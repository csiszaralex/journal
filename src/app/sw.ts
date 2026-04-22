/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── IndexedDB helpers ──────────────────────────────────────────────────────

const IDB_NAME = "journal-sw";
const IDB_STORE = "pending-actions";
const IDB_VERSION = 1;

type PendingAction = {
  id: string;
  url: string;
  body: string;
  timestamp: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveAction(action: PendingAction): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllActions(): Promise<PendingAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingAction[]);
    req.onerror = () => reject(req.error);
  });
}

async function deleteAction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Flush pending actions ─────────────────────────────────────────────────

async function flushPending(): Promise<void> {
  const actions = await getAllActions();
  // Sort oldest-first so entries arrive in creation order
  actions.sort((a, b) => a.timestamp - b.timestamp);

  for (const action of actions) {
    try {
      const res = await fetch(action.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action.body,
      });
      if (res.ok) {
        await deleteAction(action.id);
      } else {
        const data = (await res.json().catch(() => ({}))) as { noRetry?: boolean };
        // 422 validation failures should not be retried
        if (data.noRetry || res.status === 422) {
          await deleteAction(action.id);
        }
        // Other server errors: keep in IDB, browser will retry via Background Sync
      }
    } catch {
      // Network error — keep in IDB
    }
  }
}

// ── Serwist setup ─────────────────────────────────────────────────────────

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ── POST /api/sync intercept ──────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "POST" || !new URL(req.url).pathname.startsWith("/api/sync")) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req.clone());
        return res;
      } catch {
        // Network error — queue the request
        const body = await req.text();
        const parsed = JSON.parse(body) as { clientId?: string };
        const id = parsed.clientId ?? crypto.randomUUID();

        await saveAction({ id, url: req.url, body, timestamp: Date.now() });

        // Register Background Sync if available
        if ("sync" in self.registration) {
          try {
            await (self.registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register("flush-pending");
          } catch {
            // Background Sync not available — fallback handled via 'online' event in app
          }
        }

        return new Response(
          JSON.stringify({ ok: true, offline: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    })()
  );
});

// ── Background Sync handler ───────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if ((event as SyncEvent).tag === "flush-pending") {
    (event as SyncEvent).waitUntil(flushPending());
  }
});

// ── Message handler (online-event fallback for Safari/Firefox) ────────────

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string })?.type === "flush-pending") {
    flushPending().catch(console.error);
  }
});

// ── Push notifications ────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "Journal", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/192.png",
      badge: "/icons/badge.png",
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});

// SyncEvent is not in the default lib — declare it
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}
