const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const TJS = '/tmp/claude-0/-home-user-Life-Tracker/491d7a44-54fa-5605-b6ff-30383bc95445/scratchpad/mock3d/node_modules/three';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const W = 390, H = 844;
  const page = await (await b.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:2 })).newPage();
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

  const qText = () => page.textContent('.q').catch(()=>'');
  const live = () => page.textContent('#live').catch(()=>null);
  const shot = n => page.screenshot({ path: n, animations:'disabled', timeout:90000 });

  async function drag(frac, settle) {
    const y = 230;                                   // well above the card
    await page.mouse.move(W*0.10, y);
    await page.mouse.down();
    const to = W*(0.10 + 0.80*frac);
    for (let i=1;i<=8;i++) { await page.mouse.move(W*0.10 + (to-W*0.10)*i/8, y); await page.waitForTimeout(40); }
    await page.waitForTimeout(settle||900);
    const t = await live();
    await page.mouse.up();
    return t;
  }

  const found = {};
  for (let step=0; step<48; step++) {
    const opts = await page.$$('.opts .opt');
    const q = (await qText()) || '';
    if (opts.length) {
      const hasLive = await page.$('#live');
      if (hasLive) {
        const label = /supply|taking, or have you/.test(q) ? 'supply' : /heat/.test(q) ? 'heat' : 'block';
        await page.waitForTimeout(5000);
        found[label] = { at0: await live() };
        await shot('z_' + label + '_0.png');
        found[label].at50 = await drag(0.5, 900);
        await page.waitForTimeout(300);
        found[label].at100 = await drag(1.0, 1500);
        await page.waitForTimeout(5000);
        await shot('i_' + label + '.png');
        await shot('z_' + label + '_1.png');
      }
      let idx = Math.min(2, opts.length-1);
      if (/lump, swelling/.test(q)) idx = 3;
      await opts[idx].click(); await page.waitForTimeout(220);
      await page.waitForTimeout(400);
      const hit = await page.evaluate(()=>{const b=[...document.querySelectorAll('button.btn')].find(x=>!x.disabled);
        if(b){b.click();return true;}return false;});
      await page.waitForTimeout(hit?1200:350);
    } else {
      let hit=false;
      for (let w=0; !hit && w<7; w++) {
        hit = await page.evaluate(()=>{const c=document.getElementById('crawl');
          if(c&&c.classList.contains('on')){c.click();return true;}
          const b=[...document.querySelectorAll('button.btn')].find(x=>!x.disabled);
          if(b){b.click();return true;}return false;});
        if(!hit) await page.waitForTimeout(3000);
      }
      if(!hit) break;
      await page.waitForTimeout(1500);
    }
    if (await page.$('.sheet.plain')) break;
  }
  console.log('errors:', errs.length ? errs.slice(0,5).join('\n  ') : 'none');
  for (const k of ['supply','heat','block']) {
    const f = found[k];
    console.log('\n[' + k + ']');
    if (!f) { console.log('  NOT REACHED'); continue; }
    console.log('   0% :', f.at0);
    console.log('  50% :', f.at50);
    console.log(' 100% :', f.at100);
    console.log('  responds:', f.at0 !== f.at100 ? 'YES' : 'NO — readout did not change');
  }
  await b.close();
})();
