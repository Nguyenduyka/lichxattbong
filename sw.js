// ══════════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Badge số trên icon app (iOS PWA + Android PWA)
// ══════════════════════════════════════════════════════

const APP_URL   = 'https://lichlamviec.com.vn/';
const NOTIF_TAG = 'lich-lam-viec';

self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

// ── Nhận SET_BADGE từ trang ───────────────────────────
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SET_BADGE') {
    var n = parseInt(event.data.count) || 0;
    // navigator trong SW context = ServiceWorkerGlobalScope
    // Đây là cách DUY NHẤT hoạt động trên iOS Safari PWA
    if ('setAppBadge' in self) {
      if (n > 0) {
        self.setAppBadge(n).catch(function(){});
      } else {
        self.clearAppBadge().catch(function(){});
      }
    } else if ('setAppBadge' in navigator) {
      // Fallback cho một số browser khác
      if (n > 0) {
        navigator.setAppBadge(n).catch(function(){});
      } else {
        navigator.clearAppBadge().catch(function(){});
      }
    }
  }
});

// ── Click notification → mở app + xoá badge ──────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Xoá badge khi user click
  if ('clearAppBadge' in self) {
    self.clearAppBadge().catch(function(){});
  } else if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(function(){});
  }
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
