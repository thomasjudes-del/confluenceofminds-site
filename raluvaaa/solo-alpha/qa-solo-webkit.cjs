const assert=require('node:assert/strict');
const {webkit}=require('playwright');
const BASE='http://127.0.0.1:4173/raluvaaa/solo-alpha/?soloqa=1&fresh=1';

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

  // On an actual mobile-size parent viewport, force the minimap off even if Safari gives the iframe a desktop layout width.
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  const miniDisplay=await page.evaluate(()=>getComputedStyle(document.getElementById('engine').contentDocument.querySelector('.minimap')).display);
  assert.equal(miniDisplay,'none','mobile parent viewport must suppress the engine minimap');

  // Geolocation is approximate city/country, mandatory, and can still be edited manually.
  await page.click('#createBtn');
  await page.waitForFunction(()=>document.getElementById('locInput')?.value==='Rome, Italie',{timeout:5000});
  assert((await page.locator('#locStatus').innerText()).includes('OpenStreetMap'));
  await page.fill('#wishInput','Trouver un amour réciproque');
  await page.fill('#locInput','');
  await page.click('#confirm');
  assert((await page.locator('#toast').innerText()).toLowerCase().includes('lieu'),'WebKit must reject locationless creation');
  await page.fill('#locInput','Rome, Italie');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Trouver un amour réciproque'),{timeout:10000});
  const root=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='Trouver un amour réciproque').semanticId);

  // Root vs branch Bloom labels + in-sheet navigation.
  await openWish(page,root);
  assert((await page.locator('[data-act="bloom"]').innerText()).toLowerCase().includes('wish'));
  await page.click('[data-act="split"]');
  await page.fill('#branchInput','Oser aborder\nAccepter une invitation');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Oser aborder')&&window.__RV26_SOLO__.semantic().some(x=>x.text==='Accepter une invitation'),{timeout:10000});
  const child=await page.evaluate(()=>window.__RV26_SOLO__.semantic().find(x=>x.text==='Oser aborder').semanticId);
  await openWish(page,root);
  assert.equal(await page.locator('[data-nav-wish="'+child+'"]').count(),1,'root sheet should expose sub-wishes');
  await page.click('[data-nav-wish="'+child+'"]');
  assert((await page.locator('[data-act="bloom"]').innerText()).toLowerCase().includes('branche'));
  assert.equal(await page.locator('[data-nav-wish="'+root+'"]').count(),1,'child sheet should expose parent wish');
  await page.click('[data-nav-wish="'+root+'"]');

  let warning='';
  page.once('dialog',d=>{warning=d.message();d.accept()});
  await page.click('[data-act="bloom"]');
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',root,{timeout:10000});
  assert(warning.includes('branches actives'),'root Bloom must warn about unfinished branches');
  const states=await page.evaluate(()=>window.__RV26_SOLO__.semantic().filter(x=>x.text==='Oser aborder'||x.text==='Accepter une invitation').map(x=>x.state));
  assert(states.every(x=>x==='abandoned'),'unfinished root paths must fade after whole-wish Bloom');

  // Mute remains a struck note, never an X.
  await page.click('#musicBtn');
  await page.waitForTimeout(180);
  assert.equal((await page.locator('#musicBtn').innerText()).trim(),'♪');
  assert(parseFloat(await page.locator('#musicBtn .sound-strike').evaluate(el=>getComputedStyle(el).opacity))>.8,'muted WebKit note must be struck');

  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('RALUVAAA Solo RC WebKit/iOS P0 QA passed');
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});