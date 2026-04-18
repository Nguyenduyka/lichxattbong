// OneSignalSDKWorker.js – Service Worker chính
// Gộp OneSignal + Badge API + Cache + Push
 
// ── ONESIGNAL (bắt buộc import đầu tiên) ──────
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
 
// ── CACHE ──────────────────────────────────────
const CACHE_NAME = 'llv-v5';
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
    // Relay về client — trang tự gọi navigator.setAppBadge() (SW không gọi được trên Android)
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'BADGE_SET', count: n })))
      .catch(() => {});
  }
 
  if (type === 'CLEAR_BADGE') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'BADGE_SET', count: 0 })))
      .catch(() => {});
    self.registration.getNotifications({ tag: 'lich-update' })
      .then(ns => ns.forEach(n => n.close())).catch(() => {});
  }
 
  if (type === 'SKIP_WAITING') self.skipWaiting();
});
 
 
// ── PUSH EVENT – set badge khi nhận push (app background/closed, iOS & Android) ──
self.addEventListener('push', e => {
  let count = 1;
  try {
    const d = e.data ? e.data.json() : {};
    count = parseInt(
      (d.custom && d.custom.a && d.custom.a.count) ||
      (d.data && d.data.count) || 1
    ) || 1;
  } catch(_) {}
 
  // Đọc badge hiện tại từ SW cache rồi tăng lên
  const p = self.caches.open('llv-badge').then(c =>
    c.match('badge-count').then(r => r ? r.text() : '0')
  ).then(cur => {
    const next = (parseInt(cur)||0) + count;
    // Lưu lại
    return self.caches.open('llv-badge').then(c =>
      c.put('badge-count', new Response(String(next)))
    ).then(() => next);
  }).then(next => {
    // setAppBadge trong push event context — iOS Safari & Android Chrome đều hỗ trợ
    if ('setAppBadge' in self) return self.setAppBadge(next).catch(()=>{});
  }).catch(()=>{});
 
  e.waitUntil(p);
});
 
// ── NOTIFICATION CLICK ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url : self.registration.scope;
  e.waitUntil(
    // Xóa badge khi user click thông báo
    Promise.all([
      self.caches.open('llv-badge').then(c => c.put('badge-count', new Response('0'))),
      ('setAppBadge' in self) ? self.clearAppBadge().catch(()=>{}) : Promise.resolve()
    ]).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          for (const c of clients) {
            if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
              c.postMessage({ type: 'NOTIF_CLICKED' });
              c.postMessage({ type: 'BADGE_SET', count: 0 });
              return c.focus();
            }
          }
          if (self.clients.openWindow) return self.clients.openWindow(target);
        })
    )
  );
});
