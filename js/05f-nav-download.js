
// ════════════════════════════════════════
// NAV & DOWNLOAD
// ════════════════════════════════════════
function nav(dir){wkOff+=dir;wxData=null;wxFetchedAt=0;renderAll();}
function goToday(){wkOff=0;wxData=null;wxFetchedAt=0;renderAll();}
function importLich(){
  const existing=document.getElementById('ovImport');
  if(existing){existing.classList.add('open');return;}
  const modal=document.createElement('div');
  modal.className='overlay open';modal.id='ovImport';
  modal.innerHTML=`
    <div class="modal md">
      <div class="modal-handle"></div>
      <div class="mh"><h2>📥 Import lịch có sẵn</h2><button class="mx" onclick="document.getElementById('ovImport').classList.remove('open')">✕</button></div>
      <div class="mb">
        <div style="background:var(--bg2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--muted);margin-bottom:8px">
          <b style="color:var(--ink)">Hỗ trợ 2 định dạng:</b><br>
          ① <b>JSON</b> — File sao lưu từ ứng dụng này<br>
          ② <b>Excel (.xlsx)</b> — Cột: Ngày, Buổi, Nội dung, Chủ trì, Địa điểm, Thành phần, Chuẩn bị
        </div>
        <div class="fg"><label>Định dạng file</label>
          <select id="importMode">
            <option value="json">📦 JSON (sao lưu từ ứng dụng)</option>
            <option value="excel">📊 Excel (.xlsx)</option>
          </select>
        </div>
        <div class="fg"><label>Xử lý dữ liệu hiện tại</label>
          <select id="importMerge">
            <option value="merge">🔀 Thêm vào lịch hiện tại</option>
            <option value="replace">♻️ Xoá cũ, thay mới</option>
          </select>
        </div>
        <div class="fg"><label>Chọn file</label>
          <input type="file" id="importFile" accept=".json,.xlsx,.xls" style="border:1.5px solid var(--line);border-radius:8px;padding:8px;width:100%;font-size:13px;background:var(--paper)" onchange="handleImportFile(this)">
        </div>
        <div id="importPreview" style="display:none;background:var(--bg2);border-radius:8px;padding:10px 12px;font-size:12px;margin-top:4px"></div>
      </div>
      <div class="mf"><div></div><div class="mf-r">
        <button class="bc" onclick="document.getElementById('ovImport').classList.remove('open')">Huỷ</button>
        <button class="bs" id="btnDoImport" onclick="doImport()" style="display:none">📥 Nhập lịch</button>
      </div></div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open');});
  document.body.appendChild(modal);
}

let _importData=null;
function handleImportFile(inp){
  const file=(inp.files||[])[0];if(!file)return;
  const preview=document.getElementById('importPreview');
  const btnDo=document.getElementById('btnDoImport');
  preview.style.display='block';preview.innerHTML='⏳ Đang đọc file...';
  _importData=null;
  const mode=document.getElementById('importMode').value;
  const reader=new FileReader();
  if(mode==='json'){
    reader.onload=e=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data.events||!Array.isArray(data.events))throw new Error('File JSON không đúng định dạng');
        _importData=data.events;
        preview.innerHTML='✅ <b>File hợp lệ:</b> '+_importData.length+' lịch, xuất lúc '+(data.exportedAt?new Date(data.exportedAt).toLocaleString('vi-VN'):'không rõ');
        btnDo.style.display='';
      }catch(err){preview.innerHTML='❌ '+err.message;btnDo.style.display='none';}
    };
    reader.readAsText(file,'UTF-8');
  } else {
    reader.onload=e=>{
      try{
        if(typeof XLSX==='undefined')throw new Error('Thư viện XLSX chưa tải. Kiểm tra kết nối mạng.');
        if(typeof XLSX==='undefined'){_ensureXlsx(()=>reader.onload(e));return;}
        const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});
        const parsed=[];let curDate='',curSes='sang';const idBase=Date.now();
        for(let i=1;i<rows.length;i++){
          const r=rows[i];
          const c0=r[0]?String(r[0]).trim():'';
          const c1=r[1]?String(r[1]).trim():'';
          const c2=r[2]?String(r[2]).trim():'';
          if(c0&&(c0.includes('Thứ')||c0.includes('Chủ nhật'))){
            for(let k=i+1;k<=i+2&&k<rows.length;k++){
              const d=rows[k][0]?String(rows[k][0]).trim():'';
              const mp=d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if(mp){curDate=mp[3]+'-'+mp[1].padStart(2,'0')+'-'+mp[2].padStart(2,'0');break;}
              const mi=d.match(/(\d{4})-(\d{2})-(\d{2})/);
              if(mi){curDate=mi[0].substring(0,10);break;}
            }
          }
          if(c1==='Sáng')curSes='sang';
          else if(c1==='Chiều')curSes='chieu';
          else if(c1==='Tối')curSes='toi';
          if(!c2||c2==='NỘI DUNG'||c2.toLowerCase()==='nghỉ')continue;
          let title=c2.replace(/^[-–•]\s*/,'').trim();
          let location=r[4]?String(r[4]).trim():'';
          let chair=r[3]?String(r[3]).trim():'';
          let member=r[5]?String(r[5]).trim():'';
          let prep=r[6]?String(r[6]).trim():'';
          let j=i+1;
          while(j<rows.length){
            const nr=rows[j];
            if((nr[0]&&String(nr[0]).includes('Thứ'))||nr[1]||nr[2])break;
            if(nr[4])location=(location+' '+String(nr[4])).trim();
            if(nr[3])chair=(chair+' '+String(nr[3])).trim();
            if(nr[5])member=(member+' '+String(nr[5])).trim();
            if(nr[6])prep=(prep+' '+String(nr[6])).trim();
            j++;
          }
          let time='';
          const tm=title.match(/^(\d{1,2})[hH](\d{2})[\u2019']?\s*[:\-]\s*/);
          if(tm){time=tm[1].padStart(2,'0')+':'+tm[2];title=title.slice(tm[0].length).trim();}
          const low=title.toLowerCase();
          let cat='kh';
          if(/họp|hội nghị|hội thảo|sinh hoạt chi bộ|tập huấn|tuyên truyền/.test(low))cat='hop';
          else if(/kiểm tra|nghiệm thu/.test(low))cat='kt';
          else if(/tiếp công dân/.test(low))cat='nd';
          else if(/làm việc|lãnh đạo/.test(low))cat='ldao';
          if(!curDate)continue;
          parsed.push({id:idBase+parsed.length,title,date:curDate,ses:curSes,cat,time,location,chair,member,prep,note:'',files:[]});
        }
        if(parsed.length===0)throw new Error('Không đọc được dữ liệu. Kiểm tra cấu trúc file.');
        _importData=parsed;
        preview.innerHTML='✅ <b>Đọc được '+parsed.length+' lịch</b> từ file Excel';
        btnDo.style.display='';
      }catch(err){preview.innerHTML='❌ '+err.message;btnDo.style.display='none';}
    };
    reader.readAsArrayBuffer(file);
  }
}

function doImport(){
  if(!_importData||!_importData.length)return;
  const merge=document.getElementById('importMerge').value;
  if(merge==='replace'){
    if(!confirm('⚠️ Xoá toàn bộ lịch hiện tại và thay bằng dữ liệu mới?'))return;
    events=_importData.map((e,i)=>({...e,id:i+1}));
  } else {
    let maxId=0;for(const e of events){const n=parseInt(e.id)||0;if(n>maxId)maxId=n;}
    events=[...events,..._importData.map((e,i)=>({...e,id:maxId+i+1}))];
  }
  save();renderAllNoFetch();
  document.getElementById('ovImport').classList.remove('open');
  _importData=null;
}

function openPrintModal(){
  document.getElementById('ovPrint').classList.add('open');
}
function closePrintModal(){
  document.getElementById('ovPrint').classList.remove('open');
}
function doPrint(){
  const ws=wkStart(wkOff);const we=addDays(ws,6);const wn=wkNum(ws);
  const days=Array.from({length:7},(_,i)=>addDays(ws,i));
  var _org=typeof ORG_CONFIG!=='undefined'?ORG_CONFIG:{tenCoQuan:'UBND XÃ TÂY TRÀ BỒNG',capCoQuan:'Uỷ ban nhân dân',tenNgan:'Xã Tây Trà Bồng',donVi:'xã Tây Trà Bồng',nguoiPhuTrach:'Nguyễn Duy Ka',soDienThoai:'0917.921.999'};
  const now=new Date();
  const ngayKy=(_org.diaDanh||_org.donVi)+', ngày '+String(now.getDate()).padStart(2,'0')+' tháng '+(now.getMonth()+1)+' năm '+now.getFullYear();

  const tr=(cells)=>'<tr>'+cells+'</tr>';
  const td=(v,s)=>'<td style="padding:5px 7px;border:1px solid #ccc;font-size:9.5pt;font-family:Times New Roman;vertical-align:middle;'+(s||'')+'">'+( v||'—')+'</td>';
  const th=(v,s)=>'<th style="padding:6px 7px;border:1px solid #ccc;font-size:9.5pt;font-family:Times New Roman;font-weight:bold;background:#e8e8e8;text-align:center;'+(s||'')+'">'+v+'</th>';

  let rows='';
  days.forEach(d=>{
    const ds=iso(d);
    const eS=dayEvs(ds,'sang');const eC=dayEvs(ds,'chieu');const eT=dayEvs(ds,'toi');
    const nS=Math.max(eS.length,1);const nC=Math.max(eC.length,1);
    const nR=2+nS+nC+(eT.length>0?1+eT.length:0);
    const dowStr=viDow(d.getDay());
    const dtStr=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');

    rows+=tr('<td rowspan="'+nR+'" style="padding:5px;border:1px solid #ccc;font-size:9.5pt;font-family:Times New Roman;text-align:center;vertical-align:middle;font-weight:bold;">'+dowStr+'<br>'+dtStr+'</td>'
      +'<td colspan="6" style="padding:4px 7px;border:1px solid #ccc;font-size:9.5pt;font-family:Times New Roman;font-weight:bold;background:#fffdf0;">☀️ SÁNG</td>');
    if(eS.length===0){
      rows+=tr(td('','text-align:center')+td('<em style="color:#aaa">Không có lịch</em>','colspan="5"'));
    } else {
      eS.forEach(e=>{rows+=tr(td(e.time||'','text-align:center;color:#555')+td('<b>'+catOf(e).icon+' '+(e.title||'')+'</b>','')+td(e.chair||'—','')+td(e.location||'—','')+td(e.member||'—','')+td(e.prep||'—',''));});
    }
    rows+=tr('<td colspan="6" style="padding:4px 7px;border:1px solid #ccc;font-size:9.5pt;font-family:Times New Roman;font-weight:bold;background:#f0f4ff;">🌤 CHIỀU</td>');
    if(eC.length===0){
      rows+=tr(td('','text-align:center')+td('<em style="color:#aaa">Không có lịch</em>','colspan="5"'));
    } else {
      eC.forEach(e=>{rows+=tr(td(e.time||'','text-align:center;color:#555')+td('<b>'+catOf(e).icon+' '+(e.title||'')+'</b>','')+td(e.chair||'—','')+td(e.location||'—','')+td(e.member||'—','')+td(e.prep||'—',''));});
    }
    if(eT.length>0){
      rows+=tr('<td colspan="6" style="padding:4px 7px;border:1px solid #ccc;font-size:9.5pt;font-family:Times New Roman;font-weight:bold;background:#f5f0ff;">🌙 TỐI</td>');
      eT.forEach(e=>{rows+=tr(td(e.time||'','text-align:center;color:#555')+td('<b>'+catOf(e).icon+' '+(e.title||'')+'</b>','')+td(e.chair||'—','')+td(e.location||'—','')+td(e.member||'—','')+td(e.prep||'—',''));});
    }
  });

  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'
    +'body{font-family:"Times New Roman",serif;margin:0;padding:0}'
    +'@page{size:A4 landscape;margin:15mm 15mm 15mm 20mm}'
    +'table{border-collapse:collapse;width:100%}'
    +'</style></head><body>'
    +'<table style="width:100%;margin-bottom:6pt;border:none"><tr>'
    +'<td style="width:50%;text-align:center;border:none;font-family:Times New Roman;font-size:10pt"><b>UỶ BAN NHÂN DÂN</b><br><b><u>'+(_org.tenNgan||_org.tenCoQuan).toUpperCase()+'</u></b></td>'
    +'<td style="width:50%;text-align:center;border:none;font-family:Times New Roman;font-size:10pt"><b>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b><u>Độc lập - Tự do - Hạnh phúc</u></b><br><i>'+ngayKy+'</i></td>'
    +'</tr></table>'
    +'<p style="text-align:center;font-size:13pt;font-weight:bold;font-family:Times New Roman;margin:4pt 0 2pt">LỊCH LÀM VIỆC CỦA UỶ BAN NHÂN DÂN XÃ TÂY TRÀ BỒNG</p>'
    +'<p style="text-align:center;font-size:9.5pt;font-style:italic;font-family:Times New Roman;margin:0 0 6pt">(Tuần '+wn+': Từ ngày '+fmtVi(ws)+' đến ngày '+fmtVi(we)+')</p>'
    +'<table style="width:100%;border-collapse:collapse">'
    +'<colgroup><col style="width:8%"><col style="width:7%"><col style="width:27%"><col style="width:14%"><col style="width:14%"><col style="width:15%"><col style="width:15%"></colgroup>'
    +'<thead><tr>'+th('THỨ')+th('BUỔI')+th('NỘI DUNG CÔNG TÁC')+th('CHỦ TRÌ/DỰ')+th('ĐỊA ĐIỂM')+th('THÀNH PHẦN')+th('CƠ QUAN CHUẨN BỊ')+'</tr></thead>'
    +'<tbody>'+rows+'</tbody></table>'
    +'<p style="font-size:9pt;font-style:italic;font-family:Times New Roman;margin-top:6pt"><b>Ghi chú:</b> Ngoài thời gian đã bố trí lịch nêu trên, các đồng chí Lãnh đạo UBND xã xử lý công việc tại cơ quan.</p>'
    +'<p style="text-align:center;font-weight:bold;font-family:Times New Roman;font-size:10pt;margin-top:10pt">VĂN PHÒNG HĐND VÀ UBND XÃ</p>'
    +'<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>'
    +'</body></html>';

  const w=window.open('','_blank','width=900,height=700');
  if(w){
    w.document.open();w.document.write(html);w.document.close();
  } else {
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.target='_blank';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
}

function exportWord(){
  if(typeof docx==='undefined'){_ensureDocx(()=>exportWord());return;}
  const ws=wkStart(wkOff);const we=addDays(ws,6);const wn=wkNum(ws);
  const days=Array.from({length:7},(_,i)=>addDays(ws,i));
  var _org=typeof ORG_CONFIG!=='undefined'?ORG_CONFIG:{tenCoQuan:'UBND XÃ TÂY TRÀ BỒNG',capCoQuan:'Uỷ ban nhân dân',tenNgan:'Xã Tây Trà Bồng',donVi:'xã Tây Trà Bồng',nguoiPhuTrach:'Nguyễn Duy Ka',soDienThoai:'0917.921.999'};
  const now=new Date();
  const ngayKy=(_org.diaDanh||_org.donVi)+', ngày '+String(now.getDate()).padStart(2,'0')+' tháng '+(now.getMonth()+1)+' năm '+now.getFullYear();

  // Kiểm tra thư viện docx đã load chưa
  if(typeof docx==='undefined'){
    showToast('⏳ Đang tải thư viện Word, vui lòng thử lại sau 3 giây...');
    // Load ngay nếu chưa có
    const s=document.createElement('script');
    s.src='https://unpkg.com/docx@8.5.0/build/index.umd.js';
    s.onload=()=>{ showToast('✅ Sẵn sàng! Bấm Xuất Word lại.'); };
    document.head.appendChild(s);
    return;
  }

  const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,
    AlignmentType,PageOrientation,WidthType,BorderStyle,VerticalAlign,ShadingType}=docx;

  const brd={style:BorderStyle.SINGLE,size:4,color:'999999'};
  const brds={top:brd,bottom:brd,left:brd,right:brd};
  const noBrd={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const noBrds={top:noBrd,bottom:noBrd,left:noBrd,right:noBrd};
  const mg={top:60,bottom:60,left:80,right:80};

  const cell=(txt,opts={})=>new TableCell({
    borders:opts.nb?noBrds:brds,
    width:opts.w?{size:opts.w,type:WidthType.DXA}:undefined,
    rowSpan:opts.rs||1,columnSpan:opts.cs||1,
    shading:{fill:opts.bg||'FFFFFF',type:ShadingType.CLEAR},
    verticalAlign:VerticalAlign.CENTER,margins:mg,
    children:[new Paragraph({
      alignment:opts.center?AlignmentType.CENTER:opts.right?AlignmentType.RIGHT:AlignmentType.LEFT,
      children:[new TextRun({text:String(txt||'—'),font:'Times New Roman',size:opts.sz||20,
        bold:opts.bold||false,italics:opts.it||false,color:opts.color||'000000',
        underline:opts.ul?{}:undefined})]
    })]
  });

  const p=(txt,opts={})=>new Paragraph({
    alignment:opts.center?AlignmentType.CENTER:opts.right?AlignmentType.RIGHT:AlignmentType.LEFT,
    spacing:{before:opts.before||0,after:opts.after||80},
    children:[new TextRun({text:String(txt),font:'Times New Roman',size:opts.sz||22,
      bold:opts.bold||false,italics:opts.it||false,underline:opts.ul?{}:undefined,color:opts.color||'000000'})]
  });

  // Quốc hiệu
  const W=13985;
  const qhTable=new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W/2,W/2],
    rows:[new TableRow({children:[
      new TableCell({borders:noBrds,shading:{fill:'FFFFFF',type:ShadingType.CLEAR},margins:mg,width:{size:W/2,type:WidthType.DXA},
        children:[p('UỶ BAN NHÂN DÂN',{center:true,bold:true,sz:22}),
                  p((_org.tenNgan||_org.tenCoQuan).toUpperCase(),{center:true,bold:true,sz:22,ul:true})]}),
      new TableCell({borders:noBrds,shading:{fill:'FFFFFF',type:ShadingType.CLEAR},margins:mg,width:{size:W/2,type:WidthType.DXA},
        children:[p('CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM',{center:true,bold:true,sz:22}),
                  p('Độc lập - Tự do - Hạnh phúc',{center:true,bold:true,sz:22,ul:true}),
                  p(ngayKy,{center:true,it:true,sz:20,before:80})]}),
    ]})]
  });

  // Hàng dữ liệu
  const rows=[];
  const CW=[900,750,3600,1900,1900,2200,2735];
  days.forEach(d=>{
    const ds=iso(d);
    const eS=dayEvs(ds,'sang');const eC=dayEvs(ds,'chieu');const eT=dayEvs(ds,'toi');
    const nS=Math.max(eS.length,1);const nC=Math.max(eC.length,1);
    const nR=2+nS+nC+(eT.length>0?1+eT.length:0);
    const dowStr=viDow(d.getDay());
    const dtStr=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();

    const dayCell=new TableCell({borders:brds,rowSpan:nR,width:{size:CW[0],type:WidthType.DXA},
      verticalAlign:VerticalAlign.CENTER,shading:{fill:'FFFFFF',type:ShadingType.CLEAR},margins:mg,
      children:[p(dowStr,{center:true,bold:true,sz:18}),p(dtStr,{center:true,sz:18})]});

    rows.push(new TableRow({children:[dayCell,
      new TableCell({borders:brds,columnSpan:6,shading:{fill:'FFFDF8',type:ShadingType.CLEAR},margins:mg,
        children:[p('Sáng',{center:true,bold:true,sz:20})]})]
    }));
    if(eS.length===0){
      rows.push(new TableRow({children:[cell('',{w:CW[1]}),cell('Không có lịch',{cs:5,it:true,color:'AAAAAA'})]}));
    } else {
      eS.forEach(e=>rows.push(new TableRow({children:[
        cell(e.time||'',{w:CW[1],center:true,sz:18,color:'666666'}),
        cell(e.title||'',{w:CW[2],bold:true}),cell(e.chair||'—',{w:CW[3]}),
        cell(e.location||'—',{w:CW[4]}),cell(e.member||'—',{w:CW[5]}),cell(e.prep||'—',{w:CW[6]})
      ]})));
    }
    rows.push(new TableRow({children:[
      new TableCell({borders:brds,columnSpan:6,shading:{fill:'F0F4FF',type:ShadingType.CLEAR},margins:mg,
        children:[p('Chiều',{center:true,bold:true,sz:20})]})]
    }));
    if(eC.length===0){
      rows.push(new TableRow({children:[cell('',{w:CW[1]}),cell('Không có lịch',{cs:5,it:true,color:'AAAAAA'})]}));
    } else {
      eC.forEach(e=>rows.push(new TableRow({children:[
        cell(e.time||'',{w:CW[1],center:true,sz:18,color:'666666'}),
        cell(e.title||'',{w:CW[2],bold:true}),cell(e.chair||'—',{w:CW[3]}),
        cell(e.location||'—',{w:CW[4]}),cell(e.member||'—',{w:CW[5]}),cell(e.prep||'—',{w:CW[6]})
      ]})));
    }
    if(eT.length>0){
      rows.push(new TableRow({children:[
        new TableCell({borders:brds,columnSpan:6,shading:{fill:'F5F0FF',type:ShadingType.CLEAR},margins:mg,
          children:[p('Tối',{center:true,bold:true,sz:20})]})]
      }));
      eT.forEach(e=>rows.push(new TableRow({children:[
        cell(e.time||'',{w:CW[1],center:true,sz:18,color:'666666'}),
        cell(e.title||'',{w:CW[2],bold:true}),cell(e.chair||'—',{w:CW[3]}),
        cell(e.location||'—',{w:CW[4]}),cell(e.member||'—',{w:CW[5]}),cell(e.prep||'—',{w:CW[6]})
      ]})));
    }
  });

  const mainTable=new Table({width:{size:W,type:WidthType.DXA},columnWidths:CW,
    rows:[new TableRow({tableHeader:true,children:[
      cell('THỨ',{center:true,bold:true,bg:'D9D9D9',sz:20}),
      cell('BUỔI',{center:true,bold:true,bg:'D9D9D9',sz:20}),
      cell('NỘI DUNG CÔNG TÁC',{center:true,bold:true,bg:'D9D9D9',sz:20}),
      cell('CHỦ TRÌ/DỰ',{center:true,bold:true,bg:'D9D9D9',sz:20}),
      cell('ĐỊA ĐIỂM',{center:true,bold:true,bg:'D9D9D9',sz:20}),
      cell('THÀNH PHẦN',{center:true,bold:true,bg:'D9D9D9',sz:20}),
      cell('CƠ QUAN CHUẨN BỊ',{center:true,bold:true,bg:'D9D9D9',sz:20})
    ]}),...rows]
  });

  const doc=new Document({sections:[{
    properties:{page:{size:{width:16838,height:11906},orientation:PageOrientation.LANDSCAPE,
      margin:{top:1080,bottom:1080,left:1440,right:1080}}},
    children:[
      qhTable,
      p(''),
      p('LỊCH LÀM VIỆC CỦA UỶ BAN NHÂN DÂN XÃ TÂY TRÀ BỒNG',{center:true,bold:true,sz:26,before:80,after:40}),
      p('(Tuần '+wn+': Từ ngày '+fmtVi(ws)+' đến ngày '+fmtVi(we)+')',{center:true,it:true,sz:22,after:120}),
      mainTable,
      p('Ghi chú: Ngoài thời gian đã bố trí lịch nêu trên, các đồng chí Lãnh đạo UBND xã xử lý công việc tại cơ quan.',{it:true,sz:20,before:120}),
      p('VĂN PHÒNG HĐND VÀ UBND XÃ',{center:true,bold:true,sz:20,before:160})
    ]
  }]});

  Packer.toBlob(doc).then(blob=>{
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='LichLamViec_Tuan'+wn+'_'+ws.getFullYear()+'.docx';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    showToast('✅ Đã xuất file .docx thành công!');
  }).catch(err=>showToast('❌ Lỗi xuất .docx: '+err.message));
}
