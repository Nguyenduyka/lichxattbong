// sw.js – Service Worker cho Lịch Làm Việc Số
// Hỗ trợ: Badge API (Android), Push Notification, offline cache
 
const CACHE_NAME = 'llv-v3';
const CACHE_URLS = ['/', '/index.html'];
 
// ── CÀI ĐẶT ──────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CACHE_URLS)).catch(() => {})
  );
});
 
// ── KÍCH HOẠT ────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
 
// ── FETCH (offline fallback) ──────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // Không cache Firebase, GAS, Gemini, CDN
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') ||
      url.includes('script.google.com') || url.includes('cdnjs') ||
      url.includes('fonts.g') || url.includes('gstatic')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
 
// ── NHẬN MESSAGE TỪ TRANG ────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;
  const { type, count } = e.data;
 
  if (type === 'SET_BADGE') {
    const n = parseInt(count) || 0;
    // navigator.setAppBadge là cách đúng trong SW (không dùng self.navigator)
    if ('setAppBadge' in navigator) {
      if (n > 0) navigator.setAppBadge(n).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    }
    // Fallback: relay cho tất cả client để trang tự gọi
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'BADGE_SET', count: n })))
      .catch(() => {});
  }
 
  if (type === 'CLEAR_BADGE') {
    if ('setAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
    // Đóng tất cả notification cũ có tag lich-update
    self.registration.getNotifications({ tag: 'lich-update' })
      .then(ns => ns.forEach(n => n.close())).catch(() => {});
  }
 
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
 
// ── NHẬN PUSH (khi app đóng) ──────────────────
self.addEventListener('push', e => {
  let title = '📅 Lịch Làm Việc Số';
  let body = 'Lịch làm việc vừa được cập nhật';
  let count = 1;
 
  if (e.data) {
    try {
      const d = e.data.json();
      if (d.title) title = d.title;
      if (d.body)  body  = d.body;
      if (d.count) count = parseInt(d.count) || 1;
    } catch (_) {
      body = e.data.text() || body;
    }
  }
 
  // Hiện badge trên icon
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(count).catch(() => {});
  }
 
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: 'lich-update',
      renotify: true,
      data: { url: self.registration.scope }
    })
  );
});
 
// ── CLICK NOTIFICATION ────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : self.registration.scope;
 
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Nếu app đang mở → focus và gửi message
        for (const c of clients) {
          if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
            c.postMessage({ type: 'NOTIF_CLICKED' });
            return c.focus();
          }
        }
        // Nếu app đóng → mở tab mới
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
