const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v38/';

async function setup(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  await page.goto(BASE+'/__raluvaaa_v38_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV38R1FreshStart');
    localStorage.setItem('raluvaaaSoloExperienceV37R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'old-root',lineageId:'old-lineage',text:'OLD V37 WISH',loc:'Nantes, France'}]
    }));
    localStorage.setItem('raluvaaaSoloExperienceV38R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'stale-v38',lineageId:'stale-v38-lineage',text:'STALE V38 WISH',loc:'Nantes, France'}]
    }));
  });
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V38__?.version===38&&window.__RALUVAAA_SOUND_V38__?.version===38&&window.__RV26_SOLO__?.state,null,{timeout:12000});
  return {browser,context,page};
}

async function assertFresh(page){
  const result=await page.evaluate(()=>({
    reset:window.__RALUVAAA_FRESH_RESET_V38__,
    state:window.__RV26_SOLO__.state(),
    old:localStorage.getItem('raluvaaaSoloExperienceV37R1')
  }));
  assert.equal(result.reset?.performed,true,'V38 fresh reset must run');
  assert(result.reset.removed.includes('raluvaaaSoloExperienceV37R1'),'V38 must remove V37 test state');
  assert(result.reset.removed.includes('raluvaaaSoloExperienceV38R1'),'V38 must remove stale V38 state');
  assert.equal(result.state.events.length,0,'V38 must start with no human test wishes');
  assert.equal(result.old,null,'legacy V37 local state must be gone');
}

async function assertSoundMap(page){
  const map=await page.evaluate(()=>{
    const S=window.__RALUVAAA_SOUND_V38__;
    return {
      samples:S.samples,
      create:S.sampleForEvent({type:'create'}),
      evolve:S.sampleForEvent({type:'evolve'}),
      split:S.sampleForEvent({type:'split'}),
      branch:S.sampleForEvent({type:'branch_add'}),
      encourage:S.sampleForEvent({type:'encourage'}),
      help:S.sampleForEvent({type:'help_proposed'}),
      graft:S.sampleForEvent({type:'connect_proposed'})
    };
  });
  assert.equal(map.create,'create');
  assert.equal(map.evolve,'evolve');
  assert.equal(map.split,'branch');
  assert.equal(map.branch,'branch');
  assert.equal(map.encourage,'encourage');
  assert.equal(map.help,'help');
  assert.equal(map.graft,'graft');
  for(const [name,url] of Object.entries(map.samples)){
    assert(url.includes('/raluvaaa/v38/audio/'),name+' sound must be hosted on V38 R2 path');
  }
  assert(map.samples.share.endsWith('/share.wav'));
  assert(map.samples.bloomWish.endsWith('/bloom-wish.mp3'));
  assert(map.samples.bloomBranch.endsWith('/bloom-branch.mp3'));
}

async function createWish(page){
  await page.click('#createBtn');
  await page.fill('#wishInput','QA V38 wish');
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA V38 wish'),null,{timeout:6000});
  await page.waitForFunction(()=>window.__RALUVAAA_SOUND_V38__.history.some(x=>x.name==='create'),null,{timeout:3000});
  return await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA V38 wish').semanticId);
}

async function assertBloomRouting(page,id){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  const root=await page.evaluate(id=>window.__RALUVAAA_SOUND_V38__.sampleForEvent({type:'bloom',semanticId:id}),id);
  assert.equal(root,'bloomWish');

  await page.evaluate(()=>window.__RALUVAAA_UI__.action('branch'));
  await page.fill('#branchInput','QA child branch');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA child branch'),null,{timeout:6000});
  const child=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA child branch').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),child);
  const branch=await page.evaluate(id=>window.__RALUVAAA_SOUND_V38__.sampleForEvent({type:'bloom',semanticId:id}),child);
  assert.equal(branch,'bloomBranch');
}

async function assertGuidance(page){
  const sizes=await page.evaluate(()=>({
    mode:parseFloat(getComputedStyle(document.querySelector('#modeBar')).fontSize),
    modeText:parseFloat(getComputedStyle(document.querySelector('#modeText')).fontSize),
    toast:parseFloat(getComputedStyle(document.querySelector('#toast')).fontSize)
  }));
  assert(sizes.mode>=13,'mode guidance font too small');
  assert(sizes.modeText>=13,'mode text font too small');
  assert(sizes.toast>=13,'toast font too small');
}

async function assertFlagButton(page){
  await page.click('#entrustedBtn');
  await page.waitForSelector('#drawerBody [data-open]',{timeout:6000});
  await page.locator('#drawerBody [data-open]').first().click();
  await page.waitForSelector('#drawerBody .v38-report-button',{timeout:6000});
  const label=(await page.locator('#drawerBody .v38-report-button').innerText()).trim();
  assert(['Flag as inappropriate','Signaler comme inapproprié'].includes(label),'unexpected moderation label: '+label);
  await page.locator('#drawerBody .v38-report-button').click();
  await page.waitForSelector('#reportReason',{timeout:4000});
  assert.equal(await page.locator('#reportReason').count(),1,'report modal must open');
  await page.click('#cancel');
}

(async()=>{
  const {browser,page}=await setup();
  try{
    await assertFresh(page);
    await assertSoundMap(page);
    const id=await createWish(page);
    await assertBloomRouting(page,id);
    await assertGuidance(page);
    await assertFlagButton(page);
    console.log('RALUVAAA V38 moderation + sound design + guidance QA passed');
  }finally{
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});