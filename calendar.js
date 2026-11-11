// Calendar tab: month view with events, and a day view with a timeline of events
// followed by the day's tasks (the Task section, moved here from Track).
// Events are stored by the sync layer (window.trackerPlan) in tracker_plan_items.
// Uses the app's globals: year, month0, sel, days, REAL, MONTHS, DOW, dim(), firstDow(),
// dow(), render(), loadMonth(), flush(), richEditor(), rtHtml(), rtText(), TASK_COLS.
(function(){
'use strict';
const COLORS={green:'#7DCB7D',yellow:'#F2C14E',red:'#F07070'};
const COLOR_NAMES={green:'Green',yellow:'Yellow',red:'Red'};

// ---------- styles ----------
const css=document.createElement('style');
css.textContent=`
#calview{display:none;}
.calmode #calview{display:block;}
.cmg{padding:10px 6px 10px;margin-bottom:14px;}
.cmg .wd{margin-bottom:4px;}
.cgrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;}
.cc{min-height:70px;border-radius:8px;padding:3px 2px;overflow:hidden;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;width:100%;min-width:0;}
.cc.empty{visibility:hidden;cursor:default;}
.cc .n{font-size:11.5px;font-weight:600;text-align:center;margin-bottom:3px;color:var(--ink);}
.cc.past .n{color:#D9A15C;}
.cc.today .n span{background:var(--pine);color:#fff;border-radius:99px;padding:0 6px;}
.cc.sel{background:#3A3935;box-shadow:inset 0 0 0 1.5px var(--ink);}
.cchip{font-size:9.5px;line-height:1.3;padding:1px 3px;border-radius:3px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1f1f1d;font-weight:600;}
.cchip.cx{text-decoration:line-through;opacity:.45;}
.cmore{font-size:9px;color:var(--muted);text-align:center;}
.clink{background:none;border:0;padding:0;margin-left:auto;color:var(--muted);font:600 12px 'Inter',sans-serif;cursor:pointer;}
.crow{display:flex;gap:11px;align-items:center;padding:11px 14px;border-top:1px solid var(--line);cursor:pointer;}
.crow:first-child{border-top:none;}
.crow .cbar{width:4px;align-self:stretch;border-radius:3px;flex:none;}
.crow .ctm{font-size:12px;color:var(--muted);font-weight:600;width:62px;flex:none;}
.crow .ctt{font-size:14px;font-weight:500;flex:1;min-width:0;overflow-wrap:anywhere;}
.crow.cx .ctt{text-decoration:line-through;color:var(--muted);}
.cempty{padding:14px 16px;color:var(--muted);font-size:13px;}
.cck{width:24px;height:24px;border-radius:7px;border:2px solid #4A4942;flex:none;display:flex;align-items:center;justify-content:center;background:none;padding:0;cursor:pointer;color:#fff;font:800 13px 'Inter',sans-serif;}
.cck.on{background:#43A047;border-color:#43A047;}
.cck.x{border-color:#A03030;color:#E25858;}
.cdh{display:flex;align-items:center;gap:8px;margin:0 2px 6px;}
.cdh .d{font-family:'Fraunces',serif;font-size:21px;font-weight:600;color:#D9A15C;}
.cdh .s{font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
.cdh .nav{margin-left:auto;display:flex;gap:6px;}
.cbtn{min-width:34px;height:34px;padding:0 10px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:600 13px 'Inter',sans-serif;cursor:pointer;}
.cdsum{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);font-weight:600;margin:0 2px 14px;min-height:24px;}
.tleft{margin-left:auto;background:#38301F;color:#F2C14E;border:0;border-radius:99px;padding:4px 10px;font:700 11.5px 'Inter',sans-serif;cursor:pointer;}
.ctl{position:relative;padding:4px 0;margin-bottom:18px;}
.ctl::before{content:'';position:absolute;left:58px;top:0;bottom:0;width:2px;background:#3C3B37;}
.cev{display:grid;grid-template-columns:50px minmax(0,1fr);gap:16px;position:relative;margin-bottom:8px;}
.cev .t{text-align:right;font-size:12px;font-weight:700;padding-top:8px;line-height:1.25;}
.cev .t small{display:block;font-weight:500;color:var(--muted);font-size:11px;}
.cev .dot{position:absolute;left:54px;top:11px;width:10px;height:10px;border-radius:50%;border:2px solid var(--paper);}
.cblk{border-radius:11px;padding:9px 10px 9px 12px;display:flex;gap:10px;align-items:flex-start;border-left:4px solid;cursor:pointer;min-width:0;}
.cblk.ov{margin-left:18px;}
.cblk .bt{font-size:14px;font-weight:600;line-height:1.3;overflow-wrap:anywhere;}
.cblk .bs{font-size:11.5px;color:var(--muted);margin-top:2px;}
.cblk .bn{font-size:12px;color:var(--muted);margin-top:4px;max-height:3.9em;overflow:hidden;}
.cblk .bn ul,.cblk .bn ol{margin:2px 0;padding-left:18px;}
.cblk .cck{margin-left:auto;}
.cblk.cx{opacity:.6;}
.cblk.cx .bt{text-decoration:line-through;color:var(--muted);}
.cnowtag{color:#F07070;font-weight:700;}
.cgap{display:grid;grid-template-columns:50px minmax(0,1fr);gap:16px;margin:2px 0 10px;}
.cgap span{grid-column:2;font-size:11.5px;color:var(--muted);border:1px dashed #4A4942;border-radius:9px;padding:5px 10px;font-weight:600;}
.cnow{display:grid;grid-template-columns:50px minmax(0,1fr);gap:16px;align-items:center;margin:0 0 10px;}
.cnow .t{text-align:right;font-size:11px;font-weight:800;color:#F07070;}
.cnow .ln{height:2px;background:#F07070;position:relative;}
.cnow .ln::before{content:'';position:absolute;left:-12px;top:-4px;width:10px;height:10px;border-radius:50%;background:#F07070;}
.ctlempty{background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:16px;color:var(--muted);font-size:13px;text-align:center;margin-bottom:18px;}
.cfab{position:fixed;right:max(18px,calc(50% - 262px));bottom:calc(24px + env(safe-area-inset-bottom));z-index:60;width:58px;height:58px;border-radius:50%;background:var(--pine);color:#fff;border:0;font-size:30px;line-height:1;box-shadow:0 6px 18px rgba(0,0,0,.5);cursor:pointer;display:none;}
.calmode .cfab{display:block;}
.csheet-wrap{position:fixed;inset:0;z-index:90;display:none;}
.csheet-wrap.open{display:block;}
.csheet-wrap .dim{position:absolute;inset:0;background:rgba(0,0,0,.55);}
.csheet{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;max-height:90vh;overflow:auto;background:#2b2b29;border-radius:22px 22px 0 0;border-top:1px solid #444;padding:10px 16px calc(20px + env(safe-area-inset-bottom));}
.csheet .grab{width:40px;height:5px;border-radius:9px;background:#555;margin:0 auto 10px;}
.csheet h3{margin:0 0 12px;font-size:15px;font-weight:700;}
.cin{width:100%;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:500 15px 'Inter',sans-serif;color:var(--ink);margin-bottom:9px;}
.cin:focus{outline:none;border-color:var(--pine);}
.cin.title{font-size:16px;font-weight:600;}
.cfld{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:4px 6px 4px 12px;margin-bottom:9px;}
.cfld span{color:var(--muted);font-size:12.5px;font-weight:600;}
.cfld input{background:none;border:0;color:var(--ink);font:500 15px 'Inter',sans-serif;padding:8px 4px;text-align:right;color-scheme:dark;min-width:0;}
.cfld input:focus{outline:none;}
.ctwo{display:flex;gap:8px;}.ctwo .cfld{flex:1;min-width:0;}
.clbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:8px 2px 8px;}
.cswatch{display:flex;gap:14px;margin:0 2px 8px;}
.cswatch button{width:42px;height:42px;border-radius:50%;border:0;cursor:pointer;color:#1f1f1d;font:900 16px 'Inter',sans-serif;}
.cswatch button.on{box-shadow:0 0 0 2px #2b2b29,0 0 0 4px var(--ink);}
.cerr{color:#F07070;font-size:12.5px;min-height:16px;margin:6px 2px 4px;}
.cacts{display:flex;gap:8px;margin-top:6px;}
.cacts button{flex:1;padding:13px;border-radius:12px;font:700 15px 'Inter',sans-serif;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink);}
.cacts .csave{flex:2;background:var(--pine);border-color:var(--pine);color:#fff;}
.cacts .cdel{color:#F07070;}
#calview #taskSec{margin-top:4px;}
#calNoteSec{margin-bottom:18px;}
#calNoteSec .rt{margin-top:0;}
#calNoteSec .rt-ed{min-height:80px;background:var(--card);}
.cnote-meta{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin:6px 2px 0;}
.cc .npen{font-size:9px;color:var(--muted);text-align:center;line-height:1;margin-top:auto;}
.cnoteprev{padding:10px 14px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.45;color:var(--ink);cursor:pointer;max-height:6.2em;overflow:hidden;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent);}
.cnoteprev ul,.cnoteprev ol{margin:2px 0;padding-left:18px;}
.cnoteprev .lbl{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:2px;}
`;
document.head.appendChild(css);

// ---------- markup ----------
const view=document.createElement('div');
view.id='calview';
view.innerHTML=`
<div id="calMonth">
  <div class="card cmg"><div class="wd"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="cgrid" id="calGrid"></div></div>
  <div class="sec-label"><span class="dot"></span><h2 id="calSelTitle"></h2><button type="button" class="clink" id="calOpen">Open day ›</button></div>
  <div class="card" id="calSelCard"></div>
</div>
<div id="calDay">
  <div class="cdh"><button type="button" class="cbtn" id="calBack" aria-label="Back to month">‹ Month</button><span class="d" id="cdDay"></span><span class="s" id="cdMon"></span>
    <span class="nav"><button type="button" class="cbtn" id="cdPrev" aria-label="Previous day">‹</button><button type="button" class="cbtn" id="cdNext" aria-label="Next day">›</button></span></div>
  <div class="cdsum"><span id="cdSum"></span><button type="button" class="tleft" id="cdLeft"></button></div>
  <div class="ctl" id="calTL"></div>
  <section id="calNoteSec">
    <div class="sec-label"><span class="dot" style="background:#D9A15C"></span><h2>Note</h2></div>
    <div id="calNote" data-ph="Write a little about this day — plans, reminders, thoughts…" data-min="80"></div>
    <div class="cnote-meta"><span>Saved with this day</span><span id="calNoteCount"></span></div>
  </section>
</div>`;
const wrap=document.querySelector('.wrap');
wrap.insertBefore(view,document.getElementById('tip'));
const dayEl=view.querySelector('#calDay'), monthEl=view.querySelector('#calMonth');

// The Task section moves from Track to the Calendar day view (same lists, same data).
const taskSec=document.getElementById('taskSec');
if(taskSec){taskSec.classList.remove('trackOnly');dayEl.appendChild(taskSec);
  const h=taskSec.querySelector('h2');if(h)h.textContent='Tasks · any time';}

const fab=document.createElement('button');
fab.type='button';fab.className='cfab';fab.textContent='+';fab.setAttribute('aria-label','Add event');
document.body.appendChild(fab);

const sheetWrap=document.createElement('div');
sheetWrap.className='csheet-wrap';
sheetWrap.innerHTML=`<div class="dim"></div>
<div class="csheet" role="dialog" aria-modal="true" aria-labelledby="csTitle">
  <div class="grab"></div><h3 id="csTitle">New event</h3>
  <input class="cin title" id="csName" maxlength="200" placeholder="Event title" autocomplete="off">
  <label class="cfld"><span>Date</span><input type="date" id="csDate"></label>
  <div class="ctwo"><label class="cfld"><span>Start</span><input type="time" id="csStart"></label><label class="cfld"><span>End</span><input type="time" id="csEnd"></label></div>
  <p class="clbl">Colour</p><div class="cswatch" id="csColors"></div>
  <p class="clbl">Note</p><div id="csNote" data-ph="Optional note…"></div>
  <div class="cerr" id="csErr"></div>
  <div class="cacts"><button type="button" class="cdel" id="csDel">Delete</button><button type="button" id="csCancel">Cancel</button><button type="button" class="csave" id="csSave">Save event</button></div>
</div>`;
document.body.appendChild(sheetWrap);
const $=id=>document.getElementById(id);

// ---------- day note: stored in the day's row as planNote, synced like ticks ----------
const noteCount=v=>{const n=rtText(v).length;$('calNoteCount').textContent=n?n+' chars':'';};
const dayNoteEd=richEditor(document.getElementById('calNote'),v=>{dayObj(sel).planNote=v;noteCount(v);scheduleSave();});
const planNoteOf=d=>(days[d]&&typeof days[d].planNote==='string')?days[d].planNote:'';

// ---------- helpers ----------
const P=()=>window.trackerPlan;
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m0,d)=>y+'-'+pad(m0+1)+'-'+pad(d);
const selIso=()=>iso(year,month0,sel);
const todayIso=()=>iso(REAL.getFullYear(),REAL.getMonth(),REAL.getDate());
const mins=t=>{if(!t||!/^\d\d:\d\d$/.test(t))return null;return +t.slice(0,2)*60+ +t.slice(3,5);};
const hm=m=>pad(Math.floor(m/60))+':'+pad(m%60);
function fmt(t,ampm){const m=mins(t);if(m==null)return '';let h=Math.floor(m/60);const ap=h>=12?'PM':'AM';h=h%12||12;
  return h+':'+pad(m%60)+(ampm?' '+ap:'');}
function dur(m){const h=Math.floor(m/60),r=m%60;return [h?h+'h':'',r?r+'m':''].filter(Boolean).join(' ')||'0m';}
const newId=()=>(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);
function items(){const all=P()?P().all():{};return Object.keys(all).map(id=>Object.assign({id},all[id])).filter(x=>x&&!x.deleted&&x.day);}
function eventsOn(day,list){return (list||items()).filter(x=>x.day===day).sort((a,b)=>
  (a.start_time||'').localeCompare(b.start_time||'')||(a.end_time||'').localeCompare(b.end_time||'')||String(a.title).localeCompare(String(b.title)));}
function tasksLeft(){const T=(days[sel]&&days[sel].tasks)||{};let n=0;
  TASK_COLS.forEach(([c])=>(T[c]||[]).forEach(x=>{if(x&&String(x.t||'').trim()&&!x.d&&!x.sk)n++;}));return n;}
function check(st,onTap,label){const b=document.createElement('button');b.type='button';
  b.className='cck'+(st===1?' on':st===2?' x':'');b.textContent=st===1?'✓':st===2?'✕':'';
  b.setAttribute('aria-label',label+': '+(st===1?'done':st===2?'cancelled':'not yet')+'. Tap to change.');
  b.onclick=e=>{e.stopPropagation();onTap();};return b;}
function cycle(ev){P().put({id:ev.id,status:((ev.status||0)+1)%3});render();}

let mode='month';

// ---------- month view ----------
function renderMonth(list){
  const g=$('calGrid');g.innerHTML='';
  const n=dim(),fd=firstDow(),tIso=todayIso();
  for(let i=0;i<fd;i++){const e=document.createElement('div');e.className='cc empty';g.appendChild(e);}
  for(let d=1;d<=n;d++){
    const dIso=iso(year,month0,d),evs=eventsOn(dIso,list);
    const b=document.createElement('button');b.type='button';
    b.className='cc'+(dIso<tIso?' past':'')+(dIso===tIso?' today':'')+(d===sel?' sel':'');
    const num=document.createElement('div');num.className='n';
    if(dIso===tIso){const s=document.createElement('span');s.textContent=d;num.appendChild(s);}else num.textContent=d;
    b.appendChild(num);
    evs.slice(0,2).forEach(ev=>{const c=document.createElement('div');c.className='cchip'+(ev.status===2?' cx':'');
      c.style.background=COLORS[ev.color]||COLORS.green;c.textContent=ev.title;b.appendChild(c);});
    if(evs.length>2){const m=document.createElement('div');m.className='cmore';m.textContent='+'+(evs.length-2)+' more';b.appendChild(m);}
    if(rtText(planNoteOf(d))){const pn=document.createElement('div');pn.className='npen';pn.textContent='✎';pn.setAttribute('aria-hidden','true');b.appendChild(pn);}
    b.setAttribute('aria-label',dow(d)+' '+d+' '+MONTHS[month0]+(evs.length?', '+evs.length+' event'+(evs.length>1?'s':''):'')+(rtText(planNoteOf(d))?', has a note':''));
    b.onclick=()=>{if(sel===d){openDay();return;}sel=d;render();};
    g.appendChild(b);
  }
  $('calSelTitle').textContent=dow(sel)+' '+sel+' '+MONTHS[month0].slice(0,3);
  const card=$('calSelCard');card.innerHTML='';
  const evs=eventsOn(selIso(),list);
  evs.forEach(ev=>{const r=document.createElement('div');r.className='crow'+(ev.status===2?' cx':'');
    const bar=document.createElement('span');bar.className='cbar';bar.style.background=COLORS[ev.color]||COLORS.green;
    const tm=document.createElement('span');tm.className='ctm';tm.textContent=fmt(ev.start_time,true);
    const tt=document.createElement('span');tt.className='ctt';tt.textContent=ev.title;
    r.append(bar,tm,tt,check(ev.status||0,()=>cycle(ev),ev.title));
    r.onclick=()=>openSheet(ev);card.appendChild(r);});
  const nt=planNoteOf(sel);
  if(rtText(nt)){const np=document.createElement('div');np.className='cnoteprev';
    const l=document.createElement('span');l.className='lbl';l.textContent='Note';
    const body=document.createElement('div');body.innerHTML=rtHtml(nt);np.append(l,body);np.onclick=openDay;card.appendChild(np);}
  const left=tasksLeft();
  const foot=document.createElement('div');foot.className='cempty';foot.style.cursor='pointer';
  foot.textContent=(evs.length||rtText(nt)?'':'No events. Tap + to add one. ')+(left?left+' task'+(left>1?'s':'')+' left · ':'')+'Open day ›';
  if(left){foot.style.color='#F2C14E';}
  foot.onclick=openDay;card.appendChild(foot);
}

// ---------- day view ----------
function renderDay(list){
  $('cdDay').textContent=dow(sel)+' '+sel;$('cdMon').textContent=MONTHS[month0];
  const dIso=selIso(),evs=eventsOn(dIso,list);
  dayNoteEd.set(planNoteOf(sel));noteCount(planNoteOf(sel));
  const done=evs.filter(e=>e.status===1).length,cx=evs.filter(e=>e.status===2).length;
  $('cdSum').textContent=evs.length?('Events '+done+' of '+evs.length+' done'+(cx?' · '+cx+' cancelled':'')):'No events';
  const left=tasksLeft(),lb=$('cdLeft');
  lb.style.display=left?'':'none';lb.textContent=left+' task'+(left>1?'s':'')+' left ↓';
  const tl=$('calTL');tl.innerHTML='';
  if(!evs.length){const e=document.createElement('div');e.className='ctlempty';e.textContent='No events for this day. Tap + to add one.';tl.appendChild(e);tl.className='';return;}
  tl.className='ctl';
  const now=new Date(),isToday=dIso===todayIso(),nowM=isToday?now.getHours()*60+now.getMinutes():null;
  let runEnd=-1,runTitle='',nowShown=!isToday;
  const nowLine=()=>{const w=document.createElement('div');w.className='cnow';
    const t=document.createElement('span');t.className='t';t.textContent=fmt(hm(nowM),false);
    const l=document.createElement('span');l.className='ln';w.append(t,l);tl.appendChild(w);nowShown=true;};
  evs.forEach(ev=>{
    const s=mins(ev.start_time),e=Math.max(mins(ev.end_time)||s,s);
    const overlap=runEnd>=0&&s<runEnd;
    if(!overlap){
      if(runEnd>=0&&s-runEnd>=30){const gp=document.createElement('div');gp.className='cgap';
        const sp=document.createElement('span');sp.textContent='Free · '+dur(s-runEnd);gp.appendChild(sp);tl.appendChild(gp);}
      if(!nowShown&&nowM<s)nowLine();
    }
    const row=document.createElement('div');row.className='cev';
    const t=document.createElement('div');t.className='t';t.textContent=fmt(ev.start_time,false);
    const sm=document.createElement('small');sm.textContent=fmt(ev.end_time,false);t.appendChild(sm);
    const dot=document.createElement('span');dot.className='dot';dot.style.background=COLORS[ev.color]||COLORS.green;
    const col=COLORS[ev.color]||COLORS.green;
    const blk=document.createElement('div');blk.className='cblk'+(ev.status===2?' cx':'')+(overlap?' ov':'');
    blk.style.background=col+'22';blk.style.borderLeftColor=col;
    blk.style.minHeight=Math.max(46,Math.min(150,Math.round((e-s)*0.55)))+'px';
    const body=document.createElement('div');body.style.minWidth='0';
    const bt=document.createElement('div');bt.className='bt';bt.textContent=ev.title;
    const bs=document.createElement('div');bs.className='bs';
    bs.textContent=fmt(ev.start_time,true)+' – '+fmt(ev.end_time,true)+' · '+dur(e-s)+(overlap?' · during '+runTitle:'')+(ev.status===2?' · cancelled':'');
    if(nowM!=null&&nowM>=s&&nowM<e){const nt=document.createElement('span');nt.className='cnowtag';nt.textContent=' · now';bs.appendChild(nt);nowShown=true;}
    body.append(bt,bs);
    if(ev.note&&rtText(ev.note)){const bn=document.createElement('div');bn.className='bn';bn.innerHTML=rtHtml(ev.note);body.appendChild(bn);}
    blk.append(body,check(ev.status||0,()=>cycle(ev),ev.title));
    blk.onclick=()=>openSheet(ev);
    row.append(t,dot,blk);tl.appendChild(row);
    if(!overlap||e>runEnd){if(!overlap)runTitle=ev.title;runEnd=Math.max(runEnd,e);}
  });
  if(!nowShown)nowLine();
}

function renderCalendar(){
  monthEl.style.display=mode==='month'?'':'none';
  dayEl.style.display=mode==='day'?'':'none';
  const list=items();
  if(mode==='month')renderMonth(list);
  else{renderDay(list);
    // Task boxes size to their text, which can't be measured while the view is hidden.
    if(taskSec)taskSec.querySelectorAll('.ttxt').forEach(el=>{if(typeof fitTask==='function')fitTask(el);});}
}
window.renderCalendar=renderCalendar;
function openDay(){mode='day';render();window.scrollTo(0,0);}
$('calOpen').onclick=openDay;
$('calBack').onclick=()=>{mode='month';render();window.scrollTo(0,0);};
async function goDay(delta){
  const d=new Date(year,month0,sel+delta);
  if(d.getFullYear()!==year||d.getMonth()!==month0){await flush();year=d.getFullYear();month0=d.getMonth();await loadMonth();}
  sel=d.getDate();render();
}
$('cdPrev').onclick=()=>goDay(-1);
$('cdNext').onclick=()=>goDay(1);
$('cdLeft').onclick=()=>{if(taskSec)window.scrollTo({top:taskSec.getBoundingClientRect().top+window.scrollY-14,behavior:'smooth'});};
// Tapping the Calendar tab again goes back to the month.
$('tabCal').addEventListener('click',()=>{if(document.body.classList.contains('calmode')&&mode==='day'){mode='month';}},true);

// ---------- add / edit sheet ----------
let editing=null,color='green',noteVal='';
const sw=$('csColors');
Object.keys(COLORS).forEach(k=>{const b=document.createElement('button');b.type='button';b.dataset.c=k;
  b.style.background=COLORS[k];b.setAttribute('aria-label',COLOR_NAMES[k]);
  b.onclick=()=>{color=k;paintColors();};sw.appendChild(b);});
function paintColors(){sw.querySelectorAll('button').forEach(b=>{const on=b.dataset.c===color;b.classList.toggle('on',on);b.textContent=on?'✓':'';b.setAttribute('aria-pressed',on);});}
const noteEd=richEditor($('csNote'),v=>{noteVal=v;});
function openSheet(ev){
  editing=ev||null;
  $('csTitle').textContent=ev?'Edit event':'New event';
  $('csName').value=ev?ev.title:'';
  $('csDate').value=ev?ev.day:selIso();
  let s,e;
  if(ev){s=ev.start_time;e=ev.end_time;}
  else{const base=selIso()===todayIso()?Math.min(23*60,(new Date().getHours()+1)*60):9*60;s=hm(base);e=hm(Math.min(23*60+59,base+60));}
  $('csStart').value=s;$('csEnd').value=e;
  color=ev&&COLORS[ev.color]?ev.color:'green';paintColors();
  noteVal=ev?(ev.note||''):'';noteEd.ed.dataset.v='\u0000';noteEd.set(noteVal);
  $('csErr').textContent='';$('csDel').style.display=ev?'':'none';
  sheetWrap.classList.add('open');
  if(!ev)setTimeout(()=>$('csName').focus(),50);
}
function closeSheet(){sheetWrap.classList.remove('open');editing=null;if(document.activeElement)document.activeElement.blur();}
function save(){
  const title=$('csName').value.trim(),day=$('csDate').value,s=$('csStart').value,e=$('csEnd').value;
  const err=$('csErr');
  if(!title){err.textContent='Give the event a title.';$('csName').focus();return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)){err.textContent='Pick a date.';return;}
  if(mins(s)==null||mins(e)==null){err.textContent='Pick a start and end time.';return;}
  if(mins(e)<=mins(s)){err.textContent='End time must be after the start time.';return;}
  const fields={day,start_time:s,end_time:e,title,color,note:noteVal||''};
  if(editing)P().put(Object.assign({id:editing.id},fields));
  else P().put(Object.assign({id:newId(),status:0,deleted:false},fields));
  closeSheet();
  // Show the day the event was saved on when it is in the month on screen.
  const y=+day.slice(0,4),m0=+day.slice(5,7)-1;
  if(y===year&&m0===month0)sel=+day.slice(8,10);
  render();
}
$('csSave').onclick=save;
$('csCancel').onclick=closeSheet;
sheetWrap.querySelector('.dim').onclick=closeSheet;
$('csDel').onclick=()=>{if(!editing)return;if(!confirm('Delete "'+editing.title+'"?'))return;
  P().put({id:editing.id,deleted:true});closeSheet();render();};
$('csName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheetWrap.classList.contains('open'))closeSheet();});
fab.onclick=()=>openSheet(null);

// Keep the "now" line moving while the day view is open.
setInterval(()=>{if(document.body.classList.contains('calmode')&&mode==='day'&&!sheetWrap.classList.contains('open'))renderCalendar();},60000);
})();
