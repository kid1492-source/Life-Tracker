// Track tab: "Today's focus" (2–3 key habits with streaks) and goals with a reward.
// Settings (which habits are in focus, the goals) sync through the reviews table under the
// special month key 0000-00: each setting is one entry in review.weekly, so the existing
// sync merges them one by one. A goal's progress is worked out from the daily ticks.
// Uses the app's globals: year, month0, sel, days, REAL, DOW, MONTHS, DAILY_KEYS,
// dayObj(), save(), render(), window.storage.
(function(){
'use strict';
const SKEY='tracker:0000-00';
const MAX_FOCUS=3, MAX_GOALS=3;
const DEFAULT_FOCUS=['mWake','tahajud','mFajr'];

// ---------- styles ----------
const css=document.createElement('style');
css.textContent=`
.fcard{background:linear-gradient(180deg,#3A2E28,#30302E);border:1px solid #5a4032;border-radius:16px;padding:12px 14px 4px;margin-bottom:12px;box-shadow:var(--shadow);}
.fcard .fh{display:flex;align-items:center;gap:8px;margin-bottom:4px;}
.fcard .fh b{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#E8875F;}
.fcard .fh .fd{font-size:12px;color:var(--muted);font-weight:600;}
.flink{background:none;border:0;padding:4px 0;color:var(--muted);font:600 12px 'Inter',sans-serif;text-decoration:underline;cursor:pointer;}
.fcard .fh .flink:first-of-type{margin-left:auto;}
.frow{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid rgba(255,255,255,.07);cursor:pointer;user-select:none;}
.frow:first-child{border-top:none;}
.frow .ft{font-size:15px;font-weight:600;}
.frow .fs{font-size:11.5px;color:var(--muted);}
.frow.done .check{background:#43A047;border-color:#43A047;}
.frow.done .check svg{opacity:1;transform:scale(1);}
.frow.fail .check{border-color:#A03030;}
.frow.fail .check::after{content:'✕';position:absolute;color:#E25858;font-size:13px;font-weight:800;line-height:1;}
.fstreak{margin-left:auto;font-size:13px;font-weight:700;color:#F2C14E;white-space:nowrap;}
.fstreak.cold{color:var(--muted);font-weight:600;font-size:12px;}
.gcard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin-bottom:12px;box-shadow:var(--shadow);}
.gcard.miss{background:#38301F;border-color:#6b5426;}
.gcard.won{background:linear-gradient(180deg,#4a3a17,#38301F);border-color:#D9A15C;}
.gcard .gt{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;}
.gcard .gt .gr{margin-left:auto;font-size:12px;color:var(--muted);font-weight:700;}
.gcard .gs{font-size:12px;color:var(--muted);margin:3px 0 9px;line-height:1.4;}
.gcard .gs b{color:var(--ink);}
.gpips{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
.gpips span{height:28px;border-radius:8px;background:var(--track);display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;color:var(--muted);}
.gpips span.on{background:#43A047;color:#fff;}
.gpips span.miss{background:#6b5426;color:#F2C14E;}
.gpips span.today{box-shadow:inset 0 0 0 2px var(--ink);}
.gcomp{display:flex;align-items:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);font-size:12.5px;line-height:1.4;}
.gcomp .gb{margin-left:auto;background:#43A047;color:#fff;border:0;font:700 12.5px 'Inter',sans-serif;border-radius:9px;padding:8px 12px;white-space:nowrap;cursor:pointer;}
.gfoot{display:flex;justify-content:flex-end;margin-top:6px;}
.gnew{display:block;width:100%;background:none;border:1px dashed var(--line);color:var(--muted);border-radius:14px;padding:11px;font:600 13px 'Inter',sans-serif;cursor:pointer;margin-bottom:12px;}
.fpick{display:flex;align-items:center;gap:12px;padding:11px 2px;border-top:1px solid var(--line);cursor:pointer;font-size:14.5px;}
.fpick:first-child{border-top:none;}
.fpick .check{width:22px;height:22px;}
.fpick.on .check{background:#43A047;border-color:#43A047;}
.fpick.on .check svg{opacity:1;transform:scale(1);}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin:0 2px 8px;}
.chips button{font:600 12.5px 'Inter',sans-serif;padding:8px 12px;border-radius:99px;border:1px solid var(--line);background:none;color:var(--muted);cursor:pointer;}
.chips button.on{border-color:var(--ink);color:var(--ink);background:#3A3935;}
.csel{width:100%;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:500 15px 'Inter',sans-serif;color:var(--ink);margin-bottom:9px;color-scheme:dark;}
.fhint{font-size:12px;color:var(--muted);margin:2px 2px 8px;line-height:1.4;}
`;
document.head.appendChild(css);

// ---------- helpers ----------
const pad=n=>String(n).padStart(2,'0');
const isoD=t=>t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());
const fromIso=s=>new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const addDays=(s,n)=>{const t=fromIso(s);t.setDate(t.getDate()+n);return isoD(t);};
const todayIso=()=>isoD(REAL);
const CHECK='<div class="check"><svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg></div>';
function label(key){const r=document.querySelector('.row[data-key="'+key+'"] .goal');return r?r.textContent:key;}
function sub(key){const r=document.querySelector('.row[data-key="'+key+'"] .freq');return r?r.textContent:'';}
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

// ---------- settings (focus list, goals) ----------
let settings={};
async function loadSettings(){
  try{const r=await window.storage.get(SKEY);const p=r&&r.value?JSON.parse(r.value):null;
    settings=(p&&p.review&&p.review.weekly)||{};}catch(e){settings={};}
}
async function setSetting(k,v){
  let p={};try{const r=await window.storage.get(SKEY);p=r&&r.value?JSON.parse(r.value):{};}catch(e){p={};}
  if(!p||typeof p!=='object')p={};
  if(!p.days)p.days={};
  if(!p.review)p.review={weekly:{},monthly:''};
  if(!p.review.weekly)p.review.weekly={};
  p.review.weekly[k]=v;settings=p.review.weekly;
  await window.storage.set(SKEY,JSON.stringify(p));
}
function focusKeys(){
  try{const f=JSON.parse(settings.focus||'null');if(Array.isArray(f))return f.filter(k=>DAILY_KEYS.includes(k)).slice(0,MAX_FOCUS);}catch(e){}
  return DEFAULT_FOCUS.slice();
}
function goals(){
  return Object.keys(settings).filter(k=>k.startsWith('goal:')&&settings[k]).map(k=>{try{return JSON.parse(settings[k]);}catch(e){return null;}})
    .filter(g=>g&&g.id&&g.key&&g.start).sort((a,b)=>String(a.start).localeCompare(String(b.start)));
}

// ---------- recent days (today's month and the two before), from the device copy ----------
let recent={};
async function loadRecent(){
  const out={};
  for(let back=2;back>=0;back--){
    const t=new Date(REAL.getFullYear(),REAL.getMonth()-back,1),y=t.getFullYear(),m=t.getMonth();
    let ds={};
    if(y===year&&m===month0)ds=days;
    else{try{const r=await window.storage.get('tracker:'+y+'-'+pad(m+1));const p=r&&r.value?JSON.parse(r.value):null;ds=(p&&p.days)||{};}catch(e){}}
    Object.keys(ds).forEach(d=>{out[y+'-'+pad(m+1)+'-'+pad(d)]=ds[d];});
  }
  recent=out;
}
const val=(key,iso)=>{const o=recent[iso];return o?o[key]:0;};
function streak(key){
  let d=todayIso();if(val(key,d)!==1)d=addDays(d,-1);
  let n=0;while(val(key,d)===1&&n<400){n++;d=addDays(d,-1);}return n;
}
// Where a new goal starts: at the beginning of the current streak (ending today, or yesterday
// while today is still open), counting at most days-1 so the goal is never reached at once.
function streakStart(key,days){
  const today=todayIso(),end=val(key,today)===1?today:addDays(today,-1);
  let n=0;while(n<days-1&&val(key,addDays(end,-n))===1)n++;
  return n?{start:addDays(end,-(n-1)),n,end}:{start:today,n:0,end:null};
}
function best(key){
  let b=0,run=0;Object.keys(recent).sort().forEach(d=>{if(val(key,d)===1){run++;b=Math.max(b,run);}else run=0;});return b;
}

// ---------- goal progress, worked out from the ticks ----------
// A goal counts days in a row with the habit ticked, from its start day up to today.
// "comp" goals allow one missed day: the goal grows by one day and the compensation must be
// marked done by the end of the next day. Otherwise (or on a second miss) it starts again.
function evalGoal(g){
  const today=todayIso(),comp=g.mode==='comp',done=g.compDone||[];
  let start=g.start,target=g.days,progress=0,miss=null,resetOn=null,won=null;
  for(let d=g.start,guard=0;d<=today&&guard<500;d=addDays(d,1),guard++){
    if(miss&&!done.includes(miss)&&d>addDays(miss,1)){ // compensation not done in time
      resetOn=d;start=d;target=g.days;progress=0;miss=null;}
    const v=val(g.key,d);
    if(v===1){progress++;if(progress>=target){won=d;break;}continue;}
    if(d===today)break;                                    // today is still open
    if(comp&&!miss){miss=d;target++;continue;}             // the one allowed miss
    resetOn=addDays(d,1);start=addDays(d,1);target=g.days;progress=0;miss=null;
  }
  return {start,target,progress,miss,resetOn,won,
    compDue:!!miss&&!done.includes(miss)&&today<=addDays(miss,1)};
}

// ---------- markup ----------
const cal=document.querySelector('.wrap .cal');
const box=document.createElement('div');box.className='trackOnly';box.id='focusBox';
box.innerHTML=`<div class="fcard"><div class="fh"><b id="fTitle">Today's focus</b><span class="fd" id="fDay"></span>
  <button type="button" class="flink" id="fEdit">Edit</button></div><div id="fRows"></div></div><div id="gBox"></div>`;
cal.parentNode.insertBefore(box,cal);

const wrap=document.createElement('div');wrap.className='csheet-wrap';
wrap.innerHTML=`<div class="dim"></div><div class="csheet" role="dialog" aria-modal="true" aria-labelledby="fsTitle">
  <div class="grab"></div><h3 id="fsTitle"></h3><div id="fsBody"></div><div class="cerr" id="fsErr"></div>
  <div class="cacts"><button type="button" id="fsCancel">Cancel</button><button type="button" class="csave" id="fsSave">Save</button></div></div>`;
document.body.appendChild(wrap);
const $=id=>document.getElementById(id);
let onSave=null;
function openSheet(title,body,save){$('fsTitle').textContent=title;const b=$('fsBody');b.innerHTML='';b.appendChild(body);$('fsErr').textContent='';onSave=save;wrap.classList.add('open');}
function closeSheet(){wrap.classList.remove('open');onSave=null;}
$('fsCancel').onclick=closeSheet;wrap.querySelector('.dim').onclick=closeSheet;
$('fsSave').onclick=async()=>{if(!onSave)return;const err=await onSave();if(err){$('fsErr').textContent=err;return;}closeSheet();render();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&wrap.classList.contains('open'))closeSheet();});

// ---------- focus card ----------
function drawFocus(){
  const isToday=year===REAL.getFullYear()&&month0===REAL.getMonth()&&sel===REAL.getDate();
  $('fTitle').textContent=isToday?"Today's focus":'Focus';
  $('fDay').textContent=DOW[new Date(year,month0,sel).getDay()]+' '+sel;
  const rows=$('fRows');rows.innerHTML='';
  const o=days[sel]||{};
  focusKeys().forEach(k=>{
    const v=o[k]||0,r=document.createElement('div');r.className='frow'+(v===1?' done':v===2?' fail':'');
    r.setAttribute('role','button');r.tabIndex=0;
    r.innerHTML=CHECK+'<div><div class="ft"></div><div class="fs"></div></div><span class="fstreak"></span>';
    r.querySelector('.ft').textContent=label(k);r.querySelector('.fs').textContent=sub(k);
    const s=streak(k),st=r.querySelector('.fstreak');
    if(s>0)st.textContent='🔥 '+s+' day'+(s>1?'s':'');
    else{const bb=best(k);st.classList.add('cold');st.textContent=bb?'best '+bb+' day'+(bb>1?'s':''):'';}
    const tap=()=>{const d=dayObj(sel);d[k]=((d[k]||0)+1)%3;save();};
    r.onclick=tap;r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap();}};
    rows.appendChild(r);
  });
}
$('fEdit').onclick=()=>{
  let pick=focusKeys();
  const body=document.createElement('div');
  const hint=document.createElement('p');hint.className='fhint';hint.textContent='Pick up to 3. They stay in their usual sections too — ticking either place is the same tick.';
  body.appendChild(hint);
  const list=document.createElement('div');
  const draw=()=>{list.innerHTML='';DAILY_KEYS.forEach(k=>{const on=pick.includes(k);
    const r=document.createElement('div');r.className='fpick'+(on?' on':'');r.setAttribute('role','checkbox');r.setAttribute('aria-checked',on);r.tabIndex=0;
    r.innerHTML=CHECK+'<span></span>';r.querySelector('span').textContent=label(k);
    const t=()=>{if(on)pick=pick.filter(x=>x!==k);else if(pick.length<MAX_FOCUS)pick=pick.concat(k);else{$('fsErr').textContent='Up to 3 — untick one first.';return;}
      $('fsErr').textContent='';draw();};
    r.onclick=t;r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();t();}};list.appendChild(r);});};
  draw();body.appendChild(list);
  openSheet('Edit focus',body,async()=>{if(!pick.length)return 'Pick at least one habit.';
    pick.sort((a,b)=>DAILY_KEYS.indexOf(a)-DAILY_KEYS.indexOf(b));await setSetting('focus',JSON.stringify(pick));});
};

// ---------- goal cards ----------
function drawGoals(){
  const host=$('gBox');host.innerHTML='';
  const gs=goals(),today=todayIso();
  gs.forEach(g=>{
    const e=evalGoal(g),c=document.createElement('div');
    c.className='gcard'+(e.won?' won':e.compDue?' miss':'');
    const t=document.createElement('div');t.className='gt';
    const tt=document.createElement('span');tt.textContent=(e.won?'🎉 ':'🎯 ')+label(g.key)+' '+g.days+' days in a row';
    const gr=document.createElement('span');gr.className='gr';gr.textContent=Math.min(e.progress,e.target)+' / '+e.target;
    t.append(tt,gr);c.appendChild(t);
    const s=document.createElement('div');s.className='gs';
    const rw=document.createElement('b');rw.textContent=g.reward||'—';
    if(e.won){s.append(g.claimed?'Reward claimed ✓ — well done! ':'Goal reached! Your reward: ',rw);}
    else{
      const left=e.target-e.progress;
      if(e.miss){const md=fromIso(e.miss);s.append('Missed '+DOW[md.getDay()]+' — goal is now '+e.target+' days · Reward: ',rw);}
      else{s.append('Reward: ',rw,' · '+left+' more day'+(left>1?'s':''));}
      if(e.resetOn&&e.resetOn>=addDays(today,-2)&&!e.miss){const rd=fromIso(e.resetOn);s.append(' · started again '+DOW[rd.getDay()]+' '+rd.getDate());}
    }
    c.appendChild(s);
    const pips=document.createElement('div');pips.className='gpips';
    for(let i=0;i<e.target;i++){const d=addDays(e.start,i),p=document.createElement('span');
      const dd=fromIso(d);p.textContent=DOW[dd.getDay()];
      if(val(g.key,d)===1)p.className='on';else if(d===e.miss)p.className='miss';
      if(d===today)p.classList.add('today');p.title=d;pips.appendChild(p);}
    c.appendChild(pips);
    if(e.compDue){const cp=document.createElement('div');cp.className='gcomp';
      const md=fromIso(addDays(e.miss,1));const tx=document.createElement('div');
      const b1=document.createElement('b');b1.style.color='#F2C14E';b1.textContent='Compensation: ';
      tx.append(b1,g.comp||'—');const br=document.createElement('div');br.style.color='var(--muted)';
      br.textContent='Do it by '+DOW[md.getDay()]+' night to keep the streak. Another miss starts again.';tx.appendChild(br);
      const b=document.createElement('button');b.type='button';b.className='gb';b.textContent='✓ Done';
      b.onclick=async()=>{const cd=(g.compDone||[]).concat(e.miss);await setSetting('goal:'+g.id,JSON.stringify(Object.assign({},g,{compDone:cd})));render();};
      cp.append(tx,b);c.appendChild(cp);}
    const f=document.createElement('div');f.className='gfoot';
    if(e.won&&!g.claimed){const cl=document.createElement('button');cl.type='button';cl.className='flink';cl.style.marginRight='14px';cl.textContent='Claim reward';
      cl.onclick=async()=>{await setSetting('goal:'+g.id,JSON.stringify(Object.assign({},g,{claimed:true})));render();};f.appendChild(cl);}
    const rm=document.createElement('button');rm.type='button';rm.className='flink';rm.textContent=e.won?'Remove':'Remove goal';
    rm.onclick=async()=>{if(!e.won&&!confirm('Remove this goal?'))return;await setSetting('goal:'+g.id,'');render();};
    f.appendChild(rm);c.appendChild(f);
    host.appendChild(c);
  });
  if(gs.length<MAX_GOALS){const b=document.createElement('button');b.type='button';b.className='gnew';b.textContent='＋ Set a goal with a reward';b.onclick=newGoal;host.appendChild(b);}
}
function newGoal(){
  let key='tahajud',n=7,mode='comp';
  const body=document.createElement('div');
  const lab=t=>{const p=document.createElement('p');p.className='clbl';p.textContent=t;return p;};
  const selEl=document.createElement('select');selEl.className='csel';selEl.setAttribute('aria-label','Habit');
  DAILY_KEYS.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=label(k);if(k===key)o.selected=true;selEl.appendChild(o);});
  const sHint=document.createElement('p');sHint.className='fhint';
  const setS=()=>{const st=streakStart(key,n);
    if(!st.n){sHint.textContent='Starts counting today.';return;}
    const a=fromIso(st.start),z=fromIso(st.end);
    sHint.textContent='Counts your current streak: '+st.n+' day'+(st.n>1?'s':'')+' ('+DOW[a.getDay()]+' '+a.getDate()+(st.n>1?' – '+DOW[z.getDay()]+' '+z.getDate():'')+').';};
  selEl.onchange=()=>{key=selEl.value;setS();};
  const chips=(opts,cur,on)=>{const w=document.createElement('div');w.className='chips';
    opts.forEach(([v,t])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.classList.toggle('on',v===cur);
      b.onclick=()=>{w.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');on(v);};w.appendChild(b);});return w;};
  const reward=document.createElement('input');reward.className='cin';reward.maxLength=100;reward.placeholder='e.g. Buffet with wifey 🍽️';
  const comp=document.createElement('input');comp.className='cin';comp.maxLength=100;comp.placeholder='e.g. Sedekah RM10';
  const compBox=document.createElement('div');compBox.append(lab('Compensation'),comp);
  const hint=document.createElement('p');hint.className='fhint';
  const setHint=()=>{hint.textContent=mode==='comp'?'One missed day is allowed: the goal grows by 1 day and you do the compensation by the next night. Another miss starts again from 0.':'Any missed day starts again from 0.';compBox.style.display=mode==='comp'?'':'none';};
  body.append(lab('Habit'),selEl,sHint,lab('Days in a row'),chips([[3,'3 days'],[7,'7 days'],[14,'14 days'],[30,'30 days']],n,v=>{n=v;setS();}),
    lab('Reward'),reward,lab('If I miss a day'),chips([['comp','1 miss allowed, with compensation'],['strict','Start again from 0']],mode,v=>{mode=v;setHint();}),compBox,hint);
  setHint();setS();
  openSheet('New goal',body,async()=>{
    if(!reward.value.trim())return 'Add a reward to work towards.';
    if(mode==='comp'&&!comp.value.trim())return 'Add the compensation for a missed day.';
    const g={id:newId(),key,days:n,reward:reward.value.trim(),mode,comp:mode==='comp'?comp.value.trim():'',
      start:streakStart(key,n).start,compDone:[],claimed:false};
    await setSetting('goal:'+g.id,JSON.stringify(g));
  });
  setTimeout(()=>reward.focus(),50);
}

// ---------- hooks ----------
let drawing=false,again=false;
async function draw(){
  if(drawing){again=true;return;}drawing=true;
  try{do{again=false;await loadSettings();await loadRecent();drawFocus();drawGoals();}while(again);}
  finally{drawing=false;}
}
window.focusDraw=draw;
const baseRender=render;
render=function(){baseRender();if(!document.body.classList.contains('dashmode')&&!document.body.classList.contains('calmode'))draw();};
document.getElementById('tabTrack').addEventListener('click',()=>draw());
draw();
})();
