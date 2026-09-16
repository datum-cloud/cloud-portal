const CLAIM_CLIENTS = 'CLAIM_CLIENTS';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', () => {
  // First-visit control is requested by the page (CLAIM_CLIENTS) before
  // hydration. Claiming here would abort GraphQL and SSE on SW updates.
});

self.addEventListener('message', (event) => {
  if (event.data === CLAIM_CLIENTS) {
    event.waitUntil(self.clients.claim());
  }
});

// Chromium treats a fetch listener as required for installability.
// Leaving the handler empty lets the browser handle GraphQL, plugins, and SSE.
self.addEventListener('fetch', () => {});
