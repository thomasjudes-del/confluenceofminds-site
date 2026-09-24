const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const URL=BASE+'/raluvaaa/solo-experience-v31/?qa=1&actor=A';

async function setup(type,viewport){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{
    window.__QA_MEDIA_PLAYS__=[];
    const p=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){
      try{window.__QA_MEDIA_PLAYS__.push(this.src||this.currentSrc||'')}catch{}
      return Promise.resolve();
    };
    try{
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_ok,err){setTimeout(()=>err?.({code:1}),0)}}});
    }catch{}
  });
  const page=await context.newPage();
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RALUVAAA_V31__?.version===31&&window.__RV26_TEST__?.state,{timeout:10000});
  await page.waitForFunction(()=>window.__RV26_TEST__.semantic().length>0,{timeout:10000});
  return {browser,page};
}

async function createWish(page,text='I want to learn pottery.'){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='create'),null,{timeout:7000});
  const id=await page.evaluate(()=>window.__RV26_TEST__.state().events.find(e=>e.type==='create').semanticId);
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForSelector('.v31-action-deck');
  return id;
}

async function desktop(){
  const {browser,page}=await setup(chromium,{width:1600,height:900});
  try{
    assert.equal(await page.evaluate(()=>window.RALUVAAA_STORE_KEY),'raluvaaaSoloExperienceV31R1');
    assert.equal(await page.evaluate(()=>window.__RV26_TEST__.state().events.length),0,'V31 must start clean');

    const rail=await page.evaluate(()=>['entrustedBtn','myWorldBtn','musicBtn','createBtn'].map(id=>{
      const b=document.getElementById(id),r=b.getBoundingClientRect(),svg=b.querySelector('svg')?.getBoundingClientRect();
      return {id,w:r.width,h:r.height,sw:svg?.width||0,sh:svg?.height||0,html:b.innerHTML};
    }));
    assert(rail.every(x=>x.w===rail[0].w&&x.h===rail[0].h),'rail controls must have one size');
    assert(rail.every(x=>x.sw>=28&&x.sh>=28),'rail pictograms must use the available button area');
    assert(rail.every(x=>Math.abs(x.sw-rail[0].sw)<1&&Math.abs(x.sh-rail[0].sh)<1),'every desktop rail pictogram must use the exact same visual size');
    assert(rail.find(x=>x.id==='createBtn').html.includes('M27 5V15'),'release icon must be a simple seed + plus');
    assert((rail.find(x=>x.id==='myWorldBtn').html.match(/<path/g)||[]).length>=3,'My wishes must read as multiple wish seeds');

    const rootId=await createWish(page);

    const deck=await page.evaluate(()=>[...document.querySelectorAll('.v31-action-deck .v31-action-unit')].map(u=>{
      const b=u.querySelector('button').getBoundingClientRect();
      const s=u.querySelector('svg').getBoundingClientRect();
      const l=u.querySelector('.v31-action-label').getBoundingClientRect();
      return {bw:b.width,bh:b.height,sw:s.width,sh:s.height,labelTop:l.top,buttonBottom:b.bottom,label:u.textContent.trim()};
    }));
    assert(deck.length>=8,'owner should have all actions visible in one deck');
    assert(deck.every(x=>Math.abs(x.bw-deck[0].bw)<1&&Math.abs(x.bh-deck[0].bh)<1),'all action circles must have the same size');
    assert(deck.every(x=>Math.abs(x.sw-deck[0].sw)<1&&Math.abs(x.sh-deck[0].sh)<1),'all action pictograms must have the same visual size');
    assert(deck.every(x=>x.labelTop>=x.buttonBottom),'action meaning must sit below the pictogram');
    assert.equal(await page.locator('#drawerBody details.more').evaluate(el=>getComputedStyle(el).display),'none');
    assert.equal(await page.locator('#drawerBody .action-grid').evaluate(el=>getComputedStyle(el).display),'none');
    assert.equal(await page.locator('#drawerBody .v30-action-surface').evaluate(el=>getComputedStyle(el).display),'none');

    // Custom uploaded creation sound is the one wired to CREATE.
    const sound=await page.evaluate(()=>({
      source:window.__RALUVAAA_CREATE_AUDIO_V31__?.source,
      src:window.__RALUVAAA_CREATE_AUDIO_V31__?.audio?.src||'',
      history:window.__RALUVAAA_CREATE_AUDIO_V31__?.history||[],
      plays:window.__QA_MEDIA_PLAYS__||[]
    }));
    assert.equal(sound.source,'uploaded create a wish.wav');
    assert(sound.src.startsWith('data:audio/ogg;base64,'),'creation sound must be embedded from the uploaded file');
    assert(sound.history.some(x=>x.name==='create'),'create confirmation must call the uploaded creation sound');
    assert(sound.plays.some(x=>x.startsWith('data:audio/ogg;base64,')),'browser play() must be requested for the uploaded creation sound');

    // Root uses the same seed language after a branch is created.
    const branchUnit=page.locator('.v31-action-unit').filter({hasText:/Branch|Embrancher/}).first();
    await branchUnit.locator('button').click();
    await page.fill('#branchInput','Choose clay\nBook a class');
    await page.click('#confirm');
    await page.evaluate(id=>window.__RV26_SOLO__.open(id),rootId);
    await page.click('#drawerBody .wish-nav button:not(.wish-nav-parent)');
    await page.waitForSelector('.v28-root .v30-seed svg');
    const rootPaths=await page.locator('.v28-root .v30-seed svg').locator('path').count();
    assert(rootPaths>=2,'root control must use a clear seed pictogram');

    console.log('RALUVAAA Experience V31 desktop QA passed');
  } finally {await browser.close();}
}

async function mobile(){
  const {browser,page}=await setup(webkit,{width:393,height:852});
  try{
    await createWish(page,'I want to learn one song on the cello.');
    const m=await page.evaluate(()=>({
      deck:[...document.querySelectorAll('.v31-action-deck .v31-action-circle')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,sw:b.querySelector('svg').getBoundingClientRect().width})),
      labels:[...document.querySelectorAll('.v31-action-label')].map(l=>parseFloat(getComputedStyle(l).fontSize)),
      rail:[...document.querySelectorAll('#rail .rail-btn:not(.hidden)')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,sw:b.querySelector('svg')?.getBoundingClientRect().width||0}))
    }));
    assert(m.deck.length>=8);
    assert(m.deck.every(x=>x.w>=70&&Math.abs(x.w-x.h)<1&&x.sw>=40),'mobile actions must stay large and uniform');
    assert(m.labels.every(x=>x>=10.5),'mobile action labels must remain readable');
    assert(m.rail.every(x=>Math.abs(x.w-m.rail[0].w)<1&&Math.abs(x.h-m.rail[0].h)<1&&x.w>=40&&x.sw>=27),'mobile rail must use one button scale: '+JSON.stringify(m.rail));
    assert(m.rail.every(x=>Math.abs(x.sw-m.rail[0].sw)<1),'every mobile rail pictogram must use the same visual size: '+JSON.stringify(m.rail));
    console.log('RALUVAAA Experience V31 WebKit/mobile QA passed');
  } finally {await browser.close();}
}

(async()=>{await desktop();await mobile()})().catch(e=>{console.error(e);process.exit(1)});