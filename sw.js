// ════════════════════════════════════════
// SERVICE WORKER – Lịch làm việc số
// Hỗ trợ: FCM background push + App Badge (iOS 16.4+)
// ════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Firebase config (phải khớp với index.html) ──
firebase.initializeApp({
  apiKey: "AIzaSyBRBEqHmR9Anezw06LVNjPdewTxoB-4Wag",
  authDomain: "lichxattbong.firebaseapp.com",
  databaseURL: "https://lichxattbong-default-rtdb.firebaseio.com",
  projectId: "lichxattbong",
  storageBucket: "lichxattbong.firebasestorage.app",
  messagingSenderId: "351527831399",
  appId: "1:351527831399:web:98bc82f14284978ca751c2"
});

const messaging = firebase.messaging();

// ── Cache version ──
const CACHE_NAME = 'lich-v1';

// ════════════════════════════════════════
// INSTALL & ACTIVATE
// ════════════════════════════════════════
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ════════════════════════════════════════
// FCM BACKGROUND MESSAGE
// Khi app đóng hoặc background → SW nhận push và hiển thị notification
// ════════════════════════════════════════
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);

  const data = payload.data || {};
  const count = parseInt(data.count) || 1;
  const title = data.title || '📅 Lịch làm việc số';
  const body  = data.body  || ('Có ' + count + ' lịch mới được cập nhật');

  // Cập nhật App Badge (số đỏ trên icon – iOS 16.4+)
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(count).catch(() => {});
  }

  // Lưu count vào IndexedDB để app đọc lại khi mở
  setBadgeCount(count);

  // Hiển thị notification
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'lich-update',
    renotify: true,
    data: { url: self.location.origin, count },
    actions: [
      { action: 'open', title: '📋 Xem lịch' },
      { action: 'dismiss', title: 'Bỏ qua' }
    ],
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(title, options);
});

// ════════════════════════════════════════
// NOTIFICATION CLICK
// ════════════════════════════════════════
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const url = (e.notification.data && e.notification.data.url) || self.location.origin;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Nếu đã có tab mở → focus và xóa badge
      const existing = clients.find(c => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'CLEAR_BADGE' });
        if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
        return;
      }
      // Chưa có → mở tab mới
      return self.clients.openWindow(url);
    })
  );
});

// ════════════════════════════════════════
// MESSAGES TỪ APP (postMessage)
// ════════════════════════════════════════
self.addEventListener('message', e => {
  if (!e.data) return;

  switch (e.data.type) {
    case 'SET_BADGE': {
      const count = e.data.count || 0;
      if ('setAppBadge' in self.navigator) {
        if (count > 0) self.navigator.setAppBadge(count).catch(() => {});
        else self.navigator.clearAppBadge().catch(() => {});
      }
      setBadgeCount(count);
      break;
    }
    case 'CLEAR_BADGE': {
      if ('clearAppBadge' in self.navigator) {
        self.navigator.clearAppBadge().catch(() => {});
      }
      setBadgeCount(0);
      break;
    }
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

// ════════════════════════════════════════
// PUSH EVENT (fallback nếu FCM không handle được)
// ════════════════════════════════════════
self.addEventListener('push', e => {
  // FCM onBackgroundMessage sẽ xử lý trường hợp có data
  // Push event này chỉ là fallback cho trường hợp không có data
  if (!e.data) return;

  let payload;
  try { payload = e.data.json(); } catch { return; }

  // Nếu FCM đã xử lý thì bỏ qua
  if (payload.data && payload.data.google) return;

  const count = (payload.data && parseInt(payload.data.count)) || 1;
  const title = (payload.notification && payload.notification.title) || '📅 Lịch làm việc số';
  const body  = (payload.notification && payload.notification.body)  || ('Có ' + count + ' lịch mới');

  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(count).catch(() => {});
  }

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: 'lich-update',
      renotify: true,
      data: { count }
    })
  );
});

// ════════════════════════════════════════
// HELPER: lưu badge count vào IndexedDB
// (dùng để app đọc lại khi foreground)
// ════════════════════════════════════════
function setBadgeCount(count) {
  try {
    const req = indexedDB.open('lcttb_badge', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('kv');
    };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(count, 'badge_count');
    };
  } catch(err) {}
}
