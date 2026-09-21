const { chromium } = require('/tmp/rv26-playwright/node_modules/playwright');
const assert = require('assert');
const BASE='http://127.0.0.1:4173/raluvaaa/mvp-v26/';
const H=3600000;
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:'fr-FR'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(BASE+'?actor=A&qa=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__RV26_TEST__&&window.__RV26_TEST__.semantic().length>100,null,{timeout:30000});
  await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('raluvaaaEntrustedV26PolicyV2')||'null')?.entries?.length===3}catch{return false}},null,{timeout:15000});
  const data=await page.evaluate(()=>({
    policy:JSON.parse(localStorage.getItem('raluvaaaEntrustedV26PolicyV2')),
    state:JSON.parse(localStorage.getItem('raluvaaaManualMvpV26'))
  }));
  assert.equal(data.policy.entries.length,3);
  const now=Date.now();
  const rem=data.policy.entries.map(x=>x.expires-now);
  assert(rem[0]>=0.55*H&&rem[0]<=2.95*H,`short entrusted duration out of range: ${rem[0]/H}h`);
  assert(rem[1]>=9.9*H&&rem[1]<=23.6*H,`medium entrusted duration out of range: ${rem[1]/H}h`);
  assert(rem[2]>=35.9*H&&rem[2]<=71.6*H,`long entrusted duration out of range: ${rem[2]/H}h`);
  assert.deepEqual(data.state.entrusted.map(x=>x.semanticId),data.policy.entries.map(x=>x.semanticId));
  await page.locator('#entrustedBtn').click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band]').count(),3);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band="short"]').count(),1);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band="medium"]').count(),1);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band="long"]').count(),1);
  const c1=(await page.locator('#drawerBody [data-entrusted-band="short"] .m').innerText()).trim();
  assert(/^\d{2}:\d{2}:\d{2}$/.test(c1),`short countdown format invalid: ${c1}`);
  await page.waitForFunction(prev=>{const el=document.querySelector('#drawerBody [data-entrusted-band="short"] .m');return el&&el.textContent.trim()!==prev},c1,{timeout:3500});
  const c2=(await page.locator('#drawerBody [data-entrusted-band="short"] .m').innerText()).trim();
  assert.notEqual(c1,c2,'entrusted countdown should visibly tick');
  await page.locator('#drawerClose').click();
  await page.locator('#myWorldBtn').click();
  await page.waitForTimeout(60);
  assert.equal((await page.locator('#drawerTitle').innerText()).trim(),'Mes wishes');
  await page.locator('#drawerClose').click();
  assert(await page.locator('#qaStrip').isVisible(),'QA persona controls should remain available in qa mode');
  assert.equal(await page.locator('#musicBtn').count(),1,'temporary ambient music control should exist');
  assert.equal(await page.locator('#ambientCredit').count(),1,'music attribution should remain visible');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_AUDIO__?.url),'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Immersed.mp3');

  await page.locator('#createBtn').click();
  await page.locator('#wishInput').fill('I want to make one real thing this week.');
  await page.locator('#locInput').fill('Nantes, France');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>document.querySelectorAll('#ritualLayer .rv-ring').length>0,null,{timeout:5000});
  assert(await page.locator('#overlay').evaluate(el=>!el.textContent.trim()),'creation modal should clear before the creation ritual');
  assert(await page.locator('#ritualLayer .rv-seed').count()>0,'creation should visibly emerge as a seed ritual');

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  assert(await page.locator('#rail').isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=0,'alpha mobile horizontal overflow');
  assert.deepEqual(errors,[],`browser errors: ${errors.join('\n')}`);
  const clean=await context.newPage();
  await clean.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await clean.waitForTimeout(200);
  assert(await clean.locator('#qaStrip').isHidden(),'tester controls must be hidden in normal Alpha V0 mode');
  assert.equal(await clean.title(),'RALUVAAA · Alpha V0');
  await browser.close();
  console.log('RALUVAAA Alpha V0 UX QA passed');
})().catch(e=>{console.error(e);process.exit(1)});
