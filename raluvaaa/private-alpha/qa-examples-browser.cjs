// Local fixture only: no Worker, production API, account or persistent backend writes.
const assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const {chromium}=require('playwright');
const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4187';
const OUT=process.env.RALUVAAA_QA_OUTPUT||'/tmp/raluvaaa-ten-examples-evidence';
const ID=id=>'alpha-example-v1-'+id;
const fixtureWish={id:'api-fixture-root',lineageId:'api-fixture-lineage',kind:'create',text:'The API fixture wish stays exactly as authored.',locationText:'Fixture location',isMine:true,state:'alive',createdAt:Date.now(),encouragementCount:0};
(async()=>{
  mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'en-US'});
  const requests=[],blocked=[],errors=[];
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!==new URL(BASE).origin){blocked.push(req.url());return route.abort()}
    if(url.pathname.startsWith('/qa-api/')){
      requests.push({method:req.method(),path:url.pathname});
      let body={};
      if(url.pathname.endsWith('/v1/session'))body={actorId:'fixture-actor',token:'fixture-token'};
      else if(url.pathname.endsWith('/v1/me'))body={actorId:'fixture-actor',claimed:false,wishes:[fixtureWish],encouragedWishIds:[]};
      else if(url.pathname.endsWith('/v1/world'))body={wishes:[fixtureWish],events:[],connections:[]};
      else if(url.pathname.endsWith('/v1/saved'))body={saved:[]};
      else if(url.pathname.endsWith('/v1/translate'))body={translation:JSON.parse(req.postData()||'{}').text,sourceLang:'en'};
      else throw new Error('Unexpected fixture API request: '+req.method()+' '+url.pathname);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
    }
    return route.continue()
  });
  await context.addInitScript(()=>{
    localStorage.setItem('raluvaaaSoloExperienceV44R1FreshStart','1');
    localStorage.setItem('raluvaaaAlphaSessionTokenV1:WORLD','fixture-token');
    localStorage.setItem('raluvaaaAlphaActorIdV1:WORLD','fixture-actor');
    localStorage.setItem('raluvaaaAmbientAudioV1','off');
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const open=async()=>{await page.goto(BASE+'/raluvaaa/private-alpha/?api='+encodeURIComponent(BASE+'/qa-api/'));await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__&&window.__RV26_SHARED__?.semantic().length===11)};
  await open();
  const read=()=>page.evaluate(()=>({semantic:window.__RV26_SHARED__.semantic(),state:window.__RV26_SHARED__.state(),qc:document.getElementById('engine').contentWindow.__RV42_SIMULATION_QC__.summary()}));
  const first=await read();assert.equal(first.semantic.filter(x=>x.simulated).length,10);assert.equal(first.state.events.filter(x=>x.type==='create').length,1);assert.equal(first.state.entrusted.length,3);
  assert.equal(first.qc.withHelp+first.qc.withEncouragement+first.qc.withSuggestion+first.qc.warps,0);
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),ID('first-bee-photo'));
  await page.waitForFunction(id=>window.__RALUVAAA_UI__.current()?.semanticId===id,ID('first-bee-photo'));
  await page.screenshot({path:OUT+'/ten-examples-en.png'});
  await page.click('[data-lang="fr"]');await page.waitForFunction(()=>window.__RV26_SHARED__.semantic().find(x=>x.semanticId==='alpha-example-v1-first-bee-photo')?.text.startsWith('Photographier'));
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),ID('first-bee-photo'));
  const french=await read();assert.equal(french.semantic.find(x=>x.semanticId==='api-fixture-root').text,fixtureWish.text);assert.deepEqual(french.state.events,first.state.events);
  await page.screenshot({path:OUT+'/ten-examples-fr.png'});
  await page.reload();await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__&&window.__RV26_SHARED__?.semantic().length===11);
  const reloaded=await read();assert.deepEqual(reloaded.semantic,french.semantic,'same IDs, language and real wish after browser reload');
  assert.deepEqual(reloaded.state.entrusted,first.state.entrusted,'same actor keeps all three exact deadlines on full reload');
  assert.equal(reloaded.state.entrustedActorId,'fixture-actor');
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),ID('guitar-song'));
  await page.waitForFunction(id=>window.__RALUVAAA_UI__.current()?.semanticId===id,ID('guitar-song'));
  assert.match(await page.locator('#drawerBody').innerText(),/chanter une chanson entière/);
  assert.match(await page.locator('#drawerBody').innerText(),/Je veux apprendre à jouer de la guitare/);
  await page.screenshot({path:OUT+'/ten-examples-evolution-fr.png'});
  await page.setViewportSize({width:390,height:844});await page.click('#entrustedBtn');
  await page.waitForFunction(()=>document.querySelectorAll('[data-entrusted-band]').length===3);
  const bands=await page.locator('[data-entrusted-band]').evaluateAll(els=>els.map(el=>({band:el.dataset.entrustedBand,id:el.dataset.open})));
  assert.deepEqual(bands.map(x=>x.band),['short','medium','long']);assert.equal(new Set(bands.map(x=>x.id)).size,3);
  await page.screenshot({path:OUT+'/ten-examples-entrusted-mobile.png'});
  // Capture actual canvas drawing calls used by the export, not a source-string assertion.
  await page.evaluate(()=>{window.__exampleExportLabels=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__exampleExportLabels.push(String(text));return original.call(this,text,...args)}});
  await page.evaluate(id=>window.__RALUVAAA_V46__.openShare(id),ID('bees'));
  await page.waitForFunction(()=>window.__exampleExportLabels.includes('WISH SIMULÉ'));
  const exportLabels=await page.evaluate(()=>window.__exampleExportLabels.filter(x=>/SIMUL|HUMAN|HUMAIN/.test(x)));
  assert(exportLabels.includes('WISH SIMULÉ'));assert(!exportLabels.includes('WISH HUMAIN'));
  assert.deepEqual(errors,[]);
  const report={examples:first.semantic.filter(x=>x.simulated).length,qc:first.qc,bands,exportLabels,errors,
    apiRequests:requests,blockedExternalRequests:blocked.length,
    entrustedReload:{before:first.state.entrusted,after:reloaded.state.entrusted,changed:JSON.stringify(first.state.entrusted)!==JSON.stringify(reloaded.state.entrusted)}};
  writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
