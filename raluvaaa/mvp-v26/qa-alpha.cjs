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
  await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('raluvaaaEntrustedV26PolicyV1')||'null')?.entries?.length===3}catch{return false}},null,{timeout:15000});
  const data=await page.evaluate(()=>({
    policy:JSON.parse(localStorage.getItem('raluvaaaEntrustedV26PolicyV1')),
    state:JSON.parse(localStorage.getItem('raluvaaaManualMvpV26'))
  }));
  assert.equal(data.policy.entries.length,3);
  const now=Date.now();
  const rem=data.policy.entries.map(x=>x.expires-now);
  assert(rem[0]>=2.9*H&&rem[0]<=8.1*H,`short entrusted duration out of range: ${rem[0]/H}h`);
  assert(rem[1]>=17.9*H&&rem[1]<=30.1*H,`medium entrusted duration out of range: ${rem[1]/H}h`);
  assert(rem[2]>=59.9*H&&rem[2]<=84.1*H,`long entrusted duration out of range: ${rem[2]/H}h`);
  assert.deepEqual(data.state.entrusted.map(x=>x.semanticId),data.policy.entries.map(x=>x.semanticId));
  await page.locator('#entrustedBtn').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band]').count(),3);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band="short"]').count(),1);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band="medium"]').count(),1);
  assert.equal(await page.locator('#drawerBody [data-entrusted-band="long"]').count(),1);
  await page.locator('#drawerClose').click();
  await page.locator('#myWorldBtn').click();
  await page.waitForTimeout(50);
  assert.equal((await page.locator('#drawerTitle').innerText()).trim(),'Mes wishes');
  await page.locator('#drawerClose').click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  assert(await page.locator('#rail').isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=0,'alpha mobile horizontal overflow');
  assert.deepEqual(errors,[],`browser errors: ${errors.join('\n')}`);
  await browser.close();
  console.log('RALUVAAA V26 alpha UX QA passed');
})().catch(e=>{console.error(e);process.exit(1)});
