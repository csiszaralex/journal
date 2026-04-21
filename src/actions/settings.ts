'use server';

import { getRegistrationEnabled, setRegistrationEnabled } from '@/db/queries/settings';
import { revalidatePath } from 'next/cache';

export async function getRegistrationEnabledAction(): Promise<boolean> {
  return getRegistrationEnabled();
}

export async function setRegistrationEnabledAction(enabled: boolean): Promise<void> {
  setRegistrationEnabled(enabled);
  revalidatePath('/settings');
}
