import { requireUserId } from '@/lib/auth';
import { createSafeActionClient } from 'next-safe-action';

const baseClient = createSafeActionClient({
  handleServerError(error) {
    if (error.message === 'Unauthorized') return 'Unauthorized';
    console.error('[action]', error);
    return 'Hiba történt a művelet közben';
  },
});

export const authActionClient = baseClient.use(async ({ next }) => {
  const userId = await requireUserId();
  return next({ ctx: { userId } });
});
