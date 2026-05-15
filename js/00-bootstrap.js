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

// Theme (light/dark): áp dụng trước paint + FAB toggle + phím tắt Ctrl+Shift+D
(function(){
  function getTheme(){return document.documentElement.getAttribute('data-theme')||'light';}
  function applyMeta(t){
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',t==='dark'?'#15110d':'#c0392b');
  }
  function updateBtn(){
    var btn=document.getElementById('uThemeToggle');
    if(!btn)return;
    var dark=getTheme()==='dark';
    btn.textContent=dark?'☀️':'🌙';
    btn.setAttribute('aria-label',dark?'Chuyển sang chế độ sáng':'Chuyển sang chế độ tối');
    btn.title=dark?'Chế độ sáng (Ctrl+Shift+D)':'Chế độ tối (Ctrl+Shift+D)';
  }
  function setTheme(t){
    document.documentElement.setAttribute('data-theme',t);
    try{localStorage.setItem('ui-theme',t);}catch(e){}
    applyMeta(t);
    updateBtn();
  }
  window.__setTheme=setTheme;
  // Áp dụng theme trước khi paint
  try{
    var saved=localStorage.getItem('ui-theme');
    var theme=(saved==='light'||saved==='dark')?saved:((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');
    document.documentElement.setAttribute('data-theme',theme);
    applyMeta(theme);
    // Theo dõi thay đổi system preference khi user chưa chọn
    if(window.matchMedia){
      var mq=window.matchMedia('(prefers-color-scheme: dark)');
      var handler=function(e){
        if(!localStorage.getItem('ui-theme')){
          var t=e.matches?'dark':'light';
          document.documentElement.setAttribute('data-theme',t);
          applyMeta(t);
          updateBtn();
        }
      };
      if(mq.addEventListener)mq.addEventListener('change',handler);
      else if(mq.addListener)mq.addListener(handler);
    }
  }catch(e){}
  function ensureBtn(){
    if(document.getElementById('uThemeToggle'))return;
    var btn=document.createElement('button');
    btn.id='uThemeToggle';
    btn.className='u-theme-toggle';
    btn.type='button';
    btn.onclick=function(){setTheme(getTheme()==='dark'?'light':'dark');};
    document.body.appendChild(btn);
    updateBtn();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',ensureBtn);
  }else{
    ensureBtn();
  }
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='D'||e.key==='d')){
      e.preventDefault();
      setTheme(getTheme()==='dark'?'light':'dark');
    }
  });
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
