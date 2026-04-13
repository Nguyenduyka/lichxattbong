// ══════════════════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Chức năng: serve manifest, SET_BADGE, click notification mở app
// ══════════════════════════════════════════════════════════════

const APP_URL   = 'https://lichlamviec.com.vn/';
const NOTIF_TAG = 'lich-lam-viec';

// ── Manifest JSON ──────────────────────────────────────────────
var MANIFEST_JSON = JSON.stringify({
  name: 'Lịch Làm Việc Số',
  short_name: 'LLV',
  description: 'Hệ thống quản lý lịch làm việc số UBND Xã Tây Trà Bồng',
  start_url: 'https://lichlamviec.com.vn/',
  display: 'standalone',
  background_color: '#f5f1ec',
  theme_color: '#c0392b',
  orientation: 'any',
  icons: [
    { src: 'data:image/png;base64,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',
      sizes: '192x192', type: 'image/png', purpose: 'any maskable' }
  ]
});

// ── Install / Activate ────────────────────────────────────────
self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

// ── Serve /manifest.webmanifest ───────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(new Response(MANIFEST_JSON, {
      status: 200,
      headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache' }
    }));
  }
});

// ── Message từ trang → set/clear badge icon ───────────────────
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SET_BADGE') {
    var n = parseInt(event.data.count) || 0;
    // iOS PWA: self.setAppBadge hoạt động trong SW context
    if ('setAppBadge' in self) {
      if (n > 0) self.setAppBadge(n).catch(function(){});
      else        self.clearAppBadge().catch(function(){});
    }
    // Android: báo tab foreground tự gọi navigator.setAppBadge
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        list.forEach(function(c) {
          try { c.postMessage({ type: 'DO_BADGE', count: n }); } catch(e) {}
        });
      });
  }
});

// ── Click notification → xóa badge + focus/mở app ────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Xóa badge khi user bấm notification
  if ('clearAppBadge' in self) self.clearAppBadge().catch(function(){});
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        list.forEach(function(c){
          try { c.postMessage({ type: 'NOTIF_CLICKED' }); } catch(e) {}
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
