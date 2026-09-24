const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v37/';
const expectedRail={
  entrustedBtn:'entrusted',
  inboxBtn:'notifications',
  myWorldBtn:'mywishes',
  musicBtn:'music',
  createBtn:'create'
};
async function setup(actor='A'){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV37R1FreshStart');
    localStorage.setItem('raluvaaaSoloExperienceV33R1',JSON.stringify({
      version:26,lang:'fr',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'old-root',lineageId:'old-lineage',text:'OLD WISH MUST DISAPPEAR',loc:'Nantes, France'}]
    }));
    localStorage.setItem('raluvaaaSoloExperienceV37R1',JSON.stringify({
      version:26,lang:'fr',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'bad-v37-root',lineageId:'bad-v37-lineage',text:'STALE V37 DATA',loc:'Nantes, France'}]
    }));
  });
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(BASE+PATH+'?qa=1&actor='+actor,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V37__?.version===37&&window.__RV26_SOLO__?.state,null,{timeout:12000});
  return {browser,context,page};
}
async function assertFresh(page){
  const state=await page.evaluate(()=>window.__RV26_SOLO__.state());
  assert.equal(state.events.length,0,'V37 must start with no persisted human test events');
  assert.equal(state.lang==='fr'||state.lang==='en',true);
  const stale=await page.evaluate(()=>localStorage.getItem('raluvaaaSoloExperienceV33R1'));
  assert.equal(stale,null,'legacy solo store must be cleared on first V37 load');
}
async function assertRail(page){
  await page.waitForFunction(()=>['entrustedBtn','inboxBtn','myWorldBtn','musicBtn','createBtn'].every(id=>document.querySelector('#'+id+' img.v37-icon')?.complete),null,{timeout:10000});
  for(const [id,name] of Object.entries(expectedRail)){
    const got=await page.locator('#'+id).getAttribute('data-v37-icon');
    assert.equal(got,name,id+' semantic icon mismatch');
    const src=await page.locator('#'+id+' img.v37-icon').getAttribute('src');
    assert(src.endsWith('/raluvaaa/v37/icons/'+name+'.svg'),id+' must use V37 hosted asset');
  }
}
async function createWish(page){
  await page.click('#createBtn');
  await page.fill('#wishInput','QA V37 wish');
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA V37 wish'),null,{timeout:6000});
  const id=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA V37 wish').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle img.v37-icon').length>=8,null,{timeout:6000});
  return id;
}
async function assertOwner(page){
  const got=await page.locator('#drawerBody .v33-action-circle').evaluateAll(bs=>Object.fromEntries(bs.map(b=>[b.dataset.v37Icon,b.querySelector('img')?.src||''])));
  for(const name of ['evolve','branch','bloom','recenter','modify','graft','share','letgo']){
    assert(got[name]?.endsWith('/raluvaaa/v37/icons/'+name+'.svg'),'owner action mismatch: '+name);
  }
}
async function assertHelper(context,id){
  const page=await context.newPage();
  await page.goto(BASE+PATH+'?qa=1&actor=B',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V37__?.version===37&&window.__RV26_SOLO__?.semantic,null,{timeout:12000});
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().some(x=>x.semanticId===id),id,{timeout:6000});
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle img.v37-icon').length>=6,null,{timeout:6000});
  const got=new Set(await page.locator('#drawerBody .v33-action-circle').evaluateAll(bs=>bs.map(b=>b.dataset.v37Icon)));
  for(const name of ['encourage','help','graft','suggest','recenter','share']){
    assert(got.has(name),'helper action mismatch: '+name);
  }
  await page.close();
}
(async()=>{
  const {browser,context,page}=await setup('A');
  try{
    await assertFresh(page);
    await assertRail(page);
    const id=await createWish(page);
    await assertOwner(page);
    await assertHelper(context,id);
    console.log('RALUVAAA V37 full semantic icon + fresh-state QA passed');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});