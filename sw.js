
Copy

// ══════════════════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Chức năng: SET_BADGE từ trang + click notification mở app
// ══════════════════════════════════════════════════════════════
 
const APP_URL   = 'https://lichlamviec.com.vn/';
const NOTIF_TAG = 'lich-lam-viec';
 
// ── Install / Activate ────────────────────────────────────────
self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
 
// ── Message từ trang → set/clear badge icon ───────────────────
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SET_BADGE') {
    var n = parseInt(event.data.count) || 0;
    // iOS PWA: self.setAppBadge có trong SW context
    if ('setAppBadge' in self) {
      if (n > 0) self.setAppBadge(n).catch(function(){});
      else        self.clearAppBadge().catch(function(){});
    }
    // Android Chrome: navigator.setAppBadge KHÔNG có trong SW
    // → báo lại tất cả tab foreground để tự gọi navigator.setAppBadge
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        list.forEach(function(c) {
          try { c.postMessage({ type: 'DO_BADGE', count: n }); } catch(e) {}
        });
      });
  }
});
 
// ── Click notification → focus hoặc mở app ───────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        // Báo cho app biết: mở qua click notification → không xóa badge
        list.forEach(function(c){
          try{ c.postMessage({ type: 'NOTIF_CLICKED' }); } catch(e){}
        });
        for (var i = 0; i < list.length; i++) {
          if (list[i].url.indexOf('lichlamviec.com.vn') >= 0 && 'focus' in list[i]) {
            return list[i].focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(APP_URL);
      })
  );
});
