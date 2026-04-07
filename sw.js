// ════════════════════════════════════════════════
// SERVICE WORKER – Lịch Làm Việc Số
// Background notification qua Firebase REST SSE
// ════════════════════════════════════════════════
const FB_DB_URL  = 'https://lichxattbong-default-rtdb.firebaseio.com';
const VIEWER_UID = 'jSgnpibQwNNZFMB8T5ATA5Eb2fy2';
const NOTIF_TAG  = 'lich-lam-viec';
const APP_URL    = 'https://lichlamviec.com.vn/';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

// ── FCM push ─────────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  const title = (data.notification && data.notification.title) || '📅 Lịch làm việc số';
  const body  = (data.notification && data.notification.body)  || (data.data && data.data.msg) || 'Có lịch mới được cập nhật';
  const count = parseInt((data.data && data.data.count) || 1);
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body, icon:'/icons/icon-192.png', badge:'/icons/icon-72.png',
      tag:NOTIF_TAG, renotify:true, data:{url:APP_URL}
    }),
    ('setAppBadge' in self.navigator)
      ? self.navigator.setAppBadge(count).catch(function(){})
      : Promise.resolve()
  ]));
});

// ── Click notification ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list) {
      for (var i=0;i<list.length;i++) {
        if (list[i].url.indexOf('lichlamviec.com.vn')>=0 && 'focus' in list[i])
          return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(APP_URL);
    })
  );
});

// ── Message từ trang ──────────────────────────────────────────────────────────
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SET_BADGE') {
    var n = event.data.count || 0;
    if ('setAppBadge' in self.navigator)
      n > 0 ? self.navigator.setAppBadge(n).catch(function(){})
             : self.navigator.clearAppBadge().catch(function(){});
  }
  if (event.data.type === 'INIT_WATCH') {
    _watchUid = event.data.uid || VIEWER_UID;
    _lastSig  = event.data.sig || '';
    _startSSE();
  }
  if (event.data.type === 'STOP_WATCH') _stopSSE();
});

// ── Firebase SSE streaming ────────────────────────────────────────────────────
var _watchUid  = VIEWER_UID;
var _lastSig   = '';
var _sseCtrl   = null;
var _sseTimer  = null;
var _sseActive = false;

function _startSSE() {
  _stopSSE();
  _sseActive = true;
  _connectSSE();
}

function _stopSSE() {
  _sseActive = false;
  if (_sseCtrl)  { try{_sseCtrl.abort();}catch(e){} _sseCtrl = null; }
  if (_sseTimer) { clearTimeout(_sseTimer); _sseTimer = null; }
}

function _connectSSE() {
  if (!_sseActive) return;
  clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list) {
    var appVisible = list.some(function(c) {
      return c.url.indexOf('lichlamviec.com.vn') >= 0 && c.visibilityState === 'visible';
    });
    if (appVisible) {
      // App đang mở → kiểm tra lại sau 30s
      _sseTimer = setTimeout(_connectSSE, 30000);
      return;
    }
    _doSSE();
  });
}

function _doSSE() {
  if (!_sseActive) return;
  _sseCtrl = new AbortController();
  var url = FB_DB_URL + '/donvi/' + _watchUid + '/events.json';

  fetch(url, {
    headers: {'Accept':'text/event-stream'},
    signal : _sseCtrl.signal,
    cache  : 'no-store'
  }).then(function(res) {
    if (!res.ok || !res.body) throw new Error('fail');
    var reader = res.body.getReader();
    var dec    = new TextDecoder();
    var buf    = '';
    var evType = '';

    function read() {
      if (!_sseActive) return;
      reader.read().then(function(chunk) {
        if (chunk.done) { _reconnect(); return; }
        buf += dec.decode(chunk.value, {stream:true});
        var lines = buf.split('\n');
        buf = lines.pop();
        for (var i=0;i<lines.length;i++) {
          var line = lines[i];
          if (line.indexOf('event:') === 0) {
            evType = line.slice(6).trim();
          } else if (line.indexOf('data:') === 0 && evType === 'put') {
            try {
              var payload = JSON.parse(line.slice(5).trim());
              _handleData(payload.data);
            } catch(e) {}
            evType = '';
          }
        }
        read();
      }).catch(function() { _reconnect(); });
    }
    read();
  }).catch(function() { _reconnect(); });
}

function _reconnect() {
  if (!_sseActive) return;
  _sseTimer = setTimeout(_connectSSE, 5000);
}

function _handleData(data) {
  if (!data) return;
  var events   = Object.values(data);
  var newEvs   = events.filter(function(e){ return e.isNew && e.isNew > 0; });
  var newCount = newEvs.length;
  var sig      = newEvs.map(function(e){return e.id;}).sort().join(',');
  if (sig === _lastSig) return;
  _lastSig = sig;

  if (newCount === 0) {
    if ('setAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(function(){});
    return;
  }

  var title0 = (newEvs[0] && newEvs[0].title) || 'Lịch mới';
  var body   = newCount === 1
    ? '📅 ' + title0
    : '📅 ' + title0 + ' và ' + (newCount-1) + ' lịch khác';

  self.registration.showNotification('Lịch làm việc có cập nhật mới', {
    body    : body,
    icon    : '/icons/icon-192.png',
    badge   : '/icons/icon-72.png',
    tag     : NOTIF_TAG,
    renotify: true,
    data    : {url: APP_URL}
  });

  if ('setAppBadge' in self.navigator)
    self.navigator.setAppBadge(newCount).catch(function(){});
}
