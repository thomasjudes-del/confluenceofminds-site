
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const URL=BASE+'/raluvaaa/solo-experience-v29/?qa=1';

async function prepare(browserType, viewport){
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
    status:200,
    contentType:'application/json',
    body:JSON.stringify({success:true,city:'Nantes',country:'France'})
  }));
  await page.route('https://ipapi.co/**',route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({city:'Nantes',country_name:'France'})
  }));
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#createBtn');
  return {browser,context,page};
}

async function createWish(page,text='I want to learn to sail under the stars.'){
  await page.click('#createBtn');
  await page.waitForSelector('#wishInput');
  await page.fill('#wishInput',text);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value.includes('Nantes'),null,{timeout:8000});
  assert.equal(await page.inputValue('#locInput'),'Nantes, France','desktop/network fallback should prefill city + country');
  await page.click('#confirm');
  await page.click('#myWorldBtn');
  await page.waitForSelector('#drawerBody [data-open]');
  await page.click('#drawerBody [data-open]');
  await page.waitForSelector('#drawerBody>.wish');
}

async function desktop(){
  const {browser,page}=await prepare(chromium,{width:1600,height:900});
  try{
    await createWish(page);

    assert.equal(await page.title(),'RALUVAAA · Experience V29');

    const metrics=await page.evaluate(()=>{
      const drawer=document.querySelector('#drawer').getBoundingClientRect();
      const wish=getComputedStyle(document.querySelector('#drawerBody>.wish'));
      const actions=[...document.querySelectorAll('#drawerBody .action-grid button[data-act]')].map(b=>{
        const r=b.getBoundingClientRect(),svg=b.querySelector('svg.v29-gesture')?.getBoundingClientRect();
        const hidden=b.querySelector('.v29-action-name')?getComputedStyle(b.querySelector('.v29-action-name')):null;
        return {act:b.dataset.act,w:r.width,h:r.height,svgW:svg?.width||0,labelW:hidden?.width,labelOverflow:hidden?.overflow};
      });
      const more=document.querySelector('#drawerBody details.more summary')?.getBoundingClientRect();
      return {drawer:{w:drawer.width,h:drawer.height},wishFont:parseFloat(wish.fontSize),actions,more:{w:more?.width||0,h:more?.height||0}};
    });
    assert(metrics.drawer.w>=430&&metrics.drawer.w<=570,'desktop wish card should use its space without becoming a full panel');
    assert(metrics.drawer.h<760,'desktop wish card must not be an almost-empty full-height panel');
    assert(metrics.wishFont>=32,'wish title must be game-scale readable');
    assert(metrics.actions.length>=3,'owner wish needs three clear primary actions');
    for(const a of metrics.actions.slice(0,3)){
      assert(a.w>=84&&a.h>=84,'primary action must have a large click target: '+a.act);
      assert(a.svgW>=54,'primary action needs a real graphic, not a tiny picto: '+a.act);
      assert.equal(a.labelW,'1px','primary action words must be visually hidden');
    }
    assert(metrics.more.w>=44&&metrics.more.h>=44,'more actions control must be discoverable');

    await page.click('#drawerBody details.more summary');
    const secondary=await page.evaluate(()=>{
      const menu=document.querySelector('#drawerBody .more-grid');
      const cs=getComputedStyle(menu);
      const items=[...menu.querySelectorAll('button')].map(b=>{
        const r=b.getBoundingClientRect();
        return {h:r.height,label:parseFloat(getComputedStyle(b.querySelector('.v29-secondary-label')).fontSize)};
      });
      return {display:cs.display,items};
    });
    assert(secondary.items.length>=2,'secondary menu needs usable options');
    for(const item of secondary.items){assert(item.h>=50&&item.label>=12,'secondary options must be readable and clickable')}

    // Build two sub-wishes through the actual primary graphical branch action.
    await page.click('#drawerBody details.more summary');
    await page.click('#drawerBody .action-grid [data-act="split"]');
    await page.waitForSelector('#branchInput');
    await page.fill('#branchInput','Book one sailing lesson\nLearn the basic navigation rules');
    await page.click('#confirm');
    await page.click('#myWorldBtn');
    await page.click('#drawerBody [data-open]');
    await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .wish-nav button:not(.wish-nav-parent)').length===2);

    const nav=await page.evaluate(()=>[...document.querySelectorAll('#drawerBody .wish-nav button:not(.wish-nav-parent)')].map(b=>({
      h:b.getBoundingClientRect().height,
      font:parseFloat(getComputedStyle(b.querySelector('b')).fontSize),
      mark:!!b.querySelector('.v29-branch-mark')
    })));
    assert(nav.every(x=>x.h>=68&&x.font>=16&&x.mark),'sub-wishes must be readable and visually marked as branches');

    await page.click('#drawerBody .wish-nav button:not(.wish-nav-parent)');
    await page.waitForSelector('#drawerBody .v28-root');
    assert(await page.locator('#drawerBody .v28-back').isVisible(),'sub-wish needs parent back navigation');
    assert(await page.locator('#drawerBody .v28-root').isVisible(),'sub-wish needs root navigation');
    await page.click('#drawerBody .v28-root');
    await page.waitForFunction(()=>document.querySelector('#drawerBody>.wish')?.textContent.includes('learn to sail'));

    // Verify graphical action remains actually clickable.
    await page.click('#drawerBody .action-grid [data-act="evolve"]');
    await page.waitForSelector('.sheet #evolveInput');
    await page.click('#cancel');

    console.log('RALUVAAA Experience V29 desktop QA passed');
  } finally { await browser.close(); }
}

async function mobile(){
  const {browser,page}=await prepare(webkit,{width:393,height:852});
  try{
    await createWish(page,'I want to make one beautiful ceramic bowl.');

    const m=await page.evaluate(()=>{
      const drawer=document.querySelector('#drawer').getBoundingClientRect();
      const wish=parseFloat(getComputedStyle(document.querySelector('#drawerBody>.wish')).fontSize);
      const buttons=[...document.querySelectorAll('#drawerBody .action-grid button[data-act]')].slice(0,3).map(b=>b.getBoundingClientRect().width);
      const rail=document.querySelector('#rail').getBoundingClientRect();
      return {drawer:{x:drawer.x,w:drawer.width,h:drawer.height,bottom:drawer.bottom},wish,buttons,rail:{y:rail.y,bottom:rail.bottom}};
    });
    assert(m.drawer.x<=10&&m.drawer.w>=370,'mobile wish experience must be a broad bottom sheet');
    assert(m.drawer.h<620,'mobile sheet must leave the world visible');
    assert(m.wish>=28,'mobile wish text must be immediately readable');
    assert(m.buttons.length>=3&&m.buttons.every(w=>w>=70),'mobile primary actions need large touch targets');
    assert(m.rail.y>760,'mobile world controls belong at the bottom');

    await page.click('#drawerBody details.more summary');
    const visible=await page.locator('#drawerBody .more-grid').isVisible();
    assert(visible,'mobile secondary actions must open visibly');

    console.log('RALUVAAA Experience V29 WebKit/mobile QA passed');
  } finally { await browser.close(); }
}

(async()=>{
  await desktop();
  await mobile();
})().catch(err=>{console.error(err);process.exit(1)});
