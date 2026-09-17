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
 await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('raluvaaaEntrustedV26PolicyV2')||'null')?.entries?.length===3}catch{return false}},null,{timeout:15000});
 await page.waitForTimeout(700);
 await page.locator('#entrustedBtn').click();
 await page.waitForTimeout(150);
 const panel=await page.evaluate(()=>{const d=document.getElementById('drawer'),b=document.getElementById('entrustedBtn');return{drawerClass:d.className,hidden:d.classList.contains('hidden'),display:getComputedStyle(d).display,active:b.classList.contains('active'),wrapped:b.dataset.alphaWrapped||'',handler:String(b.onclick).slice(0,240),items:document.querySelectorAll('#drawerBody [data-open]').length,title:document.getElementById('drawerTitle').textContent}});
 if(panel.hidden||panel.display==='none'){console.error('ALPHA V0 PANEL DEBUG '+JSON.stringify(panel));process.exit(1)}
 await page.locator('#drawerClose').click();
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(700);
 if(errors.length){console.error('ALPHA V0 BASE ERRORS\n'+errors.join('\n---\n'));process.exit(1)}
 await browser.close();console.log('RALUVAAA Alpha V0 base renderer diagnostic passed');
})().catch(e=>{console.error(e);process.exit(1)});