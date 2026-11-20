const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const TJS = '/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await (await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e));
  page.on('console', m => { if (m.type()==='error') errs.push('CON: ' + m.text()); });
  await page.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.hostname === 'cdn.jsdelivr.net') {
      const m = u.pathname.match(/three@[^/]+\/(.*)$/);
      if (m) { const f = path.join(TJS, m[1]); if (fs.existsSync(f)) return r.fulfill({contentType:'text/javascript', body:fs.readFileSync(f,'utf8')}); }
      return r.fulfill({status:404, body:''});
    }
    if (u.hostname === 'app.local')
      return r.fulfill({contentType:'text/html', body:'<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+fs.readFileSync('index.html','utf8')+'</body></html>'});
    return r.continue();
  });
  await page.goto('http://app.local/');
  await page.waitForTimeout(3500);
  let n = 0;
  const snap = async t => { n++; await page.screenshot({path:'s'+String(n).padStart(2,'0')+'_'+t+'.png',animations:'disabled',timeout:90000}); };
  await snap('intro');
  for (let step = 0; step < 45; step++) {
    const opts = await page.$$('.opts .opt');
    const q = (await page.textContent('.q').catch(()=>'')) || '';
    if (opts.length) {
      let idx = Math.min(2, opts.length-1);
      if (/lump, swelling/.test(q)) idx = 3;
      await opts[idx].click(); await page.waitForTimeout(260);
      const nx = await page.$('button.btn:not([disabled])');
      if (nx) { await snap('q'+step); await nx.click(); await page.waitForTimeout(3600); }
      else await page.waitForTimeout(400);
    } else {
      const hdr = (await page.textContent('.h1').catch(()=>'')) || '';
      await snap('beat_'+hdr.slice(0,14).replace(/[^a-z0-9]+/gi,'_'));
      // the crawl advances on a tap, and has no .btn until it resolves
      let acted = await page.evaluate(()=>{
        const c=document.getElementById('crawl');
        if(c && c.classList.contains('on')){ c.click(); return 'crawl'; }
        const b=[...document.querySelectorAll('button.btn')].find(x=>!x.disabled);
        if(b){ b.click(); return 'btn'; }
        return null;
      });
      for (let w=0; !acted && w<6; w++) {
        await page.waitForTimeout(2500);
        acted = await page.evaluate(()=>{
          const c=document.getElementById('crawl');
          if(c && c.classList.contains('on')){ c.click(); return 'crawl'; }
          const b=[...document.querySelectorAll('button.btn')].find(x=>!x.disabled);
          if(b){ b.click(); return 'btn'; }
          return null;
        });
      }
      if (!acted) break;
      await page.waitForTimeout(acted==='crawl'?900:3600);
    }
    if (await page.$('.sheet.plain')) { await page.waitForTimeout(700); await snap('result'); break; }
  }
  console.log('errors:', errs.length ? errs.slice(0,6).join('\n  ') : 'none');
  console.log('shots:', fs.readdirSync('.').filter(f=>/^s\d\d_/.test(f)).sort().join(' '));
  await b.close();
})();
