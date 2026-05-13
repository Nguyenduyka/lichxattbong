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
  // Credit
  var credit='✍️ <strong>'+ORG_CONFIG.nguoiPhuTrach+'</strong>, Phòng Kinh tế '+ORG_CONFIG.donVi+' &nbsp;|&nbsp; 📱 <strong>'+ORG_CONFIG.soDienThoai+'</strong>';
  ['vsCredit','adminCredit','tvGcCredit'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.innerHTML=credit;
  });
  // TV gc note
  var gcNote=document.getElementById('tvGcNote');
  if(gcNote) gcNote.innerHTML='📋 <strong>Ghi chú:</strong> Ngoài thời gian đã bố trí, các đồng chí Lãnh đạo '+ORG_CONFIG.tenCoQuan+' xử lý công việc tại cơ quan.';
  // TV wx meta
  var wxMeta=document.getElementById('tvWxMeta');
  if(wxMeta) wxMeta.textContent='📍 '+ORG_CONFIG.tenCoQuan;
});
