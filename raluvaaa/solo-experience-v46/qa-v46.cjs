const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v46/';

async function setup(viewport={width:390,height:844}){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport,acceptDownloads:true,isMobile:viewport.width<600,hasTouch:viewport.width<600});
  const page=await context.newPage();
  await page.goto(BASE+'/__raluvaaa_v46_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV44R1FreshStart');
    localStorage.removeItem('raluvaaaSoloExperienceV44R1');
    localStorage.removeItem('raluvaaaSavedWishesV1:A');
  });
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V46__?.version===46&&window.__RALUVAAA_V42__?.version===42&&window.__RV26_SOLO__?.state,null,{timeout:15000});
  return{browser,page};
}
async function createWish(page,text){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(t=>window.__RV26_SOLO__.semantic().some(x=>x.text===t),text,{timeout:7000});
  return page.evaluate(t=>window.__RV26_SOLO__.semantic().find(x=>x.text===t).semanticId,text);
}
async function open(page,id){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,id,{timeout:5000});
}
async function openShare(page,id){
  await open(page,id);
  await page.waitForSelector('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle',{timeout:5000});
  await page.locator('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle').click();
  await page.waitForSelector('#v46ShareOverlay.open',{timeout:5000});
}
async function installNativeShareSpy(page){
  await page.evaluate(()=>{
    window.__qaShares=[];
    window.__qaCopied='';
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__qaCopied=text}}});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:opts=>!!opts?.files?.length});
    Object.defineProperty(navigator,'share',{configurable:true,value:payload=>{
      window.__qaShares.push({
        active:navigator.userActivation?.isActive!==false,
        hasFiles:!!payload?.files?.length,
        type:payload?.files?.[0]?.type||'',
        name:payload?.files?.[0]?.name||'',
        text:payload?.text||'',
        url:payload?.url||''
      });
      return Promise.resolve();
    }});
  });
}
async function mobileShareContract(){
  const{browser,page}=await setup();
  try{
    const id=await createWish(page,'V46 mobile share contract');
    await installNativeShareSpy(page);
    await openShare(page,id);

    assert.equal(await page.evaluate(()=>window.__RALUVAAA_V46__.mode()),'animation');
    const share=page.locator('[data-share-now]');
    assert.equal(await share.isDisabled(),true,'Share must be disabled while the File is being prepared');
    assert.match((await share.innerText()).trim(),/Preparing|Préparation/i);

    await page.waitForFunction(()=>window.__RALUVAAA_V46__.mediaReady()||window.__RALUVAAA_V46__.mediaError(),null,{timeout:9000});
    assert.equal(await page.evaluate(()=>window.__RALUVAAA_V46__.mediaError()),false,'personalized clip should prepare on capable browser');
    assert.equal(await page.evaluate(()=>window.__RALUVAAA_V46__.mediaReady()),true);
    assert.equal(await share.isDisabled(),false,'Share must enable only after the File exists');
    assert.doesNotMatch((await share.innerText()).trim(),/Preparing|Préparation/i);

    await share.click();
    await page.waitForFunction(()=>window.__qaShares.length===1,null,{timeout:2000});
    const sent=await page.evaluate(()=>window.__qaShares[0]);
    assert.equal(sent.active,true,'navigator.share must be invoked while user activation is active');
    assert.equal(sent.hasFiles,true);
    assert.match(sent.type,/^video\//);
    assert(/v46-mobile-share-contract/i.test(sent.name));
    assert.equal((sent.text.match(/#wish=/g)||[]).length,1);
    assert.equal(sent.url,'','file share must not duplicate URL');

    await page.locator('[data-mode="image"]').click();
    assert.equal(await share.isDisabled(),true,'switching mode invalidates prior media');
    await page.waitForFunction(()=>window.__RALUVAAA_V46__.mediaReady(),null,{timeout:4000});
    await share.click();
    await page.waitForFunction(()=>window.__qaShares.length===2,null,{timeout:2000});
    const still=await page.evaluate(()=>window.__qaShares[1]);
    assert.equal(still.hasFiles,true);
    assert.equal(still.type,'image/png');

    await page.locator('[data-share-copy]').click();
    assert.equal(await page.locator('[data-share-copy]').isDisabled(),true);
    assert.match((await page.locator('[data-share-copy]').innerText()).trim(),/Link copied/i);
  }finally{await browser.close()}
}
async function desktopFallback(){
  const{browser,page}=await setup({width:1328,height:700});
  try{
    const id=await createWish(page,'V46 desktop fallback');
    await openShare(page,id);
    await page.evaluate(()=>{
      window.__qaCopied='';
      Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__qaCopied=text}}});
    });
    await page.waitForFunction(()=>window.__RALUVAAA_V46__.mediaReady()||window.__RALUVAAA_V46__.mediaError(),null,{timeout:9000});
    const share=page.locator('[data-share-now]');
    await share.click();
    await page.waitForFunction(()=>window.__qaCopied.includes('#wish='),null,{timeout:2500});
    assert.equal(await page.evaluate(()=>!!window.__openedVideo),false,'desktop fallback must not open video');
    await page.locator('[data-mode="image"]').click();
    await page.waitForSelector('.v46-share-preview canvas.v46-pretty-still',{timeout:2000});
    const box=await page.locator('.v46-share-preview canvas.v46-pretty-still').boundingBox();
    assert(box&&box.height>220,'still preview must remain visible on desktop');
  }finally{await browser.close()}
}
(async()=>{
  await mobileShareContract();
  await desktopFallback();
  console.log('RALUVAAA V46 mobile/desktop share QC passed');
})().catch(err=>{console.error(err);process.exit(1)});