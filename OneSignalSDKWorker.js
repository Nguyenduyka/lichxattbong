// OneSignalSDKWorker.js – Service Worker chính
// Gộp OneSignal + Badge API + Cache + Push
//
// CACHE STRATEGY (v17):
// - HTML (index.html): network-first → cache fallback (đảm bảo user luôn có
//   bản mới nhất khi online, fallback cache khi offline)
// - JS/CSS: stale-while-revalidate (response cache ngay, update background)
// - Cross-origin (Firebase, OneSignal, CDN, fonts): bypass cache (network only)
//
// KHÔNG precache JS riêng lẻ: vì khi deploy phiên bản mới, nếu precache
// list khác đi mà HTML chưa update, sẽ xảy ra "HTML cũ + JS mới" → lỗi
// ReferenceError. Strategy stale-while-revalidate sẽ tự cache lần đầu user
// truy cập, tự update background. An toàn hơn precache.

// ── ONESIGNAL (bắt buộc import đầu tiên) ──────
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ── CACHE ──────────────────────────────────────
const CACHE_NAME = 'llv-v17';

// Chỉ precache tài nguyên cốt lõi mà user CHẮC CHẮN cần ngay khi mở app offline.
// Các JS files sẽ tự cache dần qua stale-while-revalidate khi user duyệt.
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => {
      // allSettled: mạng kém vẫn cache được phần nào
      return Promise.allSettled(
        CORE_ASSETS.map(url => c.add(url).catch(() => null))
      );
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Helper: kiểm tra URL có nên bypass cache hoàn toàn không
function _shouldBypass(url){
  return url.includes('firebaseio.com') ||
         url.includes('firebasestorage.googleapis.com') ||
         url.includes('googleapis.com') ||
         url.includes('script.google.com') ||
         url.includes('onesignal.com') ||
         url.includes('open-meteo.com') ||
         url.includes('cdnjs.cloudflare.com') ||
         url.includes('unpkg.com') ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com') ||
         url.includes('gstatic.com');
}

// Helper: nhận diện request HTML (navigation hoặc Accept: text/html)
function _isHTML(req){
  if (req.mode === 'navigate') return true;
  var accept = req.headers.get('accept') || '';
  return accept.indexOf('text/html') !== -1;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Bypass: không can thiệp các domain external
  if (_shouldBypass(url)) return;

  // STRATEGY 1: HTML → network-first
  // Mục tiêu: user luôn nhận được HTML mới nhất khi online, đảm bảo JS/CSS
  // version mới được nạp đúng. Khi offline, fallback cache.
  if (_isHTML(e.request)) {
    e.respondWith(
      fetch(e.request).then(res => {
        // Cache lại response mới (background)
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // Offline: fallback cache (hoặc index.html nếu route khác)
        return caches.match(e.request).then(c => c || caches.match('/index.html'));
      })
    );
    return;
  }

  // STRATEGY 2: Asset tĩnh (JS, CSS, ảnh) → stale-while-revalidate
  // Response cache ngay (fast), nhưng vẫn fetch network background để update cache.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached); // offline → trả cached nếu có
      // Trả cache ngay nếu có, không thì chờ network
      return cached || networkFetch;
    })
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
