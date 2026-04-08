// ══════════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Badge icon: iOS PWA (self.setAppBadge) + Android (navigator.setAppBadge)
// ══════════════════════════════════════════════════════
const APP_URL   = 'https://lichlamviec.com.vn/';
const NOTIF_TAG = 'lich-lam-viec';
 
self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
 
function _badge(n) {
  // iOS Safari PWA: setAppBadge trên self (ServiceWorkerGlobalScope)
  if ('setAppBadge' in self) {
    if (n > 0) self.setAppBadge(n).catch(function(){});
    else        self.clearAppBadge().catch(function(){});
    return;
  }
  // Android Chrome SW: setAppBadge trên navigator
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
