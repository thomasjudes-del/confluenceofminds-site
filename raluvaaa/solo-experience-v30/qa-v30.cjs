
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const AURL=BASE+'/raluvaaa/solo-experience-v30/?qa=1&actor=A';

async function contextFor(browserType,viewport){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{
    try{
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
        getCurrentPosition(_ok,err){setTimeout(()=>err?.({code:1,message:'QA permission denied'}),0)}
      }});
    }catch{}
  });
  const page=await context.newPage();
  await page.route('https://ipwho.is/**',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({success:true,city:'Nantes',country:'France'})
  }));
  await page.route('https://ipapi.co/**',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({city:'Nantes',country_name:'France'})
  }));
  return {browser,context,page};
}

async function ready(page,url=AURL){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#createBtn');
  await page.waitForFunction(()=>window.__RALUVAAA_V30__?.version===30&&window.__RV26_TEST__?.state,{timeout:10000});
  await page.waitForFunction(()=>window.__RV26_TEST__?.semantic()?.length>0,{timeout:10000});
}

async function createWish(page,text='I want to learn to sail under the stars.'){
  await page.click('#createBtn');
  await page.waitForSelector('#wishInput');
  await page.fill('#wishInput',text);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value.includes('Nantes'),null,{timeout:8000});
  assert.equal(await page.inputValue('#locInput'),'Nantes, France');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='create'),null,{timeout:7000});
  const rootId=await page.evaluate(()=>window.__RV26_TEST__.state().events.find(e=>e.type==='create').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),rootId);
  await page.waitForSelector('#drawerBody>.wish');
  await page.waitForSelector('.v30-action-surface');
  return rootId;
}

async function desktop(){
  const {browser,page}=await contextFor(chromium,{width:1600,height:900});
  try{
    await ready(page);

    assert.equal(await page.evaluate(()=>window.RALUVAAA_STORE_KEY),'raluvaaaSoloExperienceV30R1','V30 must use a new clean personal wish store');
    assert.equal((await page.evaluate(()=>window.__RV26_TEST__.state().events.length)),0,'V30 must start with personal wishes reset');
    assert.equal(await page.title(),'RALUVAAA · Experience V30');

    // Empty-field error is intentionally legible.
    await page.click('#createBtn');
    await page.click('#confirm');
    await page.waitForSelector('#toast.show-toast');
    const toastFont=await page.locator('#toast').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    assert(toastFont>=14,'error/toast text must not be microcopy');
    await page.click('#cancel');

    const rootId=await createWish(page);

    // Root owner actions: three visual verbs + all secondary actions exposed, no ellipsis.
    const owner=await page.evaluate(()=>{
      const primary=[...document.querySelectorAll('#drawerBody .action-grid button[data-act]')]
        .filter(b=>getComputedStyle(b).display!=='none')
        .map(b=>({act:b.dataset.act,w:b.getBoundingClientRect().width,color:getComputedStyle(b).color,svg:!!b.querySelector('svg.v29-gesture')}));
      const visible=[...document.querySelectorAll('#drawerBody .v30-action')].map(b=>({
        act:b.dataset.v30Act,label:b.textContent.trim(),h:b.getBoundingClientRect().height
      }));
      const more=document.querySelector('#drawerBody details.more');
      return {primary,visible,moreVisible:more?getComputedStyle(more).display!=='none':false};
    });
    assert.deepEqual(owner.primary.slice(0,3).map(x=>x.act),['evolve','split','bloom']);
    assert(owner.primary.slice(0,3).every(x=>x.w>=84&&x.svg),'primary verbs need large graphical controls');
    assert.equal(new Set(owner.primary.slice(0,3).map(x=>x.color)).size,3,'continue / branch / bloom need distinct semantic colors');
    assert.equal(owner.moreVisible,false,'V30 must have no ellipsis menu');
    for(const needed of ['recenter','modify','graft','share','letgo'])assert(owner.visible.some(x=>x.act===needed),'missing owner action '+needed);
    assert(owner.visible.every(x=>x.h>=60),'visible owner actions must be real touch/click targets');
    assert(!owner.visible.some(x=>/remove|mistake|reattach/i.test(x.act+x.label)),'remove mistake / reattach must not be surfaced');

    // Create two sub-wishes using the graphical branch verb.
    await page.click('#drawerBody .action-grid [data-act="split"]');
    await page.fill('#branchInput','Book one sailing lesson\nLearn the basic navigation rules');
    await page.click('#confirm');
    await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='split'),null,{timeout:7000});
    await page.evaluate(id=>window.__RV26_SOLO__.open(id),rootId);
    await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .wish-nav button:not(.wish-nav-parent)').length===2);

    const childId=await page.locator('#drawerBody .wish-nav button:not(.wish-nav-parent)').first().getAttribute('data-nav-wish');
    await page.click('#drawerBody .wish-nav button:not(.wish-nav-parent)');
    await page.waitForSelector('#drawerBody .v28-root');
    await page.waitForSelector('#drawerBody .v28-back');

    // Same seed symbol means release/create and root.
    const seedParity=await page.evaluate(()=>({
      create:document.querySelector('#createBtn .v30-seed')?.outerHTML,
      root:document.querySelector('#drawerBody .v28-root .v30-seed')?.outerHTML,
      backFont:document.querySelector('#drawerBody .v28-back .v30-back-icon')?.getBoundingClientRect().width||0
    }));
    assert(seedParity.create&&seedParity.root,'seed symbol must exist in both release and root navigation');
    assert.equal(seedParity.create,seedParity.root,'release a wish and root wish must use the same seed symbol');
    assert(seedParity.backFont>=22,'parent back affordance must be readable');
    await page.click('#drawerBody .v28-root');
    await page.waitForFunction(()=>document.querySelector('#drawerBody>.wish')?.textContent.includes('learn to sail'));

    // Entrusted cards carry the full phase color, not just the countdown.
    await page.click('#entrustedBtn');
    await page.waitForFunction(()=>document.querySelectorAll('#drawerBody [data-entrusted-band]').length===3,{timeout:10000});
    const entrusted=await page.locator('#drawerBody [data-entrusted-band]').evaluateAll(items=>items.map(el=>({
      band:el.dataset.entrustedBand,
      card:getComputedStyle(el).color,
      title:getComputedStyle(el.querySelector('.t')).color,
      timer:getComputedStyle(el.querySelector('.m')).color
    })));
    assert.equal(new Set(entrusted.map(x=>x.card)).size,3,'entrusted cards need three distinct phase colors');
    assert(entrusted.every(x=>x.card===x.title&&x.card===x.timer),'the whole entrusted phrase/card must carry the phase color');

    // Persona B sees helper grammar on Persona A's wish.
    const burl=BASE+'/raluvaaa/solo-experience-v30/?qa=1&actor=B';
    await ready(page,burl);
    await page.evaluate(id=>window.__RV26_SOLO__.open(id),rootId);
    await page.waitForSelector('.v30-action-surface.v30-helper');
    const helper=await page.evaluate(()=>[...document.querySelectorAll('.v30-action-surface.v30-helper .v30-action')].map(b=>({act:b.dataset.v30Act,label:b.textContent.trim()})));
    for(const needed of ['support','help','graft','suggest','recenter','share'])assert(helper.some(x=>x.act===needed),'missing helper action '+needed);

    await page.click('.v30-action[data-v30-act="support"]');
    await page.waitForFunction(id=>window.__RV26_TEST__.state().events.some(e=>e.type==='encourage'&&e.semanticId===id&&e.actorId==='B'),rootId,{timeout:5000});

    console.log('RALUVAAA Experience V30 desktop role/UI QA passed');
  } finally { await browser.close(); }
}

async function mobile(){
  const {browser,page}=await contextFor(webkit,{width:393,height:852});
  try{
    await ready(page);
    const rootId=await createWish(page,'I want to make one beautiful ceramic bowl.');
    const mobile=await page.evaluate(()=>({
      seed:!!document.querySelector('#createBtn .v30-seed'),
      drawer:document.querySelector('#drawer').getBoundingClientRect().toJSON(),
      title:parseFloat(getComputedStyle(document.querySelector('#drawerBody>.wish')).fontSize),
      primary:[...document.querySelectorAll('#drawerBody .action-grid button[data-act]')].filter(b=>getComputedStyle(b).display!=='none').map(b=>b.getBoundingClientRect().width),
      surface:[...document.querySelectorAll('.v30-action-surface .v30-action')].map(b=>b.getBoundingClientRect().height),
      moreVisible:!!document.querySelector('#drawerBody details.more')&&getComputedStyle(document.querySelector('#drawerBody details.more')).display!=='none'
    }));
    assert(mobile.seed,'mobile release control must use the seed symbol');
    assert(mobile.title>=28,'mobile wish must stay game-scale readable');
    assert(mobile.primary.length>=3&&mobile.primary.slice(0,3).every(w=>w>=70),'mobile primary verbs must be large');
    assert(mobile.surface.length>=4&&mobile.surface.every(h=>h>=55),'mobile visible actions must be readable touch targets');
    assert.equal(mobile.moreVisible,false,'mobile must not hide actions behind ellipsis');

    // Root navigation gets the same seed after a split.
    await page.click('#drawerBody .action-grid [data-act="split"]');
    await page.fill('#branchInput','Choose clay\nBook a pottery class');
    await page.click('#confirm');
    await page.evaluate(id=>window.__RV26_SOLO__.open(id),rootId);
    await page.click('#drawerBody .wish-nav button:not(.wish-nav-parent)');
    await page.waitForSelector('.v28-root .v30-seed');
    assert.equal(await page.locator('#createBtn .v30-seed').getAttribute('viewBox'),await page.locator('.v28-root .v30-seed').getAttribute('viewBox'));

    console.log('RALUVAAA Experience V30 WebKit/mobile QA passed');
  } finally { await browser.close(); }
}

(async()=>{await desktop();await mobile()})().catch(err=>{console.error(err);process.exit(1)});
