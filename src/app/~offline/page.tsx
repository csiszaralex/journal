export const dynamic = 'force-static';

import { OfflineMessage } from './OfflineMessage';

// Stays static and free of any setting read: the service worker precaches this
// route at build time (see `additionalPrecacheEntries` in next.config.ts) and
// serves it as the navigation fallback, so it has to render with no server.
export default function OfflinePage() {
  return <OfflineMessage />;
}
