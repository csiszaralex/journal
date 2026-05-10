"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
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

const credentialIdSchema = z.string().min(1);
const nameSchema = z.string().trim().min(1).max(60);

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RP_NAME = "Journal";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

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

export async function renamePasskeyAction(credentialID: string, name: string) {
  const userId = await requireUserId();
  const validId = credentialIdSchema.parse(credentialID);
  const validName = nameSchema.parse(name);
  const ok = renamePasskey(validId, userId, validName);
  if (!ok) throw new Error("Passkey not found");
  logAudit("auth.passkey.rename", { user_id: userId });
  revalidatePath("/settings/sessions");
}

export async function deletePasskeyAction(credentialID: string) {
  const userId = await requireUserId();
  const validId = credentialIdSchema.parse(credentialID);
  if (countPasskeysForUser(userId) <= 1) {
    throw new Error("Cannot delete your last passkey");
  }
  const ok = deletePasskey(validId, userId);
  if (!ok) throw new Error("Passkey not found");
  // Cascade-delete the matching account row so sign-in doesn't reference an orphaned credentialID
  db.delete(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, "passkey"),
        eq(authAccounts.providerAccountId, validId),
      ),
    )
    .run();
  logAudit("auth.passkey.delete", { user_id: userId });
  revalidatePath("/settings/sessions");
}

type RegistrationOptions = Awaited<ReturnType<typeof generateRegistrationOptions>>;
type VerifyResponseArg = Parameters<typeof verifyRegistrationResponse>[0]["response"];

export async function getPasskeyRegistrationOptionsAction(): Promise<RegistrationOptions> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const userEmail = session.user.email ?? "user";

  const { rpID } = await deriveRpAndOrigin();

  const existing = listPasskeysForUser(userId);
  const excludeCredentials = existing.map((p) => ({
    id: new Uint8Array(Buffer.from(p.credentialID, "base64url")),
    type: "public-key" as const,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: userId,
    userName: userEmail,
    userDisplayName: session.user.name ?? userEmail,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Store the challenge keyed by user; replace any prior pending challenge
  const identifier = challengeIdentifier(userId);
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
}

export async function verifyPasskeyRegistrationAction(
  response: VerifyResponseArg,
) {
  const userId = await requireUserId();
  const { rpID, origin } = await deriveRpAndOrigin();

  const identifier = challengeIdentifier(userId);
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
    response,
    expectedChallenge: stored.token,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  // Always clear the challenge after a verify attempt
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
  const transports = response.response.transports ?? null;
  const ua = (await headers()).get("user-agent");

  db.insert(authAuthenticators)
    .values({
      credentialID,
      userId,
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

  // Mirror what the Passkey provider does on registration so sign-in can resolve the user
  db.insert(authAccounts)
    .values({
      userId,
      type: "webauthn",
      provider: "passkey",
      providerAccountId: credentialID,
    })
    .onConflictDoNothing()
    .run();

  logAudit("auth.passkey.add", { user_id: userId });
  revalidatePath("/settings/sessions");
}
