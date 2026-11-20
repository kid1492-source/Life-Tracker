const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const TJS='/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await(await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push(String(e).slice(0,160)));
  page.on('console',m=>{if(m.type()==='error')errs.push('CON: '+m.text().slice(0,140))});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
   if(u.hostname==='cdn.jsdelivr.net'){const m=u.pathname.match(/three@[^/]+\/(.*)$/);
    if(m){const f=path.join(TJS,m[1]);if(fs.existsSync(f))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(f,'utf8')});}
    return r.fulfill({status:404,body:''});}
   if(u.hostname==='app.local')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
   return r.continue();});
  await page.goto('http://app.local/');
  await page.waitForFunction(()=>!!window.__nav,null,{timeout:45000});
  await page.waitForTimeout(1200);
  // the opening crawl is an overlay; dismiss it before probing the UI beneath
  const noCrawl=()=>page.evaluate(()=>{const c=document.getElementById('crawl');
    if(c){c.classList.remove('on');c.style.display='none';}});
  await noCrawl();
  await page.waitForTimeout(300);

  const seen = async label => {
    const r = await page.evaluate(()=>({
      bar: !!document.querySelector('.topbar'),
      back: !!document.querySelector('.backb'),
      rest: !!document.querySelector('.restb'),
      head: (document.querySelector('.h1,.q')||{}).textContent||''
    }));
    console.log(label.padEnd(10), 'bar',r.bar?'y':'n', '| back',r.back?'y':'n', '| restart',r.rest?'y':'n', '|', r.head.slice(0,44));
    return r;
  };

  // every screen with a top bar must carry the restart
  for (const k of ['ctx','board','result','arrange','method','delivery','agent','lab']) {
    await page.evaluate(n=>window.__nav[n](), k); await page.waitForTimeout(600);
    await seen(k);
  }
  // a real question screen, and the two screens that had no way back
  await page.evaluate(()=>{window.__A.qi=0;window.__nav.ctx();});
  await page.waitForTimeout(400);
  const probe = async (label,fn) => { await page.evaluate(fn); await page.waitForTimeout(700); await seen(label); };
  await probe('question', ()=>{window.__A.qi=4;window.__scr.q();});
  await probe('section1', ()=>window.__scr.section(1));
  await probe('handoff0', ()=>window.__scr.handoff(0));

  // answer two questions, restart, confirm the answers are really gone
  await page.evaluate(()=>window.__nav.ctx()); await page.waitForTimeout(400);
  await page.evaluate(()=>{window.__A.answers={0:new Set([1]),1:new Set([2])};window.__A.flags={heat:true};window.__A.qi=5;});
  await page.click('.restb'); await page.waitForTimeout(400);
  const modal = await page.evaluate(()=>!!document.querySelector('.modal'));
  // cancelling must change nothing
  await page.evaluate(()=>[...document.querySelectorAll('.modal .ghost')][0].click());
  await page.waitForTimeout(300);
  const kept = await page.evaluate(()=>({n:Object.keys(window.__A.answers).length,modal:!!document.querySelector('.modal')}));
  // confirming must wipe
  await page.click('.restb'); await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelector('.modal .btn').click());
  await page.waitForTimeout(1200);
  const after = await page.evaluate(()=>({
    n:Object.keys(window.__A.answers).length, qi:window.__A.qi,
    flags:Object.keys(window.__A.flags).length,
    modal:!!document.querySelector('.modal'),
    onIntro:/would not feel a thing/.test((document.querySelector('.h1')||{}).textContent||'')}));
  console.log('\nconfirm dialog opens :', modal?'YES':'NO');
  console.log('cancel keeps answers :', kept.n===2 && !kept.modal ?'YES ('+kept.n+' kept)':'NO '+JSON.stringify(kept));
  console.log('confirm wipes all    :', after.n===0&&after.qi===0&&after.flags===0?'YES':'NO '+JSON.stringify(after));
  console.log('lands on the intro   :', after.onIntro?'YES':'NO');
  console.log('errors:', errs.length?errs.slice(0,4).join('\n  '):'none');
  await b.close();
})();
