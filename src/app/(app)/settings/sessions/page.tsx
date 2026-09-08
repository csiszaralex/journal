export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listSessionsForUser } from "@/db/queries/sessions";
import { listPasskeysForUser } from "@/db/queries/passkeys";
import { formatInAppTZ } from "@/lib/date";
import { getDict } from "@/i18n/request";
import { SessionsClient } from "@/components/journal/SessionsClient";

export default async function SessionsPage() {
  const d = await getDict();
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const cookieStore = await cookies();
  const currentToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    null;

  // Rendered in the journal's zone, not the server's: these are the times the
  // reader recognises as when they signed in. The pattern and the locale both
  // come from the dictionary — the locale was missing, which spelled any month
  // or weekday name in English whatever the language setting said.
  const fmt = (at: Date | null | undefined): string | null =>
    at ? formatInAppTZ(at, d.dates.timestamp, d.dates.locale) : null;

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
      <h1 className="text-xl font-semibold tracking-tight">{d.sessions.title}</h1>
      <SessionsClient sessions={sessions} passkeys={passkeys} />
    </>
  );
}
