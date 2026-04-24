'use server';

import { getRegistrationEnabled, setRegistrationEnabled } from '@/db/queries/settings';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function getRegistrationEnabledAction(): Promise<boolean> {
  return getRegistrationEnabled();
}

export async function setRegistrationEnabledAction(enabled: boolean): Promise<void> {
  const validEnabled = z.boolean().parse(enabled);
  setRegistrationEnabled(validEnabled);
  revalidatePath('/settings');
}
