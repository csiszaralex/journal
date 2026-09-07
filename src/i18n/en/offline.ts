/**
 * The PWA's offline fallback. Kept in its own area because it is the one screen
 * that cannot ask the server what language to use: the page is prerendered at
 * build time and served by the service worker with no network, so it picks its
 * language in the browser (see `src/app/~offline/OfflineMessage.tsx`).
 */
export const offline = {
  title: "You're offline",
  body: "This page isn't available offline yet. Connect to the internet and reload.",
};

export type Offline = typeof offline;
