export const dynamic = "force-dynamic";

import { listSubscriptions } from "@/db/queries/subscriptions";
import { DevicesClient } from "@/components/journal/DevicesClient";
import { env } from "@/env";
import { getDict } from "@/i18n/request";

export default async function DevicesPage() {
  const d = await getDict();
  const subscriptions = listSubscriptions();
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{d.devices.title}</h1>
      <DevicesClient subscriptions={subscriptions} vapidPublicKey={env.VAPID_PUBLIC_KEY} />
    </>
  );
}
