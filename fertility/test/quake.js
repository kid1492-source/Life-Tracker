const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const TJS='/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await(await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,150)));
await page.route('**/*',r=>{const u=new URL(r.request().url());
 if(u.hostname==='cdn.jsdelivr.net'){const m=u.pathname.match(/three@[^/]+\/(.*)$/);
  if(m){const f=path.join(TJS,m[1]);if(fs.existsSync(f))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(f,'utf8')});}
  return r.fulfill({status:404,body:''});}
 if(u.hostname==='app.local')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
 return r.continue();});
await page.goto('http://app.local/');
await page.waitForFunction(()=>!!window.__SC,null,{timeout:40000});
await page.waitForTimeout(1500);

// frame the lump question and let it settle
await page.evaluate(()=>{const SC=window.__SC,q=window.__Q[4];
  SC.clearInter();SC.populate(true);SC.clearMarks();
  SC.look(q.f[0],q.f[1],q.f[2],q.f[3],2-q.s);SC.act(q.act);
  document.getElementById('ui').textContent='';});
await page.waitForTimeout(9000);
const opt={animations:'disabled',timeout:90000};
await page.screenshot(Object.assign({path:'qk_calm.png'},opt));

// probe a fixed point repeatedly: a steady camera gives a steady answer
const jitter = async ()=> await page.evaluate(async()=>{
  const SC=window.__SC, xs=[];
  for(let i=0;i<12;i++){ xs.push(SC.probe(0,7.6,0).sx); await new Promise(r=>requestAnimationFrame(r)); }
  return Math.max(...xs)-Math.min(...xs);
});
const calm = await jitter();

// now tell it about a lump
await page.evaluate(()=>{const SC=window.__SC,q=window.__Q[4];
  SC.mark(q.f[0],q.f[1],q.f[2],'stop',4);});
const shaking = await jitter();
await page.screenshot(Object.assign({path:'qk_stop.png'},opt));
await page.waitForTimeout(4000);
await page.screenshot(Object.assign({path:'qk_after.png'},opt));
console.log('camera spread, calm    :', calm.toFixed(5));
console.log('camera spread, on stop :', shaking.toFixed(5));
console.log('shaking:', shaking > calm*3 + 0.0005 ? 'YES' : 'no');
console.log('errors:', errs.length?errs.join(' | '):'none');
await b.close();})();
