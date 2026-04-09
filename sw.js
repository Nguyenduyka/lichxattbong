// ══════════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Badge icon: iOS PWA (self.setAppBadge) + Android
// Push notification khi app đóng (FCM background push)
// ══════════════════════════════════════════════════════
const APP_URL   = 'https://lichlamviec.com.vn/';
const NOTIF_TAG = 'lich-lam-viec';
 
// Import Firebase Messaging SW script (background push)
try {
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
 
  // Nhận push khi app đóng → hiện notification + set badge
  messaging.onBackgroundMessage(function(payload) {
    const count = parseInt((payload.data && payload.data.count) || 0);
    const msg   = (payload.data && payload.data.msg) || '📅 Lịch Làm Việc Số cập nhật';
 
    // Set badge iOS
    if ('setAppBadge' in self) {
      if (count > 0) self.setAppBadge(count).catch(function(){});
    }
 
    // Hiện notification
    return self.registration.showNotification('📅 Lịch Làm Việc Số', {
      body: msg,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: NOTIF_TAG,
      renotify: true,
      data: { url: APP_URL, count: count }
    });
  });
} catch(e) {
  console.log('SW Firebase init err:', e.message);
}
 
self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
 
function _badge(n) {
  if ('setAppBadge' in self) {
    if (n > 0) self.setAppBadge(n).catch(function(){});
    else        self.clearAppBadge().catch(function(){});
    return;
  }
  if ('setAppBadge' in navigator) {
    if (n > 0) navigator.setAppBadge(n).catch(function(){});
    else        navigator.clearAppBadge().catch(function(){});
  }
}
 
// ── Nhận SET_BADGE từ trang ───────────────────────────
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SET_BADGE') {
    _badge(parseInt(event.data.count) || 0);
  }
});
 
// ── Click notification → mở app + xoá badge ──────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  _badge(0);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].url.indexOf('lichlamviec.com.vn') >= 0 && 'focus' in list[i]) {
            return list[i].focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(APP_URL);
      })
  );
});
