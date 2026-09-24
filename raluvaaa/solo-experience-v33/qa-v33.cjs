const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const URL=BASE+'/raluvaaa/solo-experience-v33/?qa=1&actor=A';

async function setup(type,viewport){
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
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V33__?.version===32&&window.__RV26_TEST__?.state&&window.__RALUVAAA_CREATE_AUDIO_V33__,{timeout:12000});
  return {browser,page};
}

async function assertLanguageSwitch(page,viewportWidth){
  const lang=page.locator('.lang');
  await expectVisible(lang,'language switch');
  const geometry=await page.evaluate(()=>({
    wrap:(()=>{const r=document.querySelector('.lang').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right}})(),
    buttons:[...document.querySelectorAll('.lang button')].map(b=>{const r=b.getBoundingClientRect();return {lang:b.dataset.lang,w:r.width,h:r.height,display:getComputedStyle(b).display}})
  }));
  assert(geometry.wrap.w>60&&geometry.wrap.h>=30,'FR/EN switch must have a real visible footprint');
  assert(geometry.wrap.x>=0&&geometry.wrap.right<=viewportWidth,'FR/EN switch must stay inside mobile viewport');
  assert(geometry.buttons.every(b=>b.w>=30&&b.h>=28&&b.display!=='none'),'FR/EN buttons must be readable touch targets');

  await page.click('.lang button[data-lang="en"]');
  await page.waitForFunction(()=>window.__RV26_TEST__.state().lang==='en');
  assert(await page.locator('.lang button[data-lang="en"]').evaluate(el=>el.classList.contains('active')),'EN must become active');
  await page.click('#createBtn');
  assert.equal((await page.locator('.sheet h3').textContent()).trim(),'Release a wish','English must visibly translate the create sheet');
  assert.equal((await page.locator('#confirm').textContent()).trim(),'Create','English create CTA must be visible');
  await page.click('#cancel');

  await page.click('.lang button[data-lang="fr"]');
  await page.waitForFunction(()=>window.__RV26_TEST__.state().lang==='fr');
  assert(await page.locator('.lang button[data-lang="fr"]').evaluate(el=>el.classList.contains('active')),'FR must become active');
  await page.click('#createBtn');
  assert.equal((await page.locator('.sheet h3').textContent()).trim(),'Déposer un wish','French must visibly translate the create sheet');
  assert.equal((await page.locator('#confirm').textContent()).trim(),'Créer','French create CTA must be visible');
  await page.click('#cancel');
}

async function expectVisible(locator,name){
  await locator.waitFor({state:'visible',timeout:7000}).catch(()=>{});
  assert(await locator.isVisible(),name+' must be visible');
}

async function createAndVerifySound(page){
  await page.click('#createBtn');
  await page.fill('#wishInput','I want to hear a magical creation sound.');
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RALUVAAA_CREATE_AUDIO_V33__?.history?.some(x=>x.name==='create'),null,{timeout:5000});

  const info=await page.evaluate(async()=>{
    const a=window.__RALUVAAA_CREATE_AUDIO_V33__.audio;
    const response=await fetch(a.src,{cache:'no-store'});
    const bytes=await response.arrayBuffer();
    if(a.readyState<1){
      await new Promise(resolve=>{
        const done=()=>{a.removeEventListener('loadedmetadata',done);a.removeEventListener('error',done);resolve()};
        a.addEventListener('loadedmetadata',done,{once:true});
        a.addEventListener('error',done,{once:true});
        a.load();
        setTimeout(done,5000);
      });
    }
    return {
      source:window.__RALUVAAA_CREATE_AUDIO_V33__.source,
      format:window.__RALUVAAA_CREATE_AUDIO_V33__.format,
      src:a.src,
      canPlay:a.canPlayType('audio/mpeg'),
      readyState:a.readyState,
      duration:a.duration,
      response:{ok:response.ok,status:response.status,type:response.headers.get('content-type'),bytes:bytes.byteLength}
    };
  });
  assert.equal(info.source,'uploaded create a wish.wav');
  assert.equal(info.format,'audio/mpeg');
  assert(info.src.includes('/raluvaaa/solo-experience-v33/create-a-wish.mp3'),'CREATE must use the V33 static MP3');
  assert(info.canPlay!=='','browser must report MP3 support');
  assert(info.response.ok&&info.response.status===200&&info.response.bytes>10000,'CREATE MP3 must be served as a real non-empty asset');
  assert(info.readyState>=1&&Number.isFinite(info.duration)&&info.duration>0,'browser must decode CREATE MP3 metadata');
}

async function desktop(){
  const {browser,page}=await setup(chromium,{width:1600,height:900});
  try{
    assert.equal(await page.title(),'RALUVAAA · Experience V33');
    assert.equal(await page.evaluate(()=>window.RALUVAAA_STORE_KEY),'raluvaaaSoloExperienceV33R1');
    await assertLanguageSwitch(page,1600);
    await createAndVerifySound(page);
    console.log('RALUVAAA Experience V33 desktop language/audio QA passed');
  }finally{await browser.close()}
}

async function mobile(){
  const {browser,page}=await setup(webkit,{width:393,height:852});
  try{
    await assertLanguageSwitch(page,393);
    const brand=await page.locator('#brand').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width}});
    assert(brand.x>=0&&brand.right<=393,'brand + language switch must fit on iPhone width');
    await createAndVerifySound(page);
    console.log('RALUVAAA Experience V33 WebKit/mobile language/audio QA passed');
  }finally{await browser.close()}
}

(async()=>{await desktop();await mobile()})().catch(e=>{console.error(e);process.exit(1)});