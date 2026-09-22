
// ════════════════════════════════════════
// NOTIFICATION SYSTEM
// ════════════════════════════════════════
// (_notifCount, _notifGranted, _isMarkingRead, _openedViaNotif đã khai báo ở đầu script)
let _originalTitle=document.title;
const _BADGE_KEY='llv_badge_count'; // Badge count lưu trên thiết bị này
const _SEEN_KEY='llv_seen_new'; // Timestamps isNew đã xử lý
let _seenNewTs=new Set(JSON.parse(localStorage.getItem(_SEEN_KEY)||'[]'));
function _markSeenNew(ts){
  _seenNewTs.add(ts);
  // Chỉ giữ 100 entry gần nhất
  if(_seenNewTs.size>100){const arr=[..._seenNewTs].sort((a,b)=>b-a).slice(0,100);_seenNewTs=new Set(arr);}
  try{localStorage.setItem(_SEEN_KEY,JSON.stringify([..._seenNewTs]));}catch(e){}
}

function _getLocalBadge(){ return parseInt(localStorage.getItem(_BADGE_KEY)||'0')||0; }
function _setLocalBadge(n){
  const v=Math.max(0,parseInt(n)||0);
  if(v>0) localStorage.setItem(_BADGE_KEY,String(v));
  else localStorage.removeItem(_BADGE_KEY);
  setAppIconBadge(v);
  setUiBadge(v);
  setFaviconBadge(v);
  setTitleBadge(v);
  _notifCount=v;
}

// 1. Xin quyền Push Notification + kích hoạt badge
function requestNotifPermission(){
  if(!('Notification' in window))return;
  // Đã có quyền → set badge ngay
  if(Notification.permission==='granted'){
    _notifGranted=true;
    // Set badge ngay lập tức sau khi xác nhận permission
    if('serviceWorker' in navigator){
      navigator.serviceWorker.ready.then(function(){
        updateNewBadge();
      }).catch(function(){updateNewBadge();});
    } else { updateNewBadge(); }
    return;
  }
  if(Notification.permission==='denied') return;
  // Chưa có quyền → chờ user tap lần đầu rồi mới hỏi
  // (mobile browser yêu cầu user gesture trước khi requestPermission)
  var _asked=false;
  function _ask(){
    if(_asked) return; _asked=true;
    document.removeEventListener('touchstart',_ask,true);
    document.removeEventListener('click',_ask,true);
    Notification.requestPermission().then(function(p){
      _notifGranted=(p==='granted');
      if(_notifGranted){
        if('serviceWorker' in navigator){
          navigator.serviceWorker.ready.then(function(){setTimeout(()=>updateNewBadge(),500);});
        } else { setTimeout(()=>updateNewBadge(),500); }
      }
    });
  }
  document.addEventListener('touchstart',_ask,{once:true,passive:true,capture:true});
  document.addEventListener('click',_ask,{once:true,capture:true});
}

// 2. Favicon badge đỏ
function setFaviconBadge(count){
  const favicon=document.getElementById('dynamicFavicon');
  if(!favicon)return;
  const canvas=document.createElement('canvas');
  canvas.width=32;canvas.height=32;
  const ctx=canvas.getContext('2d');
  const img=new Image();
  img.crossOrigin='anonymous';
  img.onload=function(){
    ctx.drawImage(img,0,0,32,32);
    if(count>0){
      // Vẽ badge đỏ
      ctx.beginPath();
      ctx.arc(24,8,9,0,2*Math.PI);
      ctx.fillStyle='#c0392b';
      ctx.fill();
      ctx.strokeStyle='#fff';
      ctx.lineWidth=1.5;
      ctx.stroke();
      // Số
      ctx.fillStyle='#fff';
      ctx.font='bold 11px Arial';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(count>9?'9+':String(count),24,8);
    }
    favicon.href=canvas.toDataURL('image/png');
  };
  img.onerror=function(){
    // Fallback nếu không load được icon
    ctx.fillStyle='#c0392b';
    ctx.beginPath();ctx.arc(16,16,16,0,2*Math.PI);ctx.fill();
    if(count>0){
      ctx.fillStyle='#fff';ctx.font='bold 16px Arial';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(count>9?'9+':String(count),16,16);
    }
    favicon.href=canvas.toDataURL('image/png');
  };
  img.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABo0lEQVR42u2XvUvDUBTFz4upUhsKtRZaKPaDgtBJB6miIEW6irgJiv+AuDq5Ozm4CQ5CxdWCoFg/oIWCqUjpLjp0KbjVJJVaEoemYpLXopImDjlb7n1553ffDTc8Aoqe1zMKBqD4yTXRx4gVxv1AGKvN9V6M1eZ6CAY2i9hR/XfZfgIOgANABZg4OEUsmwc3v4Sf5kO7+4hl8/CtbmjWjsQnEcvmET2+AMN5jQCy0DClEqF0CwDwzKU1cU59blYfoPeShYZ5LRD5ApR2G65gGMPRhDplCDypRRXwpncLzDgFWRTQrJY1VbuTUxjy+SFLIqQKb6he8w2YAfHVhtl0p3oVRCwXoXy0QPNiaVR/lVS5hywJYMfG4U5OwzOzoAGj7c/SNlLkzu9BeW9SX+qXF0p38GaW4d/cAjPKof1ah/RYAhTFmjkgFC4BAK5QGADwVrzqaQ4A5GklZchGjs7B+gOGxfW9HYh8oX++XETk8AxsIAgAqG2voVV7+R2AM4odAAfAUoBEjid2mSdyPPkfLbDjFLqejD5gpbnhdtzVoMYzrchPcgWxsIQ2mzAAAAAASUVORK5CYII=';
}

// 3. Title badge
function setTitleBadge(count){
  if(count>0){
    document.title='('+count+') '+_originalTitle;
  } else {
    document.title=_originalTitle;
  }
}

// 4. Badge đỏ trong giao diện
// TRƯỚC ĐÂY: tạo 1 chấm đỏ nổi cố định (position:fixed top:12px;right:12px)
// đè ngay lên góc phải màn hình — đúng chỗ ô thời tiết trong header, gây rối
// giao diện. Giờ đã có nút chuông riêng (#hdrNotifBell) nằm cạnh ô thời tiết
// với badge số gắn liền vào chuông, nên bỏ hẳn badge nổi kiểu cũ này.
function setUiBadge(count){
  // Dọn phần tử cũ nếu còn sót lại từ bản trước (cache/Service Worker cũ)
  const old=document.getElementById('notifBadge');
  if(old && old.parentNode) old.parentNode.removeChild(old);
}

// 5. Push notification
function sendPushNotif(msg){
  if(!_notifGranted||Notification.permission!=='granted')return;
  var _title='📅 Lịch làm việc số cập nhật';
  var _body=msg||'Có lịch mới được thêm vào tuần này';
  var _isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  var _opts={body:_body,badge:'icons/icon-72.png',tag:'lich-update',renotify:true,
    icon:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAIeklEQVR42u2dy28VZRiH35lz2tNzKSA0ooQQQSxRpAiBtiK0jYKKJurGxIWJGmPiwo3Rnf+CazduXbrARCCh0FaglBIqCIJCKirQFhCqtOfS9lzGBSHewPabM5dv5nueJTCn0+nvmd/7zTcNlmjGpTd3OQKxZc0XvZZO52MRdjBZCovQg8kyWAQfTBbBIvhgsggWwQeTRbAIPpgsgk34IUp4nTGL4IPJbWATfjC5DWzCDyZLYBN+MFkCm/CDyRLYhB9MlsAm/GCyBDbhB5MlsAk/mCyBTfjBZAlsLhOYjM3dH0xuAZvwg8kSMAIBIxB3fzC1BWgAoAG4+4OpLUADAA3A3R9MbQEaAGgA7v5gagvQAEADABgtAOMPmDoG0QBAAwAgAAACAJiFxQIYaAAABABAAAAEAEAAAAQAQAAABABAAAAEAEAAAAQAQAAABABAAAAEAEAAAAQAQAAABABAAAAEAEAAAAQA0EKAWn6KqwBGUstP0QDACASAAAAIAGCiACyEwcQFMA0ANACXABCAMQgMHH9ERJI6nFBzz25pefdD5eOufvy2lK+PG3fei19+XZa+8Z7ycVc+eksqNyYCuTaLdr4iy976QPm4sU/el7nLl8IZgWiBaJA/ekikVlM+LvfMc4Gdo5uvNXf5ku/h/3fGWQNEkOrtSSmePekilDsDOb+G5SsktfZx5eOmjxwIfxFMC0SkBQ4fCCyYQdz9nWpVCoOHAr370wARpvjtkNQKeS1bIOtCgNJ3J6Q6fTv8BqAFooFTKUv+eL+6AJ3dYiX8e/bR9NgT0vDgCu3Gn/tlmgaI8hjkIjR2bpGkN7Zrdfev5aekdGo4lGtoqxoD+jD70wUpj19Wb4Ht/jwNspJJyXX0qIt8rE+caiXwu/+8DYAE+jN9pFf5mMymTrEzOc/PJb2xXexcs1bjz3wZZgSK+hg0eFB5T8BKNki2o8vzc3H17P/KzzL3y2ho18+u1yAIl+rvt6R07lsXYfX2aZCdyUlmU6e6wEd7fbs2C8mu7dUHQYhjkIs9gabW9ZJsWe7d4rejS6xkg9IxTrUqeZ+e/S80s7bXHwjBUxw5JrWi4p6AZXn6aoSbRimdOSnV27+HFn7lNQAS6IlTnpPC8GH10G73ZgxKtiyXptb16uOPD4tf1Yzafn8B0HcManhopaQeXefN4teyFHM0LcVTQ6GG35UASKAns6PnpTxxNZTFsJvPyB/vF6dSCTX8rgVAAj1xM1JkO3vESiRcf83UmnXS8PBK9XM9fCD08NclABJoKMDgQRHHUTom0bxY0m1b6ht/FJkb+1Vmf74YevjrFgAJ9KIyeVNK504FNgZZiYRkO3tCW/x6kT3bqxNBhOiOQZnNT4udySofl96wRRKLliiGpVb3s38v8+bpqxBIED6Fk4NSKxXV7uQNjZLduiOQ5iidHZHqH5PaZMzzd4Fog3Bx5malMPyNepgV9wTsprZZZ'};
  if(_isIOS){
    try{new Notification(_title,_opts);}catch(e){}
  } else {
    if('serviceWorker' in navigator){
      navigator.serviceWorker.ready.then(function(reg){
        // SW tự set badge khi nhận push — không cần relay từ trang
        reg.showNotification(_title,_opts).catch(function(){try{new Notification(_title,_opts);}catch(e2){}});
      }).catch(function(){try{new Notification(_title,_opts);}catch(e){}});
    } else { try{new Notification(_title,_opts);}catch(e){} }
  }
}
function sendPushNotif_UNUSED(msg){
  if(!_notifGranted||Notification.permission!=='granted')return;
  try{
    new Notification('📅 Lịch làm việc số cập nhật',{
      body:msg||'Có lịch mới được thêm vào tuần này',
      icon:'data:image/png;base64,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',
      badge:'icons/icon-72.png',
      tag:'lich-update',
      renotify:true,
    });
  }catch(e){}
}

// 6. App Badge API (icon trên màn hình điện thoại)
async function setAppIconBadge(count){
  var n=parseInt(count)||0;
  // Chỉ gọi navigator.setAppBadge — KHÔNG relay qua SW để tránh vòng lặp
  if('setAppBadge' in navigator){
    try{
      if(n>0) await navigator.setAppBadge(n);
      else await navigator.clearAppBadge();
    }catch(e){}
  }
}

// 7. Hàm gọi khi có dữ liệu mới
function triggerNotif(count){
  // Badge app icon tăng theo count để iOS hiện số trên icon
  const next=(_getLocalBadge()||0)+Math.max(1,count||1);
  _setLocalBadge(next);
  // Badge chuông + panel luôn = _npMsgLog.length (nguồn duy nhất)
  _syncAllBadges();
}

// 7b. Đồng bộ TẤT CẢ badge từ một nguồn duy nhất: _npMsgLog.length
function _syncAllBadges(){
  const n=_npMsgLog.length;
  // Dọn badge nổi kiểu cũ (#notifBadge, position:fixed góc phải màn hình) nếu
  // còn sót lại do trình duyệt/Service Worker cache bản JS cũ — đây là chấm đỏ
  // bị hiểu nhầm là badge của chuông nhưng lại nằm ở góc ô thời tiết.
  try{const _old=document.getElementById('notifBadge'); if(_old&&_old.parentNode) _old.parentNode.removeChild(_old);}catch(e){}
  // Badge nav chuông + số trong panel header
  if(typeof _updateMobNotifBadge==='function') _updateMobNotifBadge(n);
  // Hiệu ứng rung+nhấp nháy trên chuông — luôn đồng bộ CÙNG LÚC với badge để
  // không bao giờ lệch pha giữa "số hiện" và "chuông có rung hay không".
  _updateBellAlertState(n);
  // App icon badge = n (iOS home screen, PWA)
  setAppIconBadge(n);
  // Favicon + title badge cũng dùng n
  setFaviconBadge(n);
  setTitleBadge(n);
  _notifCount=n;
  // Lưu localStorage để khôi phục khi reload
  if(n>0) localStorage.setItem(_BADGE_KEY,String(n));
  else localStorage.removeItem(_BADGE_KEY);
}

// 8. Xóa thông báo khi người dùng click
function clearNotif(){
  _setLocalBadge(0);
  if(fbDb) fbDb.ref('push_trigger/badge_count').set(0).catch(()=>{});
  if(typeof _updateMobNotifBadge==='function') _updateMobNotifBadge(0);
}

// ── NOTIF PANEL ──────────────────────────────
// Log thông báo: lưu cả msg text từ push_trigger + event mới
// ── NOTIF PANEL ──────────────────────────────
// Log lưu localStorage — còn đến khi người dùng bấm Đánh dấu đã đọc
let _npMsgLog = [];
let _npScrollDate = null; // ngày cần scroll đến từ thông báo
let _npScrollEvId = null; // id lịch cần highlight

// ── Trạng thái hiệu ứng "rung + nhấp nháy" của chuông ──────────────────
// _isNotifPanelOpen: panel danh sách thông báo có đang mở hay không — mở
//   panel là dấu hiệu người dùng "đã để ý" nên phải DỪNG hiệu ứng ngay,
//   dù số lượng chưa đọc (badge) vẫn giữ nguyên cho đến khi thật sự đọc/
//   đánh dấu đã đọc.
// _bellSeenCount: mốc số lượng chưa đọc tại lần gần nhất người dùng đã mở
//   panel để xem — dùng để chỉ BẬT LẠI hiệu ứng khi có thông báo MỚI PHÁT
//   SINH THÊM (n tăng vượt mốc này), không tự bật lại chỉ vì đóng rồi mở
//   panel qua loa mà không có gì mới.
let _isNotifPanelOpen = false;
let _bellSeenCount = 0;

// Bật/tắt hiệu ứng rung+nhấp nháy trên chuông (cả desktop lẫn mobile)
function _setBellAlert(active){
  const b1=document.getElementById('hdrNotifBell');
  const b2=document.getElementById('mobNotifBtn');
  [b1,b2].forEach(function(b){ if(b) b.classList.toggle('notif-alert', !!active); });
}

// Quyết định bật/tắt hiệu ứng dựa trên số lượng chưa đọc hiện tại (n) và
// trạng thái panel — gọi mỗi khi badge được đồng bộ (_syncAllBadges).
function _updateBellAlertState(n){
  if(_isNotifPanelOpen){
    // Đang mở panel → luôn tắt hiệu ứng, đồng thời chốt mốc "đã xem" tại n
    // hiện tại để không tự bật lại khi đóng panel nếu không có gì mới thêm.
    _setBellAlert(false);
    _bellSeenCount = n;
    return;
  }
  if(n<=0){
    _setBellAlert(false);
    _bellSeenCount = 0;
    return;
  }
  if(n>_bellSeenCount){
    // Có thông báo MỚI phát sinh (n tăng so với mốc đã xem) → bật hiệu ứng,
    // kể cả khi hệ thống vừa tải trang lần đầu và đã có sẵn thông báo chưa
    // xem từ trước (_bellSeenCount khởi tạo = 0 nên n>0 sẽ bật ngay).
    _setBellAlert(true);
  }
  // n>0 nhưng không tăng thêm so với mốc đã xem → giữ nguyên trạng thái
  // hiện tại (không tự bật lại nếu người dùng đã dừng nó trước đó).
}
(function(){
  try{_npMsgLog=JSON.parse(localStorage.getItem('llv_np_log')||'[]');}catch(e){_npMsgLog=[];}
  // Dọn các mục trùng đã lưu từ trước (cùng evId + cùng loại thông báo). Log
  // sắp mới-nhất-trước (do unshift) nên giữ mục gặp đầu tiên và bổ sung dữ liệu
  // thiếu (date/icon) từ các bản trùng. Giúp 2 thẻ đang bị trùng sẵn tự gộp lại
  // sau khi cập nhật mà người dùng không phải bấm "Đánh dấu đã đọc tất cả".
  try{
    const _seen=Object.create(null), _out=[];
    for(const it of _npMsgLog){
      const _key=(it && it.evId!=null) ? (it.evId+'|'+_getMsgMeta(it.msg).label) : null;
      if(_key && _seen[_key]){
        const _k=_seen[_key];
        if(!_k.date && it.date) _k.date=it.date;
        if(!_k.catIcon && it.catIcon) _k.catIcon=it.catIcon;
        if(!_k.catColor && it.catColor) _k.catColor=it.catColor;
        continue; // bỏ bản trùng
      }
      if(_key) _seen[_key]=it;
      _out.push(it);
    }
    if(_out.length!==_npMsgLog.length){
      _npMsgLog=_out;
      try{localStorage.setItem('llv_np_log',JSON.stringify(_npMsgLog));}catch(e){}
    }
  }catch(e){}
})();
// Cập nhật badge ngay sau khi DOM sẵn sàng
function _initBadge(){
  if(typeof _syncAllBadges==='function') _syncAllBadges();
  else if(typeof _updateMobNotifBadge==='function') _updateMobNotifBadge(_npMsgLog.length);
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',_initBadge);}
else{setTimeout(_initBadge,0);}

function _addNotifMsg(item){
  // Chống trùng: ưu tiên khớp theo ts (như cũ). Nếu không có ts trùng, khớp theo
  // evId + loại thông báo — vì cùng MỘT lịch có thể đến từ 2 nguồn khác nhau:
  //   • push_trigger (05a) lưu ts = d.ts (lúc bấm gửi push)
  //   • rebuild từ events.isNew (05b) lưu ts = e.isNew (lúc tạo lịch)
  // Hai mốc ts lệch nhau nên chỉ so ts sẽ bị nhân đôi; evId thì cả 2 nguồn đều
  // truyền (kiểu số, từ nid()) nên === khớp chính xác. Giữ thêm điều kiện "cùng
  // nhãn" để "Lịch mới" và "Hoãn" của cùng lịch vẫn hiện riêng.
  let existing=_npMsgLog.find(x=>x.ts===item.ts);
  if(!existing && item.evId!=null){
    const _lbl=_getMsgMeta(item.msg).label;
    existing=_npMsgLog.find(x=>x.evId===item.evId && _getMsgMeta(x.msg).label===_lbl);
  }
  if(existing){
    // Cập nhật date/evId/icon nếu trước đó chưa có (push từ Firebase thiếu date)
    if(!existing.date && item.date) existing.date=item.date;
    if((existing.evId==null) && item.evId!=null) existing.evId=item.evId;
    if(!existing.catIcon && item.catIcon) existing.catIcon=item.catIcon;
    if(!existing.catColor && item.catColor) existing.catColor=item.catColor;
    try{localStorage.setItem('llv_np_log',JSON.stringify(_npMsgLog));}catch(e){}
    return;
  }
  _npMsgLog.unshift(item);
  if(_npMsgLog.length>30) _npMsgLog=_npMsgLog.slice(0,30);
  try{localStorage.setItem('llv_np_log',JSON.stringify(_npMsgLog));}catch(e){}
  if(typeof _syncAllBadges==='function') _syncAllBadges();
  else if(typeof _updateMobNotifBadge==='function') _updateMobNotifBadge(_npMsgLog.length);
}

function _getMsgMeta(msg){
  if(!msg) return {icon:'📅',color:'#1a4f7a',label:'Cập nhật'};
  if(msg.includes('Lịch mới')||msg.includes('lặp lại')) return {icon:'➕',color:'#15683a',label:'Lịch mới'};
  if(msg.includes('sửa')||msg.includes('Sửa')) return {icon:'✏️',color:'#1a4f7a',label:'Thay đổi lịch'};
  if(msg.includes('hoãn')||msg.includes('Hoãn')) return {icon:'⏸',color:'#c87c0a',label:'Hoãn lịch'};
  if(msg.includes('chuyển')||msg.includes('Chuyển')) return {icon:'🔄',color:'#5b2d8e',label:'Thay đổi thời gian'};
  if(msg.includes('xoá')||msg.includes('Xoá')) return {icon:'🗑',color:'#c0392b',label:'Xóa lịch'};
  return {icon:'📅',color:'#1a4f7a',label:'Cập nhật'};
}

// Rút gọn msg còn ~2 dòng (~80 ký tự)
function _truncMsg(msg){
  if(!msg) return '';
  if(msg.length<=80) return msg;
  return msg.slice(0,78)+'…';
}

// ── DEEP-LINK từ push (mở app rồi nhảy đến đúng sự kiện) ──────────────
// _pendingDeepLink lưu {date, evId} khi push được bấm lúc app chưa có dữ liệu;
// _processDeepLink() sẽ điều hướng ngay khi events đã load xong.
window._pendingDeepLink = window._pendingDeepLink || null;
function _processDeepLink(){
  try{
    if(!_pendingDeepLink) return;
    if(typeof events==='undefined' || !events || !events.length) return; // chờ dữ liệu
    var d = _pendingDeepLink.date, ev = _pendingDeepLink.evId;
    _pendingDeepLink = null;
    if(d){
      _scrollToDate(d, ev ? parseInt(ev) : null);
      // Dọn query để refresh không lặp lại deep-link
      try{ history.replaceState(null,'', location.pathname + location.hash); }catch(_){}
    }
  }catch(e){ logWarn('[DeepLink] error:', e.message||e); }
}
window._processDeepLink = _processDeepLink;

// Scroll đến đúng card ngày trên mobile viewer
async function _scrollToDate(dateStr, evId){
  closeNotifPanel();
  if(!dateStr||!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  const target=new Date(dateStr+'T00:00:00');
  if(isNaN(target.getTime())) return;
  const todayWk=wkStart(0);
  // QUAN TRỌNG: phải tính hiệu số tuần dựa trên NGÀY THỨ HAI của tuần chứa
  // target, KHÔNG dùng trực tiếp ngày target. Nếu dùng ngày target thô, các
  // sự kiện rơi vào Thứ 5/6/7/CN của tuần hiện tại (lệch 4-6 ngày so với Thứ
  // Hai) sẽ bị Math.round() làm tròn LÊN thành tuần kế tiếp một cách sai lệch
  // → bấm thông báo không nhảy đến đúng tuần/vị trí (đặc biệt rõ khi đang
  // xem các tuần sau tuần hiện tại, vì lệch tuần cộng dồn sai luôn theo).
  const targetWk=new Date(target);
  const _dow=targetWk.getDay(); // 0=CN..6=T7
  targetWk.setDate(targetWk.getDate()-(_dow===0?6:_dow-1));
  targetWk.setHours(0,0,0,0);
  const diffWk=Math.round((targetWk-todayWk)/(7*24*3600*1000));

  // Nếu khác tuần → chuyển tuần và chờ render xong
  if(diffWk!==wkOff){
    // QUAN TRỌNG: phải GÁN (không phải xoá) 2 biến này trước khi render lại.
    // renderMobileCards() kiểm tra "if(!_npScrollDate)" để quyết định có tự
    // động cuộn về card "hôm nay" hay không sau khi vẽ lại tuần mới. Trước
    // đây code lại xoá về null ngay tại đây, khiến điều kiện luôn đúng →
    // MỌI lần đổi tuần từ thông báo đều bị tự cuộn giật về "hôm nay" trước,
    // xung đột với việc cuộn đến đúng lịch của thông báo ngay sau đó (nhất
    // là trên mobile khi đang không ở tuần hiện tại).
    _npScrollDate=dateStr; _npScrollEvId=evId;
    wkOff=diffWk;
    // FIX: renderAllNoFetch() không tự fetch thời tiết — nếu wxData chưa có
    // (hoặc tuần đích ngoài phạm vi cache), bảng thời tiết sẽ hiện "Không có
    // dự báo". Đảm bảo có dữ liệu thời tiết trước khi vẽ lại tuần mới.
    if(!wxData && typeof fetchWx==='function'){
      try{ wxData = await fetchWx(); wxFetchedAt = Date.now(); }catch(e){}
    }
    await renderAllNoFetch();
    // Chờ thêm để đảm bảo DOM đã paint xong sau khi đổi tuần
    await new Promise(r=>setTimeout(r,120));
  }

  // Chờ 2 frame để DOM chắc chắn đã paint xong
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  // Mobile dùng .vs-card-list (id="vsCards"), desktop dùng .vs-tbl-inner
  const isMobile=window.innerWidth<=600;
  if(isMobile){
    var cards=document.getElementById('vsCards');
    if(!cards) return;
    // Tìm đúng card theo data-date (không dùng text search)
    var card=cards.querySelector('[data-date="'+dateStr+'"]');
    if(!card){
      // Phòng trường hợp DOM chưa kịp dựng xong sau khi đổi tuần (thiết bị
      // yếu/chậm) → thử lại thêm 1 lần sau 200ms thay vì bỏ cuộc ngay lập tức.
      await new Promise(r=>setTimeout(r,200));
      card=cards.querySelector('[data-date="'+dateStr+'"]');
      if(!card) return;
    }

    if(evId){
      // Có evId → scroll thẳng đến đúng dòng lịch, không scroll card trước
      var evEl=card.querySelector('[data-evid="'+evId+'"]');
      if(evEl){
        // Dùng instant scroll để tính toán chính xác, tránh bị override bởi smooth
        var evTop=evEl.getBoundingClientRect().top + cards.scrollTop - cards.getBoundingClientRect().top;
        var offset=80; // bù cho header cố định
        cards.scrollTo({top: Math.max(0, evTop - offset), behavior:'smooth'});
        // Highlight sau khi scroll xong
        await new Promise(r=>setTimeout(r,400));
        evEl.classList.add('hl');
        setTimeout(function(){evEl.classList.remove('hl');},5000);
      } else {
        // evId không tìm thấy trong DOM → fallback scroll đến card ngày
        var cardTop=card.getBoundingClientRect().top + cards.scrollTop - cards.getBoundingClientRect().top;
        cards.scrollTo({top: Math.max(0, cardTop - 12), behavior:'smooth'});
      }
    } else {
      // Không có evId → scroll đến đầu card ngày
      var cardTop2=card.getBoundingClientRect().top + cards.scrollTop - cards.getBoundingClientRect().top;
      cards.scrollTo({top: Math.max(0, cardTop2 - 12), behavior:'smooth'});
      // Highlight card ngày
      card.style.transition='box-shadow .3s,outline .3s';
      card.style.outline='2.5px solid #c0392b';
      card.style.boxShadow='0 0 0 5px rgba(192,57,43,.2)';
      setTimeout(function(){card.style.outline='';card.style.boxShadow='';},5000);
    }
    // Đã cuộn xong theo thông báo → xoá cờ để các lần đổi tuần thông thường
    // (bấm Trước/Tiếp) sau đó vẫn tự cuộn về "hôm nay" như bình thường.
    _npScrollDate=null; _npScrollEvId=null;
  } else {
    // Desktop: scroll trong vs-tbl-inner
    var tblInner=document.getElementById('vsTblInner');
    if(!tblInner) return;
    // Tìm row có data-date tương ứng
    var row=tblInner.querySelector('[data-date="'+dateStr+'"]');
    if(row){
      var rowTop=row.getBoundingClientRect().top;
      var innerTop=tblInner.getBoundingClientRect().top;
      tblInner.scrollTop=tblInner.scrollTop+(rowTop-innerTop)-60;
      if(evId){
        var evEl2=tblInner.querySelector('[data-evid="'+evId+'"]');
        if(evEl2){
          var eTop=evEl2.getBoundingClientRect().top;
          tblInner.scrollTop=tblInner.scrollTop+(eTop-innerTop)-60;
          evEl2.classList.add('hl');
          setTimeout(function(){evEl2.classList.remove('hl');},5000);
        } else {
          // Không tìm thấy đúng dòng lịch (VD: id đổi) → vẫn nhấp nháy cả ngày để user thấy vị trí
          row.classList.add('hl');
          setTimeout(function(){row.classList.remove('hl');},5000);
        }
      } else {
        // Không có evId cụ thể → nhấp nháy nguyên ngày để dễ nhận biết
        row.classList.add('hl');
        setTimeout(function(){row.classList.remove('hl');},5000);
      }
    }
  }
}

function openNotifPanel(){
  // Mở panel = người dùng đã để ý → dừng hiệu ứng rung/nhấp nháy NGAY LẬP
  // TỨC (badge số lượng vẫn giữ nguyên, chỉ hiệu ứng thu hút chú ý dừng lại).
  _isNotifPanelOpen = true;
  _setBellAlert(false);
  // Chặn scroll lan ra ngoài — gắn một lần
  const npList = document.getElementById('npList');
  if(npList && !npList._scrollLocked){
    npList._scrollLocked = true;
    npList.addEventListener('touchstart', function(e){ this._startY = e.touches[0].clientY; }, {passive:true});
    npList.addEventListener('touchmove', function(e){
      const dy = e.touches[0].clientY - this._startY;
      const atTop = this.scrollTop === 0;
      const atBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 1;
      if((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
    }, {passive:false});
  }
  // Chỉ rebuild từ events.isNew nếu chưa "đánh dấu đã đọc"
  const _clearedAt = parseInt(localStorage.getItem('llv_np_cleared')||'0');
  // Rebuild từ events.isNew mới hơn cleared VÀ chưa bị user dismiss (_seenNewTs)
  events.filter(e=>e.isNew&&e.isNew>0&&e.isNew>_clearedAt&&!_seenNewTs.has(e.isNew)).forEach(e=>{
    const cat=CAT[e.cat]||{icon:'📌',label:'Khác',color:'#5b2d8e'};
    const d=new Date(e.date+'T00:00:00');
    const dStr=d.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
    const sesLabel={sang:'Sáng',chieu:'Chiều',toi:'Tối'}[e.ses]||'';
    const hoan=isHoan(e);
    const msg=(hoan?'Hoãn: ':'Lịch mới: ')+e.title
      +' — '+dStr+(sesLabel?' ('+sesLabel+')':'')+(e.time?' 🕐 '+e.time:'');
    _addNotifMsg({msg,ts:e.isNew,date:e.date,evId:e.id,catIcon:cat.icon,catColor:cat.color});
  });
  // Cập nhật badge ngay khi mở panel
  if(typeof _syncAllBadges==='function') _syncAllBadges();
  _renderNotifPanel();
  if(typeof _syncAllBadges==='function') _syncAllBadges();

  const panel=document.getElementById('notifPanel');
  const overlay=document.getElementById('npOverlay');
  const bell=document.getElementById('hdrNotifBell');
  const isDesktop=window.innerWidth>600 && bell && bell.offsetParent!==null; // offsetParent null nếu bell đang display:none (đã ẩn ở màn hình hẹp/ngang)

  if(isDesktop){
    // Panel xổ xuống ngay dưới chuông. Ưu tiên canh MÉP TRÁI panel trùng mép
    // trái chuông (chuông nằm bên trái ô thời tiết nên mở về phía phải là
    // thuận mắt nhất), sau đó kẹp lại để panel không tràn khỏi màn hình.
    // Mũi tên được đặt đúng tâm chuông qua biến CSS --np-caret.
    panel.style.visibility='hidden';
    panel.style.right='auto';
    panel.classList.add('open');
    requestAnimationFrame(function(){
      const r=bell.getBoundingClientRect();
      const pw=panel.offsetWidth||380;
      const margin=10;
      let left=r.left;                       // canh mép trái panel với mép trái chuông
      left=Math.max(margin, Math.min(left, window.innerWidth-pw-margin));
      panel.style.top=(r.bottom+10)+'px';
      panel.style.left=left+'px';
      // Tâm chuông tính theo hệ toạ độ của panel, kẹp trong thân panel
      const caret=Math.max(16, Math.min(pw-16, (r.left+r.width/2)-left));
      panel.style.setProperty('--np-caret', caret+'px');
      panel.style.visibility='visible';
      bell.classList.add('open');
    });
  } else {
    panel.classList.add('open');
  }
  overlay.classList.add('open');
}

function closeNotifPanel(){
  document.getElementById('notifPanel').classList.remove('open');
  document.getElementById('npOverlay').classList.remove('open');
  const bell=document.getElementById('hdrNotifBell');
  if(bell) bell.classList.remove('open');
  // Đóng panel: người dùng đã "xem qua" danh sách tại thời điểm này. Mốc
  // _bellSeenCount đã được chốt sẵn trong _updateBellAlertState() lúc mở
  // panel, nên chỉ cần tắt cờ — nếu không có thông báo mới nào phát sinh
  // thêm trong lúc xem, hiệu ứng sẽ KHÔNG tự bật lại sau khi đóng.
  _isNotifPanelOpen = false;
}

function clearNotifPanel(){
  clearNotif();
  // Mark tất cả ts hiện tại là đã xem → không rebuild lại từ events.isNew
  _npMsgLog.forEach(x=>{if(x.ts) _markSeenNew(x.ts);});
  // Mark tất cả events.isNew hiện tại là đã xem
  events.forEach(e=>{if(e.isNew&&e.isNew>0) _markSeenNew(e.isNew);});
  _npMsgLog=[];
  localStorage.removeItem('llv_np_log');
  localStorage.setItem('llv_np_cleared', String(Date.now()));
  if(typeof _syncAllBadges==='function') _syncAllBadges();
  _renderNotifPanel();
}

function _renderNotifPanel(){
  const list=document.getElementById('npList');
  const cnt=document.getElementById('npCnt');
  const clrBtn=document.getElementById('npClrBtn');
  if(!list) return;
  const _n=_npMsgLog.length;
  if(typeof _syncAllBadges==='function') _syncAllBadges();
  else _updateMobNotifBadge(_n);
  if(_n===0){
    list.innerHTML='<div class="np-empty">Không có thông báo mới</div>';
    cnt.style.display='none';
    clrBtn.style.display='none';
  } else {
    cnt.textContent=_n>9?'9+':String(_n);
    cnt.style.display='inline-flex';
    clrBtn.style.display='block';
    list.innerHTML=_npMsgLog.map((it,idx)=>{
      const meta=_getMsgMeta(it.msg);
      const icon=it.catIcon||meta.icon;
      const color=it.catColor||meta.color;
      const t=new Date(it.ts);
      const tStr=t.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})
        +' · '+t.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});
      const short=_truncMsg(it.msg);
      const dateAttr=it.date?`data-date="${escAttr(it.date)}"`:'';
      const evidAttr=it.evId?`data-evid="${escAttr(it.evId)}"`:'';
      // Escape nội dung notif (it.msg đến từ admin/Firebase → tiềm năng XSS)
      const safeShort = esc(short.replace(/^[^:]+:\s*/,''));
      const safeLabel = esc(meta.label);
      return `<div class="np-item" ${dateAttr} ${evidAttr} data-ts="${it.ts}" onclick="_npItemClick(this)">
        <div class="np-dot" style="background:${color}18;border:1.5px solid ${color}40;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${icon}</div>
        <div class="np-body">
          <div style="font-size:10px;font-weight:700;color:${color};margin-bottom:3px;letter-spacing:.3px">${safeLabel}</div>
          <div class="np-ev-title" style="-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">${safeShort}</div>
          <div class="np-ev-meta" style="margin-top:4px"><span style="color:var(--muted);font-size:10px">🕐 ${tStr}</span></div>
        </div>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style="flex-shrink:0;margin-top:12px;opacity:.3"><path d="M1 1l5 5-5 5" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>`;
    }).join('');
  }
  if(typeof _syncAllBadges==='function') _syncAllBadges();
  else _updateMobNotifBadge(_npMsgLog.length);
}

function _npItemClick(el){
  const date=el.getAttribute('data-date');
  const evId=el.getAttribute('data-evid');
  const ts=parseInt(el.getAttribute('data-ts')||'0');
  const npItem=_npMsgLog.find(x=>x.ts===ts)||{msg:el.querySelector('.np-ev-title')?el.querySelector('.np-ev-title').textContent:'',date,evId:evId?parseInt(evId):null};

  // Xóa khỏi log NGAY (trước khi mở modal/scroll) để badge luôn chính xác
  if(ts){
    // Đánh dấu ts này đã được user xem/xóa → openNotifPanel sẽ không rebuild lại
    _markSeenNew(ts);
    _npMsgLog=_npMsgLog.filter(x=>x.ts!==ts);
    if(_npMsgLog.length===0){
      localStorage.setItem('llv_np_cleared',String(Date.now()));
      localStorage.removeItem('llv_np_log');
    } else {
      try{localStorage.setItem('llv_np_log',JSON.stringify(_npMsgLog));}catch(e){}
    }
  }

  // Ẩn item + cập nhật badge ngay lập tức
  el.style.transition='opacity .2s,max-height .25s';
  el.style.opacity='0';
  setTimeout(function(){
    if(el.parentNode) el.remove();
    if(_npMsgLog.length===0) _renderNotifPanel();
    if(typeof _syncAllBadges==='function') _syncAllBadges();
    else _updateMobNotifBadge(_npMsgLog.length);
  },220);

  // Trên DESKTOP: mở modal xem chi tiết lịch (kèm tải giấy mời nếu có),
  // KHÔNG cuộn đến vị trí tuần nữa — người dùng chỉ cần xem/tải, không cần
  // rời khỏi tuần đang xem. Modal không phụ thuộc tuần/thời tiết nên luôn
  // đúng dù thông báo thuộc tuần nào.
  // Trên MOBILE: giữ nguyên hành vi cũ (cuộn đến đúng vị trí lịch trong tuần).
  const isMobile=window.innerWidth<=600;
  if(!isMobile){
    closeNotifPanel();
    _openNpDetail(date, evId?parseInt(evId):null, npItem);
    return;
  }

  // Nếu date null — thử tìm từ events theo ts hoặc title
  let mDate=date, mEvId=evId?parseInt(evId):null;
  if(!mDate){
    let matched=events.find(e=>e.isNew&&Math.abs(e.isNew-ts)<30000);
    if(!matched){
      const msg=npItem.msg||'';
      if(msg){
        const msgLow=msg.toLowerCase();
        matched=events.find(e=>{
          if(!e.title) return false;
          const t=e.title.toLowerCase();
          return msgLow.includes(t)||t.split(' ').filter(w=>w.length>3).some(w=>msgLow.includes(w));
        });
      }
    }
    if(matched){ mDate=matched.date; mEvId=matched.id; }
  }

  if(!mDate){
    // Không xác định được lịch nào cả (kể cả suy luận cũng không ra) → coi
    // như đã bị xoá, hiện form thông báo thay vì im lặng đóng panel.
    closeNotifPanel();
    _openNpDetail(null, null, npItem);
    return;
  }

  // Lịch này còn tồn tại hay đã bị xoá? Chỉ khi có evId cụ thể mới xác định
  // chắc chắn được (không có evId — thông báo dạng cũ — thì không đủ căn cứ
  // để kết luận là đã xoá, cứ cuộn đến ngày như trước).
  const stillExists = mEvId==null || events.some(e=>e.id==mEvId);
  if(!stillExists){
    // Lịch đã bị xoá → hiện form "đã bị xoá" gọn gàng (dùng chung modal với
    // desktop) thay vì cuộn đến một vị trí giờ đã trống rỗng, không có gì
    // để xem, khiến người dùng không hiểu chuyện gì đã xảy ra.
    closeNotifPanel();
    _openNpDetail(mDate, mEvId, npItem);
    return;
  }

  // Navigate đến đúng ngày/lịch (mobile)
  _scrollToDate(mDate, mEvId);
}

// ── Modal xem chi tiết lịch từ thông báo (desktop) ──────────────
function _openNpDetail(date, evId, npItem){
  const ov=document.getElementById('ovNpDetail');
  const body=document.getElementById('npdBody');
  const hdr=document.getElementById('npdHdrTitle');
  if(!ov||!body) return;

  // Tìm sự kiện thật trong events theo id (ưu tiên), rồi theo ngày+tiêu đề
  let ev=null;
  if(evId!=null) ev=events.find(e=>e.id==evId);
  if(!ev && date){
    const msg=(npItem&&npItem.msg)||'';
    const msgLow=msg.toLowerCase();
    ev=events.find(e=>e.date===date && e.title && msgLow.includes(e.title.toLowerCase()));
  }

  if(ev){
    // ── Lịch vẫn còn tồn tại → hiện đầy đủ thông tin ──
    const cat=catOf(ev);
    hdr.innerHTML='📅 Chi tiết lịch';
    const d=new Date(ev.date+'T00:00:00');
    const dStr=d.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
    const sesLabel={sang:'☀️ Sáng',chieu:'🌤 Chiều',toi:'🌙 Tối'}[ev.ses]||'';
    const hoan=isHoan(ev);
    const files=(ev.files||[]);
    const filesHtml=files.length?`
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:2px">
        ${files.map((f,fi)=>`
          <button type="button" onclick="openFile(events.find(x=>x.id==${ev.id}).files[${fi}])" style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:9px;border:1.5px solid ${fBorder(f.type)};background:${fBg(f.type)};color:${fColor(f.type)};font-size:12.5px;font-weight:700;cursor:pointer;font-family:'Be Vietnam Pro',sans-serif;text-align:left;width:100%">
            <span style="font-size:16px">${fIcon(f.type)}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name||'File đính kèm')}</span>
            <span style="font-size:10px;font-weight:800;opacity:.85">⬇ Tải về</span>
          </button>`).join('')}
      </div>`:'';
    body.innerHTML=`
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="width:38px;height:38px;border-radius:10px;background:${cat.color}18;border:1.5px solid ${cat.color}40;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${cat.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:800;color:#1a1a1a;line-height:1.35">${esc(ev.title)}${hoan?' <span class="ev-hoan-badge">⏸ Hoãn</span>':''}</div>
          <div style="font-size:11.5px;color:${cat.color};font-weight:700;margin-top:2px">${esc(cat.label)}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;padding:12px;background:#faf8f5;border-radius:10px;border:1px solid #f0ede8">
        <div style="font-size:12.5px;color:#333"><b>🗓 Ngày:</b> ${dStr}</div>
        <div style="font-size:12.5px;color:#333"><b>${sesLabel}</b>${ev.time?' · 🕐 '+esc(ev.time):''}</div>
        ${ev.location?`<div style="font-size:12.5px;color:#333">📍 ${esc(ev.location)}</div>`:''}
        ${ev.chair?`<div style="font-size:12.5px;color:#333"><b>Chủ trì:</b> ${esc(ev.chair)}</div>`:''}
        ${ev.member?`<div style="font-size:12.5px;color:#333"><b>Thành phần:</b> ${esc(ev.member)}</div>`:''}
        ${ev.prep?`<div style="font-size:12.5px;color:#333"><b>Chuẩn bị:</b> ${esc(ev.prep)}</div>`:''}
      </div>
      ${filesHtml||`<div style="font-size:11.5px;color:var(--muted);font-style:italic">Không có file đính kèm (giấy mời).</div>`}
    `;
  } else {
    // ── Lịch không còn tồn tại (đã bị xoá) → thông báo nhẹ nhàng, giữ lại
    //    thông tin đã biết từ tin nhắn thông báo để người dùng vẫn hiểu ngữ
    //    cảnh, thay vì màn hình trống khó hiểu.
    hdr.innerHTML='📅 Chi tiết lịch';
    const meta=_getMsgMeta(npItem&&npItem.msg);
    const shortMsg=esc(_truncMsg((npItem&&npItem.msg)||'').replace(/^[^:]+:\s*/,''));
    const dateLine=date?new Date(date+'T00:00:00').toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}):'';
    body.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:18px 8px">
        <div style="width:52px;height:52px;border-radius:50%;background:#fdf0ef;display:flex;align-items:center;justify-content:center;font-size:26px">🗑️</div>
        <div style="font-size:14px;font-weight:800;color:#1a1a1a">Lịch này đã bị xoá</div>
        <div style="font-size:12.5px;color:var(--muted);line-height:1.5">
          ${shortMsg?esc(shortMsg):'Nội dung lịch không còn tồn tại trong hệ thống.'}
          ${dateLine?'<br>Ngày dự kiến: '+dateLine:''}
        </div>
        <div style="font-size:11px;color:var(--muted);font-style:italic;margin-top:2px">Có thể lịch đã được xoá hoặc thay đổi bởi quản trị viên.</div>
      </div>
    `;
  }
  ov.classList.add('open');
}
function closeNpDetail(){
  const ov=document.getElementById('ovNpDetail');
  if(ov) ov.classList.remove('open');
}

function _updateMobNotifBadge(n){
  // Badge trên nút chuông mobile (nav dưới)
  const b=document.getElementById('mobNotifBadge');
  if(b){
    if(n>0){b.textContent=n>9?'9+':String(n);b.classList.add('show');}
    else b.classList.remove('show');
  }
  // Badge trên nút chuông desktop (thanh nav trên) — cùng nguồn dữ liệu duy nhất
  const bd=document.getElementById('desktopNotifBadge');
  if(bd){
    if(n>0){bd.textContent=n>9?'9+':String(n);bd.classList.add('show');}
    else bd.classList.remove('show');
  }
}

// Gửi FCM push đến tất cả thiết bị đã đăng ký token
// URL Google Apps Script để gửi push notification
// Điền URL sau khi deploy GAS: https://script.google.com/macros/s/XXXX/exec
const GAS_PUSH_URL = 'https://script.google.com/macros/s/AKfycbwg3oqfg0qjNXjVmHwwmrPwomObZlBrNjSKb5yYthpASmgUbdyLXQMi9HwpEssPCSIBkw/exec';

async function sendFCMPush(count, msg, evId, evDate) {
  log('[Push] sendFCMPush called:', {count, msg: msg?.slice(0,50), evId});
  try {
    const newCount = count || events.filter(e => e.isNew && e.isNew > 0).length;
    const pushMsg = msg || ('📅 Lịch làm việc vừa được cập nhật');
    // Ghi trigger vào Firebase — viewer listener sẽ nhận và hiện thông báo
    if (fbDb) {
      const payload = {count: newCount, ts: Date.now(), msg: pushMsg, uid: currentUID || 'viewer'};
      if(evId) payload.evId = evId;
      if(evDate) payload.evDate = evDate;
      fbDb.ref('push_trigger/latest').set(payload)
        .then(()=>log('[Push] ✅ push_trigger written to Firebase'))
        .catch(e=>logWarn('[Push] ❌ push_trigger failed:',e.message));
    } else {
      logWarn('[Push] fbDb not ready');
    }
    // Gọi GAS push để gửi đến điện thoại (kể cả khi app đóng)
    if (GAS_PUSH_URL) {
      const gasUrl = GAS_PUSH_URL + '?action=push&count=' + newCount + '&msg=' + encodeURIComponent(pushMsg)
        + (evId ? ('&ev=' + encodeURIComponent(evId)) : '')
        + (evDate ? ('&d=' + encodeURIComponent(evDate)) : '');
      log('[Push] calling GAS:', gasUrl.slice(0,100)+'...');
      fetch(gasUrl, {method:'GET', mode:'no-cors'})
        .then(()=>log('[Push] ✅ GAS request sent (no-cors, response opaque)'))
        .catch(e=>logWarn('[Push] ❌ GAS request failed:',e.message));
    } else {
      logWarn('[Push] GAS_PUSH_URL not set');
    }
  } catch(e) {
    logErr('[Push] sendFCMPush error:', e);
  }
}

// Đếm lịch NEW và cập nhật badge icon
function updateNewBadge(){
  // Tất cả badge đều dùng _npMsgLog.length làm nguồn duy nhất
  _syncAllBadges();
}

// Badge chỉ xóa khi lướt đến cuối danh sách (xem hàm _initScrollClearBadge)

const CAT={
  hop:{label:'Họp / Hội nghị',icon:'📣',color:'#c0392b'},
  ldao:{label:'Lãnh đạo CT',icon:'🏃',color:'#15683a'},
  kt:{label:'Kiểm tra',icon:'🔍',color:'#1a4f7a'},
  nd:{label:'Tiếp công dân',icon:'🤝',color:'#c87c0a'},
  kh:{label:'Khác',icon:'📌',color:'#5b2d8e'},
};
// Helper truy cập CAT an toàn — tránh crash khi e.cat undefined/không hợp lệ
const _CAT_FB={icon:'📌',label:'Khác',color:'#5b2d8e'};
const catOf=e=>CAT[e&&e.cat]||_CAT_FB;
// Helper chuẩn hoá so sánh hoan (true/1/'true' → true)
const isHoan=e=>(e.hoan===true||e.hoan===1||e.hoan==='true');
function wxInfo(code,day){
  const d={0:'Trời quang',1:'Ít mây',2:'Mây rải rác',3:'Nhiều mây',45:'Sương mù',51:'Mưa phùn nhẹ',53:'Mưa phùn',61:'Mưa nhẹ',63:'Mưa vừa',65:'Mưa to',80:'Mưa rào nhẹ',81:'Mưa rào',82:'Mưa rào to',95:'Giông bão'};
  const i={0:day?'☀️':'🌙',1:day?'🌤':'🌙',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',53:'🌦️',61:'🌧️',63:'🌧️',65:'⛈️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️'};
  return{icon:i[code]||'🌡️',desc:d[code]||'Không xác định'};
}
