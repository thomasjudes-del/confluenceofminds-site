const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v34/';

async function setup(type,viewport,actor='A'){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{
    try{
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
        getCurrentPosition(_ok,err){setTimeout(()=>err?.({code:1}),0)}
      }});
    }catch{}
  });
  const page=await context.newPage();
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(BASE+PATH+'?qa=1&actor='+actor,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V34__?.version===34&&window.__RV26_TEST__?.state&&window.__RALUVAAA_CREATE_AUDIO_V34__,null,{timeout:12000});
  return {browser,context,page};
}

async function assertRail(page){
  await page.waitForFunction(()=>document.querySelector('#myWorldBtn .v34-icon')&&document.querySelector('#createBtn .v34-icon'),null,{timeout:5000});
  assert.equal(await page.locator('#myWorldBtn').getAttribute('data-v34-icon'),'myWishes');
  assert.equal(await page.locator('#createBtn').getAttribute('data-v34-icon'),'create');
  assert.equal(await page.locator('#entrustedBtn .v34-icon').count(),0,'entrusted icon must stay the existing V33 three-wish symbol');
  const sizes=await page.evaluate(()=>['myWorldBtn','createBtn'].map(id=>{
    const r=document.querySelector('#'+id+' .v34-icon').getBoundingClientRect();
    return {id,w:r.width,h:r.height};
  }));
  assert(sizes.every(x=>x.w>=28&&x.h>=28),'V34 rail pictograms must remain clearly visible');
}

async function createWish(page){
  await page.click('#createBtn');
  await page.fill('#wishInput','I want to grow a small human project.');
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RALUVAAA_CREATE_AUDIO_V34__?.history?.some(x=>x.name==='create'),null,{timeout:5000});
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle .v34-icon').length>=6,null,{timeout:6000});
  const state=await page.evaluate(()=>({
    semantic:window.__RV26_TEST__.semantic(),
    deck:[...document.querySelectorAll('#drawerBody .v33-action-circle')].map(b=>({
      icon:b.dataset.v34Icon,
      label:b.getAttribute('aria-label')
    }))
  }));
  assert(state.semantic.length>=1,'created wish must exist');
  const icons=new Set(state.deck.map(x=>x.icon));
  for(const key of ['evolve','branch','bloom','recenter','modify','graft','share','letgo']){
    assert(icons.has(key),'owner deck missing V34 icon: '+key);
  }
  return state.semantic.find(x=>x.kind==='create')?.semanticId||state.semantic[0].semanticId;
}

async function assertHelperDeck(context,page,wishId){
  await page.goto(BASE+PATH+'?qa=1&actor=B#wish='+encodeURIComponent(wishId),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V34__?.version===34&&window.__RV26_TEST__?.state,null,{timeout:12000});
  await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle .v34-icon').length>=6,null,{timeout:6000});
  const icons=new Set(await page.locator('#drawerBody .v33-action-circle').evaluateAll(btns=>btns.map(b=>b.dataset.v34Icon)));
  for(const key of ['encourage','help','graft','suggest','recenter','share','report']){
    assert(icons.has(key),'helper deck missing V34 icon: '+key);
  }
}

async function assertSoundAsset(page){
  const info=await page.evaluate(async()=>{
    const a=window.__RALUVAAA_CREATE_AUDIO_V34__.audio;
    const response=await fetch(a.src,{cache:'no-store'});
    const bytes=await response.arrayBuffer();
    return {src:a.src,ok:response.ok,status:response.status,bytes:bytes.byteLength,type:response.headers.get('content-type')};
  });
  assert(info.src.includes('/raluvaaa/solo-experience-v33/create-a-wish.mp3'),'V34 must reuse the approved V33 creation sound');
  assert(info.ok&&info.status===200&&info.bytes>10000,'creation MP3 must be served and non-empty');
}

async function desktop(){
  const {browser,context,page}=await setup(chromium,{width:1600,height:900});
  try{
    assert.equal(await page.title(),'RALUVAAA · Experience V34');
    await assertRail(page);
    const wishId=await createWish(page);
    await assertSoundAsset(page);
    await assertHelperDeck(context,page,wishId);
    console.log('RALUVAAA Experience V34 desktop icon QA passed');
  }finally{await browser.close()}
}

async function mobile(){
  const {browser,page}=await setup(webkit,{width:393,height:852});
  try{
    await assertRail(page);
    const box=await page.locator('#rail').boundingBox();
    assert(box&&box.x>=0&&box.x+box.width<=393,'V34 mobile rail must remain inside viewport');
    console.log('RALUVAAA Experience V34 WebKit/mobile rail QA passed');
  }finally{await browser.close()}
}

(async()=>{await desktop();await mobile()})().catch(e=>{console.error(e);process.exit(1)});