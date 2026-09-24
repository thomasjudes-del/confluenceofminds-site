const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v36/';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  try{
    await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__RALUVAAA_V36__?.version===36&&window.__RV26_SOLO__?.semantic,null,{timeout:12000});
    await page.click('#createBtn');
    await page.fill('#wishInput','QA semantic icon placement');
    await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
    await page.click('#confirm');
    await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='QA semantic icon placement'),null,{timeout:6000});
    const id=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='QA semantic icon placement').semanticId);
    await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
    await page.waitForFunction(()=>document.querySelectorAll('#drawerBody .v33-action-circle img.v35-icon').length>=8,null,{timeout:6000});
    const got=await page.locator('#drawerBody .v33-action-circle').evaluateAll(bs=>Object.fromEntries(bs.map(b=>[b.dataset.v35Icon,b.querySelector('img')?.src||''])));
    assert(got.evolve.endsWith('/raluvaaa/v36/icons/evolve.svg'),'evolve must use the imperfect horizontal continuation line');
    assert(got.graft.endsWith('/raluvaaa/v36/icons/graft.svg'),'graft must use the bridge icon');
    assert(got.letgo.endsWith('/raluvaaa/v36/icons/letgo.svg'),'let go must use the dying leaf over cracked soil');
    assert(got.branch.includes('/raluvaaa/v35/icons/branch.png'),'unrelated icons must remain V35');
    console.log('V36 semantic placement QA passed');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});