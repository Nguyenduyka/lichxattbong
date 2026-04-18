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
 
// ── BADGE STORAGE (IndexedDB) ──────────────────
// Lưu badge count trong SW để không mất khi app đóng/background
const DB_NAME = 'llv-sw';
const DB_STORE = 'kv';
 
function _dbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(DB_STORE);
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej();
  });
}
function _dbSet(key, val) {
  return _dbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(val, key);
    tx.oncomplete = res; tx.onerror = rej;
  })).catch(() => {});
}
function _dbGet(key) {
  return _dbOpen().then(db => new Promise((res, rej) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
    req.onsuccess = () => res(req.result || 0);
    req.onerror = () => res(0);
  })).catch(() => 0);
}
 
// ── BADGE API ──────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;
  const { type, count } = e.data;
 
  if (type === 'SET_BADGE') {
    const n = parseInt(count) || 0;
    // Lưu vào IndexedDB để trang đọc lại khi mở
    _dbSet('badge', n);
    // Relay về client đang mở để tự gọi navigator.setAppBadge()
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'BADGE_SET', count: n })))
      .catch(() => {});
  }
 
  if (type === 'CLEAR_BADGE') {
    _dbSet('badge', 0);
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'BADGE_SET', count: 0 })))
      .catch(() => {});
    self.registration.getNotifications({ tag: 'lich-update' })
      .then(ns => ns.forEach(n => n.close())).catch(() => {});
  }
 
  // Trang hỏi badge hiện tại (khi vừa mở app)
  if (type === 'GET_BADGE') {
    _dbGet('badge').then(n => {
      if (e.source) e.source.postMessage({ type: 'BADGE_SET', count: n });
    });
  }
 
  if (type === 'SKIP_WAITING') self.skipWaiting();
});
 
 
// ── PUSH EVENT – tăng badge trong IndexedDB khi nhận push (app có thể đóng) ──
self.addEventListener('push', e => {
  // OneSignal xử lý notification riêng — ta chỉ cập nhật badge count
  let count = 1;
  try {
    const data = e.data ? e.data.json() : {};
    count = parseInt((data.custom && data.custom.a && data.custom.a.count) ||
                     (data.data && data.data.count) || 1) || 1;
  } catch(_) {}
  e.waitUntil(_dbGet('badge').then(cur => _dbSet('badge', (parseInt(cur)||0) + count)));
});
 
// ── NOTIFICATION CLICK ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url : self.registration.scope;
  e.waitUntil(
    // Xóa badge trong IndexedDB khi user click thông báo
    _dbSet('badge', 0).then(() =>
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