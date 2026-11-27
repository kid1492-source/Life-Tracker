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
box.innerHTML=`<div class="jwh"><div><div class="t" id="jwTitle"></div><div class="s" id="jwSub"></div></div>
  <span class="nav"><button type="button" class="jbtn" id="jwToday">This week</button><button type="button" class="jbtn" id="jwPrev" aria-label="Previous week">‹</button><button type="button" class="jbtn" id="jwNext" aria-label="Next week">›</button></span></div>
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

let start=null,tok=0;
async function renderJournal(){
  if(!document.body.classList.contains('journalmode'))return;
  if(!start)start=mondayOf(REAL);
  const my=++tok,end=new Date(start);end.setDate(start.getDate()+6);
  const M3=m=>MONTHS[m].slice(0,3);
  $('jwTitle').textContent=start.getDate()+(start.getMonth()!==end.getMonth()?' '+M3(start.getMonth()):'')+' – '+end.getDate()+' '+M3(end.getMonth())+' '+end.getFullYear();
  $('jwSub').textContent='Week '+isoWeek(start)+' · Journal';
  const dates=[...Array(7)].map((_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
  const months={};
  for(const d of dates){const k=d.getFullYear()+'-'+d.getMonth();if(!(k in months))months[k]=await readMonthDays(d.getFullYear(),d.getMonth());}
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
const move=n=>{start=new Date(start);start.setDate(start.getDate()+7*n);renderJournal();window.scrollTo(0,0);};
$('jwPrev').onclick=()=>move(-1);
$('jwNext').onclick=()=>move(1);
$('jwToday').onclick=()=>{start=mondayOf(REAL);renderJournal();};
window.addEventListener('resize',()=>{if(document.body.classList.contains('journalmode'))renderJournal();});
window.renderJournal=renderJournal;
})();
