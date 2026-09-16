const { chromium } = require('/tmp/rv26-playwright/node_modules/playwright');
const assert = require('assert');
const BASE='http://127.0.0.1:4173/raluvaaa/mvp-v26/';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:4173'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  async function go(actor='A'){
    await page.goto(BASE+'?actor='+actor+'&qa=1',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__RV26_TEST__&&window.__RV26_TEST__.semantic().length>100);
    assert.equal(await page.getAttribute('body','data-version'),'26');
    assert.equal(await page.evaluate(()=>window.__RV26_TEST__.persona),actor);
  }
  async function open(id){await page.evaluate(id=>window.__RV26_TEST__.open(id),id);await page.waitForSelector('#drawer:not(.hidden)');await page.waitForTimeout(120)}
  async function clickAction(name){const target=page.locator(`[data-act="${name}"]`).first();if(!(await target.isVisible())){const summary=page.locator('details.more > summary');assert(await summary.count(),`missing More menu for ${name}`);await summary.click()}await target.click()}
  async function brightCount(){return page.evaluate(()=>{const f=document.getElementById('engine'),c=f.contentDocument.querySelector('canvas'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=32){if(d[i]+d[i+1]+d[i+2]>90)n++}return n})}
  async function createWish(text){await page.locator('#createBtn').click();await page.fill('#wishInput',text);await page.locator('#confirm').click();await page.waitForFunction(text=>window.__RV26_TEST__.state().events.some(e=>e.type==='create'&&e.text===text),text);return page.evaluate(text=>window.__RV26_TEST__.state().events.find(e=>e.type==='create'&&e.text===text).semanticId,text)}

  await go('A');
  assert(await page.locator('#rail').isVisible());
  assert(await page.locator('#qaStrip').isVisible());

  await page.locator('#entrustedBtn').click();
  assert.equal(await page.locator('#drawerBody [data-open]').count(),3);
  await page.locator('#drawerClose').click();
  await page.locator('[data-lang="en"]').click();
  assert.equal(await page.locator('#myWorldBtn').getAttribute('title'),'My world');
  await page.locator('[data-lang="fr"]').click();

  await open('qa-a-e1');
  const before=await brightCount();
  await clickAction('focus');
  await page.waitForFunction(()=>document.body.dataset.focusLineage==='qa-a-lineage');
  await page.waitForTimeout(350);
  const after=await brightCount();
  assert(after < before*0.82,`focus did not sufficiently isolate lineage: before=${before} after=${after}`);
  await page.locator('#modeClose').click();
  await page.waitForFunction(()=>!document.body.dataset.focusLineage);

  await open('qa-a-s1');
  await clickAction('evolve');
  await page.fill('#evolveInput','I booked my first beginner sailing lesson.');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='evolve'&&e.text==='I booked my first beginner sailing lesson.'));

  await open('qa-a-s2');
  await clickAction('split');
  await page.fill('#branchInput','Practise a bowline\nPractise a figure-eight knot');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.filter(e=>e.type==='split').length>=3);
  await open('qa-a-s2');
  assert(await page.locator('[data-act="branch"]').isVisible());
  await clickAction('branch');
  await page.fill('#branchInput','Practise tying knots with gloves');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='branch_add'&&!e.proposalId));
  const branchId=await page.evaluate(()=>window.__RV26_TEST__.state().events.filter(e=>e.type==='branch_add'&&!e.proposalId).slice(-1)[0].children[0].semanticId);
  await open(branchId);
  await clickAction('reattach');
  await page.selectOption('#parentSelect','qa-a-s1');
  await page.locator('#confirm').click();
  await page.waitForFunction(id=>window.__RV26_TEST__.state().events.some(e=>e.type==='reparent'&&e.semanticId===id),branchId);

  page.once('dialog',d=>d.accept());
  await open('qa-a-s3');
  await clickAction('bloom');
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='bloom'&&e.semanticId==='qa-a-s3'));
  await open('qa-a-s3');
  assert.equal(await page.locator('[data-act="evolve"]').count(),0);
  assert.equal(await page.locator('[data-act="split"]').count(),0);

  const abandonedId=await createWish('QA wish to abandon intentionally');
  await open(abandonedId);
  page.once('dialog',d=>d.accept());
  await clickAction('abandon');
  await page.waitForFunction(id=>window.__RV26_TEST__.state().events.some(e=>e.type==='abandon'&&e.semanticId===id),abandonedId);

  const mistakeId=await createWish('QA accidental wish to remove');
  await open(mistakeId);
  page.once('dialog',d=>d.accept());
  await clickAction('remove');
  await page.waitForFunction(id=>!window.__RV26_TEST__.state().events.some(e=>e.type==='create'&&e.semanticId===id),mistakeId);

  await open('qa-a-root');
  await clickAction('share');
  await page.waitForTimeout(100);
  const clip=await page.evaluate(()=>navigator.clipboard.readText());
  assert(clip.includes('#wish=qa-a-root'));

  await go('A');
  await open('qa-b-root');
  await clickAction('encourage');
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='encourage'&&e.semanticId==='qa-b-root'&&e.actorId==='A'));
  await open('qa-b-root');
  assert(await page.locator('[data-act="encourage"]').isDisabled());

  await clickAction('help');
  await page.fill('#helpInput','I can lend you tools for the first planting day.');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='help_proposed'&&e.actorId==='A'));

  await open('qa-b-root');
  await clickAction('suggest');
  await page.fill('#suggestInput','Ask the first three neighbours\nChoose one tiny plot');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='suggest_proposed'&&e.actorId==='A'));

  await open('qa-a-root');
  await clickAction('connect');
  await page.evaluate(()=>window.__RV26_TEST__.open('qa-b-root'));
  await page.waitForSelector('#confirm');
  await page.locator('#confirm').click();
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='connect_proposed'&&e.actorId==='A'));
  assert.equal(await page.evaluate(()=>window.__RV26_TEST__.state().events.filter(e=>e.type==='connect').length),0);

  await go('B');
  assert((await page.locator('#inboxBadge').textContent())!=='0');
  await page.locator('#inboxBtn').click();
  assert(await page.locator('[data-accept]').count()>=3);
  while(await page.locator('[data-accept]').count()){
    await page.locator('[data-accept]').first().click();
    await page.waitForTimeout(140);
  }
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='connect'));
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='help'));
  await page.waitForFunction(()=>window.__RV26_TEST__.state().events.some(e=>e.type==='branch_add'&&e.proposalId));

  await page.locator('#myWorldBtn').click();
  assert(await page.locator('#drawer').isVisible());
  assert((await page.locator('#drawerBody').innerText()).includes('shared neighbourhood garden'));

  page.once('dialog',d=>d.accept());
  await page.locator('#qaReset').click();
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(()=>window.__RV26_TEST__&&window.__RV26_TEST__.semantic().length>100);
  assert((await page.locator('.sub').innerText()).includes('V26'));
  assert.equal(await page.evaluate(()=>window.__RV26_TEST__.state().version),26);
  assert.equal(await page.evaluate(()=>window.__RV26_TEST__.state().events.length),6);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__RV26_TEST__&&window.__RV26_TEST__.semantic().length>100);
  const layout=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,rail:document.getElementById('rail').getBoundingClientRect(),brand:document.getElementById('brand').getBoundingClientRect()}));
  assert(layout.sw<=layout.cw,'mobile horizontal overflow');
  assert(layout.rail.right<=391&&layout.rail.left>330,'mobile side rail is not compact/right aligned');
  assert(layout.brand.bottom<90,'mobile brand too tall');
  await page.locator('#entrustedBtn').click();
  const drawerBox=await page.locator('#drawer').boundingBox();
  assert(drawerBox.height>700,'mobile drawer should use vertical space rather than a bottom bar');

  assert.deepEqual(errors,[],`browser errors: ${errors.join('\n')}`);
  await browser.close();
  console.log('RALUVAAA V26 browser QA passed');
})().catch(async e=>{console.error(e);process.exit(1)});