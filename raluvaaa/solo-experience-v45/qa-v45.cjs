const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v45/';

async function setup(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const page=await context.newPage();
  await page.goto(BASE+'/__raluvaaa_v45_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV44R1FreshStart');
    localStorage.removeItem('raluvaaaSoloExperienceV44R1');
    localStorage.removeItem('raluvaaaSavedWishesV1:A');
  });
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V45__?.version===45&&window.__RALUVAAA_V42__?.version===42&&window.__RV26_SOLO__?.state,null,{timeout:15000});
  return{browser,page};
}
async function createWish(page,text){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(t=>window.__RV26_SOLO__.semantic().some(x=>x.text===t),text,{timeout:7000});
  return await page.evaluate(t=>window.__RV26_SOLO__.semantic().find(x=>x.text===t).semanticId,text);
}
async function open(page,id){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,id,{timeout:5000});
}
async function openShare(page,id){
  await open(page,id);
  await page.waitForSelector('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle',{timeout:5000});
  await page.locator('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle').click();
  await page.waitForSelector('#v45ShareOverlay.open',{timeout:5000});
}
async function testAssets(page){
  for(let i=0;i<5;i++){
    const result=await page.evaluate(async i=>{
      const api=window.__RALUVAAA_V45__;
      const vu=api.assetUrl('video',i),pu=api.assetUrl('poster',i);
      const [v,p]=await Promise.all([fetch(vu),fetch(pu)]);
      return{video:v.ok,poster:p.ok,vtype:v.headers.get('content-type')||'',ptype:p.headers.get('content-type')||''};
    },i);
    assert.equal(result.video,true,'prebuilt video '+(i+1)+' must exist');
    assert.equal(result.poster,true,'prebuilt poster '+(i+1)+' must exist');
  }
}
async function testThreeButtons(page,id){
  await openShare(page,id);
  assert.equal(await page.locator('.v45-style-dots [data-style]').count(),5,'five prebuilt share templates expected');
  assert.equal(await page.locator('.v45-share-modes [data-mode]').count(),2,'still and animation modes expected');
  assert.equal(await page.locator('#v45ShareOverlay').getByText(/Preparing|Préparation|Creating|Création/).count(),0,'V45 must never show a share-time rendering spinner');
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_V45__.mode()),'animation','animated clip must be the default share mode');
  await page.waitForSelector('.v45-share-preview canvas.v45-pretty-animation',{timeout:3000});
  const frameA=await page.locator('.v45-share-preview canvas.v45-pretty-animation').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(180);
  const frameB=await page.locator('.v45-share-preview canvas.v45-pretty-animation').evaluate(c=>c.toDataURL());
  assert.notEqual(frameA,frameB,'animated preview must keep moving using the V44 organic renderer');

  const box=await page.locator('.v45-share-sheet').boundingBox();
  const footer=await page.locator('.v45-share-sheet footer').boundingBox();
  assert(box&&box.y>=0&&box.y+box.height<=844,'share sheet must fit one mobile screen');
  assert(footer&&footer.y+footer.height<=844,'Copy Download Share must be visible without scrolling');

  const url=await page.evaluate(id=>window.__RALUVAAA_V45__.shareUrl(id),id);
  assert(url.includes('#wish='+encodeURIComponent(id)),'share URL must deep-link to wish');
  assert(!url.includes('actor='),'share URL must not leak actor');
  assert(!url.includes('qa='),'share URL must not leak QA');
  assert.equal(await page.locator('.v45-card-url').count(),0,'wish URL must not be visible in the artwork');

  await page.evaluate(()=>{
    window.__qaCopied='';
    window.__qaShares=[];
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__qaCopied=text}}});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:opts=>!!opts?.files?.length});
    Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{
      window.__qaShares.push({hasFiles:!!payload?.files?.length,type:payload?.files?.[0]?.type||'',text:payload?.text||'',url:payload?.url||''});
    }});
  });

  // Copy must act immediately.
  await page.locator('[data-share-copy]').click();
  await page.waitForFunction(()=>window.__qaCopied.includes('#wish='),null,{timeout:3000});
  assert.equal(await page.locator('.v45-share-status').innerText(),'Link copied');

  // Default animated mode uses the already-preloaded MP4. The click must not await a fetch.
  const dlVideo=page.waitForEvent('download',{timeout:5000});
  await page.locator('[data-share-download]').click();
  const video=await dlVideo;
  assert(/\.mp4$/i.test(video.suggestedFilename()),'default Download must emit stored MP4');

  await page.locator('[data-share-now]').click();
  await page.waitForFunction(()=>window.__qaShares.length>=1,null,{timeout:3000});
  let last=await page.evaluate(()=>window.__qaShares.at(-1));
  assert.equal(last.hasFiles,true,'default animated Share must include preloaded MP4');
  assert.equal(last.type,'video/mp4','default Share must use MP4');
  assert(last.text.includes('V45 instant sharing test'),'native share caption must include dynamic wish title');
  assert(last.text.includes('Nantes, France'),'native share caption must include location');
  assert(last.text.includes('#wish='),'native share caption must include deep-link');

  // Still remains available as the secondary mode and produces a personalized PNG.
  await page.locator('[data-mode="image"]').click();
  await page.waitForSelector('.v45-share-preview img',{timeout:3000});
  await page.evaluate(()=>window.__RALUVAAA_V45__.buildStillFile());

  const dlStill=page.waitForEvent('download',{timeout:5000});
  await page.locator('[data-share-download]').click();
  const still=await dlStill;
  assert(/\.png$/i.test(still.suggestedFilename()),'Still Download must emit PNG');

  await page.locator('[data-share-now]').click();
  await page.waitForFunction(()=>window.__qaShares.length>=2,null,{timeout:3000});
  last=await page.evaluate(()=>window.__qaShares.at(-1));
  assert.equal(last.hasFiles,true,'Still Share must include file');
  assert.equal(last.type,'image/png','Still Share file must be PNG');

  await page.click('.v45-share-x');
}
async function testBookmark(page,id){
  await open(page,id);
  await page.waitForSelector('#v43MobileBookmarkBtn',{state:'visible',timeout:5000});
  assert(/Save this wish|Saved/.test((await page.locator('#v43MobileBookmarkBtn').innerText()).trim()));
}
(async()=>{
  const{browser,page}=await setup();
  try{
    await testAssets(page);
    const id=await createWish(page,'V45 instant sharing test');
    await testBookmark(page,id);
    await testThreeButtons(page,id);
    console.log('RALUVAAA V45 instant prebuilt share QC passed');
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});