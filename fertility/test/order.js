const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const TJS='/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
(async()=>{const b=await chromium.launch();
const page=await(await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await page.route('**/*',r=>{const u=new URL(r.request().url());
 if(u.hostname==='cdn.jsdelivr.net'){const m=u.pathname.match(/three@[^/]+\/(.*)$/);
  if(m){const f=path.join(TJS,m[1]);if(fs.existsSync(f))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(f,'utf8')});}
  return r.fulfill({status:404,body:''});}
 if(u.hostname==='app.local')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf8"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
 return r.continue();});
await page.goto('http://app.local/');
await page.waitForFunction(()=>!!window.__nav,null,{timeout:40000});
const label=()=>page.evaluate(()=>{
  const ui=document.getElementById('ui');
  const e=ui.querySelector('.eyeb'),q=ui.querySelector('.q'),h=ui.querySelector('.h1'),k=ui.querySelector('.kick');
  return [(k&&k.textContent)||(e&&e.textContent)||'', (q&&q.textContent)||(h&&h.textContent)||''].join(' | ').slice(0,84);
});
const taps=[];
for(let i=0;i<70;i++){
  taps.push(await label());
  const done=await page.evaluate(()=>{
    const ui=document.getElementById('ui');
    const opts=[...ui.querySelectorAll('.opts .opt')];
    if(opts.length){
      const none=opts.find(o=>/^(None of these|No|Not trying yet|Under 6 months|Yes)$/.test(o.textContent.trim()));
      (none||opts[opts.length-1]).click();
      const nx=[...ui.querySelectorAll('button.btn')].find(b=>!b.disabled);
      if(nx) nx.click();
      return false;
    }
    const b=[...ui.querySelectorAll('button.btn')].find(x=>!x.disabled);
    if(b){b.click();return false;}
    return true;
  });
  await page.waitForTimeout(420);
  if(done){ await page.waitForTimeout(5200);
    const still=await page.evaluate(()=>{const ui=document.getElementById('ui');
      return !ui.querySelector('.opts .opt') && ![...ui.querySelectorAll('button.btn')].some(x=>!x.disabled);});
    if(still) break; else continue; }
  if(await page.evaluate(()=>!!document.querySelector('.sheet.plain .pill'))) {taps.push(await label());break;}
}
console.log('errors:',errs.length?errs.join(' | '):'none');
taps.forEach((t,i)=>console.log(String(i+1).padStart(2),t));
await b.close();})();
