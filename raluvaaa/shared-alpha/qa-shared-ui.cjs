const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const BASE='http://127.0.0.1:4173/raluvaaa/shared-alpha/?api=http://127.0.0.1:8787&sharedqa=1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function ready(page){
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,{timeout:20000});
  await page.waitForFunction(()=>window.__RV26_SHARED__&&window.__RALUVAAA_SHARED_DEBUG__,{timeout:10000});
  await page.waitForFunction(()=>window.__RV26_SHARED__.semantic().length>0,{timeout:10000});
}
async function refresh(page){
  await page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh());
  await wait(250);
}
async function world(page){return page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.world())}
async function inbox(page){return page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.inbox())}
async function openWish(page,id){
  await page.waitForFunction(id=>window.__RV26_SHARED__.semantic().some(x=>x.semanticId===id),id,{timeout:10000});
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),id);
  await page.waitForSelector('#drawer:not(.hidden) .wish',{timeout:5000});
}
async function createWish(page,text){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.fill('#locInput','Nantes, France');
  await page.click('#confirm');
  await page.waitForFunction(text=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text===text),text,{timeout:12000});
  const w=await world(page);
  return w.wishes.find(x=>x.text===text).id;
}
async function acceptPending(page,type){
  await refresh(page);
  await page.waitForFunction(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type===type),type,{timeout:10000});
  await page.click('#inboxBtn');
  const p=await inbox(page);
  const wanted=p.pending.find(x=>x.type===type);
  assert(wanted,'pending '+type+' required');
  const selector='[data-accept="'+wanted.id+'"]';
  await page.waitForSelector(selector,{timeout:5000});
  await page.click(selector);
  return wanted.id;
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const ctxA=await browser.newContext({viewport:{width:1280,height:800},locale:'fr-FR'});
  const ctxB=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  const A=await ctxA.newPage(),B=await ctxB.newPage();
  const errors=[];
  for(const [label,page] of [['A',A],['B',B]]){
    page.on('pageerror',e=>errors.push(label+': '+String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text())});
  }
  await Promise.all([ready(A),ready(B)]);
  const actorA=await A.evaluate(()=>window.RALUVAAA_ACTOR_ID);
  const actorB=await B.evaluate(()=>window.RALUVAAA_ACTOR_ID);
  assert(actorA&&actorB&&actorA!==actorB,'two browser contexts must have independent identities');

  const stamp=Date.now().toString(36);
  const textA='QA shared wish '+stamp+' A';
  const wishA=await createWish(A,textA);

  await refresh(B);
  assert((await world(B)).wishes.some(w=>w.id===wishA),'B must see A wish');
  await openWish(B,wishA);

  await B.click('[data-act="encourage"]');
  await B.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.me()?.encouragedWishIds?.includes(id),wishA,{timeout:10000});
  await refresh(B);
  await openWish(B,wishA);
  assert(await B.locator('[data-act="encourage"]').isDisabled(),'encourage must be one-per-human');

  await B.click('[data-act="help"]');
  await B.fill('#helpInput','I can help with one concrete first step.');
  await B.click('#confirm');
  await acceptPending(A,'help');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help'&&e.wishId===id),wishA,{timeout:10000});

  await refresh(B);
  await openWish(B,wishA);
  await B.click('[data-act="suggest"]');
  await B.fill('#suggestInput','Choose one tiny first action\nDo that action this week');
  await B.click('#confirm');
  await acceptPending(A,'suggest_branch');
  await A.waitForFunction(()=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text==='Choose one tiny first action'),{timeout:10000});

  const textB='QA shared wish '+stamp+' B';
  const wishB=await createWish(B,textB);
  await refresh(B);
  await openWish(B,wishB);
  await B.click('[data-act="connect"]');
  await B.evaluate(id=>window.__RV26_SHARED__.select(id),wishA);
  await B.waitForSelector('#overlay #confirm',{timeout:5000});
  await B.click('#overlay #confirm');
  await acceptPending(A,'connect');
  await A.waitForFunction((ids)=>window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='connect'&&((e.wishId===ids[0]&&e.payload?.otherWishId===ids[1])||(e.wishId===ids[1]&&e.payload?.otherWishId===ids[0]))),[wishA,wishB],{timeout:10000});

  await refresh(A);
  await openWish(A,wishA);
  await A.click('[data-act="evolve"]');
  const evolvedText='QA shared evolved '+stamp;
  await A.fill('#evolveInput',evolvedText);
  await A.click('#confirm');
  await A.waitForFunction(t=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text===t),evolvedText,{timeout:10000});
  const evolved=(await world(A)).wishes.find(w=>w.text===evolvedText).id;

  await refresh(A);
  await openWish(A,evolved);
  await A.click('[data-act="split"]');
  await A.fill('#branchInput','QA branch one '+stamp+'\nQA branch two '+stamp);
  await A.click('#confirm');
  await A.waitForFunction(stamp=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.filter(w=>w.text.includes('QA branch')&&w.text.includes(String(stamp))).length>=2,stamp,{timeout:10000});
  const branches=(await world(A)).wishes.filter(w=>w.text.includes('QA branch')&&w.text.includes(String(stamp)));
  assert.equal(branches.length,2);

  await refresh(A);
  await openWish(A,branches[0].id);
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="bloom"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='bloomed',branches[0].id,{timeout:10000});

  await refresh(A);
  await openWish(A,branches[1].id);
  await A.locator('details.more summary').click();
  A.once('dialog',d=>d.accept());
  await A.click('[data-act="abandon"]');
  await A.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='abandoned',branches[1].id,{timeout:10000});

  assert.equal(errors.length,0,'browser console/page errors: '+errors.join(' | '));
  console.log('RALUVAAA shared Alpha two-browser UI QA passed');
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});