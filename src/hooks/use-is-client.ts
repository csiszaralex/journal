import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // getSnapshot: kliensen mindig true
    () => false, // getServerSnapshot: SSR során mindig false
  );
}
