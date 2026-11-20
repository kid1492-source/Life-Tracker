const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const TJS='/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
const serve = page => page.route('**/*',r=>{const u=new URL(r.request().url());
 if(u.hostname==='cdn.jsdelivr.net'){const m=u.pathname.match(/three@[^/]+\/(.*)$/);
  if(m){const f=path.join(TJS,m[1]);if(fs.existsSync(f))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(f,'utf8')});}
  return r.fulfill({status:404,body:''});}
 if(u.hostname==='app.local')return r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
 return r.continue();});
const noCrawl = p => p.evaluate(()=>{const c=document.getElementById('crawl');if(c){c.classList.remove('on');c.style.display='none';}});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,150)));
  await serve(page); await page.goto('http://app.local/');
  await page.waitForFunction(()=>!!window.__nav,null,{timeout:45000});
  await noCrawl(page); await page.waitForTimeout(500);

  // answer three questions for real
  await page.evaluate(()=>{window.__A.qi=0;window.__scr.q();});
  for(let i=0;i<3;i++){
    await page.waitForTimeout(500);
    const o=await page.$$('.opts .opt'); if(o.length) await o[Math.min(1,o.length-1)].click();
    await page.waitForTimeout(250);
    await page.evaluate(()=>{const x=[...document.querySelectorAll('button.btn')].find(y=>!y.disabled);if(x)x.click();});
  }
  await page.waitForTimeout(700);
  const before=await page.evaluate(()=>({qi:window.__A.qi,n:Object.keys(window.__A.answers).length,
    store:!!sessionStorage.getItem('fert.screen.v1')}));

  // RELOAD - the "a call came in" case
  await page.reload(); await page.waitForFunction(()=>!!window.__nav,null,{timeout:45000});
  await page.waitForTimeout(800);
  const survived=await page.evaluate(()=>!!sessionStorage.getItem('fert.screen.v1'));
  const hasResume=await page.evaluate(()=>[...document.querySelectorAll('button')]
    .some(x=>/Pick up where/.test(x.textContent)));
  await noCrawl(page);
  await page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(y=>/Pick up where/.test(y.textContent));if(x)x.click();});
  await page.waitForTimeout(900);
  const after=await page.evaluate(()=>({qi:window.__A.qi,n:Object.keys(window.__A.answers).length}));

  // BACK GESTURE - must step back a question, never leave the app
  const qBefore=after.qi;
  await page.goBack({timeout:5000}).catch(()=>{});
  await page.waitForTimeout(900);
  const ab=await page.evaluate(()=>({qi:window.__A.qi,alive:!!window.__A,
    ui:!!document.querySelector('.topbar')}));

  // REDUCED MOTION - shake suppressed, lighting dip retained
  const p2=await (await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})).newPage();
  await serve(p2); await p2.goto('http://app.local/');
  await p2.waitForFunction(()=>!!window.__SC,null,{timeout:45000});
  await p2.waitForTimeout(1600);
  const quiet=await p2.evaluate(async()=>{
    const SC=window.__SC; SC.look(0,7.6,0,3.0,1);
    await new Promise(r=>setTimeout(r,1500));
    const cam=SC.cam?SC.cam():null;
    SC.mark(0,7.6,0,'stop',0);
    const xs=[];
    for(let i=0;i<16;i++){await new Promise(r=>requestAnimationFrame(r));
      if(cam)xs.push(cam.position.x);}
    const mean=xs.reduce((a,c)=>a+c,0)/(xs.length||1);
    const spread=Math.sqrt(xs.reduce((a,c)=>a+(c-mean)*(c-mean),0)/(xs.length||1));
    return {reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, spread:+spread.toFixed(5), n:xs.length};
  });
  console.log('store written          :', before.store?'YES':'NO', '| answers', before.n, '| qi', before.qi);
  console.log('survives a reload      :', survived?'YES':'NO');
  console.log('resume button offered  :', hasResume?'YES':'NO');
  console.log('answers restored       :', after.n===before.n?('YES ('+after.n+')'):'NO '+JSON.stringify(after));
  console.log('back stays in the app  :', ab.alive&&ab.ui?'YES':'NO (app exited)');
  console.log('back steps a question  :', ab.qi<qBefore?('YES '+qBefore+'->'+ab.qi):'NO '+qBefore+'->'+ab.qi);
  console.log('reduced-motion honoured:', quiet.reduced?('media YES, camera spread '+quiet.spread+' over '+quiet.n+' frames'):'media NOT SET');
  console.log('errors:', errs.length?errs.slice(0,3).join('\n  '):'none');
  await b.close();
})();
