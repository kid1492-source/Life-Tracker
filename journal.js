// Journal tab: read your Daily Reviews a week at a time, like flipping through a diary.
// Read-only; the Daily Review is written on Track. Uses the app's globals: REAL, MONTHS,
// readMonthDays(), showDay-like month loading via year/month0/sel, loadMonth(), flush(),
// render(), rtHtml(), rtText().
(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
#journal{display:none;}
.journalmode #journal{display:block;}
.journalmode .trackOnly,.journalmode .mnav{display:none;}
body.journalmode.jwide .wrap{max-width:1160px;}
.jcal{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 10px 12px;margin:0 0 16px;}
.jm{display:flex;align-items:center;gap:8px;margin:0 2px 10px;}
.jm .mn{flex:1;text-align:center;font-family:'Fraunces',serif;font-size:19px;font-weight:600;color:var(--ink);}
.jweeks{display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:6px;}
.jwk-b{display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:1px solid var(--line);border-radius:11px;padding:8px 4px 7px;color:var(--ink);font:inherit;cursor:pointer;min-width:0;}
.jwk-b .w{font-size:13px;font-weight:700;}
.jwk-b .r{font-size:10.5px;color:var(--muted);font-weight:600;line-height:1.25;text-align:center;}
.jwk-b .dots{display:flex;gap:3px;margin-top:2px;}
.jwk-b .dots i{width:5px;height:5px;border-radius:50%;background:#45443F;}
.jwk-b .dots i.on{background:#D9A15C;}
.jwk-b.now{border-color:#6b5426;}
.jwk-b.now .w::after{content:' •';color:var(--pine);}
.jwk-b.on{background:var(--pine);border-color:var(--pine);}
.jwk-b.on .r{color:#fff;opacity:.85;}
.jwk-b.on .dots i{background:rgba(255,255,255,.3);}
.jwk-b.on .dots i.on{background:#fff;}
.jwk-b.on.now .w::after{color:#fff;}
.jwh{display:flex;align-items:center;gap:8px;margin:0 2px 14px;}
.jwh .t{font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#D9A15C;line-height:1.15;}
.jwh .s{font-size:11.5px;color:var(--muted);font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
.jwh .nav{margin-left:auto;display:flex;gap:6px;flex:none;}
.jbtn{min-width:34px;height:34px;padding:0 10px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:600 13px 'Inter',sans-serif;cursor:pointer;}
.jwk{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-bottom:24px;}
body.jwide .jwk{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px;align-items:start;}
.jcol{display:grid;gap:12px;min-width:0;}
.jd{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px 14px;min-width:0;}
.jd.today{border-color:var(--pine);box-shadow:inset 0 0 0 1px var(--pine);}
.jd .hd{display:flex;align-items:flex-end;gap:10px;padding-bottom:8px;border-bottom:1.5px solid #4A4942;cursor:pointer;}
.jd .num{font-family:'Fraunces',serif;font-size:34px;font-weight:600;line-height:.9;color:#D9A15C;}
.jd.today .num{color:var(--pine);}
.jd.future .num{color:var(--ink);}
.jd .dn{font-size:15px;font-weight:600;line-height:1.2;}
.jd .dn small{display:block;font-size:11px;color:var(--muted);font-weight:500;}
.jd .hj{margin-left:auto;text-align:right;font-size:11.5px;color:var(--muted);font-weight:600;line-height:1.3;}
.jd .hj b{display:block;color:var(--ink);font-size:13px;font-weight:600;}
.jd .mood{margin-top:9px;font-size:12.5px;font-weight:700;color:#D9A15C;}
.jd .txt{margin-top:9px;font-size:14px;line-height:1.55;color:var(--ink);cursor:pointer;overflow-wrap:anywhere;}
.jd .mood+.txt{margin-top:4px;}
.jd .txt ul,.jd .txt ol{margin:2px 0;padding-left:18px;}
.jd .txt p{margin:0 0 4px;}
.jd .none{margin-top:9px;font-size:12.5px;color:#6E6C64;font-style:italic;}
`;
document.head.appendChild(css);

const wrap=document.querySelector('.wrap');
const box=document.createElement('div');box.id='journal';
box.innerHTML=`<div class="jcal">
  <div class="jm"><button type="button" class="jbtn" id="jmPrev" aria-label="Previous month">‹</button><span class="mn" id="jmName"></span><button type="button" class="jbtn" id="jmNext" aria-label="Next month">›</button></div>
  <div class="jweeks" id="jmWeeks"></div></div>
<div class="jwh"><div><div class="t" id="jwTitle"></div><div class="s" id="jwSub"></div></div>
  <span class="nav"><button type="button" class="jbtn" id="jwToday">This week</button></span></div>
<div class="jwk" id="jwGrid"></div>`;
wrap.insertBefore(box,document.getElementById('tip'));
const $=id=>document.getElementById(id);

const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const HIJRI=(()=>{try{return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'});}catch(e){return null;}})();
const hijri=d=>{if(!HIJRI)return '';try{return HIJRI.format(d).replace(/\s*AH$/,'');}catch(e){return '';}};
const MALAY=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
const DAYNAME=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MOODS={1:'😞 Low',2:'😐 Okay',3:'🙂 Good',4:'😄 Great'};
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);
  const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/864e5+1)/7);}
const mondayOf=d=>{const m=new Date(d.getFullYear(),d.getMonth(),d.getDate());m.setDate(m.getDate()-((m.getDay()+6)%7));return m;};

let start=null,tok=0,vm=null;            // vm: the month shown in the picker {y,m}
// Weeks of a month, Monday to Sunday. A week that spans two months belongs to the one holding
// most of its days (its Thursday), so every week is in exactly one month.
function monthWeeks(y,m){const out=[];let d=mondayOf(new Date(y,m,1));
  for(;;d.setDate(d.getDate()+7)){const th=new Date(d);th.setDate(d.getDate()+3);
    if(th.getFullYear()*12+th.getMonth()<y*12+m)continue;if(th.getMonth()!==m)break;out.push(new Date(d));}
  return out;}
const written=o=>!!(o&&o.note&&rtText(o.note));
async function drawPicker(months){
  const M3=m=>MONTHS[m].slice(0,3);
  $('jmName').textContent=MONTHS[vm.m]+' '+vm.y;
  const ws=monthWeeks(vm.y,vm.m),host=$('jmWeeks'),nowMon=iso(mondayOf(REAL));host.innerHTML='';
  for(const [i,w] of ws.entries()){
    const e=new Date(w);e.setDate(w.getDate()+6);
    const b=document.createElement('button');b.type='button';
    b.className='jwk-b'+(iso(w)===iso(start)?' on':'')+(iso(w)===nowMon?' now':'');
    b.innerHTML='<span class="w"></span><span class="r"></span><span class="dots"></span>';
    b.querySelector('.w').textContent='Week '+(i+1);
    b.querySelector('.r').textContent=(w.getMonth()!==e.getMonth()?w.getDate()+' '+M3(w.getMonth())+'–'+e.getDate()+' '+M3(e.getMonth()):w.getDate()+'–'+e.getDate());
    const dots=b.querySelector('.dots');let n=0;
    for(let k=0;k<7;k++){const d=new Date(w);d.setDate(w.getDate()+k);const key=d.getFullYear()+'-'+d.getMonth();
      if(!(key in months))months[key]=await readMonthDays(d.getFullYear(),d.getMonth());
      const on=written((months[key]||{})[d.getDate()]);if(on)n++;
      const dot=document.createElement('i');if(on)dot.className='on';dots.appendChild(dot);}
    b.setAttribute('aria-label','Week '+(i+1)+', '+b.querySelector('.r').textContent+', '+n+' of 7 days written');
    b.onclick=()=>{start=new Date(w);renderJournal();};
    host.appendChild(b);
  }
}
async function renderJournal(){
  if(!document.body.classList.contains('journalmode'))return;
  if(!start)start=mondayOf(REAL);
  if(!vm){const t=new Date(start);t.setDate(t.getDate()+3);vm={y:t.getFullYear(),m:t.getMonth()};}
  const my=++tok,end=new Date(start);end.setDate(start.getDate()+6);
  const M3=m=>MONTHS[m].slice(0,3);
  $('jwTitle').textContent=start.getDate()+(start.getMonth()!==end.getMonth()?' '+M3(start.getMonth()):'')+' – '+end.getDate()+' '+M3(end.getMonth())+' '+end.getFullYear();
  {const i=monthWeeks(vm.y,vm.m).findIndex(w=>iso(w)===iso(start));
    $('jwSub').textContent=i>=0?MONTHS[vm.m]+' · Week '+(i+1):'Week '+isoWeek(start);}
  const dates=[...Array(7)].map((_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
  const months={};
  for(const d of dates){const k=d.getFullYear()+'-'+d.getMonth();if(!(k in months))months[k]=await readMonthDays(d.getFullYear(),d.getMonth());}
  await drawPicker(months);
  if(my!==tok)return;
  const wide=window.innerWidth>=900;document.body.classList.toggle('jwide',wide);
  const g=$('jwGrid');g.innerHTML='';
  // Tablet: Mon–Thu on the left, Fri–Sun on the right, like a paper diary.
  const cols=wide?[0,1].map(()=>{const c=document.createElement('div');c.className='jcol';g.appendChild(c);return c;}):null;
  const tIso=iso(REAL);
  dates.forEach((d,i)=>{
    const dIso=iso(d),o=(months[d.getFullYear()+'-'+d.getMonth()]||{})[d.getDate()]||{};
    const c=document.createElement('div');c.className='jd'+(dIso===tIso?' today':dIso>tIso?' future':'');
    const hd=document.createElement('div');hd.className='hd';
    hd.innerHTML='<span class="num"></span><span class="dn"></span><span class="hj"><b></b><span></span></span>';
    hd.querySelector('.num').textContent=d.getDate();
    hd.querySelector('.dn').textContent=DAYNAME[d.getDay()];
    const sm=document.createElement('small');sm.textContent=dIso===tIso?'Today':M3(d.getMonth())+' '+d.getFullYear();hd.querySelector('.dn').appendChild(sm);
    hd.querySelector('.hj b').textContent=MALAY[d.getDay()];hd.querySelector('.hj span').textContent=hijri(d);
    hd.onclick=()=>openDay(d);
    c.appendChild(hd);
    if(MOODS[o.mood]){const md=document.createElement('div');md.className='mood';md.textContent=MOODS[o.mood];c.appendChild(md);}
    if(o.note&&rtText(o.note)){const t=document.createElement('div');t.className='txt';t.innerHTML=rtHtml(o.note);t.onclick=()=>openDay(d);c.appendChild(t);}
    else if(dIso<=tIso){const n=document.createElement('div');n.className='none';n.textContent='Nothing written';c.appendChild(n);}
    (cols?cols[i<4?0:1]:g).appendChild(c);
  });
}
// Tap a day: open it on Track at its Daily Review, where it is written.
async function openDay(d){
  if(d.getFullYear()!==year||d.getMonth()!==month0){await flush();year=d.getFullYear();month0=d.getMonth();await loadMonth();}
  sel=d.getDate();window.trackerSetView('track');render();
  const r=document.getElementById('dayNote');if(r)setTimeout(()=>window.scrollTo({top:r.getBoundingClientRect().top+window.scrollY-120}),60);
}
// Month arrows: show that month's weeks and open its first week (or this week, in this month).
const moveMonth=n=>{const t=new Date(vm.y,vm.m+n,1);vm={y:t.getFullYear(),m:t.getMonth()};
  const nowMon=mondayOf(REAL),ws=monthWeeks(vm.y,vm.m);start=new Date(ws.find(w=>iso(w)===iso(nowMon))||ws[0]);renderJournal();};
$('jmPrev').onclick=()=>moveMonth(-1);
$('jmNext').onclick=()=>moveMonth(1);
$('jwToday').onclick=()=>{start=mondayOf(REAL);vm=null;renderJournal();};
window.addEventListener('resize',()=>{if(document.body.classList.contains('journalmode'))renderJournal();});
window.renderJournal=renderJournal;
})();
