"use client";

import { useState, useTransition } from "react";
import { BellIcon, BellOffIcon, LoaderIcon, SmartphoneIcon, TrashIcon, SendIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateSubscriptionAction,
  deleteSubscriptionAction,
  sendTestNotificationAction,
  sendScheduledPreviewAction,
  toggleSubscriptionAction,
  type SendActionResult,
} from "@/actions/subscriptions";
import { useI18n } from "@/i18n/provider";
import type { SendKind } from "@/i18n/en/devices";

type Subscription = {
  id: string;
  endpoint: string;
  device_label: string;
  timezone: string;
  notify_hour: number;
  notify_minute: number;
  enabled: number;
  created_at: number;
};

const TIMEZONES = [
  "Europe/Budapest",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

export function DevicesClient({ subscriptions: initial, vapidPublicKey }: { subscriptions: Subscription[]; vapidPublicKey: string }) {
  const d = useI18n();
  const [subscriptions, setSubscriptions] = useState(initial);
  const [subscribing, setSubscribing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // `kind` names which button was pressed, not the words to print: the
  // dictionary writes each of these messages out in full, per language.
  function reportResult(kind: SendKind, data: SendActionResult | undefined, serverError: string | undefined) {
    const send = d.devices.send;
    if (serverError) {
      toast.error(send.failed(kind, serverError));
      return;
    }
    if (!data) {
      toast.error(send.noResponse(kind));
      return;
    }
    if (data.ok) {
      toast.success(send.sent(kind));
      return;
    }
    if (data.reason === "gone") {
      toast.error(send.expired);
      return;
    }
    if (data.reason === "not-found") {
      toast.error(send.notFound);
      return;
    }
    if (data.statusCode) {
      toast.error(
        data.message
          ? send.failedWithStatus(kind, data.statusCode, data.message)
          : send.failedUnknownWithStatus(kind, data.statusCode)
      );
      return;
    }
    toast.error(data.message ? send.failed(kind, data.message) : send.failedUnknown(kind));
  }

  async function handleSubscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert(d.devices.subscribe.notSupported);
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert(d.devices.subscribe.permissionDenied);
        return;
      }

      // Wait for SW with a timeout — fails gracefully if SW isn't registered.
      // The message is translated here because the catch below alerts it.
      const swReady = Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(d.devices.subscribe.serviceWorkerTimeout)), 8000)
        ),
      ]);
      const reg = await swReady;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      // Without this the button just goes quiet on any refusal — a throttled
      // request answers 429 rather than throwing, so the catch below never sees it.
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      alert(body?.error ?? d.devices.subscribe.failedWithStatus(res.status));
    } catch (err) {
      alert(err instanceof Error ? err.message : d.devices.subscribe.failed);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribeThis() {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      {/* Subscribe this device */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSubscribe} disabled={subscribing} size="sm" className="gap-2">
          {subscribing ? <LoaderIcon className="size-4 animate-spin" /> : <BellIcon className="size-4" />}
          {d.devices.enableOnThisDevice}
        </Button>
        <Button onClick={handleUnsubscribeThis} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <BellOffIcon className="size-4" />
          {d.devices.disableThisDevice}
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 py-4">{d.devices.empty}</p>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              isPending={isPending}
              onUpdate={(patch) =>
                startTransition(async () => {
                  await updateSubscriptionAction({ id: sub.id, patch });
                  setSubscriptions((prev) =>
                    prev.map((s) => (s.id === sub.id ? { ...s, ...patch } : s))
                  );
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  await deleteSubscriptionAction({ id: sub.id });
                  setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
                })
              }
              onTest={() =>
                startTransition(async () => {
                  const result = await sendTestNotificationAction({ id: sub.id });
                  reportResult("test", result?.data, result?.serverError);
                })
              }
              onPreview={() =>
                startTransition(async () => {
                  const result = await sendScheduledPreviewAction({ id: sub.id });
                  reportResult("preview", result?.data, result?.serverError);
                })
              }
              onToggle={(enabled) =>
                startTransition(async () => {
                  await toggleSubscriptionAction({ id: sub.id, enabled });
                  setSubscriptions((prev) =>
                    prev.map((s) => (s.id === sub.id ? { ...s, enabled: enabled ? 1 : 0 } : s))
                  );
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({
  sub,
  isPending,
  onUpdate,
  onDelete,
  onTest,
  onPreview,
  onToggle,
}: {
  sub: Subscription;
  isPending: boolean;
  onUpdate: (patch: Partial<Subscription>) => void;
  onDelete: () => void;
  onTest: () => void;
  onPreview: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const d = useI18n();
  const [label, setLabel] = useState(sub.device_label);
  const [timezone, setTimezone] = useState(sub.timezone);
  const [hour, setHour] = useState(sub.notify_hour);
  const [minute, setMinute] = useState(sub.notify_minute);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <SmartphoneIcon className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label !== sub.device_label && onUpdate({ device_label: label })}
            className="h-7 text-sm font-medium border-transparent bg-transparent px-1 focus:border-input focus:bg-background"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onTest}
            disabled={isPending}
            title={d.devices.card.sendTest}
          >
            <SendIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onPreview}
            disabled={isPending}
            title={d.devices.card.sendPreview}
          >
            <SparklesIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onToggle(!sub.enabled)}
            disabled={isPending}
            title={d.devices.card.toggle(Boolean(sub.enabled))}
          >
            {sub.enabled ? <BellIcon className="size-3.5" /> : <BellOffIcon className="size-3.5 text-muted-foreground" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isPending}
            title={d.devices.card.remove}
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{d.devices.card.timezoneLabel}</Label>
          <Select
            value={timezone}
            onValueChange={(v) => {
              if (!v) return;
              setTimezone(v);
              onUpdate({ timezone: v });
            }}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{d.devices.card.notifyHourLabel}</Label>
          <Select
            value={String(hour)}
            onValueChange={(v) => {
              if (!v) return;
              const n = parseInt(v, 10);
              setHour(n);
              onUpdate({ notify_hour: n });
            }}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            {/* Clock numerals, not words: "07:00" and ":15" are the same in
                every language this app is read in, so they stay arithmetic. */}
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{d.devices.card.notifyMinuteLabel}</Label>
          <Select
            value={String(minute)}
            onValueChange={(v) => {
              if (!v) return;
              const n = parseInt(v, 10);
              setMinute(n);
              onUpdate({ notify_minute: n });
            }}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 15, 30, 45].map((m) => (
                <SelectItem key={m} value={String(m)}>:{String(m).padStart(2, "0")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/50 truncate" title={sub.endpoint}>
        {sub.endpoint.slice(0, 60)}…
      </p>
    </div>
  );
}
