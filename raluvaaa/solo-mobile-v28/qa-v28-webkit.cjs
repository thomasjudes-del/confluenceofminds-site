const assert=require('node:assert/strict');
const {webkit}=require('playwright');
const BASE='http://127.0.0.1:4173/raluvaaa/solo-mobile-v28/?soloqa=1&fresh=1';

async function ready(page){
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RV26_SOLO__&&window.__RV26_SOLO__.semantic().length>100,{timeout:30000});
  await page.waitForFunction(()=>window.__RALUVAAA_AUDIO__&&window.__RALUVAAA_ACTION_AUDIO__,{timeout:10000});
  await page.waitForTimeout(500);
}
async function openWish(page,id){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForSelector('#drawer:not(.hidden) .wish',{timeout:5000});
}
(async()=>{
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({
    viewport:{width:900,height:844},
    screen:{width:900,height:844},
    locale:'fr-FR',
    geolocation:{latitude:41.9028,longitude:12.4964},
    permissions:['geolocation']
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('https://nominatim.openstreetmap.org/**',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({address:{city:'Rome',country:'Italie'}})
  }));
  await ready(page);

  // Desktop/WebKit minimap must render without the white-block/stripe corruption seen on iOS Safari.
  const mini=await page.evaluate(()=>{
    const f=document.getElementById('engine').contentWindow,c=f.document.getElementById('mini'),r=c.getBoundingClientRect();
    if(r.width<2||r.height<2)return{visible:false};
    const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height;
    let bright=0,rowMax=0;
    for(let y=0;y<h;y++){
      let row=0;
      for(let xx=0;xx<w;xx++){
        const i=(y*w+xx)*4,a=d[i+3];
        if(a>90&&d[i]>220&&d[i+1]>220&&d[i+2]>220){bright++;row++}
      }
      rowMax=Math.max(rowMax,row);
    }
    return{visible:true,w,h,brightRatio:bright/(w*h),rowBrightRatio:rowMax/w};
  });
  assert.equal(mini.visible,true,'WebKit desktop minimap should render');
  assert(mini.brightRatio<.08,'WebKit minimap white-block artifact: '+JSON.stringify(mini));
  assert(mini.rowBrightRatio<.35,'WebKit minimap stripe artifact: '+JSON.stringify(mini));

  // On an actual mobile-size WebKit page, the minimap must be suppressed from first paint.
  const mobileContext=await browser.newContext({
    viewport:{width:390,height:844},
    screen:{width:390,height:844},
    locale:'fr-FR',
    geolocation:{latitude:41.9028,longitude:12.4964},
    permissions:['geolocation']
  });
  const mobile=await mobileContext.newPage();
  mobile.on('pageerror',e=>errors.push('mobile '+String(e)));
  mobile.on('console',m=>{if(m.type()==='error')errors.push('mobile '+m.text())});
  await mobile.route('https://nominatim.openstreetmap.org/**',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({address:{city:'Rome',country:'Italie'}})
  }));
  await ready(mobile);
  assert.equal(await mobile.evaluate(()=>window.RALUVAAA_STORE_KEY),'raluvaaaSoloMobileV28R1','WebKit V28 must use isolated wish storage');
  assert.equal(await mobile.evaluate(()=>window.RALUVAAA_ENTRUSTED_POLICY_KEY),'raluvaaaEntrustedSoloMobileV28R1','WebKit V28 must use isolated entrusted cache');
  const miniDisplay=await mobile.evaluate(()=>getComputedStyle(document.getElementById('engine').contentDocument.querySelector('.minimap')).display);
  assert.equal(miniDisplay,'none','mobile parent viewport must suppress the engine minimap');

  // Entrusted countdown rarity colors must remain visible on the primary mobile browser.
  let soundAt=Date.now();
  await mobile.click('#entrustedBtn');
  await mobile.waitForFunction(()=>document.querySelectorAll('#drawerBody [data-entrusted-band]').length===3,{timeout:10000});
  await mobile.waitForFunction(after=>(window.__RALUVAAA_ACTION_AUDIO__?.history||[]).some(x=>x.name==='ui_open'&&x.at>=after),soundAt,{timeout:5000});
  const entrustedColors=await mobile.locator('#drawerBody [data-entrusted-band] .m').evaluateAll(els=>els.map(el=>getComputedStyle(el).color));
  assert.equal(new Set(entrustedColors).size,3,'WebKit entrusted timers need three distinct colors');
  await mobile.click('#drawerClose');

  // Geolocation is approximate city/country, mandatory, and can still be edited manually.
  const p=mobile;
  await p.click('#createBtn');
  await p.waitForFunction(()=>document.getElementById('locInput')?.value==='Rome, Italie',{timeout:5000});
  assert((await p.locator('#locStatus').innerText()).includes('OpenStreetMap'));
  await p.fill('#wishInput','Trouver un amour réciproque');
  await p.fill('#locInput','');
  await p.click('#confirm');
  assert((await p.locator('#toast').innerText()).toLowerCase().includes('lieu'),'WebKit must reject locationless creation');
  await p.fill('#locInput','Rome, Italie');
  await p.click('#confirm');
  await p.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Trouver un amour réciproque'),{timeout:10000});
  const root=await p.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='Trouver un amour réciproque').semanticId);

  // Root vs branch Bloom labels + in-sheet navigation.
  await openWish(p,root);
  assert.equal(await p.locator('[data-act="bloom"]').getAttribute('data-v27-bloom'),'root');
  await p.click('[data-act="split"]');
  await p.fill('#branchInput','Oser aborder\nAccepter une invitation');
  await p.click('#confirm');
  await p.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Oser aborder')&&window.__RV26_SOLO__.semantic().some(x=>x.text==='Accepter une invitation'),{timeout:10000});
  const child=await p.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='Oser aborder').semanticId);
  await openWish(p,root);
  assert.equal(await p.locator('[data-nav-wish="'+child+'"]').count(),1,'root sheet should expose sub-wishes');
  await p.click('[data-nav-wish="'+child+'"]');
  assert.equal(await p.locator('[data-act="bloom"]').getAttribute('data-v27-bloom'),'branch');
  await p.waitForSelector('.v28-back',{state:'visible',timeout:2000});
  assert.equal(await p.locator('.v28-back').count(),1,'child sheet should expose visible back navigation');
  await p.click('.v28-back');

  let warning='';
  p.once('dialog',d=>{warning=d.message();d.accept()});
  await p.click('[data-act="bloom"]');
  await p.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',root,{timeout:10000});
  assert(warning.includes('branches actives'),'root Bloom must warn about unfinished branches');
  const states=await p.evaluate(()=>window.__RV26_SOLO__.semantic().filter(x=>x.text==='Oser aborder'||x.text==='Accepter une invitation').map(x=>x.state));
  assert(states.every(x=>x==='abandoned'),'unfinished root paths must fade after whole-wish Bloom');

  // Mute remains a struck note, never an X.
  await p.click('#musicBtn');
  await p.waitForTimeout(180);
  assert.equal((await p.locator('#musicBtn').innerText()).trim(),'♪');
  assert(parseFloat(await p.locator('#musicBtn .sound-strike').evaluate(el=>getComputedStyle(el).opacity))>.8,'muted WebKit note must be struck');

  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('RALUVAAA Solo Mobile V28 WebKit/iOS QA passed');
  await mobileContext.close();
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});