const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const TJS='/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
const serve = page => page.route('**/*',r=>{const u=new URL(r.request().url());
 if(u.hostname==='cdn.jsdelivr.net'){const m=u.pathname.match(/three@[^/]+\/(.*)$/);
  if(m){const f=path.join(TJS,m[1]);if(fs.existsSync(f))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(f,'utf8')});}
  return r.fulfill({status:404,body:''});}
 if(u.hostname==='app.local')return r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
 return r.continue();});

// identical probe, run once with motion allowed and once with it reduced
async function probe(b, mode){
  const p=await (await b.newContext({viewport:{width:390,height:844},reducedMotion:mode})).newPage();
  await serve(p); await p.goto('http://app.local/');
  await p.waitForFunction(()=>!!window.__SC,null,{timeout:45000});
  await p.waitForTimeout(1600);
  const out=await p.evaluate(async()=>{
    const SC=window.__SC, cam=SC.cam();
    SC.look(0,7.6,0,3.0,1);
    await new Promise(r=>setTimeout(r,2500));            // let the lerp fully settle
    const calm=[];
    for(let i=0;i<16;i++){await new Promise(r=>requestAnimationFrame(r));calm.push(cam.position.x);}
    SC.mark(0,7.6,0,'stop',0);                            // fire the stop tier
    const hit=[];
    for(let i=0;i<16;i++){await new Promise(r=>requestAnimationFrame(r));hit.push(cam.position.x);}
    const sd=a=>{const m=a.reduce((x,c)=>x+c,0)/a.length;
      return +Math.sqrt(a.reduce((x,c)=>x+(c-m)*(c-m),0)/a.length).toFixed(5);};
    return {media:matchMedia('(prefers-reduced-motion: reduce)').matches, calm:sd(calm), hit:sd(hit)};
  });
  return out;
}
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const on  = await probe(b,'no-preference');
  const off = await probe(b,'reduce');
  console.log('motion allowed : media',on.media, '| settled',on.calm, '-> on stop',on.hit);
  console.log('motion reduced : media',off.media,'| settled',off.calm,'-> on stop',off.hit);
  const shakes = on.hit > on.calm*3 + 0.0005;
  const quiet  = off.hit <= off.calm*3 + 0.0005;
  console.log('\nshakes when allowed :', shakes?'YES':'NO');
  console.log('silent when reduced :', quiet?'YES':'NO  <-- GATE NOT WORKING');
  await b.close();
})();
