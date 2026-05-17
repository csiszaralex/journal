"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { authActionClient } from "@/lib/safe-action";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import {
  authAccounts,
  authAuthenticators,
  authVerificationTokens,
} from "@/db/schema";
import { logAudit } from "@/db/queries/audit";
import {
  countPasskeysForUser,
  listPasskeysForUser,
  deletePasskey,
  renamePasskey,
} from "@/db/queries/passkeys";
import { friendlyNameFromUA } from "@/lib/user-agent";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RP_NAME = "Journal";

async function deriveRpAndOrigin(): Promise<{ rpID: string; origin: string }> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const rpID = host.split(":")[0];
  return { rpID, origin: `${proto}://${host}` };
}

function challengeIdentifier(userId: string): string {
  return `passkey-reg:${userId}`;
}

export const renamePasskeyAction = authActionClient
  .inputSchema(
    z.object({
      credentialID: z.string().min(1),
      name: z.string().trim().min(1).max(60),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const ok = renamePasskey(parsedInput.credentialID, ctx.userId, parsedInput.name);
    if (!ok) throw new Error("Passkey not found");
    logAudit("auth.passkey.rename", { user_id: ctx.userId });
    revalidatePath("/settings/sessions");
  });

export const deletePasskeyAction = authActionClient
  .inputSchema(z.object({ credentialID: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (countPasskeysForUser(ctx.userId) <= 1) {
      throw new Error("Cannot delete your last passkey");
    }
    const ok = deletePasskey(parsedInput.credentialID, ctx.userId);
    if (!ok) throw new Error("Passkey not found");
    db.delete(authAccounts)
      .where(
        and(
          eq(authAccounts.provider, "passkey"),
          eq(authAccounts.providerAccountId, parsedInput.credentialID),
        ),
      )
      .run();
    logAudit("auth.passkey.delete", { user_id: ctx.userId });
    revalidatePath("/settings/sessions");
  });

type RegistrationOptions = Awaited<ReturnType<typeof generateRegistrationOptions>>;
type VerifyResponseArg = Parameters<typeof verifyRegistrationResponse>[0]["response"];

export const getPasskeyRegistrationOptionsAction = authActionClient.action(
  async ({ ctx }): Promise<RegistrationOptions> => {
    const session = await auth();
    const userEmail = session?.user?.email ?? "user";
    const userName = session?.user?.name ?? userEmail;

    const { rpID } = await deriveRpAndOrigin();

    const existing = listPasskeysForUser(ctx.userId);
    const excludeCredentials = existing.map((p) => ({
      id: new Uint8Array(Buffer.from(p.credentialID, "base64url")),
      type: "public-key" as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: ctx.userId,
      userName: userEmail,
      userDisplayName: userName,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    const identifier = challengeIdentifier(ctx.userId);
    db.delete(authVerificationTokens)
      .where(eq(authVerificationTokens.identifier, identifier))
      .run();
    db.insert(authVerificationTokens)
      .values({
        identifier,
        token: options.challenge,
        expires: new Date(Date.now() + CHALLENGE_TTL_MS),
      })
      .run();

    return options;
  },
);

const verifyResponseSchema: z.ZodType<VerifyResponseArg> = z.any();

export const verifyPasskeyRegistrationAction = authActionClient
  .inputSchema(z.object({ response: verifyResponseSchema }))
  .action(async ({ parsedInput, ctx }) => {
    const { rpID, origin } = await deriveRpAndOrigin();

    const identifier = challengeIdentifier(ctx.userId);
    const stored = db
      .select()
      .from(authVerificationTokens)
      .where(eq(authVerificationTokens.identifier, identifier))
      .get();

    if (!stored) throw new Error("No pending registration; start over");
    if (stored.expires.getTime() < Date.now()) {
      db.delete(authVerificationTokens)
        .where(eq(authVerificationTokens.identifier, identifier))
        .run();
      throw new Error("Registration expired; start over");
    }

    const verification = await verifyRegistrationResponse({
      response: parsedInput.response,
      expectedChallenge: stored.token,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    db.delete(authVerificationTokens)
      .where(eq(authVerificationTokens.identifier, identifier))
      .run();

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Passkey verification failed");
    }

    const info = verification.registrationInfo;
    const credentialID = Buffer.from(info.credentialID).toString("base64url");
    const credentialPublicKey = Buffer.from(info.credentialPublicKey).toString(
      "base64url",
    );
    const transports = parsedInput.response.response.transports ?? null;
    const ua = (await headers()).get("user-agent");

    db.insert(authAuthenticators)
      .values({
        credentialID,
        userId: ctx.userId,
        providerAccountId: credentialID,
        credentialPublicKey,
        counter: info.counter,
        credentialDeviceType: info.credentialDeviceType,
        credentialBackedUp: info.credentialBackedUp,
        transports: transports ? transports.join(",") : null,
        name: friendlyNameFromUA(ua),
        createdAt: new Date(),
      })
      .run();

    db.insert(authAccounts)
      .values({
        userId: ctx.userId,
        type: "webauthn",
        provider: "passkey",
        providerAccountId: credentialID,
      })
      .onConflictDoNothing()
      .run();

    logAudit("auth.passkey.add", { user_id: ctx.userId });
    revalidatePath("/settings/sessions");
  });
