const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v40/';

async function setup(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  const page=await context.newPage();

  await page.goto(BASE+'/__raluvaaa_v40_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV40R1FreshStart');
    localStorage.setItem('raluvaaaSoloExperienceV39R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'old-v39',lineageId:'old-v39-lineage',text:'OLD V39 WISH',loc:'Nantes, France'}]
    }));
  });

  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));

  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{
    const frame=document.getElementById('engine');
    return window.__RALUVAAA_V40__?.version===40 &&
      window.__RALUVAAA_V39__?.version===39 &&
      window.__RV26_SOLO__?.state &&
      frame?.contentWindow?.__RV40_BLOOM__?.version===40;
  },null,{timeout:15000});

  return {browser,context,page};
}

async function assertFresh(page){
  const result=await page.evaluate(()=>({
    reset:window.__RALUVAAA_FRESH_RESET_V40__,
    state:window.__RV26_SOLO__.state()
  }));
  assert.equal(result.reset?.performed,true,'V40 fresh reset must run');
  assert(result.reset.removed.includes('raluvaaaSoloExperienceV39R1'),'V40 must remove V39 local state');
  assert.equal(result.state.events.length,0,'V40 must start with no human test wishes');
}

async function createWish(page){
  await page.click('#createBtn');
  await page.fill('#wishInput','QA V40 bloom wish');
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA V40 bloom wish'),null,{timeout:6000});
  const id=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA V40 bloom wish').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle').length>=8,null,{timeout:6000});
  return id;
}

async function assertDimensions(page){
  const dims=await page.evaluate(()=>{
    const drawer=document.getElementById('drawer');
    const rect=drawer.getBoundingClientRect();
    const btn=document.querySelector('#drawerBody .v33-action-circle');
    const br=btn.getBoundingClientRect();
    const cs=getComputedStyle(drawer);
    return {drawerW:rect.width,drawerH:rect.height,bottom:cs.bottom,actionW:br.width,actionH:br.height};
  });
  assert(dims.drawerW<=652&&dims.drawerW>=568,'drawer width not rationalized');
  assert(dims.drawerH<850,'drawer should fit its content instead of filling the screen');
  assert(parseFloat(dims.bottom)>100,'drawer must no longer be pinned to the bottom edge');
  assert(dims.actionW>=102&&dims.actionW<=106,'action width mismatch');
  assert(dims.actionH>=89&&dims.actionH<=93,'action height mismatch');
}

async function createAndBloomBranch(page,rootId){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),rootId);
  await page.evaluate(()=>window.__RALUVAAA_UI__.action('branch'));
  await page.fill('#branchInput','QA V40 branch bloom');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA V40 branch bloom'),null,{timeout:6000});
  const child=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA V40 branch bloom').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),child);
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(()=>window.__RALUVAAA_UI__.action('bloom'));
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',child,{timeout:6000});
  return child;
}

async function assertBloom(page,childId){
  const info=await page.evaluate(id=>{
    const frame=document.getElementById('engine');
    const api=frame.contentWindow.__RV40_BLOOM__;
    return {
      debug:api.debugSemantic(id),
      variants:new Set(Array.from({length:80},(_,i)=>api.variantFor('sample-'+i))).size,
      rootRadius:api.screenRadiusFor({kind:'create'}),
      branchRadius:api.screenRadiusFor({kind:'split'})
    };
  },childId);
  assert.equal(info.debug.state,'bloom');
  assert.equal(info.debug.centerX,info.debug.nodeX,'bloom X must be centered on semantic node');
  assert.equal(info.debug.centerY,info.debug.nodeY,'bloom Y must be centered on semantic node');
  assert(info.debug.variant>=0&&info.debug.variant<5,'invalid bloom variant');
  assert(info.variants>=5,'bloom system must expose all five flower forms');
  assert(info.branchRadius>=17,'branch bloom must be materially larger than old star');
  assert(info.rootRadius>info.branchRadius,'whole-wish bloom must be more prominent than branch bloom');
}

async function assertSuggestIsBranching(page){
  if(await page.locator('#drawerClose').isVisible())await page.click('#drawerClose');
  await page.click('[data-lang="en"]');
  await page.click('#entrustedBtn');
  await page.waitForSelector('#drawerBody [data-open]',{timeout:6000});
  await page.locator('#drawerBody [data-open]').first().click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#drawerBody .v33-action-label')].some(x=>x.textContent.trim()==='Suggest a branch'),null,{timeout:6000});
  const unit=page.locator('#drawerBody .v33-action-unit').filter({hasText:'Suggest a branch'}).first();
  await unit.locator('.v33-action-circle').click();
  await page.waitForSelector('#suggestInput',{timeout:4000});
  assert.equal((await page.locator('.sheet h3').innerText()).trim(),'Suggest a branch');
  const hint=(await page.locator('.sheet p').innerText()).trim();
  assert(hint.includes('Nothing is added unless the wisher accepts.'),'suggestion must be described as a proposed branch');
  await page.click('#cancel');
}

async function assertSoundsPreserved(page){
  const samples=await page.evaluate(()=>window.__RALUVAAA_SOUND_V38__.samples);
  assert(samples.bloomWish.endsWith('/bloom-wish.mp3'));
  assert(samples.bloomBranch.endsWith('/bloom-branch.mp3'));
}

(async()=>{
  const {browser,page}=await setup();
  try{
    await assertFresh(page);
    const rootId=await createWish(page);
    await assertDimensions(page);
    const childId=await createAndBloomBranch(page,rootId);
    await assertBloom(page,childId);
    await assertSuggestIsBranching(page);
    await assertSoundsPreserved(page);
    console.log('RALUVAAA V40 dimensions + varied bloom + branching suggestion QA passed');
  }finally{
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});