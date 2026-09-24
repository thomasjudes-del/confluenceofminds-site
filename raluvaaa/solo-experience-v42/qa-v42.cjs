const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const BASE=process.env.RALUVAAA_QA_BASE||'http://127.0.0.1:4173';
const PATH='/raluvaaa/solo-experience-v42/';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function setup(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1920,height:1080},locale:'en-US'});
  const page=await context.newPage();

  await page.goto(BASE+'/__raluvaaa_v42_seed__',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.evaluate(()=>{
    localStorage.removeItem('raluvaaaSoloExperienceV42R1FreshStart');
    localStorage.setItem('raluvaaaSoloExperienceV41R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'old-v41',lineageId:'old-v41-lineage',text:'OLD V41 WISH',loc:'Nantes, France'}]
    }));
    localStorage.setItem('raluvaaaSoloExperienceV42R1',JSON.stringify({
      version:26,lang:'en',entrusted:null,
      events:[{type:'create',actorId:'A',semanticId:'stale-v42',lineageId:'stale-v42-lineage',text:'STALE V42 WISH',loc:'Nantes, France'}]
    }));
  });

  await page.route('https://ipwho.is/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Nantes',country:'France'})}));
  await page.route('https://ipapi.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({city:'Nantes',country_name:'France'})}));

  await page.goto(BASE+PATH+'?qa=1&actor=A',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{
    const f=document.getElementById('engine');
    return window.__RALUVAAA_V42__?.version===42 &&
      window.__RALUVAAA_VITALITY_V42__?.version===42 &&
      window.__RALUVAAA_WORKFLOW_V41__?.version===41 &&
      window.__RALUVAAA_REVIVE_AUDIO_V42__?.version===42 &&
      window.__RALUVAAA_SOUND_V38__?.version===38 &&
      window.__RV26_SOLO__?.state &&
      f?.contentWindow?.__RV41_BLOOM__?.version===41 &&
      f?.contentWindow?.__RV41_WORKFLOW_ENGINE__?.version===41 &&
      f?.contentWindow?.__RV42_RUNTIME__?.version===42 &&
      f?.contentWindow?.__RV42_VITALITY__?.version===42;
  },null,{timeout:15000});

  await page.click('[data-lang="en"]');
  return {browser,context,page};
}

async function state(page){
  return page.evaluate(()=>window.__RV26_SOLO__.state());
}
async function semantic(page){
  return page.evaluate(()=>window.__RV26_SOLO__.semantic());
}
async function meta(page,id){
  return page.evaluate(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)||null,id);
}
async function open(page,id){
  await page.evaluate(id=>window.__RV26_SOLO__.open(id),id);
  await page.waitForFunction(id=>window.__RALUVAAA_UI__.current()?.semanticId===id,id,{timeout:5000});
}
async function action(page,name){
  await page.evaluate(name=>window.__RALUVAAA_UI__.action(name),name);
}
async function acceptNextDialog(page,fn){
  const p=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Expected confirm dialog')),5000);
    page.once('dialog',async d=>{
      clearTimeout(timer);
      try{await d.accept();resolve(d.message())}catch(e){reject(e)}
    });
  });
  await fn();
  return p;
}
async function createWish(page,text){
  await page.click('#createBtn');
  await page.fill('#wishInput',text);
  await page.waitForFunction(()=>document.querySelector('#locInput')?.value==='Nantes, France',null,{timeout:8000});
  await page.click('#confirm');
  await page.waitForFunction(text=>window.__RV26_SOLO__.semantic().some(x=>x.text===text),text,{timeout:7000});
  return page.evaluate(text=>window.__RV26_SOLO__.semantic().find(x=>x.text===text).semanticId,text);
}
async function split(page,parentId,lines){
  await open(page,parentId);
  await action(page,'split');
  await page.waitForSelector('#branchInput',{timeout:4000});
  await page.fill('#branchInput',lines.join('\n'));
  await page.click('#confirm');
  await page.waitForFunction(({parentId,lines})=>{
    const s=window.__RV26_SOLO__.semantic();
    return lines.every(t=>s.some(x=>x.parentSemanticId===parentId&&x.text===t));
  },{parentId,lines},{timeout:7000});
  const s=await semantic(page);
  return lines.map(t=>s.find(x=>x.parentSemanticId===parentId&&x.text===t).semanticId);
}
async function abandon(page,id){
  await open(page,id);
  await acceptNextDialog(page,()=>action(page,'abandon'));
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='abandoned',id,{timeout:6000});
}
async function closeLineage(page,rootId){
  await open(page,rootId);
  await acceptNextDialog(page,()=>action(page,'close_lineage'));
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='abandoned',rootId,{timeout:6000});
}
async function bloom(page,id){
  await open(page,id);
  await acceptNextDialog(page,()=>action(page,'bloom'));
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.state==='bloom',id,{timeout:6000});
}

async function assertFresh(page){
  const x=await page.evaluate(()=>({
    reset:window.__RALUVAAA_FRESH_RESET_V42__,
    state:window.__RV26_SOLO__.state(),
    old:localStorage.getItem('raluvaaaSoloExperienceV41R1')
  }));
  assert.equal(x.reset?.performed,true,'V42 fresh reset must run');
  assert(x.reset.removed.includes('raluvaaaSoloExperienceV41R1'),'V42 must clear previous V41 local state');
  assert(x.reset.removed.includes('raluvaaaSoloExperienceV42R1'),'V42 must clear stale V42 state');
  assert.equal(x.state.events.length,0,'V42 must start without old human wishes');
  assert.equal(x.old,null,'old V41 local store must be gone');
}

async function testCreateCorrectEvolveCarryAndBloom(page){
  const root=await createWish(page,'Workflow root one');

  await open(page,root);
  await action(page,'correct');
  await page.fill('#correctText','Workflow root one corrected');
  await page.click('#confirm');
  await page.waitForFunction(id=>window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id)?.text==='Workflow root one corrected',root,{timeout:6000});
  assert.equal((await meta(page,root)).semanticId,root,'Correct must preserve semantic identity');

  const [a,b]=await split(page,root,['Existing branch A','Existing branch B']);

  await open(page,root);
  await action(page,'evolve');
  await page.waitForSelector('#evolveCarry',{timeout:4000});
  assert.equal(await page.locator('#evolveCarry').isChecked(),false,'Moving existing branches on evolve must be opt-in');
  await page.fill('#evolveInput','Workflow root one evolved');
  await page.check('#evolveCarry');
  await page.click('#confirm');

  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Workflow root one evolved'),null,{timeout:6000});
  const evolved=(await semantic(page)).find(x=>x.text==='Workflow root one evolved').semanticId;
  await page.waitForFunction(({a,b,evolved})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===a)?.parentSemanticId===evolved &&
      s.find(x=>x.semanticId===b)?.parentSemanticId===evolved;
  },{a,b,evolved},{timeout:7000});

  const wf=await page.evaluate(id=>({
    superseded:window.__RALUVAAA_WORKFLOW_V41__.isSuperseded(id),
    successor:window.__RALUVAAA_WORKFLOW_V41__.evolveChild(id)
  }),root);
  assert.equal(wf.superseded,true,'old state must become historical after evolve');
  assert.equal(wf.successor,evolved,'historical state must point to evolved state');

  await open(page,root);
  assert.equal(await page.locator('#drawerBody .v41-current-state').count(),1,'historical state must expose current state navigation');
  const before=(await state(page)).events.length;
  await action(page,'branch');
  await sleep(150);
  assert.equal(await page.locator('#branchInput').count(),0,'must not branch from superseded state');
  assert.equal((await state(page)).events.length,before,'blocked historical branching must create no event');

  const branchSoundBefore=await page.evaluate(()=>window.__RALUVAAA_SOUND_V38__.history.filter(x=>x.name==='bloomBranch').length);
  await bloom(page,a);
  assert.equal(await page.locator('.sheet h3').count(),0,'whole-wish bloom must not be proposed while another leaf is active');

  await bloom(page,b);
  await page.waitForFunction(()=>document.querySelector('.sheet h3')?.textContent?.trim()==='Every branch has bloomed',null,{timeout:5000});
  assert.equal(await page.evaluate(id=>window.__RALUVAAA_WORKFLOW_V41__.wholeWishBloomReady(id),root),true,'all current leaves must trigger whole-wish readiness');
  await page.click('#confirm');

  await page.waitForFunction(id=>{
    const rows=window.__RALUVAAA_WORKFLOW_V41__.lineageStates(id);
    return rows.length>=4&&rows.every(x=>x.state==='bloom');
  },root,{timeout:7000});

  const sounds=await page.evaluate(()=>({
    branch:window.__RALUVAAA_SOUND_V38__.history.filter(x=>x.name==='bloomBranch').length,
    whole:window.__RALUVAAA_SOUND_V38__.history.filter(x=>x.name==='bloomWish').length
  }));
  assert(sounds.branch>=branchSoundBefore+2,'each branch bloom should keep the branch bloom sound');
  assert(sounds.whole>=1,'accepted total bloom must trigger the whole-wish bloom sound');

  return {root,evolved,a,b};
}

async function testSelectiveWholeRevive(page){
  const root=await createWish(page,'Selective revive root');
  const [old,b]=await split(page,root,['Already let go','Still active']);

  await abandon(page,old);
  await closeLineage(page,root);
  await page.waitForFunction(({root,b})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===root)?.state==='abandoned'&&s.find(x=>x.semanticId===b)?.state==='abandoned';
  },{root,b},{timeout:6000});

  const close=await page.evaluate(lineageId=>{
    const events=window.__RV26_SOLO__.state().events;
    return [...events].reverse().find(e=>e.type==='close_lineage'&&e.lineageId===lineageId);
  },(await meta(page,root)).lineageId);
  assert(close.semanticIds.includes(root),'close snapshot must include live root');
  assert(close.semanticIds.includes(b),'close snapshot must include live branch');
  assert(!close.semanticIds.includes(old),'close snapshot must not absorb a branch already let go');

  await open(page,root);
  await page.waitForSelector('#drawerBody .v33-action-unit[data-v41-icon="revive"]:not(.v41-workflow-hidden) img.v41-revive-art',{timeout:5000});
  const visibleRevives=page.locator('#drawerBody .v33-action-unit[data-v41-icon="revive"]:not(.v41-workflow-hidden)');
  assert.equal(await visibleRevives.count(),1,'legacy layers must expose only one visible Revive action');
  const reviveIcon=await visibleRevives.locator('img.v41-revive-art').evaluate(img=>({src:img.src,nw:img.naturalWidth,nh:img.naturalHeight}));
  assert(reviveIcon.src.endsWith('/raluvaaa/v41/icons/revive.svg'),'revive must use the V41 watering asset');
  assert(reviveIcon.nw>0&&reviveIcon.nh>0,'revive asset must load');

  const soundBefore=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V41__.history.length);
  await acceptNextDialog(page,()=>action(page,'resume_lineage'));
  await page.waitForFunction(({root,b,old})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===root)?.state==='alive' &&
      s.find(x=>x.semanticId===b)?.state==='alive' &&
      s.find(x=>x.semanticId===old)?.state==='abandoned';
  },{root,b,old},{timeout:7000});
  const soundAfter=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V41__.history.length);
  assert.equal(soundAfter,soundBefore+1,'whole-wish revive must play one watering sound');

  return {root,old,b};
}

async function testReviveOnePath(page){
  const root=await createWish(page,'Path revive root');
  const [parent,sibling]=await split(page,root,['Path parent','Sibling stays asleep']);
  const [child,otherChild]=await split(page,parent,['Deep child to revive','Other deep child']);

  await closeLineage(page,root);
  await page.waitForFunction(ids=>{
    const s=window.__RV26_SOLO__.semantic();
    return ids.every(id=>s.find(x=>x.semanticId===id)?.state==='abandoned');
  },[root,parent,sibling,child,otherChild],{timeout:7000});

  const before=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V41__.history.length);
  await open(page,child);
  await acceptNextDialog(page,()=>action(page,'resume'));
  await page.waitForFunction(({root,parent,child,sibling,otherChild})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===root)?.state==='alive' &&
      s.find(x=>x.semanticId===parent)?.state==='alive' &&
      s.find(x=>x.semanticId===child)?.state==='alive' &&
      s.find(x=>x.semanticId===sibling)?.state==='abandoned' &&
      s.find(x=>x.semanticId===otherChild)?.state==='abandoned';
  },{root,parent,child,sibling,otherChild},{timeout:7000});
  const after=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V41__.history.length);
  assert.equal(after,before+1,'reviving a path must make only the final revive audible');

  return {root,parent,sibling,child,otherChild};
}

async function testBranchSubtreeCloseRevive(page){
  const root=await createWish(page,'Branch subtree close root');
  const [branch,sibling]=await split(page,root,['Branch to let go','Sibling stays awake']);
  const [childA,childB]=await split(page,branch,['Branch child A','Branch child B']);

  await open(page,branch);
  const visibleLetgo=page.locator('#drawerBody .v33-action-unit[data-v37-icon="letgo"]:not(.v41-workflow-invalid):not(.v41-workflow-hidden)');
  assert(await visibleLetgo.count()>=1,'Let go must stay available for a live branch subtree');

  await acceptNextDialog(page,()=>action(page,'abandon'));
  await page.waitForFunction(({branch,childA,childB,root,sibling})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===branch)?.state==='abandoned' &&
      s.find(x=>x.semanticId===childA)?.state==='abandoned' &&
      s.find(x=>x.semanticId===childB)?.state==='abandoned' &&
      s.find(x=>x.semanticId===root)?.state==='alive' &&
      s.find(x=>x.semanticId===sibling)?.state==='alive';
  },{branch,childA,childB,root,sibling},{timeout:7000});

  const closeEvent=await page.evaluate(id=>{
    return [...window.__RV26_SOLO__.state().events].reverse().find(e=>e.type==='close_branch'&&e.semanticId===id)||null;
  },branch);
  assert(closeEvent,'branch subtree close must create a close_branch snapshot');
  assert(closeEvent.semanticIds.includes(branch)&&closeEvent.semanticIds.includes(childA)&&closeEvent.semanticIds.includes(childB),'close_branch snapshot must contain its live subtree');
  assert(!closeEvent.semanticIds.includes(sibling),'close_branch must not put sibling branches to sleep');

  const soundBefore=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V41__.history.length);
  await open(page,branch);
  await acceptNextDialog(page,()=>action(page,'resume'));
  await page.waitForFunction(({branch,childA,childB,sibling})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===branch)?.state==='alive' &&
      s.find(x=>x.semanticId===childA)?.state==='alive' &&
      s.find(x=>x.semanticId===childB)?.state==='alive' &&
      s.find(x=>x.semanticId===sibling)?.state==='alive';
  },{branch,childA,childB,sibling},{timeout:7000});
  const soundAfter=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V41__.history.length);
  assert.equal(soundAfter,soundBefore+1,'reviving a closed branch subtree must play one watering sound');

  return {root,branch,sibling,childA,childB};
}

async function testLegoReattachAndRemoveQC(page){
  const root=await createWish(page,'LEGO root');
  const [moving,target]=await split(page,root,['Move this branch','Target branch']);
  const [c1,c2]=await split(page,moving,['Moving child one','Moving child two']);

  await open(page,moving);
  assert.equal(await page.locator('#drawerBody .action-grid [data-act="bloom"]').count(),0,'branch with active descendants must not expose an impossible Bloom action');
  await page.waitForSelector('#drawerBody .v41-move-unit .v33-action-circle',{timeout:5000});
  const moveIcon=await page.locator('#drawerBody .v41-move-unit img.v41-move-art').evaluate(img=>({src:img.src,nw:img.naturalWidth,nh:img.naturalHeight}));
  assert(moveIcon.src.endsWith('/raluvaaa/v41/icons/move-branch.svg'),'LEGO move must use the versioned exact-source move asset');
  assert(moveIcon.nw>0&&moveIcon.nh>0,'move branch asset must load');

  const allowed=await page.evaluate(({moving,target})=>document.getElementById('engine').contentWindow.__RV41_WORKFLOW_ENGINE__.reparentAllowed(moving,target),{moving,target});
  assert.equal(allowed,true,'live split branch must be movable to a valid live target');

  await page.locator('#drawerBody .v41-move-unit .v33-action-circle').click();
  await page.waitForSelector('#parentSelect',{timeout:4000});
  await page.selectOption('#parentSelect',target);
  await page.click('#confirm');
  await page.waitForFunction(({moving,target,c1,c2})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===moving)?.parentSemanticId===target &&
      s.find(x=>x.semanticId===c1)?.parentSemanticId===moving &&
      s.find(x=>x.semanticId===c2)?.parentSemanticId===moving;
  },{moving,target,c1,c2},{timeout:7000});

  // Evolve the branch itself, carry its children, then verify the historical split anchor remains the movable LEGO piece.
  await open(page,moving);
  await action(page,'evolve');
  await page.waitForSelector('#evolveCarry',{timeout:4000});
  await page.fill('#evolveInput','Move this branch evolved');
  await page.check('#evolveCarry');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='Move this branch evolved'),null,{timeout:6000});
  const movingCurrent=(await semantic(page)).find(x=>x.text==='Move this branch evolved').semanticId;
  await page.waitForFunction(({c1,c2,movingCurrent})=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.semanticId===c1)?.parentSemanticId===movingCurrent &&
      s.find(x=>x.semanticId===c2)?.parentSemanticId===movingCurrent;
  },{c1,c2,movingCurrent},{timeout:7000});

  await open(page,moving);
  assert.equal(await page.evaluate(id=>window.__RALUVAAA_WORKFLOW_V41__.isSuperseded(id),moving),true,'split anchor should be historical after its own evolve');
  await page.waitForSelector('#drawerBody .v41-move-unit .v33-action-circle',{timeout:5000});
  const historicalMoveAllowed=await page.evaluate(({moving,target})=>document.getElementById('engine').contentWindow.__RV41_WORKFLOW_ENGINE__.reparentAllowed(moving,target),{moving,target});
  assert.equal(historicalMoveAllowed,true,'historical split anchor must still move its whole evolved subtree');
  const graftUnit=page.locator('#drawerBody .v33-action-unit[data-v37-icon="graft"]');
  if(await graftUnit.count())assert(await graftUnit.first().evaluate(el=>el.classList.contains('v41-workflow-invalid')),'historical state graft must be hidden');
  const letgoUnit=page.locator('#drawerBody .v33-action-unit[data-v37-icon="letgo"]:not(.v41-workflow-invalid):not(.v41-workflow-hidden)');
  assert(await letgoUnit.count()>=1,'historical split anchor must still be able to let its whole evolved subtree go');

  await open(page,root);
  await action(page,'evolve');
  await page.waitForSelector('#evolveInput',{timeout:4000});
  await page.fill('#evolveInput','LEGO root evolved');
  if(await page.locator('#evolveCarry').count())assert.equal(await page.locator('#evolveCarry').isChecked(),false,'LEGO carry remains opt-in');
  await page.click('#confirm');
  await page.waitForFunction(()=>window.__RV26_SOLO__.semantic().some(x=>x.text==='LEGO root evolved'),null,{timeout:6000});

  const blocked=await page.evaluate(({moving,root})=>document.getElementById('engine').contentWindow.__RV41_WORKFLOW_ENGINE__.reparentAllowed(moving,root),{moving,root});
  assert.equal(blocked,false,'superseded historical state must not be a reparent target');

  await open(page,moving);
  await page.locator('#drawerBody .v41-move-unit .v33-action-circle').click();
  await page.waitForSelector('#parentSelect',{timeout:4000});
  const options=await page.locator('#parentSelect option').evaluateAll(xs=>xs.map(x=>x.value));
  assert(!options.includes(root),'manual LEGO UI must also exclude superseded targets');
  await page.click('#cancel');

  const preview=await page.evaluate(id=>window.__RALUVAAA_WORKFLOW_V41__.purgePreview(id),c2);
  const stillNested=preview.some(e=>Array.isArray(e.children)&&e.children.some(x=>x.semanticId===c2));
  assert.equal(stillNested,false,'remove-mistake replay must remove a nested split child from its parent event');

  return {root,moving,target,c1,c2};
}

async function testForeignActionSmoke(page,ownRoot){
  // The earlier workflow may have bloomed ownRoot. Graft QC needs a current live local endpoint.
  const connectorRoot=(await meta(page,ownRoot))?.state==='alive'?ownRoot:await createWish(page,'Fresh graft source');
  const foreign=await page.evaluate(()=>{
    const s=window.__RV26_SOLO__.semantic();
    return s.find(x=>x.simulated&&x.state==='alive'&&!window.__RALUVAAA_WORKFLOW_V41__.isSuperseded(x.semanticId))?.semanticId||null;
  });
  assert(foreign,'need one current live simulated wish state for foreign-action QC');
  await open(page,foreign);

  const beforeEnc=(await state(page)).events.filter(e=>e.type==='encourage'&&e.semanticId===foreign).length;
  await action(page,'encourage');
  await page.waitForFunction(id=>window.__RV26_SOLO__.state().events.some(e=>e.type==='encourage'&&e.semanticId===id),foreign,{timeout:4000});
  await action(page,'encourage');
  const afterEnc=(await state(page)).events.filter(e=>e.type==='encourage'&&e.semanticId===foreign).length;
  assert.equal(afterEnc,beforeEnc+1,'encourage must remain one-per-human per wish');

  await open(page,foreign);
  await action(page,'help');
  await page.fill('#helpInput','QA concrete help');
  await page.click('#confirm');
  assert((await state(page)).events.some(e=>e.type==='help_proposed'&&e.semanticId===foreign),'help proposal must be recorded');

  await open(page,foreign);
  await action(page,'suggest');
  await page.fill('#suggestInput','QA possible branch');
  await page.click('#confirm');
  assert((await state(page)).events.some(e=>e.type==='suggest_proposed'&&e.semanticId===foreign),'branch suggestion must be recorded');

  await open(page,connectorRoot);
  await action(page,'connect');
  await page.waitForSelector('#modeBar:not(.hidden)',{timeout:4000});
  await page.evaluate(id=>{
    window.__RALUVAAA_SUPPRESS_ENGINE_SELECT_UNTIL__=0;
    const m=window.__RV26_SOLO__.semantic().find(x=>x.semanticId===id);
    window.postMessage({type:'rv25-select',meta:m},location.origin);
  },foreign);
  await page.waitForFunction(()=>document.querySelector('.sheet h3')?.textContent?.toLowerCase().includes('graft'),null,{timeout:5000});
  await page.click('#confirm');
  await page.waitForFunction(id=>window.__RV26_SOLO__.state().events.some(e=>e.type==='connect_proposed'&&(e.aSemanticId===id||e.bSemanticId===id)),foreign,{timeout:5000});

  await open(page,foreign);
  await page.waitForSelector('#drawerBody .v38-report-button',{timeout:5000});
  await page.locator('#drawerBody .v38-report-button').click();
  await page.waitForSelector('#reportReason',{timeout:4000});
  await page.click('#cancel');

  await page.evaluate(()=>{
    try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}})}catch{}
  });
  await open(page,ownRoot);
  const shareBefore=await page.evaluate(()=>window.__RALUVAAA_SOUND_V38__.history.filter(x=>x.name==='share').length);
  await action(page,'share');
  await page.waitForFunction(n=>window.__RALUVAAA_SOUND_V38__.history.filter(x=>x.name==='share').length>n,shareBefore,{timeout:4000});
}

async function testEntrustedEligibilityV42(page){
  const rows=await page.evaluate(()=>{
    const ids=window.__RALUVAAA_VITALITY_V42__.entrusted().map(x=>x.semanticId);
    const s=window.__RV26_SOLO__.semantic();
    return ids.map(id=>{
      const m=s.find(x=>x.semanticId===id);
      return{
        id,
        state:m?.state||null,
        superseded:window.__RALUVAAA_WORKFLOW_V41__.isSuperseded(id),
        owner:!!m?.owner
      };
    });
  });
  assert(rows.length>0,'V42 should still entrust eligible simulated wishes');
  for(const row of rows){
    assert.equal(row.state,'alive','entrusted wishes must never already be bloomed or abandoned');
    assert.equal(row.superseded,false,'entrusted wish must be a current actionable state');
    assert.equal(row.owner,false,'entrusted wish must not be the current user\'s own wish');
  }
}

async function testPassiveDormancyWakeV42(page){
  const root=await createWish(page,'Passive dormancy wish');
  const info=await meta(page,root);
  const lineageId=info.lineageId;

  // Backdate the meaningful activity. V42 must derive today's state from wall-clock time on reload.
  await page.evaluate(({root})=>{
    const key='raluvaaaSoloExperienceV42R1';
    const s=JSON.parse(localStorage.getItem(key));
    const ev=s.events.find(e=>e.type==='create'&&e.semanticId===root);
    ev.at=Date.now()-31*86400000;
    localStorage.setItem(key,JSON.stringify(s));
  },{root});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{
    const f=document.getElementById('engine');
    return window.__RALUVAAA_V42__?.version===42 &&
      window.__RALUVAAA_VITALITY_V42__?.version===42 &&
      window.__RV26_SOLO__?.state &&
      f?.contentWindow?.__RV42_VITALITY__?.version===42;
  },null,{timeout:15000});
  await page.click('[data-lang="en"]');

  const v=await page.evaluate(id=>window.__RALUVAAA_VITALITY_V42__.forSemantic(id),root);
  assert.equal(v.status,'dormant','31 quiet days must derive a dormant state');
  assert(v.vigor<=.3,'dormant visual vigor should be strongly reduced');

  await open(page,root);
  await page.waitForSelector('#drawerBody .v33-action-unit[data-v42-icon="wake"]',{timeout:5000});
  assert.equal((await page.locator('#drawerBody .v33-action-unit[data-v42-icon="wake"] .v33-action-label').innerText()).trim(),'Wake');
  assert.equal(await page.locator('#drawerBody .v33-action-unit.v42-dormant-hidden').count()>0,true,'growth actions must pause until the dormant wish is woken');

  const engineV=await page.evaluate(lineageId=>document.getElementById('engine').contentWindow.__RV42_VITALITY__.get(lineageId),lineageId);
  assert.equal(engineV.status,'dormant','engine must receive the same passive dormancy state');

  const notes=await state(page);
  assert((notes.notifications||[]).some(n=>n.kind==='vitality'&&n.objectId===root&&/dormant/i.test(n.title)),'dormancy must create an in-app catch-up notification');

  const soundBefore=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V42__.history.length);
  await action(page,'wake');
  await page.waitForFunction(id=>window.__RV26_SOLO__.state().events.some(e=>e.type==='wake'&&e.semanticId===id),root,{timeout:5000});
  await page.waitForFunction(id=>window.__RALUVAAA_VITALITY_V42__.forSemantic(id)?.status==='vital',root,{timeout:7000});
  const soundAfter=await page.evaluate(()=>window.__RALUVAAA_REVIVE_AUDIO_V42__.history.length);
  assert.equal(soundAfter,soundBefore+1,'Wake must use the watering/revival sound');

  await open(page,root);
  assert.equal(await page.locator('#drawerBody .v33-action-unit[data-v42-icon="wake"]').count(),0,'Wake disappears once vitality is restored');

  return root;
}

async function testResumeVsWakeWordingV42(page){
  const root=await createWish(page,'Explicit let go wording');
  const [branch]=await split(page,root,['Branch explicitly left','Sibling remains active']);
  await abandon(page,branch);
  await open(page,branch);
  await page.waitForFunction(()=>[...document.querySelectorAll('#drawerBody .v33-action-label')].some(x=>x.textContent.trim()==='Resume'),null,{timeout:5000});
  assert.equal(await page.locator('#drawerBody .v33-action-unit[data-v41-icon="revive"] .v33-action-label').first().innerText(),'Resume','explicit Let go returns with Resume, not Wake');
}

(async()=>{
  const {browser,page}=await setup();
  try{
    await assertFresh(page);
    await testEntrustedEligibilityV42(page);
    const first=await testCreateCorrectEvolveCarryAndBloom(page);
    const selective=await testSelectiveWholeRevive(page);
    await testReviveOnePath(page);
    await testBranchSubtreeCloseRevive(page);
    await testLegoReattachAndRemoveQC(page);
    await testForeignActionSmoke(page,selective.root);
    await testPassiveDormancyWakeV42(page);
    await testResumeVsWakeWordingV42(page);

    const finalState=await state(page);
    assert(finalState.events.some(e=>e.type==='correct'),'correct workflow missing');
    assert(finalState.events.some(e=>e.type==='evolve'),'evolve workflow missing');
    assert(finalState.events.some(e=>e.type==='reparent'),'reparent workflow missing');
    assert(finalState.events.some(e=>e.type==='bloom'),'bloom workflow missing');
    assert(finalState.events.some(e=>e.type==='close_branch'),'branch subtree close workflow missing');
    assert(finalState.events.some(e=>e.type==='resume_branch'),'branch subtree revive workflow missing');
    assert(finalState.events.some(e=>e.type==='close_lineage'),'close workflow missing');
    assert(finalState.events.some(e=>e.type==='resume_lineage'),'whole revive workflow missing');
    assert(finalState.events.some(e=>e.type==='resume'),'path revive workflow missing');

    console.log('RALUVAAA V42 workflow + entrusted + passive vitality QC passed');
  }finally{
    await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});