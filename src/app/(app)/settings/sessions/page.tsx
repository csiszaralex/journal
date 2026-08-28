export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listSessionsForUser } from "@/db/queries/sessions";
import { listPasskeysForUser } from "@/db/queries/passkeys";
import { formatInAppTZ } from "@/lib/date";
import { SessionsClient } from "@/components/journal/SessionsClient";

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const cookieStore = await cookies();
  const currentToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    null;

  // Rendered in the journal's zone, not the server's: these are the times the
  // reader recognises as when they signed in.
  const fmt = (d: Date | null | undefined): string | null =>
    d ? formatInAppTZ(d, "yyyy-MM-dd HH:mm") : null;

  const sessions = listSessionsForUser(userId).map((s) => ({
    sessionToken: s.sessionToken,
    name: s.name,
    userAgent: s.userAgent,
    createdAt: fmt(s.createdAt),
    expires: fmt(s.expires) ?? "—",
    isCurrent: s.sessionToken === currentToken,
  }));

  const passkeys = listPasskeysForUser(userId).map((p) => ({
    credentialID: p.credentialID,
    name: p.name,
    credentialDeviceType: p.credentialDeviceType,
    credentialBackedUp: p.credentialBackedUp,
    createdAt: fmt(p.createdAt),
  }));

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">
        Sessions & passkeys
      </h1>
      <SessionsClient sessions={sessions} passkeys={passkeys} />
    </>
  );
}
