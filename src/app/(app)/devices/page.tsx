export const dynamic = "force-dynamic";

import { listSubscriptions } from "@/db/queries/subscriptions";
import { DevicesClient } from "@/components/journal/DevicesClient";
import { env } from "@/env";

export default function DevicesPage() {
  const subscriptions = listSubscriptions();
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Devices & Notifications</h1>
      <DevicesClient subscriptions={subscriptions} vapidPublicKey={env.VAPID_PUBLIC_KEY} />
    </div>
  );
}
