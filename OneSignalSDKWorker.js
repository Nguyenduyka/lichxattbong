// OneSignalSDKWorker.js – Service Worker chính
// Gộp OneSignal + Badge API + Cache + Push
 
// ── ONESIGNAL (bắt buộc import đầu tiên) ──────
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
 
// ── CACHE ──────────────────────────────────────
const CACHE_NAME = 'llv-v6';
const CACHE_URLS = ['/', '/index.html'];
 
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CACHE_URLS)).catch(() => {})
  );
});
 
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
 
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') ||
      url.includes('script.google.com') || url.includes('onesignal.com') ||
      url.includes('cdnjs') || url.includes('fonts.g') || url.includes('gstatic')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
 
// ── BADGE API ──────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;
  const { type, count } = e.data;
 
  if (type === 'SET_BADGE') {
    const n = parseInt(count) || 0;
    try {
      if ('setAppBadge' in self) {
        if (n > 0) self.setAppBadge(n).catch(() => {});
        else self.clearAppBadge().catch(() => {});
      } else if ('setAppBadge' in navigator) {
        if (n > 0) navigator.setAppBadge(n).catch(() => {});
        else navigator.clearAppBadge().catch(() => {});
      }
    } catch (_) {}
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'BADGE_SET', count: n })))
      .catch(() => {});
  }
 
  if (type === 'CLEAR_BADGE') {
    try {
      if ('clearAppBadge' in self) self.clearAppBadge().catch(() => {});
      else if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
    } catch (_) {}
    self.registration.getNotifications({ tag: 'lich-update' })
      .then(ns => ns.forEach(n => n.close())).catch(() => {});
  }
 
  if (type === 'SKIP_WAITING') self.skipWaiting();
});
 
// ── NOTIFICATION CLICK ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url : self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const c of clients) {
          if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
            c.postMessage({ type: 'NOTIF_CLICKED' });
            return c.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
