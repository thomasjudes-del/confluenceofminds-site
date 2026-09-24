const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v35/';
async function setup(viewport,actor='A'){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{try{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_ok,err){setTimeout(()=>err?.({code:1}),0)}}})}catch{}});
  const page=await context.newPage();
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(BASE+PATH+'?qa=1&actor='+actor,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V35__?.version===35&&window.__RV26_SOLO__?.semantic,null,{timeout:12000});
  return {browser,page};
}
async function assertAssets(page){
  await page.waitForFunction(()=>['entrustedBtn','inboxBtn','myWorldBtn','musicBtn','createBtn'].every(id=>document.querySelector('#'+id+' img.v35-icon')?.complete),null,{timeout:10000});
  const rail=await page.evaluate(()=>Object.fromEntries(['entrustedBtn','inboxBtn','myWorldBtn','musicBtn','createBtn'].map(id=>{
    const b=document.getElementById(id),im=b.querySelector('img.v35-icon');return [id,{icon:b.dataset.v35Icon,w:im.naturalWidth,h:im.naturalHeight,src:im.src}]
  })));
  assert.equal(rail.entrustedBtn.icon,'entrusted');
  assert.equal(rail.inboxBtn.icon,'notifications');
  assert.equal(rail.myWorldBtn.icon,'mywishes');
  assert.equal(rail.musicBtn.icon,'music');
  assert.equal(rail.createBtn.icon,'create');
  for(const x of Object.values(rail))assert(x.w>100&&x.h>100&&x.src.includes('/raluvaaa/v35/icons/'),'R2 icon failed to load');
}
async function createWish(page){
  const wishText='I want to grow a small human project.';
  await page.click('#createBtn');
  await page.fill('#wishInput',wishText);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(text=>window.__RV26_SOLO__.semantic().some(x=>x.kind==='create'&&x.text===text),wishText,{timeout:6000});
  const wishId=await page.evaluate(text=>window.__RV26_SOLO__.semantic().find(x=>x.kind==='create'&&x.text===text).semanticId,wishText);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),wishId);
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle img.v35-icon').length>=8,null,{timeout:6000});
  const icons=new Set(await page.locator('#drawerBody .v33-action-circle').evaluateAll(bs=>bs.map(b=>b.dataset.v35Icon)));
  for(const k of ['evolve','branch','bloom','recenter','modify','graft','share','letgo'])assert(icons.has(k),'missing owner icon '+k);
  const sizes=await page.locator('#drawerBody .v33-action-circle img.v35-icon').evaluateAll(xs=>xs.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,nw:x.naturalWidth})));
  assert(sizes.every(x=>x.w>=48&&x.h>=48&&x.nw>100),'action icons too small or unloaded');
}
async function run(viewport){
  const {browser,page}=await setup(viewport);
  try{await assertAssets(page);await createWish(page);const rail=await page.locator('#rail').boundingBox();assert(rail&&rail.x>=0&&rail.x+rail.width<=viewport.width,'rail outside viewport');}
  finally{await browser.close()}
}
(async()=>{await run({width:1600,height:900});await run({width:393,height:852});console.log('RALUVAAA V35 visual QA passed')})().catch(e=>{console.error(e);process.exit(1)});