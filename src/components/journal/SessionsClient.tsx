"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRoundIcon,
  LoaderIcon,
  MonitorSmartphoneIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteSessionAction,
  renameSessionAction,
} from "@/actions/sessions";
import {
  deletePasskeyAction,
  getPasskeyRegistrationOptionsAction,
  renamePasskeyAction,
  verifyPasskeyRegistrationAction,
} from "@/actions/passkeys";
import { useI18n } from "@/i18n/provider";

type SessionItem = {
  sessionToken: string;
  name: string | null;
  userAgent: string | null;
  createdAt: string | null;
  expires: string;
  isCurrent: boolean;
};

type PasskeyItem = {
  credentialID: string;
  name: string | null;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: string | null;
};

export function SessionsClient({
  sessions: initialSessions,
  passkeys: initialPasskeys,
}: {
  sessions: SessionItem[];
  passkeys: PasskeyItem[];
}) {
  const d = useI18n();
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reportError(err: unknown) {
    setError(err instanceof Error ? err.message : d.common.unexpectedError);
  }

  async function handleRegisterPasskey() {
    setError(null);
    setRegistering(true);
    try {
      const optionsResult = await getPasskeyRegistrationOptionsAction();
      if (optionsResult?.serverError) throw new Error(optionsResult.serverError);
      if (!optionsResult?.data) throw new Error(d.sessions.passkeys.optionsFailed);
      const response = await startRegistration(optionsResult.data);
      const verifyResult = await verifyPasskeyRegistrationAction({ response });
      if (verifyResult?.serverError) throw new Error(verifyResult.serverError);
      router.refresh();
    } catch (err) {
      // User-cancel surfaces as DOMException with name 'NotAllowedError' — silence that
      if (err instanceof Error && err.name === "NotAllowedError") return;
      reportError(err);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">{d.sessions.passkeys.heading}</h2>
          <p className="text-sm text-muted-foreground">
            {d.sessions.passkeys.description}
          </p>
        </div>
        <Button
          onClick={handleRegisterPasskey}
          disabled={registering || isPending}
          size="sm"
          className="gap-2"
        >
          {registering ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <PlusIcon className="size-4" />
          )}
          {d.sessions.passkeys.add}
        </Button>
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 py-4">
            {d.sessions.passkeys.empty}
          </p>
        ) : (
          <div className="space-y-3">
            {passkeys.map((p) => (
              <PasskeyCard
                key={p.credentialID}
                passkey={p}
                isOnly={passkeys.length === 1}
                isPending={isPending}
                onRename={(name) =>
                  startTransition(async () => {
                    setError(null);
                    const result = await renamePasskeyAction({ credentialID: p.credentialID, name });
                    if (result?.serverError) {
                      reportError(new Error(result.serverError));
                      return;
                    }
                    setPasskeys((prev) =>
                      prev.map((x) =>
                        x.credentialID === p.credentialID ? { ...x, name } : x,
                      ),
                    );
                  })
                }
                onDelete={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await deletePasskeyAction({ credentialID: p.credentialID });
                    if (result?.serverError) {
                      reportError(new Error(result.serverError));
                      return;
                    }
                    setPasskeys((prev) =>
                      prev.filter((x) => x.credentialID !== p.credentialID),
                    );
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">{d.sessions.active.heading}</h2>
          <p className="text-sm text-muted-foreground">
            {d.sessions.active.description}
          </p>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 py-4">
            {d.sessions.active.empty}
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.sessionToken}
                session={s}
                isPending={isPending}
                onRename={(name) =>
                  startTransition(async () => {
                    setError(null);
                    const result = await renameSessionAction({ token: s.sessionToken, name });
                    if (result?.serverError) {
                      reportError(new Error(result.serverError));
                      return;
                    }
                    setSessions((prev) =>
                      prev.map((x) =>
                        x.sessionToken === s.sessionToken ? { ...x, name } : x,
                      ),
                    );
                  })
                }
                onDelete={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await deleteSessionAction({ token: s.sessionToken });
                    if (result?.serverError) {
                      reportError(new Error(result.serverError));
                      return;
                    }
                    setSessions((prev) =>
                      prev.filter((x) => x.sessionToken !== s.sessionToken),
                    );
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PasskeyCard({
  passkey,
  isOnly,
  isPending,
  onRename,
  onDelete,
}: {
  passkey: PasskeyItem;
  isOnly: boolean;
  isPending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const d = useI18n();
  const [name, setName] = useState(passkey.name ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Only the two device types WebAuthn defines have words; anything else an
  // authenticator reports is a machine string and is shown as it arrived.
  const type = passkey.credentialDeviceType;
  const deviceType =
    type === "singleDevice" || type === "multiDevice"
      ? d.sessions.passkeys.deviceType(type)
      : type;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <KeyRoundIcon className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={name}
            placeholder={d.sessions.passkeys.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const trimmed = name.trim();
              if (trimmed && trimmed !== passkey.name) onRename(trimmed);
              else if (!trimmed) setName(passkey.name ?? "");
            }}
            disabled={isPending}
            className="h-7 text-sm font-medium border-transparent bg-transparent px-1 focus:border-input focus:bg-background"
          />
        </div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive shrink-0"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending || isOnly}
            title={
              isOnly
                ? d.sessions.passkeys.deleteDisabledTitle
                : d.sessions.passkeys.deleteTitle
            }
          >
            <TrashIcon className="size-3.5" />
          </Button>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{d.sessions.passkeys.confirmTitle}</DialogTitle>
              <DialogDescription>
                {d.sessions.passkeys.confirmDescription}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                {d.common.cancel}
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
              >
                {d.common.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5 pl-6">
        <p>{deviceType}</p>
        <p>{d.sessions.passkeys.added(passkey.createdAt ?? "—")}</p>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  isPending,
  onRename,
  onDelete,
}: {
  session: SessionItem;
  isPending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const d = useI18n();
  const [name, setName] = useState(session.name ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MonitorSmartphoneIcon className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={name}
            placeholder={d.sessions.active.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const trimmed = name.trim();
              if (trimmed && trimmed !== session.name) onRename(trimmed);
              else if (!trimmed) setName(session.name ?? "");
            }}
            disabled={isPending}
            className="h-7 text-sm font-medium border-transparent bg-transparent px-1 focus:border-input focus:bg-background"
          />
          {session.isCurrent && (
            <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {d.sessions.active.currentBadge}
            </span>
          )}
        </div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive shrink-0"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending || session.isCurrent}
            title={
              session.isCurrent
                ? d.sessions.active.revokeDisabledTitle
                : d.sessions.active.revokeTitle
            }
          >
            <TrashIcon className="size-3.5" />
          </Button>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{d.sessions.active.confirmTitle}</DialogTitle>
              <DialogDescription>
                {d.sessions.active.confirmDescription}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                {d.common.cancel}
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
              >
                {d.sessions.active.revoke}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5 pl-6">
        {session.userAgent && (
          <p className="truncate" title={session.userAgent}>
            {session.userAgent}
          </p>
        )}
        <p>{d.sessions.active.signedIn(session.createdAt ?? "—")}</p>
        <p>{d.sessions.active.expires(session.expires)}</p>
      </div>
    </div>
  );
}
