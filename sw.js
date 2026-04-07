// ════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Nhận push notification kể cả khi app đóng
// Dùng Firebase REST SSE (không cần Cloud Function)
// ════════════════════════════════════════════════

const SW_VERSION = 'v4';
const FB_DB_URL  = 'https://lichxattbong-default-rtdb.firebaseio.com';
const VIEWER_UID = 'jSgnpibQwNNZFMB8T5ATA5Eb2fy2';
const NOTIF_TAG  = 'lich-lam-viec';
const APP_URL    = 'https://lichlamviec.com.vn/';

// ── Xử lý FCM push (khi có Cloud Function gửi) ──────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title  = data.notification?.title  || '📅 Lịch làm việc số';
  const body   = data.notification?.body   || data.data?.msg || 'Có lịch mới được cập nhật';
  const count  = parseInt(data.data?.count || 1);

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body,
      icon : '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag  : NOTIF_TAG,
      renotify: true,
      data : { url: APP_URL }
    }),
    // Đặt badge số trên icon app
    ('setAppBadge' in self.navigator)
      ? self.navigator.setAppBadge(count).catch(()=>{})
      : Promise.resolve()
  ]));
});

// ── Click vào notification → mở app ─────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Nếu đã có tab app → focus
      for (const c of list) {
        if (c.url.includes('lichlamviec.com.vn') && 'focus' in c) return c.focus();
      }
      // Không có → mở tab mới
      if (clients.openWindow) return clients.openWindow(APP_URL);
    })
  );
});

// ── Nhận message từ trang (SET_BADGE) ───────────────────────────────────────
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SET_BADGE') {
    const count = event.data.count || 0;
    if ('setAppBadge' in self.navigator) {
      count > 0
        ? self.navigator.setAppBadge(count).catch(()=>{})
        : self.navigator.clearAppBadge().catch(()=>{});
    }
  }

  // Trang gửi token + UID để SW biết cần theo dõi node nào
  if (event.data.type === 'INIT_WATCH') {
    const { uid, lastCount } = event.data;
    _watchUid    = uid || VIEWER_UID;
    _lastCount   = lastCount || 0;
    _startPolling();
  }

  if (event.data.type === 'STOP_WATCH') {
    _stopPolling();
  }
});

// ── Polling Firebase REST khi app đóng/background ───────────────────────────
// Dùng polling nhẹ (mỗi 30s) thay vì SSE để tránh bị trình duyệt kill
let _pollTimer = null;
let _watchUid  = VIEWER_UID;
let _lastCount = 0;
let _lastTs    = 0;

function _startPolling() {
  _stopPolling();
  _poll(); // chạy ngay lần đầu
  _pollTimer = setInterval(_poll, 30000);
}

function _stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

async function _poll() {
  // Chỉ chạy khi không có client nào đang active (app đóng / background)
  const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  const appOpen = list.some(c => c.url.includes('lichlamviec.com.vn') && c.visibilityState === 'visible');
  if (appOpen) return; // app đang mở → bỏ qua, để trang tự xử lý

  try {
    const url = `${FB_DB_URL}/donvi/${_watchUid}/events.json?shallow=true`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();

    // Đếm số events có isNew > 0
    // shallow=true chỉ trả về keys → cần fetch full để đếm isNew
    // Dùng orderBy + filter qua REST query
    const newRes = await fetch(
      `${FB_DB_URL}/donvi/${_watchUid}/events.json?orderBy="isNew"&startAt=1`,
      { cache: 'no-store' }
    );
    if (!newRes.ok) return;
    const newData = await newRes.json();
    const newCount = newData ? Object.keys(newData).length : 0;

    if (newCount > 0 && newCount !== _lastCount) {
      _lastCount = newCount;
      await self.registration.showNotification('📅 Lịch làm việc số', {
        body   : `Có ${newCount} lịch mới được cập nhật`,
        icon   : '/icons/icon-192.png',
        badge  : '/icons/icon-72.png',
        tag    : NOTIF_TAG,
        renotify: true,
        data   : { url: APP_URL }
      });
      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(newCount).catch(()=>{});
      }
    }
  } catch(e) {}
}

// ── Install / Activate ───────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
