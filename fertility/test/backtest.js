const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const TJS='/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await(await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,160)));
page.on('console',m=>{if(m.type()==='error')errs.push('CON: '+m.text().slice(0,140))});
await page.route('**/*',r=>{const u=new URL(r.request().url());
 if(u.hostname==='cdn.jsdelivr.net'){const m=u.pathname.match(/three@[^/]+\/(.*)$/);
  if(m){const f=path.join(TJS,m[1]);if(fs.existsSync(f))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(f,'utf8')});}
  return r.fulfill({status:404,body:''});}
 if(u.hostname==='app.local')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf8"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
 return r.continue();});
await page.goto('http://app.local/');
await page.waitForFunction(()=>!!window.__nav,null,{timeout:40000});
await page.waitForTimeout(1600);
const r = await page.evaluate(async ()=>{
  const A=window.__A, out=[];
  const ui=()=>document.getElementById('ui');
  const q=()=>(ui().querySelector('.q')||{}).textContent||'';
  const eyeb=()=>(ui().querySelector('.eyeb')||{}).textContent||'';
  const opts=()=>[...ui().querySelectorAll('.opts .opt')];
  const back=()=>ui().querySelector('.backb');
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  // straight into the questions
  window.__nav.section ? 0 : 0;
  document.querySelector('button.btn').click();            // Show me mine
  await wait(1400); document.getElementById('crawl').click();
  for(let i=0;i<5;i++){await wait(400);const c=document.getElementById('crawl');
    if(c.classList.contains('on'))c.click();}
  await wait(900);
  const go=[...ui().querySelectorAll('button.btn')].find(x=>!x.disabled); if(go)go.click();
  await wait(900);
  const go2=[...ui().querySelectorAll('button.btn')].find(x=>!x.disabled); if(go2)go2.click();
  await wait(900);
  out.push('Q1 shown      : '+eyeb()+' | back visible: '+!!back());
  // answer Q1 with testosterone, continue
  opts()[0].click(); await wait(300);
  out.push('after tick    : flags.testosterone='+!!A.flags.testosterone+' (not yet committed)');
  [...ui().querySelectorAll('button.btn')].find(x=>!x.disabled).click(); await wait(900);
  out.push('Q2 shown      : '+eyeb()+' | back visible: '+!!back()+' | testosterone='+!!A.flags.testosterone);
  // go back
  back().click(); await wait(900);
  const ticked=opts().filter(o=>o.getAttribute('aria-pressed')==='true').length;
  out.push('after BACK    : '+eyeb()+' | ticks restored: '+ticked);
  // change the answer to "None of these" and continue
  const none=opts().find(o=>/None of these/.test(o.textContent));
  none.click(); await wait(500);
  out.push('after change  : testosterone='+!!A.flags.testosterone+' (recomputed on commit)');
  await wait(600);
  out.push('now on        : '+eyeb());
  return out;
});
r.forEach(x=>console.log(' ',x));
console.log('errors:',errs.length?errs.slice(0,4).join('\n   '):'none');
await b.close();})();
