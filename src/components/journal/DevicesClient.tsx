"use client";

import { useState, useTransition } from "react";
import { BellIcon, BellOffIcon, LoaderIcon, SmartphoneIcon, TrashIcon, SendIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateSubscriptionAction,
  deleteSubscriptionAction,
  sendTestNotificationAction,
  sendScheduledPreviewAction,
  toggleSubscriptionAction,
  type SendActionResult,
} from "@/actions/subscriptions";

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
  const [subscriptions, setSubscriptions] = useState(initial);
  const [subscribing, setSubscribing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reportResult(label: string, data: SendActionResult | undefined, serverError: string | undefined) {
    if (serverError) {
      toast.error(`${label} failed: ${serverError}`);
      return;
    }
    if (!data) {
      toast.error(`${label} failed: no response`);
      return;
    }
    if (data.ok) {
      toast.success(`${label} sent ✓`);
      return;
    }
    if (data.reason === "gone") {
      toast.error("Subscription expired — re-enable notifications on this device.");
      return;
    }
    if (data.reason === "not-found") {
      toast.error("Subscription not found.");
      return;
    }
    const status = data.statusCode ? ` (HTTP ${data.statusCode})` : "";
    toast.error(`${label} failed${status}: ${data.message ?? "Unknown error"}`);
  }

  async function handleSubscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notification permission denied.");
        return;
      }

      // Wait for SW with a timeout — fails gracefully if SW isn't registered
      const swReady = Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service worker not ready — try reloading the page.")), 8000)
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
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to enable notifications.");
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
          Enable notifications on this device
        </Button>
        <Button onClick={handleUnsubscribeThis} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <BellOffIcon className="size-4" />
          Disable this device
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 py-4">No devices registered yet.</p>
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
                  reportResult("Test", result?.data, result?.serverError);
                })
              }
              onPreview={() =>
                startTransition(async () => {
                  const result = await sendScheduledPreviewAction({ id: sub.id });
                  reportResult("Sample prompt", result?.data, result?.serverError);
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
            title="Send test notification"
          >
            <SendIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onPreview}
            disabled={isPending}
            title="Send today's scheduled prompt now (preview)"
          >
            <SparklesIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onToggle(!sub.enabled)}
            disabled={isPending}
            title={sub.enabled ? "Disable" : "Enable"}
          >
            {sub.enabled ? <BellIcon className="size-3.5" /> : <BellOffIcon className="size-3.5 text-muted-foreground" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isPending}
            title="Remove device"
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Timezone</Label>
          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              onUpdate({ timezone: e.target.value });
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Notify hour</Label>
          <select
            value={hour}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setHour(v);
              onUpdate({ notify_hour: v });
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Notify minute</Label>
          <select
            value={minute}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setMinute(v);
              onUpdate({ notify_minute: v });
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>:{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/50 truncate" title={sub.endpoint}>
        {sub.endpoint.slice(0, 60)}…
      </p>
    </div>
  );
}
