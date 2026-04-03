// ════════════════════════════════════════
// SERVICE WORKER – Lịch làm việc số
// Badge: iOS 16.4+ (setAppBadge) + Android (notification count)
// ════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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
const CACHE_NAME = 'lich-v2';
const ORIGIN = self.location.origin;

// ════════════════════════════════════════
// INSTALL & ACTIVATE
// ════════════════════════════════════════
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAndroid() {
  return /android/i.test(self.navigator.userAgent);
}

// ════════════════════════════════════════
// FCM BACKGROUND MESSAGE
// ════════════════════════════════════════
messaging.onBackgroundMessage(payload => {
  const data  = payload.data || {};
  const count = parseInt(data.count) || 1;
  const title = data.title || 'Lịch lam viec so';
  const body  = data.body  || ('Co ' + count + ' lich moi duoc cap nhat');

  // iOS: setAppBadge
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(count).catch(() => {});
  }
  setBadgeCount(count);

  const options = {
    body,
    icon    : '/icons/icon-192.png',
    badge   : '/icons/icon-72.png',
    tag     : 'lich-update',
    renotify: true,
    silent  : false,
    data    : { url: ORIGIN, count },
    vibrate : [200, 100, 200],
    timestamp: Date.now(),
    actions : [
      { action: 'open',    title: 'Xem lich' },
      { action: 'dismiss', title: 'Bo qua'   }
    ]
  };

  return self.registration.showNotification(title, options);
});

// ════════════════════════════════════════
// PUSH FALLBACK
// ════════════════════════════════════════
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { return; }
  if (payload.fcmMessageId || (payload.data && payload.data['google.c.a.e'])) return;

  const data  = payload.data || {};
  const notif = payload.notification || {};
  const count = parseInt(data.count) || 1;
  const title = notif.title || data.title || 'Lich lam viec so';
  const body  = notif.body  || data.body  || ('Co ' + count + ' lich moi');

  if ('setAppBadge' in self.navigator) self.navigator.setAppBadge(count).catch(() => {});
  setBadgeCount(count);

  e.waitUntil(
    self.registration.showNotification(title, {
      body, icon: '/icons/icon-192.png', badge: '/icons/icon-72.png',
      tag: 'lich-update', renotify: true, vibrate: [200, 100, 200],
      data: { url: ORIGIN, count }
    })
  );
});

// ════════════════════════════════════════
// NOTIFICATION CLICK
// ════════════════════════════════════════
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const targetUrl = (e.notification.data && e.notification.data.url) || ORIGIN;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.startsWith(ORIGIN));
      if (existing) {
        existing.focus();
        if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
        setBadgeCount(0);
        existing.postMessage({ type: 'CLEAR_BADGE' });
        return;
      }
      return self.clients.openWindow(targetUrl).then(client => {
        if (!client) return;
        if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
        setBadgeCount(0);
      });
    })
  );
});

// ════════════════════════════════════════
// NOTIFICATION CLOSE (Android: user vuot bo)
// ════════════════════════════════════════
self.addEventListener('notificationclose', () => {
  if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
  setBadgeCount(0);
});

// ════════════════════════════════════════
// MESSAGES TU APP
// ════════════════════════════════════════
self.addEventListener('message', e => {
  if (!e.data) return;
  switch (e.data.type) {
    case 'SET_BADGE': {
      const count = e.data.count || 0;
      if ('setAppBadge' in self.navigator) {
        count > 0 ? self.navigator.setAppBadge(count).catch(() => {})
                  : self.navigator.clearAppBadge().catch(() => {});
      }
      setBadgeCount(count);
      // Android: tao notification de badge so hien
      if (count > 0 && isAndroid()) showSilentAndroidBadge(count);
      break;
    }
    case 'CLEAR_BADGE': {
      if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
      setBadgeCount(0);
      self.registration.getNotifications({ tag: 'lich-update' })
        .then(ns => ns.forEach(n => n.close())).catch(() => {});
      break;
    }
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

// ════════════════════════════════════════
// ANDROID: notification silent de co badge so
// Android badge so = so notification chua doc
// ════════════════════════════════════════
async function showSilentAndroidBadge(count) {
  try {
    const existing = await self.registration.getNotifications({ tag: 'lich-update' });
    if (existing.length > 0) return;
    await self.registration.showNotification('Lich lam viec so', {
      body  : 'Co ' + count + ' lich moi duoc cap nhat',
      icon  : '/icons/icon-192.png',
      badge : '/icons/icon-72.png',
      tag   : 'lich-update',
      silent: true,
      data  : { url: ORIGIN, count }
    });
  } catch(e) {}
}

// ════════════════════════════════════════
// INDEXEDDB: luu badge count
// ════════════════════════════════════════
function setBadgeCount(count) {
  try {
    const req = indexedDB.open('lcttb_badge', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => {
      e.target.result.transaction('kv', 'readwrite').objectStore('kv').put(count, 'badge_count');
    };
  } catch(err) {}
}
