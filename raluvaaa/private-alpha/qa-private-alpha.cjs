const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const API=process.env.RALUVAAA_ALPHA_BASE||'http://127.0.0.1:8787';
const URL=BASE+'/raluvaaa/private-alpha/?api='+encodeURIComponent(API);

function audioFixture(){
  const rate=8000,frames=rate*20,b=Buffer.alloc(44+frames*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);for(let i=0;i<frames;i++)b.writeInt16LE(Math.sin(i*2*Math.PI*440/rate)*1000,44+i*2);return b;
}
async function clickAction(page,action){
  console.log('Click visible action',action);
  if(action==='toggle_help'){await page.locator('[data-pa-toggle-help]').click();return}
  const icon={split:'branch',branch:'branch',connect:'graft',toggle_help:null}[action]??action;
  const deck=page.locator('.v33-action-unit[data-v39-icon="'+icon+'"] .v33-action-circle:visible').first();
  // Private alpha exposes the action deck after asynchronous decorators finish.
  // Never fall back to the hidden legacy More menu while that deck is pending.
  await deck.waitFor({state:'visible',timeout:8000});
  await deck.click();
}
async function verifyPhysicalMute(page,mobile){
  // Real media decoding/playback with a deterministic local tone; chosen production
  // asset availability/audibility is a separate live-device acceptance check.
  await page.bringToFront();
  const button=page.locator('#musicBtn');
  await page.evaluate(()=>{window.__qaMediaEvents=[];[window.__RALUVAAA_AUDIO__.audio,window.__RALUVAAA_ACTION_AUDIO__.semanticChannel,window.__RALUVAAA_REVIVE_AUDIO_V42__.audio].forEach((a,channel)=>{for(const type of ['playing','pause','ended','waiting','error'])a.addEventListener(type,()=>{window.__qaMediaEvents.push({channel,type,time:a.currentTime,at:Math.round(performance.now())});if(window.__qaMediaEvents.length>30)window.__qaMediaEvents.shift()})})});
  const box=await button.boundingBox();assert(box.width>=44&&box.height>=44,'mute must have a 44px hit target');
  const hit=await button.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))});assert(hit,'mute must receive physical pointer hit-testing');
  const tap=()=>mobile?page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2):page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  if(await page.evaluate(()=>window.__RALUVAAA_AUDIO__.enabled))await tap();
  // Safari requires each media channel's initial play to belong to a real
  // user gesture. Start the actual channels in the physical unmute click,
  // rather than using evaluate() to simulate permission to autoplay.
  await button.evaluate(el=>el.addEventListener('click',()=>{window.__RALUVAAA_ACTION_AUDIO__.playNamed('help');window.__RALUVAAA_REVIVE_AUDIO_V42__.play({type:'wake'})},{once:true}));
  await tap();
  try{
    await page.waitForFunction(()=>[window.__RALUVAAA_AUDIO__.audio,window.__RALUVAAA_ACTION_AUDIO__.semanticChannel,window.__RALUVAAA_REVIVE_AUDIO_V42__.audio].every(a=>!a.paused&&!a.muted&&a.currentTime>0.02),null,{polling:50,timeout:8000});
  }catch(error){
    console.error('Actual media start state',await page.evaluate(()=>({visibility:document.visibilityState,events:window.__qaMediaEvents,channels:[window.__RALUVAAA_AUDIO__.audio,window.__RALUVAAA_ACTION_AUDIO__.semanticChannel,window.__RALUVAAA_REVIVE_AUDIO_V42__.audio].map(a=>({paused:a.paused,muted:a.muted,time:a.currentTime,readyState:a.readyState,error:a.error?.code||null}))})));throw error;
  }
  await tap();
  const stopped=await page.evaluate(()=>[window.__RALUVAAA_AUDIO__.audio,window.__RALUVAAA_ACTION_AUDIO__.semanticChannel,window.__RALUVAAA_REVIVE_AUDIO_V42__.audio].map(a=>({paused:a.paused,muted:a.muted,time:a.currentTime})));
  assert(stopped.every(a=>a.paused&&a.muted),'physical mute must silence ambient, action and revive immediately');
  await page.waitForTimeout(250);
  const later=await page.evaluate(()=>[window.__RALUVAAA_AUDIO__.audio,window.__RALUVAAA_ACTION_AUDIO__.semanticChannel,window.__RALUVAAA_REVIVE_AUDIO_V42__.audio].map(a=>a.currentTime));
  later.forEach((t,i)=>assert(Math.abs(t-stopped[i].time)<0.02,'muted playback must stay stopped'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('raluvaaaAmbientAudioV1')),'off');
  console.log('Physical '+(mobile?'touch':'mouse')+' mute: all three decoded media channels stopped');
}
async function verifyResponsiveAccount(page){
  const original=page.viewportSize(),sizes=[{width:320,height:568},{width:667,height:375},{width:320,height:360},original];
  async function check(stage){
    for(const viewport of sizes){
      console.log('Account geometry',stage,viewport,await page.evaluate(()=>({brandMutations:window.__qaBrandMutations||0,at:Math.round(performance.now())})));
      await page.bringToFront();await page.setViewportSize(viewport);
      // Measure a settled rendered viewport, not an in-flight resize.
      let frameTimeout;
      try{await Promise.race([page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),new Promise((_,reject)=>{frameTimeout=setTimeout(()=>reject(new Error('Viewport did not render two frames within 3 seconds')),3000)})])}finally{clearTimeout(frameTimeout)}
      const geometry=await page.locator('.pa-auth-card').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,width:r.width,height:r.height,overflowY:s.overflowY,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}});
      assert(geometry.x>=-1&&geometry.y>=-1&&geometry.x+geometry.width<=viewport.width+1&&geometry.y+geometry.height<=viewport.height+1,'account dialog must fit '+stage+': '+JSON.stringify({viewport,geometry}));
      if(geometry.scrollHeight>geometry.clientHeight+1)assert(['auto','scroll'].includes(geometry.overflowY),'long account content must be scrollable');
      assert(Number(await page.locator('.pa-auth-card p').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))>=14,'account explanation must be readable');
      assert(Number(await page.locator('.pa-auth-field label').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))>=12,'account labels must be readable');
      for(const selector of ['.pa-auth-x','[data-pa-send],[data-pa-verify]']){const r=await page.locator(selector).boundingBox();assert(r.width>=44&&r.height>=44,'account controls need 44px targets');}
    }
  }
  for(const language of ['en','fr']){
    await page.click('[data-lang="'+language+'"]');await page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.showAccount());await page.waitForSelector('.pa-auth-card',{state:'visible'});
    await check(language+' email');
    if(language==='fr'){
      await page.fill('[data-pa-email]','invalid');await page.click('[data-pa-send]');await page.waitForFunction(()=>!!document.querySelector('[data-pa-error]')?.textContent);await check('FR email error');
      await page.fill('[data-pa-email]','layout+'+Date.now().toString(36)+'@raluvaaa.test');await page.click('[data-pa-send]');await page.waitForSelector('[data-pa-code]');await check('FR code');
      assert.match(await page.locator('.pa-auth-card p').innerText(),/indésirables/);
      await page.fill('[data-pa-code]','no');await page.click('[data-pa-verify]');await page.waitForFunction(()=>!!document.querySelector('[data-pa-error]')?.textContent);await check('FR code error');
    }
    await page.click('.pa-auth-x');
  }
  await page.setViewportSize(original);await page.click('[data-lang="en"]');
  const music=await page.locator('#musicBtn').boundingBox();assert(music.x>=0&&music.y>=0&&music.x+music.width<=original.width&&music.y+music.height<=original.height,'mute must remain in viewport');
  console.log('EN/FR account email, code and error states fit narrow, landscape and reduced-height viewports');
}
async function verifyShareResponsive(page,id){
  const original=page.viewportSize();
  const originalLanguage=await page.locator('.lang button.active').getAttribute('data-lang');
  let states=0,controls=0;
  try{
    for(const language of ['en','fr'])for(const viewport of [{width:320,height:568},{width:390,height:844},{width:667,height:375}]){
      await page.bringToFront();await page.setViewportSize(viewport);
      await page.click('[data-lang="'+language+'"]');await openWish(page,id);await clickAction(page,'share');
      await page.waitForSelector('#v46ShareOverlay.open');
      for(const mode of ['image','animation']){
        await page.click('[data-mode="'+mode+'"]');
        assert.equal(await page.locator('.v46-share-modes button.active').getAttribute('data-mode'),mode,'Share must actually select the requested mode');
        await page.locator('.v46-media.'+(mode==='animation'?'v46-pretty-animation':'v46-pretty-still')).waitFor({state:'visible',timeout:3000});
        let frameTimeout;
        try{await Promise.race([page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),new Promise((_,reject)=>{frameTimeout=setTimeout(()=>reject(new Error('Share viewport did not render two frames within 3 seconds')),3000)})])}finally{clearTimeout(frameTimeout)}
        let measureTimeout,result;
        try{result=await Promise.race([page.evaluate(async ({viewport,mode})=>{
          const sheet=document.querySelector('.v46-share-sheet'),preview=document.querySelector('.v46-share-preview');
          const failures=[];
          const check=(ok,message)=>{if(!ok)failures.push(message)};
          const visible=el=>{
            for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden')return false}
            const r=el.getBoundingClientRect();return r.width>0&&r.height>0
          };
          const r=sheet.getBoundingClientRect(),css=getComputedStyle(sheet);
          check(r.x>=-1&&r.y>=-1&&r.right<=viewport.width+1&&r.bottom<=viewport.height+1,'sheet must fit viewport');
          check(sheet.scrollWidth<=sheet.clientWidth+1,'sheet must not overflow horizontally');
          check(document.documentElement.scrollWidth<=viewport.width+1&&document.body.scrollWidth<=viewport.width+1,'page must not overflow horizontally');
          check(sheet.scrollHeight<=sheet.clientHeight+1||['auto','scroll'].includes(css.overflowY),'long Share content must scroll vertically');
          check(preview.scrollWidth<=preview.clientWidth+1,'preview must not crop its style controls horizontally');
          const pr=preview.getBoundingClientRect();
          check(Math.abs(pr.height-pr.width*1.25)<=1,'preview must preserve its readable 4:5 portrait ratio');
          if(viewport.height<400)check(sheet.scrollHeight>sheet.clientHeight,'short landscape must scroll rather than shrink the wish preview');
          const buttons=[...sheet.querySelectorAll('button')].filter(visible);
          check(buttons.length===13,'all thirteen Share controls must exist and be visible');
          check([...sheet.querySelectorAll('.v46-style-dots button')].filter(visible).length===5,'all five style selectors must be visible');
          if(mode==='animation'){const note=sheet.querySelector('.v46-audio-note.visible');check(!!note&&visible(note)&&parseFloat(getComputedStyle(note).fontSize)>=12,'animation credit must be visible and readable')}
          for(const button of buttons){
            // Scroll only the sheet vertically. scrollIntoView can silently scroll
            // an overflow:hidden preview and conceal unreachable style controls.
            const before=button.getBoundingClientRect(),sr=sheet.getBoundingClientRect(),oldScrollTop=sheet.scrollTop;
            if(before.top<sr.top+4)sheet.scrollTop+=before.top-sr.top-4;
            else if(before.bottom>sr.bottom-4)sheet.scrollTop+=before.bottom-sr.bottom+4;
            if(sheet.scrollTop!==oldScrollTop)await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            const br=button.getBoundingClientRect(),name=button.getAttribute('aria-label')||button.textContent.trim()||button.className;
            const hit=document.elementFromPoint(br.x+br.width/2,br.y+br.height/2);
            check(br.width>=43.9&&br.height>=43.9,name+' must have a 44px target');
            check(br.x>=-1&&br.y>=-1&&br.right<=viewport.width+1&&br.bottom<=viewport.height+1,name+' must be reachable after vertical scroll');
            check(button.disabled||hit===button||button.contains(hit),name+' must pass actual pointer hit-testing');
            if(button.textContent.trim()&&!['×','‹','›'].includes(button.textContent.trim()))check(parseFloat(getComputedStyle(button).fontSize)>=12,name+' must use readable text');
            if(button.matches('.v46-share-x'))check(!!button.getAttribute('aria-label'),'Close must have an accessible label');
          }
          for(const text of sheet.querySelectorAll('h3,.v46-eyebrow,.pa-share-free,.v46-swipe-hint,.v46-audio-note,.v46-share-status')){
            if(visible(text)&&text.textContent.trim())check(parseFloat(getComputedStyle(text).fontSize)>=12,text.className+' must be at least 12px');
          }
          check(preview.scrollLeft===0&&sheet.scrollLeft===0,'reachability checks must not scroll content horizontally');
          sheet.scrollTop=0;
          return{failures,controls:buttons.length,scrollHeight:sheet.scrollHeight,clientHeight:sheet.clientHeight}
        },{viewport,mode}),new Promise((_,reject)=>{measureTimeout=setTimeout(()=>reject(new Error('Share scroll and hit-testing did not render within 3 seconds')),3000)})])}finally{clearTimeout(measureTimeout)}
        assert.deepEqual(result.failures,[],language+' '+viewport.width+'x'+viewport.height+' '+mode+': '+result.failures.join('; '));
        states++;controls+=result.controls;
      }
      await page.click('.v46-share-x');await page.waitForSelector('#v46ShareOverlay.open',{state:'hidden'});
    }
  }finally{
    if(await page.locator('#v46ShareOverlay.open').count()){
      await page.locator('.v46-share-sheet').evaluate(el=>el.scrollTop=0);
      await page.click('.v46-share-x');
    }
    await page.setViewportSize(original);
    if(originalLanguage)await page.click('[data-lang="'+originalLanguage+'"]');
  }
  console.log('Share responsive geometry, fonts, touch targets and pointer reachability',JSON.stringify({states,controls}));
}
async function verifyShareExports(page,id){
  await page.bringToFront();
  assert.equal(await page.evaluate(()=>document.visibilityState),'visible','export must be exercised in the active user tab');
  await openWish(page,id);await clickAction(page,'share');
  await page.waitForSelector('#v46ShareOverlay.open');
  const shareBox=await page.locator('.v46-share-sheet').boundingBox(),viewport=page.viewportSize();
  assert(shareBox.x>=0&&shareBox.y>=0&&shareBox.x+shareBox.width<=viewport.width+1&&shareBox.y+shareBox.height<=viewport.height+1,'Share dialog must fit viewport');
  assert.match(await page.locator('.pa-share-free').innerText(),/free|gratuit/i);
  for(const selector of ['.v46-share-x','[data-mode="image"]','[data-share-download]']){
    const box=await page.locator(selector).boundingBox();assert(box.height>=44,'share controls require readable 44px height: '+selector);
  }
  await page.click('[data-mode="image"]');
  const imageDownload=page.waitForEvent('download');await page.click('[data-share-download]');
  const image=await imageDownload,png=require('node:fs').readFileSync(await image.path());
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),900);
  await page.click('[data-mode="animation"]');
  await page.waitForFunction(()=>window.__RALUVAAA_V46__.mediaReady()||window.__RALUVAAA_V46__.mediaError(),null,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.__RALUVAAA_V46__.mediaError()),false,'animation must finish preparing');
  const clipDownload=page.waitForEvent('download');await page.click('[data-share-download]');
  const clip=await clipDownload,bytes=require('node:fs').readFileSync(await clip.path());assert(bytes.length>1000,'exported video cannot be empty');
  const fs=require('node:fs');fs.mkdirSync('qa-artifacts',{recursive:true});fs.writeFileSync('qa-artifacts/export-clip.'+(clip.suggestedFilename().endsWith('.mp4')?'mp4':'webm'),bytes);
  const info=await page.evaluate(async ({data,mime})=>{const video=document.createElement('video');video.muted=true;video.src='data:'+mime+';base64,'+data;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Exported clip metadata timed out')),5000);video.onloadedmetadata=()=>{clearTimeout(timer);resolve()};video.onerror=()=>{clearTimeout(timer);reject(new Error('Exported clip does not decode'))}});const info={width:video.videoWidth,height:video.videoHeight,duration:video.duration,durationText:String(video.duration),frameHashes:[]};
    console.log('Export metadata before frame seeks',JSON.stringify(info));
    if(Number.isFinite(info.duration)&&info.duration>2.4){
      const canvas=document.createElement('canvas');canvas.width=180;canvas.height=225;const ctx=canvas.getContext('2d');
      for(const time of [0.25,2.1]){
        await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Export frame seek timed out')),5000);video.onseeked=()=>{clearTimeout(timer);resolve()};video.currentTime=time});
        ctx.drawImage(video,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let hash=0;for(let i=0;i<pixels.length;i+=13)hash=(Math.imul(hash,31)+pixels[i])>>>0;info.frameHashes.push(hash);
      }
    }
    return info},{data:bytes.toString('base64'),mime:clip.suggestedFilename().endsWith('.mp4')?'video/mp4':'video/webm'});
  console.log('Decoded export metadata',JSON.stringify({...info,filename:clip.suggestedFilename(),bytes:bytes.length,visibility:await page.evaluate(()=>document.visibilityState),previewFrames:await page.evaluate(()=>window.__RALUVAAA_V46__.previewFrames())}));
  assert.equal(info.width,720);assert.equal(info.height,900);assert(info.duration>=2.5&&info.duration<5,'clip must decode as a roughly three-second animation: '+JSON.stringify(info));
  assert.equal(info.frameHashes.length,2,'two video frames must be seekable');assert.notEqual(info.frameHashes[0],info.frameHashes[1],'the exported clip must contain motion rather than a frozen frame');
  await page.click('.v46-share-x');await page.waitForSelector('#v46ShareOverlay.open',{state:'hidden'});
  console.log('Downloaded PNG and decoded personalized video',info);
}
async function pageFor(browser,mobile=false){
  const context=await browser.newContext({
    viewport:mobile?{width:390,height:844}:{width:1280,height:800},
    isMobile:mobile,hasTouch:mobile,locale:mobile?'fr-FR':'en-US'
  });
  const page=await context.newPage();
  page.on('crash',()=>console.error('Browser page crashed',mobile?'mobile':'desktop'));
  page.on('close',()=>console.log('Browser page closed',mobile?'mobile':'desktop'));
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));page.__qaErrors=pageErrors;
  for(const pattern of ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/**','https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/*/audio/**'])await page.route(pattern,r=>r.fulfill({status:200,contentType:'audio/wav',body:audioFixture()}));
  await page.route(url=>url.origin===new globalThis.URL(BASE).origin&&url.pathname==='/raluvaaa/solo-experience-v46/share-assets/immersed-share.m4a',r=>r.fulfill({status:200,contentType:'audio/wav',body:audioFixture()}));
  page.on('console',msg=>console.log('[browser console]',msg.type(),msg.text()));
  page.on('pageerror',err=>console.log('[browser pageerror]',err?.stack||err?.message||String(err)));
  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  try{
    await page.waitForFunction(()=>window.__RALUVAAA_SHARED_READY__===true,null,{polling:100,timeout:30000});
    await page.waitForFunction(()=>!!window.__RALUVAAA_PRIVATE_AUTH__,null,{polling:100,timeout:5000});
    await page.waitForFunction(()=>window.__RALUVAAA_V46__?.version===46,null,{polling:100,timeout:5000});
  }catch(err){
    const diag=await page.evaluate(()=>({
      sharedReady:window.__RALUVAAA_SHARED_READY__,
      privateAuth:!!window.__RALUVAAA_PRIVATE_AUTH__,
      v46:window.__RALUVAAA_V46__?.version||null,
      status:document.getElementById('sharedStatus')?.textContent||'',
      account:!!document.getElementById('privateAccountBtn')
    })).catch(()=>({evaluationFailed:true}));
    console.error('[private-alpha readiness]',diag);
    throw err
  }
  await page.evaluate(()=>{
    window.__qaBrandMutations=0;const brand=document.querySelector('#brand .sub');if(brand)new MutationObserver(records=>window.__qaBrandMutations+=records.length).observe(brand,{subtree:true,childList:true,characterData:true});
    // Keep one deterministic translator throughout FR layout/count checks and
    // the final translation assertions: cached results must not depend on test order.
    if(window.__RALUVAAA_TRANSLATION__)window.__RALUVAAA_TRANSLATION__.translate=async (text,target)=>({translation:target==='fr'?'TRADUIT: '+text:text,sourceLang:'en'})
  });
  return{context,page}
}
async function claimViaUi(page,email){
  await page.bringToFront();
  await page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.showAccount());
  await page.waitForSelector('#raluvaaaAuthOverlay.open');
  await page.waitForFunction(()=>document.activeElement?.matches('[data-pa-email]'),null,{timeout:3000});
  await page.fill('[data-pa-email]',email);
  assert.equal(await page.inputValue('[data-pa-email]'),email,'claim form must retain the requested test email');
  const sent=page.waitForResponse(r=>r.url().endsWith('/v1/auth/request-code')&&r.request().method()==='POST');
  await page.click('[data-pa-send]');
  const delivery=await sent;
  assert.equal(delivery.status(),200,'test-mode code request failed: '+JSON.stringify(await delivery.json()));
  await page.waitForSelector('[data-pa-code]',{polling:100,timeout:5000});
  const code=await page.inputValue('[data-pa-code]');
  assert.match(code,/^\d{6}$/,'CI auth code should autofill in test mode');
  await page.click('[data-pa-verify]');
  await page.waitForFunction(()=>window.__RALUVAAA_PRIVATE_AUTH__?.me?.()?.claimed===true,null,{polling:100,timeout:7000});
  await page.waitForSelector('#raluvaaaAuthOverlay.open',{state:'hidden',timeout:3000}).catch(()=>{});
}
async function createWish(page,text,emailIfNeeded){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.fill('#locInput','Nantes, France');
  await page.click('#confirm');
  if(emailIfNeeded){
    await page.waitForSelector('#raluvaaaAuthOverlay.open',{polling:100,timeout:3000});
    await page.fill('[data-pa-email]',emailIfNeeded);
    await page.click('[data-pa-send]');
    await page.waitForSelector('[data-pa-code]',{polling:100,timeout:5000});
    assert.match(await page.inputValue('[data-pa-code]'),/^\d{6}$/);
    await page.click('[data-pa-verify]');
  }
  await page.waitForFunction(t=>window.__RALUVAAA_SHARED_DEBUG__?.world()?.wishes?.some(w=>w.text===t),text,{polling:100,timeout:12000});
  return page.evaluate(t=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.find(w=>w.text===t).id,text)
}
async function refresh(page){await page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh())}
async function cameraState(page){
  const frame=page.frames().find(f=>f.url().includes('/v22/engine-v03-locked.html'));
  assert(frame,'the actual visual engine frame must exist');
  // The engine camera is a top-level lexical const, not window.camera.
  const value=await frame.evaluate(()=>({x:camera.x,y:camera.y,zoom:camera.zoom}));
  for(const key of ['x','y','zoom'])assert(Number.isFinite(value[key]),'camera '+key+' must be a finite number');
  return value
}
async function openWish(page,id){
  await refresh(page);
  // replace() rebuilds the engine asynchronously; wait for the actual hydrated node.
  await page.waitForFunction(id=>window.__RV26_SHARED__.semantic().some(w=>w.semanticId===id),id,{polling:100,timeout:8000});
  await page.evaluate(id=>window.__RV26_SHARED__.open(id),id);
  await page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,id,{polling:100,timeout:5000})
}
async function acceptFirst(page,type){
  await refresh(page);
  await page.waitForFunction(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type===type),type,{polling:100,timeout:8000});
  const p=await page.evaluate(type=>window.__RALUVAAA_SHARED_DEBUG__.inbox().pending.find(p=>p.type===type),type);
  if(await page.locator('#drawer').isVisible())await page.click('#drawerClose');
  await page.waitForSelector('#drawer',{state:'hidden'});
  await page.click('#inboxBtn');
  const btn=page.locator('[data-accept="'+p.id+'"]');
  await btn.click();
  return p
}

(async()=>{
  const desktopEngine=process.env.RALUVAAA_QA_DESKTOP_ENGINE||'chromium';
  assert(['chromium','webkit'].includes(desktopEngine),'unsupported desktop browser');
  const chrome=await ({chromium,webkit}[desktopEngine]).launch({headless:true});
  const mobileEngine=process.env.RALUVAAA_QA_MOBILE_ENGINE||'webkit';
  assert(['chromium','webkit'].includes(mobileEngine),'unsupported mobile browser');
  const safari=await ({chromium,webkit}[mobileEngine]).launch({headless:true});
  chrome.on('disconnected',()=>console.log('Desktop browser disconnected'));
  safari.on('disconnected',()=>console.log('Mobile browser disconnected'));
  const stamp=Date.now().toString(36);
  const emailA='a+'+stamp+'@raluvaaa.test',emailB='b+'+stamp+'@raluvaaa.test';
  const A=await pageFor(safari,true),B=await pageFor(chrome,false);
  try{
    assert.equal(await A.page.locator('#qaStrip').count(),0,'Private Alpha must not expose fake A/B controls');
    assert.equal(await B.page.locator('#qaStrip').count(),0,'Desktop must not expose fake A/B controls');
    assert.equal(await A.page.locator('#rail #v46AboutBtn').count(),0,'About must not consume a main rail slot');
    assert.equal(await A.page.locator('#brand #v46AboutBtn').count(),1,'About must live in the RALUVAAA brand block');
    assert.equal(await A.page.locator('#rail #privateAccountBtn').count(),0,'Account must not have a separate main rail button');
    assert(await A.page.locator('[data-lang="en"]').evaluate(el=>el.classList.contains('active')),'Private Alpha should default to English on a fresh session');
    assert.equal(await A.page.locator('#rail .rail-btn').count(),4,'Private Alpha main rail must contain exactly four actions');
    await verifyPhysicalMute(A.page,true);
    await verifyPhysicalMute(B.page,false);
    await verifyResponsiveAccount(A.page);
    // App language overrides the browser language, including account dialogs.
    await A.page.bringToFront();
    await A.page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.showAccount());
    await A.page.waitForSelector('[data-pa-send]',{state:'visible'});
    assert.equal(await A.page.locator('[data-pa-send]').innerText(),'Send my code');
    assert.match(await A.page.locator('.pa-auth-card p').innerText(),/RALUVAAA is free/);
    await A.page.click('[data-pa-cancel]');
    await A.page.click('[data-lang="fr"]');
    await A.page.bringToFront();
    await A.page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.showAccount());
    await A.page.waitForSelector('[data-pa-send]',{state:'visible'});
    assert.equal(await A.page.locator('[data-pa-send]').innerText(),'Envoyer mon code');
    assert.match(await A.page.locator('.pa-auth-card p').innerText(),/RALUVAAA est gratuit/);
    await A.page.click('[data-pa-cancel]');
    await A.page.click('[data-lang="en"]');

    const anonA=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    const anonB=await B.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.notEqual(anonA,anonB,'mobile and desktop browser contexts need independent anonymous sessions');

    // A writes first, and the publish action itself asks for identity.
    const wishA=await createWish(A.page,'A wants to learn coastal sailing '+stamp,emailA);
    const actorA=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.equal(await A.page.evaluate(()=>window.__RALUVAAA_PRIVATE_AUTH__.me().claimed),true);
    await A.page.click('#myWorldBtn');
    await A.page.waitForSelector('#privateAccountSection',{timeout:3000});
    assert.match(await A.page.locator('#privateAccountSection').innerText(),/Ton espace|Your space/i,'My Wishes must contain account identity');
    assert.equal(await A.page.locator('#rail #privateAccountBtn').count(),0,'Claimed account must not add a rail button');
    const mine=A.page.locator('#drawerBody [data-open="'+wishA+'"]');
    assert.equal(await mine.count(),1,'My Wishes must list the owned wish');
    await mine.click();
    await A.page.waitForFunction(id=>window.__RALUVAAA_UI__?.current?.()?.semanticId===id,wishA,{polling:100,timeout:5000});
    assert((await A.page.locator('#drawerBody .wish').innerText()).includes('A wants to learn coastal sailing'),'My Wishes click must open the exact wish');
    await A.page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,data:{type:'rv25-blank'}})));
    await A.page.waitForSelector('#drawer',{state:'hidden',timeout:3000});
    assert.equal(await A.page.locator('#rail .rail-btn:visible').count(),4,'blank-space close must leave the four-action rail visible');

    // Fast branch -> bloom must resolve the server wish id and show a visible state.
    await openWish(A.page,wishA);
    await clickAction(A.page,'split');
    await A.page.fill('#branchInput','First bloom test branch\nSecond live test branch');
    await A.page.click('#confirm');
    await A.page.waitForFunction(()=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.some(w=>w.text==='First bloom test branch'),null,{polling:100,timeout:10000});
    const bloomChild=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.find(w=>w.text==='First bloom test branch').id);
    await openWish(A.page,bloomChild);
    A.page.once('dialog',d=>d.accept());
    await clickAction(A.page,'bloom');
    await A.page.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.world()?.wishes?.find(w=>w.id===id)?.state==='bloomed',bloomChild,{polling:100,timeout:10000});
    await openWish(A.page,bloomChild);
    assert.match(await A.page.locator('.pa-wish-status').innerText(),/Bloomed|Fleuri/i,'node card must show its state');

    // B is still anonymous: exploration/encouragement works, but relationship actions do not.
    await openWish(B.page,wishA);await clickAction(B.page,'encourage');
    await B.page.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.client.me().then(m=>m.encouragedWishIds.includes(id)),wishA,{timeout:8000});
    await refresh(A.page);
    await openWish(A.page,wishA);
    assert.match(await A.page.locator('.pa-encouragement-count').innerText(),/1/,'owner must see a private encouragement count');
    await assert.rejects(
      ()=>B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.proposeHelp(id,'Anonymous help must be gated.'),wishA),
      /claim_required|Verify your email|HTTP 403/
    );

    // B claims explicitly. The encouragement made anonymously must follow the newly claimed identity.
    await claimViaUi(B.page,emailB);
    assert(await B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.me().then(m=>m.encouragedWishIds.includes(id)),wishA),'anonymous encouragement must survive account claim');
    const actorB=await B.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
    assert.notEqual(actorA,actorB,'A and B must remain different real accounts');
    const wishB=await createWish(B.page,'B wants to create a neighbourhood garden '+stamp);

    // A saves B. Saved state must be server-backed.
    await openWish(A.page,wishB);
    const saveA=A.page.locator('#v43MobileBookmarkBtn:visible,#v43BookmarkBtn:visible').first();
    await saveA.click();
    await A.page.waitForFunction(id=>window.__RALUVAAA_SHARED_DEBUG__.client.saved().then(x=>x.saved.some(w=>w.id===id)),wishB,{polling:100,timeout:8000});

    // B offers help to A; A receives a real notification and accepts.
    await openWish(B.page,wishA);
    await clickAction(B.page,'help');
    await B.page.waitForSelector('#helpTitleInput');
    await B.page.fill('#helpTitleInput','First sailing checklist');
    await B.page.fill('#helpInput','I can share a practical first sailing checklist.');
    await B.page.click('#confirm');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='help'&&p.targetWishId===id&&p.privatePayload?.title==='First sailing checklist')},wishA,{polling:100,timeout:10000});
    const helpProposal=await A.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.inbox().pending.find(p=>p.type==='help'&&p.targetWishId===id&&p.privatePayload?.title==='First sailing checklist').id,wishA);
    await openWish(A.page,wishA);
    await A.page.waitForFunction(()=>document.querySelector('.pa-wish-facts')?.textContent.split(' · ').includes('0 accepted offers of help'),null,{timeout:3000});
    await A.page.locator('.pa-wish-facts').waitFor({state:'visible',timeout:3000});
    assert(await A.page.locator('.pa-wish-facts').isVisible(),'pending help must leave a visible, truthful zero');
    await A.page.click('#inboxBtn');
    const helpCard=A.page.locator('.pa-request-card').filter({has:A.page.locator('[data-accept="'+helpProposal+'"]')});
    await helpCard.waitFor({state:'visible',timeout:3000});
    const requestText=await helpCard.innerText();
    assert.match(requestText,/First sailing checklist/);
    assert.match(requestText,/practical first sailing checklist/i);
    assert(!/ACTOR_/i.test(requestText),'raw actor IDs must never appear in human inbox UI');
    assert.equal(await A.page.getByText('Someone offered help',{exact:true}).count(),0,'server proposal notification must not duplicate the help card');
    await A.page.click('[data-accept="'+helpProposal+'"]');
    await B.page.waitForFunction(async ({id,wishId})=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help'&&e.wishId===wishId&&e.payload?.proposalId===id)},{id:helpProposal,wishId:wishA},{polling:100,timeout:10000});
    for(const page of [A.page,B.page]){
      await openWish(page,wishA);
      const events=await page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.world().events.filter(e=>e.type==='help'&&e.wishId===id),wishA);
      assert.equal(events.length,1,'exactly the accepted offer should materialize for this wish');
      assert.deepEqual(events[0].payload,{proposalId:helpProposal},'public help must not disclose its private content or helper');
      for(const language of ['fr','en']){
        await page.click('[data-lang="'+language+'"]');
        await openWish(page,wishA); // Mobile language navigation can dismiss the drawer.
        const label=language==='en'?'1 accepted offer of help':'1 aide acceptée';
        await page.waitForFunction(label=>document.querySelector('.pa-wish-facts')?.textContent.split(' · ').includes(label),label,{timeout:3000});
        const facts=page.locator('.pa-wish-facts');await facts.waitFor({state:'visible',timeout:3000});assert(await facts.isVisible(),'accepted help count must be visible outside hidden legacy chips');
        assert((await facts.innerText()).includes('Nantes, France'),'accepted help count must preserve the wish location');
        const text=await page.locator('#drawerBody').innerText();
        for(const privateValue of ['First sailing checklist','I can share a practical first sailing checklist.',actorA,actorB])assert(!text.includes(privateValue),'wish facts must not disclose help content or participant identities');
      }
    }
    console.log('Exact accepted help shows 0 → 1 in visible EN/FR owner and helper facts without private details',helpProposal);

    // Owner can close a wish to new help offers; helper can no longer send one.
    await openWish(A.page,wishA);
    await clickAction(A.page,'toggle_help');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world().events.some(e=>e.type==='help_setting'&&e.wishId===id&&e.payload?.open===false)},wishA,{polling:100,timeout:8000});
    await assert.rejects(
      ()=>B.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.proposeHelp(id,'Blocked title','Blocked help'),wishA),
      /help_closed|not accepting/i
    );
    await clickAction(A.page,'toggle_help');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();const ev=window.__RALUVAAA_SHARED_DEBUG__.world().events.filter(e=>e.type==='help_setting'&&e.wishId===id).pop();return ev?.payload?.open===true},wishA,{polling:100,timeout:8000});

    // A proposes a graft from its own wish to B's saved wish via the exact Saved UX.
    await openWish(A.page,wishA);
    await clickAction(A.page,'connect');
    await A.page.waitForSelector('#v46SavedGraftBtn',{polling:100,timeout:3000});
    await A.page.click('#v46SavedGraftBtn');
    await A.page.waitForSelector('[data-v46-graft-target="'+wishB+'"]',{polling:100,timeout:3000});
    await A.page.click('[data-v46-graft-target="'+wishB+'"]');
    await A.page.waitForSelector('#overlay #confirm',{polling:100,timeout:3000});
    await A.page.click('#overlay #confirm');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='connect')},null,{polling:100,timeout:10000});
    await refresh(A.page);
    const sentGraft=await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.inbox().sent.find(p=>p.type==='connect'&&p.status==='pending'));
    assert(sentGraft,'initiator sees the pending graft while awaiting the other owner');
    if(await A.page.locator('#drawer').isVisible())await A.page.click('#drawerClose');await A.page.click('#inboxBtn');
    assert.equal(await A.page.locator('[data-accept="'+sentGraft.id+'"]').count(),0,'initiator must not be asked to repeat their recorded consent');
    await A.page.click('#drawerClose');
    const graftProposal=await acceptFirst(B.page,'connect');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='connect'&&e.payload?.proposalId===id)},graftProposal.id,{polling:100,timeout:10000});
    await A.page.waitForFunction(()=>document.getElementById('engine')?.contentWindow?.__RV42_RUNTIME__?.warpCount?.()>0,null,{polling:100,timeout:5000});
    const graftVisual=await A.page.locator('#engine').evaluate(f=>({count:f.contentWindow.__RV42_RUNTIME__.warpCount(),dash:f.contentWindow.__RV42_RUNTIME__.warpDash}));
    assert(graftVisual.count>0,'accepted graft must materialise as a warp');
    assert.deepEqual(graftVisual.dash,[4.5,7],'graft warp must use the dotted rendering contract');
    const graftSound=await A.page.evaluate(()=>({sample:window.__RALUVAAA_SOUND_V38__?.sampleForEvent?.({type:'connect_proposed'}),url:window.__RALUVAAA_SOUND_V38__?.samples?.graft||''}));
    assert.equal(graftSound.sample,'graft','graft proposal must map to the graft sound');
    assert.match(graftSound.url,/graft\.wav$/,'graft sound asset must remain wired');
    // Explicitly close the previous GRAFT drawer. A toggle click can reopen it
    // if a pending engine selection changes the drawer during click scheduling.
    if(await B.page.locator('#drawer').isVisible())await B.page.click('#drawerClose');
    await B.page.waitForSelector('#drawer',{state:'hidden',timeout:3000});
    assert.equal(await B.page.locator('#inboxBtn').evaluate(el=>el.classList.contains('active')),false);

    // Reverse roles: A helps B.
    await openWish(A.page,wishB);
    await clickAction(A.page,'help');
    await A.page.fill('#helpTitleInput','First planting day');
    await A.page.fill('#helpInput','I can help organise a first neighbourhood planting day.');
    await A.page.click('#confirm');
    await B.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox()?.pending?.some(p=>p.type==='help')},null,{polling:100,timeout:10000});
    await B.page.waitForFunction(()=>Number(document.getElementById('inboxBadge')?.textContent||0)>0,null,{polling:100,timeout:5000});
    assert.notEqual((await B.page.locator('#inboxBadge').innerText()).trim(),'0','B must see an unread notification badge');
    const unreadBefore=Number((await B.page.locator('#inboxBadge').innerText()).trim()||0);
    const inboxDiagnostic=()=>B.page.evaluate(()=>({visibility:document.visibilityState,active:document.getElementById('inboxBtn')?.classList.contains('active'),hidden:document.getElementById('drawer')?.classList.contains('hidden'),badge:document.getElementById('inboxBadge')?.textContent,notifications:window.__RV26_SHARED__.state().notifications,pending:window.__RALUVAAA_SHARED_DEBUG__.inbox().pending.map(p=>p.id)}));
    console.log('Unread inbox before click',JSON.stringify(await inboxDiagnostic()));
    assert.equal(await B.page.locator('#inboxBtn').evaluate(el=>el.classList.contains('active')),false,'badge test must open, not close, Notifications');
    await B.page.click('#inboxBtn');
    await B.page.waitForSelector('#drawer:not(.hidden) .pa-inbox',{timeout:3000});
    try{await B.page.waitForFunction(()=>Number(document.getElementById('inboxBadge')?.textContent||0)===0,null,{polling:100,timeout:5000})}catch(error){
      console.error('Unread inbox after click',JSON.stringify(await inboxDiagnostic()));
      console.error('Unread inbox server',JSON.stringify(await B.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.inbox().then(x=>x.notifications))));
      throw error
    }
    const unreadAfter=Number((await B.page.locator('#inboxBadge').innerText()).trim()||0);
    assert(unreadAfter<unreadBefore,'reading the inbox must decrement the unread badge');
    await B.page.waitForFunction(()=>window.__RALUVAAA_SHARED_DEBUG__.client.inbox().then(x=>x.notifications.every(n=>n.isRead)),null,{polling:100,timeout:5000});
    console.log('Unread inbox cleared locally and server-side',JSON.stringify(await inboxDiagnostic()));
    await B.page.click('#inboxBtn');
    await acceptFirst(B.page,'help');
    await A.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world()?.events?.some(e=>e.type==='help'&&e.wishId===id)},wishB,{polling:100,timeout:10000});

    // Suggestion: actual visible send/accept controls, then one server and one visual branch.
    await openWish(B.page,wishA);await clickAction(B.page,'suggest');
    await B.page.fill('#suggestInput','A practical first lesson '+stamp);await B.page.click('#confirm');
    await A.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox().pending.some(p=>p.type==='suggest_branch')},null,{timeout:10000});
    if(await A.page.locator('#drawer').isVisible())await A.page.click('#drawerClose');
    const suggestion=await acceptFirst(A.page,'suggest_branch');
    await A.page.waitForFunction(async text=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.world().wishes.filter(w=>w.text===text).length===1},'A practical first lesson '+stamp,{timeout:10000});
    await refresh(A.page);await refresh(B.page);
    for(const page of [A.page,B.page])await page.waitForFunction(text=>window.__RV26_SHARED__.semantic().filter(w=>w.text===text).length===1,'A practical first lesson '+stamp,{timeout:5000});
    assert.equal(await A.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.filter(w=>w.parentWishId===id&&w.text.startsWith('A practical first lesson')).length,wishA),1);
    // Decline a separate proposal; no branch is materialized.
    await openWish(B.page,wishA);await clickAction(B.page,'suggest');
    await B.page.fill('#suggestInput','Declined alternative '+stamp);await B.page.click('#confirm');
    await A.page.waitForFunction(async()=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox().pending.some(p=>p.type==='suggest_branch')},null,{timeout:10000});
    if(await A.page.locator('#drawer').isVisible())await A.page.click('#drawerClose');await A.page.click('#inboxBtn');
    const declinedId=await A.page.locator('[data-decline]').first().getAttribute('data-decline');await A.page.click('[data-decline="'+declinedId+'"]');
    await B.page.waitForFunction(async id=>{await window.__RALUVAAA_SHARED_DEBUG__.refresh();return window.__RALUVAAA_SHARED_DEBUG__.inbox().sent.some(p=>p.id===id&&p.status==='declined')},declinedId,{timeout:10000});
    for(const page of [A.page,B.page]){
      await refresh(page);
      assert.equal(await page.evaluate(text=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.filter(w=>w.text===text).length,'Declined alternative '+stamp),0,'declined suggestion must create no server branch');
      assert.equal(await page.evaluate(text=>window.__RV26_SHARED__.semantic().filter(w=>w.text===text).length,'Declined alternative '+stamp),0,'declined suggestion must create no visual branch');
    }
    console.log('Exact accepted suggestion materializes once; declined suggestion creates nothing',suggestion.id,declinedId);

    // A logs in from a fresh desktop browser profile: same actor, wishes and Saved come back.
    const A2=await pageFor(chrome,false);
    try{
      await claimViaUi(A2.page,emailA);
      const actorA2=await A2.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.client.actorId);
      assert.equal(actorA2,actorA,'same email on another browser must restore the same account');
      await refresh(A2.page);
      assert(await A2.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.me().wishes.some(w=>w.id===id),wishA),'owned wish must return on second browser');
      assert(await A2.page.evaluate(id=>window.__RALUVAAA_SHARED_DEBUG__.client.saved().then(x=>x.saved.some(w=>w.id===id)),wishB),'Saved wish must return on second browser');
    }finally{await A2.context.close()}

    await verifyShareResponsive(A.page,wishA);
    await verifyShareExports(B.page,wishA);

    // V46 product surfaces remain present.
    assert.equal(await A.page.locator('#v46AboutBtn').count(),1,'About guide from V46 must remain');
    await openWish(A.page,wishA);
    const cameraBefore=await cameraState(A.page);
    await clickAction(A.page,'toggle_help');
    await A.page.waitForTimeout(180);
    const cameraAfterLocalAction=await cameraState(A.page);
    assert(Math.abs(cameraAfterLocalAction.zoom-cameraBefore.zoom)<0.0001,'local action must not change camera zoom');
    assert(Math.abs(cameraAfterLocalAction.x-cameraBefore.x)<0.01&&Math.abs(cameraAfterLocalAction.y-cameraBefore.y)<0.01,'local action must not move camera');
    await clickAction(A.page,'toggle_help');
    await A.page.evaluate(()=>window.__RALUVAAA_SHARED_DEBUG__.refresh());
    await A.page.waitForTimeout(250);
    const cameraAfter=await cameraState(A.page);
    assert(Math.abs(cameraAfter.zoom-cameraBefore.zoom)<0.0001,'server refresh must not change camera zoom');
    assert(Math.abs(cameraAfter.x-cameraBefore.x)<0.01&&Math.abs(cameraAfter.y-cameraBefore.y)<0.01,'server refresh must not move camera');
    console.log('Camera stability verified',JSON.stringify({before:cameraBefore,local:cameraAfterLocalAction,synced:cameraAfter}));
    assert(await A.page.locator('#drawerBody details.more').count(),'V46 More actions must remain');
    assert(await A.page.locator('#drawerBody [data-act="share"]').count(),'V46 Share action must remain');
    const entrustedOk=await A.page.evaluate(()=>{
      const sem=new Map(window.__RV26_SHARED__.semantic().map(x=>[x.semanticId,x]));
      return window.__RALUVAAA_VITALITY_V42__.entrusted().every(x=>sem.get(x.semanticId)?.state==='alive')
    });
    assert.equal(entrustedOk,true,'entrusted wishes must never contain bloomed/abandoned nodes');
    await A.page.click('#entrustedBtn');
    await A.page.waitForSelector('#drawerBody [data-open]',{timeout:3000});
    const firstEntrusted=A.page.locator('#drawerBody [data-open]').first();
    assert(await firstEntrusted.getAttribute('data-entrusted-band'),'entrusted wish must retain its visual duration band');
    assert.equal(await firstEntrusted.locator('.pa-entrusted-timer').count(),1,'entrusted timer must be rendered natively');
    assert.match((await firstEntrusted.locator('.m').innerText()).trim(),/\d{2}:\d{2}:\d{2}|\d+[jd] \d{2}:\d{2}:\d{2}/,'entrusted wish must show a live timer');
    assert.notEqual(await firstEntrusted.evaluate(el=>getComputedStyle(el).borderColor),'rgba(0, 0, 0, 0)','entrusted wish must retain its color cue');

    // Wish content, not only chrome, follows the reader language while the original stays accessible.
    await A.page.click('[data-lang="fr"]');
    await openWish(A.page,wishA);
    await A.page.waitForSelector('.v47-translation-note',{polling:100,timeout:5000});
    assert.match((await A.page.locator('#drawerBody .wish').innerText()).trim(),/^TRADUIT: /,'wish body must be translated for the reader');
    await A.page.click('.v47-translation-note button');
    assert.equal((await A.page.locator('#drawerBody .wish').innerText()).trim(),'A wants to learn coastal sailing '+stamp,'reader must be able to reveal the canonical original wish');
    await A.page.click('#entrustedBtn');
    await A.page.waitForSelector('#drawerBody [data-open] .t',{timeout:3000});
    await A.page.waitForFunction(()=>[...document.querySelectorAll('#drawerBody [data-open] .t')].some(el=>/^TRADUIT: /.test(el.textContent||'')),null,{polling:100,timeout:5000});
    await A.page.waitForSelector('#drawerBody .v43-saved-open .t',{timeout:3000});
    await A.page.waitForFunction(()=>[...document.querySelectorAll('#drawerBody .v43-saved-open .t')].some(el=>/^TRADUIT: /.test(el.textContent||'')),null,{polling:100,timeout:5000});

    // A rejected publish must not remain as an apparently saved wish until reload.
    const rejectedText='Rejected contact test contact@example.com';
    await B.page.click('#createBtn');
    await B.page.fill('#wishInput',rejectedText);
    await B.page.fill('#locInput','Nantes, France');
    const rejected=B.page.waitForResponse(r=>r.url().endsWith('/v1/wishes')&&r.request().method()==='POST');
    await B.page.click('#confirm');
    assert.equal((await rejected).status(),400);
    await B.page.waitForFunction(text=>!window.__RV26_SHARED__.state().events.some(e=>e.text===text),rejectedText,{polling:100,timeout:5000});
    await B.page.waitForFunction(text=>!window.__RV26_SHARED__.semantic().some(w=>w.text===text),rejectedText,{polling:100,timeout:5000});
    assert(!await B.page.evaluate(text=>window.__RALUVAAA_SHARED_DEBUG__.world().wishes.some(w=>w.text===text),rejectedText));
    console.log('Rejected optimistic publish correctly rolled back');
    // A shared deep link opens once; subsequent sync must leave the inbox open.
    await B.page.goto(URL+'#wish='+encodeURIComponent(wishA),{waitUntil:'domcontentloaded'});
    await B.page.waitForFunction(id=>window.__RALUVAAA_SHARED_READY__===true&&window.__RALUVAAA_UI__?.current?.()?.semanticId===id,wishA,{polling:100,timeout:30000});
    await B.page.click('#inboxBtn');
    await refresh(B.page);
    await B.page.waitForTimeout(600);
    assert(await B.page.locator('#inboxBtn').evaluate(el=>el.classList.contains('active')),'consumed deep link must not close Notifications after synchronization');
    assert.equal(await B.page.locator('#drawerBody .wish').count(),0,'deep link must not reopen the wish over Notifications');
    console.log('One-shot deep link preserves subsequent Notifications navigation');
    assert.deepEqual(A.page.__qaErrors,[],'mobile must have no uncaught page errors');
    assert.deepEqual(B.page.__qaErrors,[],'desktop must have no uncaught page errors');
    console.log('RALUVAAA Private Alpha A/B identity gate passed: mobile '+mobileEngine+' + desktop '+desktopEngine+' (local test-mode OTP)');
  }finally{
    await Promise.all([A.context.close(),B.context.close()]);
    await Promise.all([safari.close(),chrome.close()]);
  }
})().catch(err=>{console.error(err);process.exit(1)});
