// ════════════════════════════════════════
// SERVICE WORKER – Lịch làm việc số
// Hỗ trợ: Badge, Push Notification (FCM), Cache offline
// Android + iOS PWA
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
  appId: "1:351527831399:web:98bc82f14284978ca751c2",
});

const messaging = firebase.messaging();

// ── Cache ──
const CACHE_NAME = 'lich-lam-viec-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => cached))
  );
});

// ── Badge helper ──
function setBadge(count) {
  if ('setAppBadge' in self.navigator) {
    if (count > 0) self.navigator.setAppBadge(count).catch(() => {});
    else self.navigator.clearAppBadge().catch(() => {});
  }
}
function clearBadge() {
  if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
}

// ── Message từ trang ──
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SET_BADGE')   setBadge(event.data.count || 0);
  if (event.data.type === 'CLEAR_BADGE') clearBadge();
});

// ── FCM background push (Android khi đóng app) ──
messaging.onBackgroundMessage(payload => {
  const data  = payload.data || {};
  const title = payload.notification?.title || '📅 Lịch làm việc số';
  const body  = payload.notification?.body  || data.msg || 'Có lịch mới được cập nhật';
  const count = parseInt(data.count || '1');

  setBadge(count);

  return self.registration.showNotification(title, {
    body,
    icon:     './icons/icon-192.png',
    badge:    './icons/icon-72.png',
    tag:      'lich-update',
    renotify: true,
    vibrate:  [200, 100, 200],
    data:     { url: self.registration.scope, count },
  });
});

// ── Click thông báo → mở app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  clearBadge();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
