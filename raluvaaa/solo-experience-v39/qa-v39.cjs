const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v39/';

async function setup(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();

  await page.goto(BASE+'/__raluvaaa_v39_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV39R1FreshStart');
    localStorage.setItem('raluvaaaSoloExperienceV38R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'old-v38',lineageId:'old-v38-lineage',text:'OLD V38 WISH',loc:'Nantes, France'}]
    }));
    localStorage.setItem('raluvaaaSoloExperienceV39R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'stale-v39',lineageId:'stale-v39-lineage',text:'STALE V39 WISH',loc:'Nantes, France'}]
    }));
  });

  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));

  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V39__?.version===39&&window.__RALUVAAA_V38__?.version===38&&window.__RALUVAAA_SOUND_V38__?.version===38&&window.__RV26_SOLO__?.state,null,{timeout:12000});
  return {browser,context,page};
}

async function assertFresh(page){
  const result=await page.evaluate(()=>({
    reset:window.__RALUVAAA_FRESH_RESET_V39__,
    state:window.__RV26_SOLO__.state()
  }));
  assert.equal(result.reset?.performed,true,'V39 fresh reset must run');
  assert(result.reset.removed.includes('raluvaaaSoloExperienceV38R1'),'V39 must remove V38 local test state');
  assert(result.reset.removed.includes('raluvaaaSoloExperienceV39R1'),'V39 must remove stale V39 state');
  assert.equal(result.state.events.length,0,'V39 must start with no human test wishes');
}

async function assertRail(page){
  const expected={
    entrustedBtn:'entrusted',
    inboxBtn:'notifications',
    myWorldBtn:'mywishes',
    musicBtn:'music',
    createBtn:'create'
  };
  await page.waitForFunction(()=>['entrustedBtn','inboxBtn','myWorldBtn','musicBtn','createBtn'].every(id=>document.querySelector('#'+id+' img.v39-icon-art')?.complete),null,{timeout:10000});
  for(const [id,name] of Object.entries(expected)){
    const info=await page.locator('#'+id+' img.v39-icon-art').evaluate(img=>({
      src:img.src,nw:img.naturalWidth,nh:img.naturalHeight,w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height
    }));
    assert(info.src.endsWith('/raluvaaa/v39/icons/'+name+'.png'),id+' must use V39 approved crop');
    assert.equal(info.nw,190,id+' asset width must match board crop');
    assert.equal(info.nh,166,id+' asset height must match board crop');
    assert(info.w>=40&&info.h>=35,id+' rendered icon too small');
  }
}

async function createWish(page){
  await page.click('#createBtn');
  await page.fill('#wishInput','QA V39 exact icon wish');
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA V39 exact icon wish'),null,{timeout:6000});
  const id=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA V39 exact icon wish').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle img.v39-icon-art').length>=8,null,{timeout:6000});
  return id;
}

async function assertOwnerDeck(page){
  const info=await page.locator('#drawerBody .v33-action-unit').evaluateAll(units=>units.map(unit=>{
    const name=unit.dataset.v39Icon;
    const button=unit.querySelector('.v33-action-circle');
    const img=button?.querySelector('img.v39-icon-art');
    const cs=button?getComputedStyle(button):null;
    return {
      name,
      src:img?.src||'',
      nw:img?.naturalWidth||0,
      nh:img?.naturalHeight||0,
      w:img?.getBoundingClientRect().width||0,
      h:img?.getBoundingClientRect().height||0,
      background:cs?.backgroundColor||'',
      shadow:cs?.boxShadow||''
    };
  }));
  const by=Object.fromEntries(info.map(x=>[x.name,x]));
  for(const name of ['evolve','branch','bloom','recenter','modify','graft','share','letgo']){
    const x=by[name];
    assert(x,'missing owner action '+name);
    assert(x.src.endsWith('/raluvaaa/v39/icons/'+name+'.png'),name+' must use exact V39 crop');
    assert.equal(x.nw,190,name+' natural width mismatch');
    assert.equal(x.nh,166,name+' natural height mismatch');
    assert(x.w>=100&&x.h>=86,name+' should render the approved tile large enough');
    assert(x.background==='rgba(0, 0, 0, 0)'||x.background==='transparent',name+' button must not add another tile background');
    assert(x.shadow==='none',name+' button must not add another shadow');
  }
}

async function assertHelperFlag(page){
  await page.click('#drawerClose');
  await page.click('#entrustedBtn');
  await page.waitForSelector('#drawerBody [data-open]',{timeout:6000});
  await page.locator('#drawerBody [data-open]').first().click();
  await page.waitForSelector('#drawerBody .v38-report-button img.v39-icon-art',{timeout:6000});
  const info=await page.locator('#drawerBody .v38-report-button img.v39-icon-art').evaluate(img=>({src:img.src,nw:img.naturalWidth,nh:img.naturalHeight}));
  assert(info.src.endsWith('/raluvaaa/v39/icons/report.png'),'flag action must use exact V39 flag crop');
  assert.equal(info.nw,190);
  assert.equal(info.nh,166);
}

async function assertSoundPreserved(page){
  const samples=await page.evaluate(()=>window.__RALUVAAA_SOUND_V38__.samples);
  assert(samples.create.includes('/raluvaaa/v38/audio/create.wav'),'V38 sound design must remain connected');
  assert(samples.graft.includes('/raluvaaa/v38/audio/graft.wav'),'V38 graft sound must remain connected');
}

(async()=>{
  const {browser,page}=await setup();
  try{
    await assertFresh(page);
    await assertRail(page);
    await createWish(page);
    await assertOwnerDeck(page);
    await assertHelperFlag(page);
    await assertSoundPreserved(page);
    console.log('RALUVAAA V39 exact-board icon QA passed');
  }finally{
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});