// Fix viewport height cho Android Chrome (address bar)
(function(){
  function setVH(){
    var vh=window.innerHeight*0.01;
    document.documentElement.style.setProperty('--vh',vh+'px');
  }
  setVH();
  window.addEventListener('resize',setVH);
  window.addEventListener('orientationchange',function(){setTimeout(setVH,200);});
})();

// Dọn ngay phần tử badge nổi kiểu cũ (#notifBadge, position:fixed đè lên góc
// phải màn hình — đúng chỗ ô thời tiết) nếu trình duyệt còn giữ bản HTML/JS
// cache cũ tạo ra nó trước khi bản vá mới kịp chạy. Chạy sớm nhất có thể,
// không phụ thuộc vào lúc nào có thông báo mới.
(function(){
  function _cleanLegacyBadge(){
    var old=document.getElementById('notifBadge');
    if(old&&old.parentNode) old.parentNode.removeChild(old);
  }
  _cleanLegacyBadge();
  document.addEventListener('DOMContentLoaded',_cleanLegacyBadge);
})();

// ── TỰ ĐỘNG PHÁT HIỆN BẢN CẬP NHẬT MỚI khi tab đang mở sẵn ─────────────
// Dùng ngày sửa file THẬT (header "Last-Modified" mà GitHub tự trả về cho
// mọi file tĩnh) làm dấu vân tay phiên bản — KHÔNG cần bước build hay
// GitHub Action nào cả, hoạt động đúng với cả 2 kiểu deploy của GitHub
// Pages ("Deploy from a branch" lẫn "GitHub Actions"). Cứ định kỳ hỏi lại
// server "index.html sửa lần cuối lúc nào", nếu khác với lúc trang này được
// tải lên thì nghĩa là đã có bản mới hơn — hiện thông báo mời bấm để tải
// lại (KHÔNG tự ý reload, tránh làm mất dữ liệu người dùng đang nhập dở).
(function(){
  var _lastCheck=0;
  var _knownLastModified=null; // mốc lần đầu ghi nhận được, dùng để so sánh về sau
  function _checkForNewVersion(){
    var now=Date.now();
    if(now-_lastCheck<60000) return; // tối thiểu cách nhau 60s giữa các lần kiểm tra
    _lastCheck=now;
    fetch(location.pathname+'?_cb='+now, {cache:'no-store', method:'HEAD'})
      .then(function(r){
        var lm = r.headers.get('Last-Modified') || r.headers.get('ETag');
        if(!lm) return;
        if(_knownLastModified===null){ _knownLastModified=lm; return; } // lần đầu — chỉ ghi nhận, chưa so sánh
        if(lm!==_knownLastModified) _showUpdateNotice();
      }).catch(function(){});
  }
  function _showUpdateNotice(){
    if(document.getElementById('appUpdateOverlay')) return; // đã hiện rồi, không tạo trùng
    var ov=document.createElement('div');
    ov.id='appUpdateOverlay';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(10,6,4,.45);'
      +'display:flex;align-items:center;justify-content:center;padding:16px;'
      +'font-family:"Be Vietnam Pro",sans-serif;animation:appUpdFadeIn .2s ease';
    ov.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:340px;width:100%;'
      +'box-shadow:0 20px 50px rgba(0,0,0,.3);overflow:hidden;text-align:center;'
      +'animation:appUpdPopIn .25s cubic-bezier(.32,1,.24,1)">'
      +'<div style="padding:26px 22px 18px">'
      +'<div style="font-size:40px;line-height:1;margin-bottom:10px">🔄</div>'
      +'<div style="font-size:15px;font-weight:800;color:#1a1a1a;margin-bottom:6px">Có bản cập nhật mới</div>'
      +'<div style="font-size:12.5px;color:#666;line-height:1.5">Hệ thống vừa được cập nhật. Bấm OK để tải lại và dùng ngay bản mới nhất.</div>'
      +'</div>'
      +'<div style="border-top:1px solid #f0ede8">'
      +'<button onclick="location.reload()" '
      +'style="width:100%;padding:14px;border:none;background:#c0392b;color:#fff;font-size:14px;'
      +'font-weight:800;cursor:pointer;font-family:inherit">OK, cập nhật ngay</button>'
      +'</div></div>';
    // CHỈ có nút OK — không có lựa chọn "để sau", để tránh việc cứ mỗi vài
    // phút lại hiện lại hỏi tiếp (nag) khi người dùng bỏ qua mà không cập
    // nhật. Bấm OK là xử lý dứt điểm ngay, không hỏi lại nữa.
    document.body.appendChild(ov);
    if(!document.getElementById('appUpdStyle')){
      var st=document.createElement('style');
      st.id='appUpdStyle';
      st.textContent='@keyframes appUpdFadeIn{from{opacity:0}to{opacity:1}}'
        +'@keyframes appUpdPopIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}';
      document.head.appendChild(st);
    }
  }
  // Kiểm tra định kỳ mỗi 3 phút, và ngay khi người dùng quay lại tab (không
  // kiểm tra dồn dập nhờ chặn bằng _lastCheck ở trên).
  setInterval(_checkForNewVersion, 3*60*1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) _checkForNewVersion(); });
  window.addEventListener('focus', _checkForNewVersion);
  // Ghi nhận mốc ban đầu ngay khi trang tải xong
  _checkForNewVersion();
})();

// Áp dụng ORG_CONFIG vào title sau khi script load
document.addEventListener('DOMContentLoaded',function(){
  if(typeof ORG_CONFIG==='undefined') return;
  document.title='Lịch Làm Việc Số – '+ORG_CONFIG.tenCoQuan;
  // Header viewer
  var els={
    'orgCapVs':ORG_CONFIG.capCoQuan,
    'orgTenVs':ORG_CONFIG.tenCoQuan,
    'orgCapAdmin':ORG_CONFIG.capCoQuan,
    'orgTenAdmin':ORG_CONFIG.tenCoQuan,
    'orgCapTv':ORG_CONFIG.capCoQuan,
    'orgTenTv':ORG_CONFIG.tenCoQuan,
    'orgLogin':ORG_CONFIG.tenCoQuan,
  };
  Object.keys(els).forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.textContent=els[id];
  });
  // Credit — esc() từ js/00-utils.js (load trước)
  var _safeNg = (typeof esc === 'function') ? esc(ORG_CONFIG.nguoiPhuTrach) : ORG_CONFIG.nguoiPhuTrach;
  var _safeDv = (typeof esc === 'function') ? esc(ORG_CONFIG.donVi) : ORG_CONFIG.donVi;
  var _safeSdt= (typeof esc === 'function') ? esc(ORG_CONFIG.soDienThoai) : ORG_CONFIG.soDienThoai;
  var _safeTen= (typeof esc === 'function') ? esc(ORG_CONFIG.tenCoQuan) : ORG_CONFIG.tenCoQuan;
  var credit='✍️ <strong>'+_safeNg+'</strong>, Phòng Kinh tế '+_safeDv+' &nbsp;|&nbsp; 📱 <strong>'+_safeSdt+'</strong>';
  ['vsCredit','adminCredit','tvGcCredit'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.innerHTML=credit;
  });
  // TV gc note
  var gcNote=document.getElementById('tvGcNote');
  if(gcNote) gcNote.innerHTML='📋 <strong>Ghi chú:</strong> Ngoài thời gian đã bố trí, các đồng chí Lãnh đạo '+_safeTen+' xử lý công việc tại cơ quan.';
  // TV wx meta
  var wxMeta=document.getElementById('tvWxMeta');
  if(wxMeta) wxMeta.textContent='📍 '+ORG_CONFIG.tenCoQuan;
});
