// Track tab: FCPO learning hours, shown like play time in a game.
// Sessions are stored per day as o.tl = {items:[{id,m,at,l}], run:{s,l}}: m = minutes,
// and the day's learning note as o.tlNote (same rich-text format as the other notes);
// at = start time (ms), l = label. run = a timer that is going (start time in ms).
// The day's record syncs like ticks; lists of items merge item by item across devices.
// Reaching the daily target ticks the "Trading — CQG practice" habit (key cqg).
// Uses the app's globals: year, month0, sel, days, REAL, DOW, MONTHS, dayObj(), save(),
// render(), window.storage.
(function(){
'use strict';
const TARGET=60;                       // minutes per day
const LABELS=['Chart reading','Backtest','Sim trading','Review','Course'];
const MILESTONES=[1,5,10,25,50,100,250,500,1000,2000,5000];   // hours
const FORGOT=180;                      // minutes: ask before saving a longer timer

// ---------- styles ----------
const css=document.createElement('style');
css.textContent=`
.tl{background:linear-gradient(180deg,#2f2a1f,#2b2b29);border:1px solid #5c4a26;border-radius:16px;padding:14px 14px 10px;margin-bottom:12px;box-shadow:var(--shadow);}
.tl .h{display:flex;align-items:center;gap:8px;}
.tl .h b{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#D9A15C;}
.tl .h .st{margin-left:auto;font-size:13px;font-weight:700;color:#F2C14E;white-space:nowrap;}
.tl .h .st.cold{color:var(--muted);font-weight:600;font-size:12px;}
.tl .tot{display:flex;align-items:baseline;gap:8px;margin:6px 0 2px;}
.tl .tot .n{font-family:'Fraunces',serif;font-size:38px;font-weight:600;color:#F2C14E;line-height:1;letter-spacing:-.01em;}
.tl .tot .u{font-size:12px;color:var(--muted);font-weight:600;}
.tl .ms{font-size:12px;color:var(--muted);margin:6px 0 4px;}
.tl .ms b{color:var(--ink);}
.tl .bar{height:7px;background:var(--track);border-radius:99px;overflow:hidden;}
.tl .bar span{display:block;height:100%;border-radius:99px;background:#D9A15C;}
.tl .today{display:flex;align-items:center;gap:10px;margin:12px 0 4px;font-size:13px;font-weight:700;}
.tl .today .lbl{color:var(--ink);white-space:nowrap;}
.tl .today .bar{flex:1;}
.tl .today .bar span{background:#43A047;}
.tl .today .v{color:var(--muted);white-space:nowrap;font-weight:600;}
.tl .today .v.hit{color:#7DCB7D;}
.tl .per{display:flex;gap:16px;font-size:12px;color:var(--muted);margin:2px 0 10px;}
.tl .per b{color:var(--ink);}
.tl .chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px;}
.tl .chips button{font:600 12px 'Inter',sans-serif;padding:6px 10px;border-radius:99px;border:1px solid var(--line);background:none;color:var(--muted);cursor:pointer;}
.tl .chips button.on{border-color:#D9A15C;color:#F2C14E;background:#38301F;}
.tl .acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.tl .go{background:#43A047;border:0;color:#fff;font:700 14px 'Inter',sans-serif;border-radius:10px;padding:10px 16px;cursor:pointer;}
.tl .go.stop{background:#C0392B;}
.tl .go.wide{flex:1;}
.tl .q{background:#3A3935;border:1px solid var(--line);color:var(--ink);font:600 12.5px 'Inter',sans-serif;border-radius:9px;padding:8px 10px;cursor:pointer;}
.tl .tin{width:7ch;background:#262624;border:1px solid var(--line);border-radius:9px;color:var(--ink);font:600 13px 'Inter',sans-serif;padding:8px;text-align:center;}
.tl .tin:focus{outline:none;border-color:var(--pine);}
.tl .tin.bad{border-color:#F07070;}
.tl .run{display:flex;align-items:center;gap:10px;margin:2px 0 8px;}
.tl .run .clock{font-family:'Fraunces',serif;font-size:26px;font-weight:600;color:#7DCB7D;font-variant-numeric:tabular-nums;}
.tl .run .rl{font-size:12px;color:var(--muted);}
.tl .warn{background:#38301F;border:1px solid #6b5426;border-radius:10px;padding:10px;font-size:12.5px;color:#F2C14E;margin:0 0 8px;line-height:1.45;}
.tl .warn .acts{margin-top:8px;}
.tl .ses{margin-top:10px;border-top:1px solid rgba(255,255,255,.07);}
.tl .ses .r{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;}
.tl .ses .r:last-child{border-bottom:0;}
.tl .ses .t{color:var(--muted);min-width:7ch;}
.tl .ses .m{color:#F2C14E;font-weight:700;min-width:6ch;}
.tl .ses .l{flex:1;color:var(--ink);}
.tl .ses button{background:none;border:0;color:var(--muted);font:600 13px 'Inter',sans-serif;cursor:pointer;padding:2px 4px;}
.tlnote{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px 10px;margin:-4px 0 12px;box-shadow:var(--shadow);}
.tlnote .nh{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;}
.tlnote .nh b{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#D9A15C;}
.tlnote .nh span{margin-left:auto;font-size:11.5px;color:var(--muted);}
.tl .ses .hd{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:8px 0 2px;}
`;
document.head.appendChild(css);

// ---------- helpers ----------
const pad=n=>String(n).padStart(2,'0');
const isoD=t=>t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());
const fromIso=s=>new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const addDays=(s,n)=>{const t=fromIso(s);t.setDate(t.getDate()+n);return isoD(t);};
const todayIso=()=>isoD(new Date());
const selIso=()=>year+'-'+pad(month0+1)+'-'+pad(sel);
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmt=m=>{m=Math.round(m);const h=Math.floor(m/60),r=m%60;return h?(h+'h'+(r?' '+r+'m':'')):r+'m';};
const fmtH=h=>h>=1?(Math.round(h*10)/10)+'h':Math.round(h*60)+'m';
const clock=ms=>{const s=Math.max(0,Math.floor(ms/1000));return pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60);};
function parseMins(v){
  v=String(v||'').trim().toLowerCase().replace(/\s+/g,'');if(!v)return null;let m;
  if((m=v.match(/^(\d+):(\d{1,2})$/)))return +m[1]*60+ +m[2];
  if((m=v.match(/^(\d+(?:\.\d+)?)h(?:r|rs|ours?)?(?:(\d+)m?(?:ins?)?)?$/)))return Math.round(+m[1]*60)+(+m[2]||0);
  if((m=v.match(/^(\d+)(?:m|min|mins)?$/)))return +m[1];
  return null;
}
const tlOf=o=>(o&&o.tl&&typeof o.tl==='object')?o.tl:{};
const itemsOf=o=>Array.isArray(tlOf(o).items)?tlOf(o).items:[];
const dayMins=o=>itemsOf(o).reduce((a,x)=>a+(+x.m||0),0);
let label=(()=>{try{return localStorage.getItem('tlLabel')||'';}catch(e){return '';}})();

// ---------- all days on this device, by date ----------
let all={};
async function loadAll(){
  const out={};
  let keys=[];try{keys=((await window.storage.list('tracker:'))||{}).keys||[];}catch(e){}
  for(const k of keys){
    const m=k.match(/^tracker:(\d{4})-(\d{2})$/);if(!m)continue;
    if(+m[1]===year&&+m[2]===month0+1)continue;
    try{const r=await window.storage.get(k);const p=r&&r.value?JSON.parse(r.value):null;
      Object.keys((p&&p.days)||{}).forEach(d=>{out[m[1]+'-'+m[2]+'-'+pad(d)]=p.days[d];});}catch(e){}
  }
  Object.keys(days).forEach(d=>{out[year+'-'+pad(month0+1)+'-'+pad(d)]=days[d];});   // the month on screen is the freshest
  all=out;
}
// Change one day's record, wherever its month is (the month on screen, or another month's copy).
async function editDay(iso,fn){
  if(+iso.slice(0,4)===year&&+iso.slice(5,7)===month0+1){fn(dayObj(+iso.slice(8,10)));save();return;}
  const k='tracker:'+iso.slice(0,7);let p={};
  try{const r=await window.storage.get(k);p=r&&r.value?JSON.parse(r.value):{};}catch(e){p={};}
  if(!p.days)p.days={};if(!p.review)p.review={weekly:{},monthly:''};
  const d=String(+iso.slice(8,10));
  if(!p.days[d])p.days[d]=(typeof blankDay==='function')?blankDay():{};
  fn(p.days[d]);
  await window.storage.set(k,JSON.stringify(p));
  render();
}
function addSession(o,m,at,l){
  if(!o.tl||typeof o.tl!=='object')o.tl={};
  if(!Array.isArray(o.tl.items))o.tl.items=[];
  o.tl.items.push(Object.assign({id:newId(),m:Math.round(m),at},l?{l}:{}));
  if(dayMins(o)>=TARGET&&o.cqg!==1)o.cqg=1;     // daily target reached: tick CQG practice
}
// A timer that is going, on today or yesterday (if it ran past midnight).
function running(){
  for(const iso of [todayIso(),addDays(todayIso(),-1)]){const r=tlOf(all[iso]).run;if(r&&r.s)return {iso,run:r};}
  return null;
}

// ---------- numbers ----------
function stats(){
  const t=todayIso();let total=0,week=0,month=0;
  const dow=(fromIso(t).getDay()+6)%7,wk=addDays(t,-dow),mk=t.slice(0,7);
  Object.keys(all).forEach(iso=>{const m=dayMins(all[iso]);if(!m)return;total+=m;
    if(iso>=wk&&iso<=t)week+=m;if(iso.slice(0,7)===mk)month+=m;});
  let d=t;if(dayMins(all[d])<TARGET)d=addDays(d,-1);
  let streak=0;while(dayMins(all[d])>=TARGET&&streak<2000){streak++;d=addDays(d,-1);}
  let best=0,run=0;Object.keys(all).sort().forEach((iso,i,a)=>{
    const ok=dayMins(all[iso])>=TARGET,prevOk=i&&a[i-1]===addDays(iso,-1);
    run=ok?(prevOk&&run?run+1:1):0;best=Math.max(best,run);});
  return {total,week,month,streak,best};
}

// ---------- markup ----------
const cal=document.querySelector('.wrap .cal');
const box=document.createElement('div');box.className='trackOnly';box.id='tlBox';
const after=document.getElementById('focusBox')||cal;     // under Early wins and the goals
after.parentNode.insertBefore(box,after.nextSibling);
// The card is redrawn often; the note lives beside it so typing is never interrupted.
const cardHost=document.createElement('div');box.appendChild(cardHost);
const noteWrap=document.createElement('div');noteWrap.className='tlnote';
noteWrap.innerHTML='<div class="nh"><b>✎ What I learned</b><span></span></div><div data-min="80" data-ph="Today\'s FCPO learning: setups, mistakes, rules to remember…"></div>';
box.appendChild(noteWrap);
const noteDay=noteWrap.querySelector('.nh span');
const noteEd=richEditor(noteWrap.querySelector('[data-min]'),v=>{dayObj(sel).tlNote=v;scheduleSave();});
let tick=null,confirmDel='',stopAsk=false;

function draw(){
  const s=stats(),r=running(),o=days[sel]||{},isToday=selIso()===todayIso();
  const live=r?(Date.now()-r.run.s)/60000:0;
  const totalM=s.total+live,H=totalM/60;
  const next=MILESTONES.find(x=>x>H)||MILESTONES[MILESTONES.length-1]*2,prev=[...MILESTONES].reverse().find(x=>x<=H)||0;
  const dm=dayMins(o)+(r&&r.iso===selIso()?live:0);
  cardHost.innerHTML='';
  noteDay.textContent=isToday?'Today':DOW[new Date(year,month0,sel).getDay()]+' '+sel+' '+MONTHS[month0].slice(0,3);
  noteEd.set(typeof o.tlNote==='string'?o.tlNote:'');
  const c=document.createElement('div');c.className='tl';
  c.innerHTML=`<div class="h"><b>📈 FCPO learning</b><span class="st"></span></div>
    <div class="tot"><span class="n"></span><span class="u">total</span></div>
    <div class="bar"><span></span></div><div class="ms"></div>
    <div class="today"><span class="lbl"></span><div class="bar"><span></span></div><span class="v"></span></div>
    <div class="per"></div><div class="tlctl"></div><div class="ses"></div>`;
  const st=c.querySelector('.st');
  if(s.streak){st.textContent='🔥 '+s.streak+' day'+(s.streak>1?'s':'');}
  else{st.classList.add('cold');st.textContent=s.best?'best '+s.best+' day'+(s.best>1?'s':''):'';}
  c.querySelector('.tot .n').textContent=fmt(totalM);
  c.querySelector('.bar span').style.width=Math.min(100,(H-prev)/(next-prev)*100)+'%';
  const ms=c.querySelector('.ms');ms.append('Next milestone: ');const nb=document.createElement('b');nb.textContent=next+'h';ms.append(nb,' · '+fmt(next*60-totalM)+' to go');
  c.querySelector('.today .lbl').textContent=isToday?'Today':DOW[new Date(year,month0,sel).getDay()]+' '+sel;
  c.querySelector('.today .bar span').style.width=Math.min(100,dm/TARGET*100)+'%';
  const v=c.querySelector('.today .v');v.textContent=fmt(dm)+' / '+fmt(TARGET)+(dm>=TARGET?' ✓':'');v.classList.toggle('hit',dm>=TARGET);
  const per=c.querySelector('.per');
  [['This week',s.week+(r?live:0)],['This month',s.month+(r&&r.iso.slice(0,7)===todayIso().slice(0,7)?live:0)]].forEach(([t,m])=>{
    const sp=document.createElement('span');sp.append(t+' ');const b=document.createElement('b');b.textContent=fmt(m);sp.appendChild(b);per.appendChild(sp);});

  const ctl=c.querySelector('.tlctl');
  if(r){
    const rw=document.createElement('div');rw.className='run';
    rw.innerHTML='<span class="clock"></span><span class="rl"></span>';
    rw.querySelector('.clock').textContent=clock(Date.now()-r.run.s);
    rw.querySelector('.rl').textContent='running'+(r.run.l?' · '+r.run.l:'')+(r.iso!==todayIso()?' · since yesterday':'');
    ctl.appendChild(rw);
    if(live>FORGOT||stopAsk){
      const w=document.createElement('div');w.className='warn';
      w.textContent=live>FORGOT?'The timer has run '+fmt(live)+'. Forgot to stop it? Save the time you actually studied:':'Save this session:';
      const a=document.createElement('div');a.className='acts';
      const inp=document.createElement('input');inp.className='tin';inp.value=fmt(live);inp.setAttribute('aria-label','Minutes studied');
      const sv=document.createElement('button');sv.type='button';sv.className='q';sv.textContent='Save';
      sv.onclick=()=>{const m=parseMins(inp.value);if(m==null||m<1||m>720){inp.classList.add('bad');return;}stopTimer(r,m);};
      const dc=document.createElement('button');dc.type='button';dc.className='q';dc.textContent='Discard';dc.onclick=()=>stopTimer(r,0);
      a.append(inp,sv,dc);w.appendChild(a);ctl.appendChild(w);
    }
    const a=document.createElement('div');a.className='acts';
    const stop=document.createElement('button');stop.type='button';stop.className='go stop wide';stop.textContent='■ Stop';
    stop.onclick=()=>{const now=(Date.now()-r.run.s)/60000;   // time at the moment of tapping
      if(now>FORGOT){stopAsk=true;draw();return;}stopTimer(r,now);};
    a.appendChild(stop);ctl.appendChild(a);
  }else{
    const ch=document.createElement('div');ch.className='chips';
    LABELS.forEach(l=>{const b=document.createElement('button');b.type='button';b.textContent=l;b.classList.toggle('on',l===label);
      b.onclick=()=>{label=label===l?'':l;try{localStorage.setItem('tlLabel',label);}catch(e){}draw();};ch.appendChild(b);});
    ctl.appendChild(ch);
    if(isToday){const g=document.createElement('div');g.className='acts';g.style.marginBottom='6px';
      const go=document.createElement('button');go.type='button';go.className='go wide';go.textContent='▶ Start session';go.onclick=startTimer;g.appendChild(go);ctl.appendChild(g);}
    const a=document.createElement('div');a.className='acts';
    [15,30,60].forEach(m=>{const b=document.createElement('button');b.type='button';b.className='q';b.textContent='+'+fmt(m);
      b.onclick=()=>editDay(selIso(),d=>addSession(d,m,Date.now(),label));a.appendChild(b);});
    const inp=document.createElement('input');inp.className='tin';inp.placeholder='45';inp.setAttribute('aria-label','Add minutes, e.g. 45 or 1:30');
    const add=document.createElement('button');add.type='button';add.className='q';add.textContent='Add';
    const doAdd=()=>{const m=parseMins(inp.value);if(m==null||m<1||m>720){inp.classList.add('bad');setTimeout(()=>inp.classList.remove('bad'),1500);return;}
      editDay(selIso(),d=>addSession(d,m,Date.now(),label));};
    add.onclick=doAdd;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doAdd();}};
    a.append(inp,add);ctl.appendChild(a);
  }

  const list=itemsOf(o),ses=c.querySelector('.ses');
  if(list.length){
    const hd=document.createElement('div');hd.className='hd';hd.textContent=(isToday?"Today's":DOW[new Date(year,month0,sel).getDay()]+' '+sel)+' sessions';ses.appendChild(hd);
    list.forEach(x=>{const rw=document.createElement('div');rw.className='r';
      const t=document.createElement('span');t.className='t';t.textContent=x.at?new Date(x.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
      const m=document.createElement('span');m.className='m';m.textContent=fmt(x.m);
      const l=document.createElement('span');l.className='l';l.textContent=x.l||'';
      const del=document.createElement('button');del.type='button';del.textContent=confirmDel===x.id?'Delete?':'×';
      del.setAttribute('aria-label','Remove this session');
      del.onclick=()=>{if(confirmDel!==x.id){confirmDel=x.id;draw();return;}confirmDel='';
        editDay(selIso(),d=>{if(d.tl&&Array.isArray(d.tl.items))d.tl.items=d.tl.items.filter(y=>y.id!==x.id);});};
      rw.append(t,m,l,del);ses.appendChild(rw);});
  }
  cardHost.appendChild(c);
  clearInterval(tick);
  if(r)tick=setInterval(()=>{const el=box.querySelector('.run .clock');if(!el){clearInterval(tick);return;}
    const nowLive=(Date.now()-r.run.s)/60000;el.textContent=clock(Date.now()-r.run.s);
    box.querySelector('.tot .n').textContent=fmt(s.total+nowLive);
    if(r.iso===selIso()){const dmNow=dayMins(o)+nowLive,tv=box.querySelector('.today .v');
      tv.textContent=fmt(dmNow)+' / '+fmt(TARGET)+(dmNow>=TARGET?' ✓':'');tv.classList.toggle('hit',dmNow>=TARGET);
      box.querySelector('.today .bar span').style.width=Math.min(100,dmNow/TARGET*100)+'%';}
    if(Math.floor(nowLive)!==Math.floor(live)&&nowLive>FORGOT&&live<=FORGOT)draw();},1000);
}
function startTimer(){
  const t=todayIso();
  editDay(t,d=>{if(!d.tl||typeof d.tl!=='object')d.tl={};d.tl.run=Object.assign({s:Date.now()},label?{l:label}:{});});
}
function stopTimer(r,mins){
  stopAsk=false;
  editDay(r.iso,d=>{
    const run=(d.tl&&d.tl.run)||r.run;if(d.tl)delete d.tl.run;
    if(mins>=1)addSession(d,mins,run.s,run.l||'');
  });
}

// ---------- hooks ----------
let drawing=false,again=false;
async function refresh(){
  if(drawing){again=true;return;}drawing=true;
  try{do{again=false;await loadAll();draw();}while(again);}finally{drawing=false;}
}
const baseRender=render;
render=function(){baseRender();if(!document.body.classList.contains('dashmode')&&!document.body.classList.contains('calmode'))refresh();};
document.getElementById('tabTrack').addEventListener('click',()=>refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
refresh();
})();
