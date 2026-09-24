const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v43/';

async function setup(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();

  await page.goto(BASE+'/__raluvaaa_v43_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV43R1FreshStart');
    localStorage.removeItem('raluvaaaSavedWishesV1:A');
  });

  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.route('https://incompetech.com/**',r=>r.fulfill({status:404,contentType:'text/plain',body:'QA audio stub'}));

  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V43__?.version===43&&window.__RALUVAAA_V42__?.version===42&&window.__RV26_SOLO__?.state,null,{timeout:15000});
  return{browser,context,page};
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
async function testCoreSmoke(page){
  const root=await createWish(page,'V43 core workflow root');
  await open(page,root);
  await page.evaluate(()=>window.__RALUVAAA_UI__.action('split'));
  await page.waitForSelector('#branchInput',{timeout:4000});
  await page.fill('#branchInput','Branch one\nBranch two');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().filter(x=>x.kind==='split'&&x.lineageId===window.__RV26_SOLO__.semantic().find(y=>y.text==='V43 core workflow root')?.lineageId).length>=2,null,{timeout:7000});
  return root;
}
async function testSavedFollowsEvolution(page,root){
  await open(page,root);
  await page.waitForSelector('#v43BookmarkBtn',{timeout:4000});
  await page.click('#v43BookmarkBtn');
  assert.equal(await page.locator('#v43BookmarkBtn').getAttribute('aria-pressed'),'true','bookmark should turn on');
  let saved=await page.evaluate(()=>window.__RALUVAAA_V43__.saved());
  assert.equal(saved.length,1,'one saved wish expected');

  await page.evaluate(()=>window.__RALUVAAA_UI__.action('evolve'));
  await page.waitForSelector('#evolveInput',{timeout:4000});
  await page.fill('#evolveInput','V43 evolved current state');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='V43 evolved current state'),null,{timeout:7000});
  const evolved=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='V43 evolved current state').semanticId);

  const resolved=await page.evaluate(id=>window.__RALUVAAA_V43__.resolveSaved(id)?.semanticId,root);
  assert.equal(resolved,evolved,'saved root must resolve to its current evolved state');

  if(await page.locator('#drawerClose').isVisible())await page.click('#drawerClose');
  await page.click('#entrustedBtn');
  await page.waitForSelector('.v43-saved-section',{timeout:5000});
  assert.equal(await page.locator('.v43-saved-list .v43-saved-row').count(),1,'saved playlist should appear under entrusted wishes');
  const label=await page.locator('.v43-saved-list .v43-saved-open .t').innerText();
  assert.equal(label,'V43 evolved current state','saved playlist must display the current evolved state');

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V43__?.version===43&&window.__RV26_SOLO__?.state,null,{timeout:15000});
  saved=await page.evaluate(()=>window.__RALUVAAA_V43__.saved());
  assert.equal(saved.length,1,'saved wishes must persist across reloads');

  return evolved;
}
async function testShare(page,id){
  await open(page,id);
  await page.waitForSelector('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle',{timeout:5000});
  await page.locator('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle').click();
  await page.waitForSelector('#v43ShareOverlay.open',{timeout:5000});
  assert.equal(await page.locator('.v43-share-styles [data-style]').count(),5,'five share visual templates expected');
  assert.equal(await page.locator('.v43-share-modes [data-mode]').count(),2,'still and animated modes expected');

  const url=await page.evaluate(id=>window.__RALUVAAA_V43__.shareUrl(id),id);
  assert(url.includes('#wish='+encodeURIComponent(id)),'shared URL must deep-link to the semantic wish');
  assert(!url.includes('actor='),'shared URL must not leak QA persona');
  assert(!url.includes('qa='),'shared URL must not leak QA mode');

  const still=await page.evaluate(async id=>{
    const b=await window.__RALUVAAA_V43__.createStill(id,3);
    return{size:b?.size||0,type:b?.type||''};
  },id);
  assert.equal(still.type,'image/png');
  assert(still.size>12000,'share still must contain a real rendered visual');

  const pixels=[];
  for(let style=0;style<5;style++){
    const value=await page.evaluate(async({id,style})=>{
      const c=document.createElement('canvas');c.width=720;c.height=900;
      window.__RALUVAAA_V43__.renderFrame(c,id,style,3500,'image');
      const d=c.getContext('2d').getImageData(360,360,1,1).data;
      return Array.from(d).join(',');
    },{id,style});
    pixels.push(value);
  }
  assert(new Set(pixels).size>=3,'share styles must create visibly different renders');

  const support=await page.evaluate(()=>window.__RALUVAAA_V43__.supportsAnimation());
  assert.equal(support,true,'Chromium QA should support animated clip export');
  const clip=await page.evaluate(async id=>{
    const r=await window.__RALUVAAA_V43__.record(id,2,650);
    return{size:r?.blob?.size||0,mime:r?.mime||'',audioEmbedded:r?.audioEmbedded||false};
  },id);
  assert(clip.size>4000,'animated share must export a real video blob');
  assert(/^video\//.test(clip.mime),'animated share must use a video MIME type');

  const canvas=page.locator('.v43-share-preview canvas');
  const box=await canvas.boundingBox();
  assert(box&&box.width>250&&box.height>300,'share preview must be usable on desktop');

  await page.click('.v43-share-x');
}
async function testMobile(page,id){
  await page.setViewportSize({width:390,height:844});
  await open(page,id);
  await page.waitForSelector('#v43MobileBookmarkBtn',{state:'visible',timeout:5000});
  assert.equal(await page.locator('#v43MobileBookmarkBtn').innerText(),'Saved','mobile Save must be visibly labeled, not an unexplained icon');
  assert.equal(await page.locator('#v43BookmarkBtn').isVisible(),false,'desktop header bookmark must not create a stray mobile icon');
  await page.locator('#drawerBody .v33-action-unit[data-v39-icon="share"] .v33-action-circle').click();
  await page.waitForSelector('#v43ShareOverlay.open',{timeout:5000});
  const box=await page.locator('.v43-share-sheet').boundingBox();
  assert(box&&box.x>=0&&box.x+box.width<=390,'share sheet must stay inside mobile viewport');
  assert.equal(await page.locator('.v43-share-modes [data-mode]').count(),2);
  await page.click('.v43-share-x');
}
(async()=>{
  const{browser,page}=await setup();
  try{
    const root=await testCoreSmoke(page);
    const evolved=await testSavedFollowsEvolution(page,root);
    await testShare(page,evolved);
    await testMobile(page,evolved);
    console.log('RALUVAAA V43 saved wishes + viral share QC passed');
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});