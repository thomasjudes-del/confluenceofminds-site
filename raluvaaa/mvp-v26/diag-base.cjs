const { chromium }=require('/tmp/rv26-playwright/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.stack||String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4173/raluvaaa/mvp-v26/?actor=A&qa=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.__RV26_TEST__&&window.__RV26_TEST__.semantic().length>100,null,{timeout:30000});
 await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('raluvaaaEntrustedV26PolicyV1')||'null')?.entries?.length===3}catch{return false}},null,{timeout:15000});
 await page.waitForTimeout(700);
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(700);
 if(errors.length){console.error('V26 BASE ERRORS\n'+errors.join('\n---\n'));process.exit(1)}
 await browser.close();console.log('RALUVAAA V26 base renderer diagnostic passed');
})().catch(e=>{console.error(e);process.exit(1)});