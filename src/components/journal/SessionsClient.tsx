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

function formatDeviceType(t: string): string {
  if (t === "singleDevice") return "Single-device passkey";
  if (t === "multiDevice") return "Synced passkey";
  return t;
}

export function SessionsClient({
  sessions: initialSessions,
  passkeys: initialPasskeys,
}: {
  sessions: SessionItem[];
  passkeys: PasskeyItem[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reportError(err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong");
  }

  async function handleRegisterPasskey() {
    setError(null);
    setRegistering(true);
    try {
      const options = await getPasskeyRegistrationOptionsAction();
      const response = await startRegistration(options);
      await verifyPasskeyRegistrationAction(response);
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
          <h2 className="text-sm font-medium">Passkeys</h2>
          <p className="text-sm text-muted-foreground">
            Registered keys you can use to sign in. The last remaining passkey
            cannot be deleted.
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
          Add a passkey on this device
        </Button>
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 py-4">
            No passkeys registered.
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
                    try {
                      setError(null);
                      await renamePasskeyAction(p.credentialID, name);
                      setPasskeys((prev) =>
                        prev.map((x) =>
                          x.credentialID === p.credentialID
                            ? { ...x, name }
                            : x,
                        ),
                      );
                    } catch (err) {
                      reportError(err);
                    }
                  })
                }
                onDelete={() =>
                  startTransition(async () => {
                    try {
                      setError(null);
                      await deletePasskeyAction(p.credentialID);
                      setPasskeys((prev) =>
                        prev.filter(
                          (x) => x.credentialID !== p.credentialID,
                        ),
                      );
                    } catch (err) {
                      reportError(err);
                    }
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Active sessions</h2>
          <p className="text-sm text-muted-foreground">
            Devices currently signed in to your account. You cannot revoke the
            session you are currently using.
          </p>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 py-4">
            No active sessions.
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
                    try {
                      setError(null);
                      await renameSessionAction(s.sessionToken, name);
                      setSessions((prev) =>
                        prev.map((x) =>
                          x.sessionToken === s.sessionToken
                            ? { ...x, name }
                            : x,
                        ),
                      );
                    } catch (err) {
                      reportError(err);
                    }
                  })
                }
                onDelete={() =>
                  startTransition(async () => {
                    try {
                      setError(null);
                      await deleteSessionAction(s.sessionToken);
                      setSessions((prev) =>
                        prev.filter(
                          (x) => x.sessionToken !== s.sessionToken,
                        ),
                      );
                    } catch (err) {
                      reportError(err);
                    }
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
  const [name, setName] = useState(passkey.name ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <KeyRoundIcon className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={name}
            placeholder="Unnamed passkey"
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
                ? "Cannot delete your last passkey"
                : "Delete passkey"
            }
          >
            <TrashIcon className="size-3.5" />
          </Button>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Delete this passkey?</DialogTitle>
              <DialogDescription>
                You will no longer be able to sign in with this key. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5 pl-6">
        <p>{formatDeviceType(passkey.credentialDeviceType)}</p>
        <p>Added: {passkey.createdAt ?? "—"}</p>
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
  const [name, setName] = useState(session.name ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MonitorSmartphoneIcon className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={name}
            placeholder="Unnamed session"
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
              Current
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
                ? "You cannot revoke your current session"
                : "Revoke session"
            }
          >
            <TrashIcon className="size-3.5" />
          </Button>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Revoke this session?</DialogTitle>
              <DialogDescription>
                That device will be signed out on its next request.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
              >
                Revoke
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
        <p>Signed in: {session.createdAt ?? "—"}</p>
        <p>Expires: {session.expires}</p>
      </div>
    </div>
  );
}
