import { db } from '../client';
import { appSettings } from '../schema';
import { eq } from 'drizzle-orm';

function getSetting(key: string, fallback: string): string {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? fallback;
}

function setSetting(key: string, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export function getRegistrationEnabled(): boolean {
  return getSetting('registration_enabled', 'true') === 'true';
}

export function setRegistrationEnabled(enabled: boolean): void {
  setSetting('registration_enabled', enabled ? 'true' : 'false');
}
