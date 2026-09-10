import { getDict } from '@/i18n/request';
import { requireUserId } from '@/lib/auth';
import { createSafeActionClient } from 'next-safe-action';

const baseClient = createSafeActionClient({
  // next-safe-action v8 types this as `MaybePromise<ServerError>` and awaits the
  // result, so the handler can be async — which lets it read the language the
  // way everything else inside a request does, rather than falling back to the
  // stored setting.
  async handleServerError(error) {
    // Both sides of this line are a value rather than prose: `requireUserId`
    // throws the string on the left, and the string on the right is the marker
    // an unauthenticated action reports back as. Translating either would turn
    // a comparison into a coincidence, so this one passes through untouched.
    if (error.message === 'Unauthorized') return 'Unauthorized';
    console.error('[action]', error);
    return (await getDict()).errors.action.failed;
  },
});

export const authActionClient = baseClient.use(async ({ next }) => {
  const userId = await requireUserId();
  return next({ ctx: { userId } });
});
