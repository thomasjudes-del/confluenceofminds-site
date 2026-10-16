import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as unconfigured from './release-code-only.mjs';

// Pin a copy only inside this in-memory fake-fetch suite. Never invent production
// source/baseline pins just to run tests while the release plan is disabled.
const CODE=readFileSync(new URL('./worker.mjs',import.meta.url));
const helperSource=readFileSync(new URL('./release-code-only.mjs',import.meta.url),'utf8');
const testPins={APPROVED_SOURCE_SHA:'0123456789abcdef0123456789abcdef01234567',APPROVED_CODE_SHA256:createHash('sha256').update(CODE).digest('hex'),BASELINE_VERSION:'55555555-5555-4555-8555-555555555555',BASELINE_DEPLOYMENT:'66666666-6666-4666-8666-666666666666'};
let testSource=helperSource;
for(const [name,value] of Object.entries(testPins))testSource=testSource.replace(new RegExp("export const "+name+"=(?:null|'[^']*');"),'export const '+name+'='+JSON.stringify(value)+';');
const {APPROVED_SOURCE_SHA,APPROVED_CODE_SHA256,BASELINE_VERSION,BASELINE_DEPLOYMENT,RELEASE_REF,releaseCodeOnly,safeReleaseError,validatePlan}=await import('data:text/javascript;base64,'+Buffer.from(testSource).toString('base64'));


const CANDIDATE='11111111-1111-4111-8111-111111111111',NEW_DEPLOYMENT='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333';
const ACCOUNT='a'.repeat(32),TOKEN='SECRET-TOKEN-MUST-NOT-APPEAR',VALUE='PRIVATE-PLAINTEXT-MUST-NOT-APPEAR';
const REPOSITORY='thomasjudes-del/confluenceofminds-site';
const PLAN={enabled:true,sourceSha:APPROVED_SOURCE_SHA,codeSha256:APPROVED_CODE_SHA256,baselineVersionId:BASELINE_VERSION,baselineDeploymentId:BASELINE_DEPLOYMENT};
const WORLD_URL='https://raluvaaa-alpha-api.thomas-judes.workers.dev/v1/world';
const ROOT_IDS=[
  'wish_57b208a2-c381-4bbd-bca5-4b0c1d76a19d',
  'wish_93c9de27-c022-483f-975a-5452bdd9f06e',
  'wish_841df73a-7c30-4f8d-b7bd-df945e4c563a',
  'wish_558a976c-173a-4034-9503-f92a51c5c0b7',
  'wish_cc52e794-db66-413d-bb25-9f97d5c80c5a'
];
const CHILD='wish_77777777-7777-4777-8777-777777777777',GRANDCHILD='wish_88888888-8888-4888-8888-888888888888';
const NEIGHBOR='wish_99999999-9999-4999-8999-999999999999',NEIGHBOR_TWO='wish_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',NEW_NEIGHBOR='wish_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PUBLIC_TEXT='PUBLIC-WISH-CONTENT-MUST-NOT-APPEAR',PUBLIC_LOCATION='PUBLIC-WISH-LOCATION-MUST-NOT-APPEAR';
function publicWish(id,changes={}){return{id,lineageId:id,parentWishId:null,rootWishId:id,kind:'create',text:PUBLIC_TEXT,locationText:PUBLIC_LOCATION,state:'alive',createdAt:1000,updatedAt:1000,encouragementCount:0,isMine:false,...changes}}
function fixtureWorld(promoted){
  const family=[...ROOT_IDS.map(id=>publicWish(id)),publicWish(CHILD,{rootWishId:ROOT_IDS[0],lineageId:ROOT_IDS[0],parentWishId:ROOT_IDS[0],kind:'split'}),publicWish(GRANDCHILD,{rootWishId:ROOT_IDS[0],lineageId:ROOT_IDS[0],parentWishId:CHILD,kind:'evolve'})];
  return{room:'WORLD',wishes:[...(promoted?[]:family),publicWish(NEIGHBOR),publicWish(NEIGHBOR_TWO)],events:[]};
}

function fake(change=()=>{}){
  const calls=[],checkpoints=[];let uploaded=false,promoted=false,snapshot=0,worldRead=0;
  const bindings=[{name:'AI',type:'ai',project:VALUE},{name:'DB',type:'d1',id:'44444444-4444-4444-8444-444444444444'},{name:'ALLOWED_ORIGINS',type:'plain_text',text:VALUE},...['AUTH_CODE_SECRET','RALUVAAA_EMAIL_FROM','RESEND_API_KEY'].map(name=>({name,type:'secret_text'}))];
  const runtime={compatibility_date:'2026-09-01',usage_model:'standard'};
  const fetchImpl=async(url,options)=>{
    const u=new URL(url),path=u.pathname;calls.push({url,options,snapshot});
    let result,github=false,world=false;
    if(u.origin===new URL(WORLD_URL).origin){
      assert.equal(url,WORLD_URL);assert.equal(options.method,'GET');world=true;worldRead++;result=fixtureWorld(promoted);
    }else if(u.origin==='https://api.github.com'){
      github=true;const workflow=path.split('/').at(-2);
      if(path.endsWith('/actions/runs'))result={total_count:0,workflow_runs:[]};
      else result={workflow_runs:[{head_sha:APPROVED_SOURCE_SHA,event:'push',path:'.github/workflows/'+workflow,repository:{full_name:REPOSITORY},status:'completed',conclusion:'success'}]};
    }else if(path.endsWith('/versions')&&options.method==='POST'){
      assert.equal(u.search,'?bindings_inherit=strict');uploaded=true;result={id:CANDIDATE};
    }else if(path.endsWith('/deployments')&&options.method==='POST'){
      promoted=true;result={id:NEW_DEPLOYMENT};
    }else if(path.endsWith('/deployments')){
      snapshot++;result={deployments:[{id:promoted?NEW_DEPLOYMENT:BASELINE_DEPLOYMENT,versions:[{version_id:promoted?CANDIDATE:BASELINE_VERSION,percentage:100}],author_email:VALUE}]};
    }else if(path.endsWith('/versions'))result={items:[{id:uploaded?CANDIDATE:BASELINE_VERSION}]};
    else if(path.includes('/versions/'))result={id:path.split('/').at(-1),resources:{bindings:structuredClone(bindings),script_runtime:structuredClone(runtime),script:{etag:uploaded?'new-content-etag':'old-content-etag',handlers:['fetch']}},metadata:{author_email:VALUE}};
    else if(path.endsWith('/settings'))result={annotations:{'workers/triggered_by':'version_upload','workers/message':'retained note'},bindings:structuredClone(bindings),compatibility_date:'2026-09-01',compatibility_flags:[],usage_model:'standard',logpush:false,placement:{mode:'off'},tags:[],tail_consumers:[]};
    else if(path.endsWith('/schedules'))result={schedules:[]};
    else if(path.endsWith('/subdomain'))result={enabled:true,previews_enabled:true};
    else if(path.endsWith('/routes'))result=[];
    else if(path.endsWith('/domains'))result=[];
    else throw new Error('Unexpected URL');
    const envelope=github||world?result:{success:true,result,...(path.endsWith('/domains')?{result_info:{page:1,per_page:100,count:0,total_count:0,total_pages:1}}:{})};
    const context={url,options,path,snapshot,uploaded,promoted,world,worldRead,result,envelope};
    const response=change(context);
    return response??{ok:true,status:200,json:async()=>envelope};
  };
  return{calls,checkpoints,fetchImpl};
}
const run=(f,overrides={})=>releaseCodeOnly({fetchImpl:f.fetchImpl,accountId:ACCOUNT,token:TOKEN,plan:PLAN,ref:RELEASE_REF,repository:REPOSITORY,code:CODE,runId:'987654321',onCheckpoint:c=>f.checkpoints.push(c),...overrides});
const posts=f=>f.calls.filter(c=>c.options.method==='POST');
async function blocked(f,pattern,postCount=0){await assert.rejects(()=>run(f),e=>{assert(!safeReleaseError(e).includes(VALUE));assert(!safeReleaseError(e).includes(TOKEN));for(const value of [PUBLIC_TEXT,PUBLIC_LOCATION,...ROOT_IDS,CHILD,GRANDCHILD,NEIGHBOR,NEIGHBOR_TWO])assert(!safeReleaseError(e).includes(value));return pattern.test(safeReleaseError(e))});assert.equal(posts(f).length,postCount)}

test('only exact strict-inheritance upload and exact candidate100 promotion can write',async()=>{
  const f=fake(),result=await run(f);assert.equal(result.status,'release-verified');
  assert.equal(posts(f).length,2);
  const [upload,promotion]=posts(f);
  const metadata=JSON.parse(upload.options.body.get('metadata'));
  assert.deepEqual(Object.keys(metadata).sort(),['annotations','bindings','compatibility_date','main_module','usage_model']);
  assert.equal(metadata.main_module,'worker.mjs');
  assert.deepEqual(metadata.annotations,{'workers/message':'retained note'});
  assert.equal(metadata.bindings.length,6);assert(metadata.bindings.every(b=>Object.keys(b).sort().join() === 'name,type'&&b.type==='inherit'));
  assert.equal(await upload.options.body.get('worker.mjs').text(),CODE.toString());
  assert(!JSON.stringify(metadata).includes(VALUE));assert(!JSON.stringify(metadata).includes(TOKEN));
  assert.deepEqual(JSON.parse(promotion.options.body),{strategy:'percentage',versions:[{version_id:CANDIDATE,percentage:100}]});
  assert(f.calls.indexOf(upload)>15);assert(f.calls.slice(f.calls.indexOf(upload)+1,f.calls.indexOf(promotion)).filter(c=>c.options.method==='GET').length>=11);
  for(const call of f.calls){assert.equal(call.options.redirect,'error');if(call.options.method==='GET')assert(!('body' in call.options));if(new URL(call.url).origin==='https://api.github.com')assert(!call.options.headers.authorization)}
  const output=JSON.stringify([result,f.checkpoints]);for(const privateValue of [TOKEN,VALUE,ACCOUNT,'44444444-4444-4444-8444-444444444444',PUBLIC_TEXT,PUBLIC_LOCATION,...ROOT_IDS,CHILD,GRANDCHILD,NEIGHBOR,NEIGHBOR_TWO])assert(!output.includes(privateValue));
  assert.deepEqual(f.checkpoints.map(x=>x.stage),['baseline-verified','upload-request-starting','candidate-uploaded','promotion-request-starting','promotion-response-received','release-verified']);
  assert.equal(f.checkpoints[2].candidateVersionId,CANDIDATE);
});

test('disabled plan, wrong branch/repository/source, wrong bytes cannot contact remote services',async()=>{
  for(const overrides of [{plan:{...PLAN,enabled:false}},{plan:{...PLAN,sourceSha:'0'.repeat(40)}},{ref:'refs/heads/main'},{repository:'someone/else'},{code:Buffer.from('different code')},{runId:undefined}]){
    const f=fake();await assert.rejects(()=>run(f,overrides));assert.equal(f.calls.length,0);
  }
  assert.throws(()=>validatePlan({...PLAN,unexpected:true},{ref:RELEASE_REF,repository:REPOSITORY}));
});

test('latest failed or pending source CI prevents even a Cloudflare request',async()=>{
  for(const mutate of [r=>r.conclusion='failure',r=>r.status='in_progress',r=>r.head_sha='0'.repeat(40),r=>r.path='wrong',r=>r.repository.full_name='someone/else']){
    const f=fake(c=>{if(c.path.includes('/actions/workflows/'))mutate(c.result.workflow_runs[0])});await blocked(f,/CI/);assert(f.calls.every(c=>new URL(c.url).origin==='https://api.github.com'));
  }
});

test('split deployment, baseline drift and latest upload drift prevent upload',async()=>{
  for(const mutate of [c=>c.result.deployments[0].versions.push({version_id:OTHER,percentage:50}),c=>c.result.deployments[0].id=OTHER]){
    const f=fake(c=>{if(c.path.endsWith('/deployments'))mutate(c)});await blocked(f,/Split|drift/);
  }
  await blocked(fake(c=>{if(c.path.endsWith('/versions'))c.result.items[0].id=OTHER}),/drift/);
});

test('test auth, missing binding and unknown runtime fields fail closed before upload',async()=>{
  for(const mutate of [v=>v.resources.bindings.push({name:'AUTH_TEST_MODE',type:'plain_text',text:'1'}),v=>v.resources.bindings.pop(),v=>v.resources.script_runtime.unknown={secret:VALUE},v=>v.resources.unknown={secret:VALUE}]){
    await blocked(fake(c=>{if(c.path.includes('/versions/'))mutate(c.result)}),/AUTH_TEST_MODE|binding inventory|Unknown/);
  }
});

test('unsupported placement and settings shape fail before upload',async()=>{
  for(const mutate of [s=>s.placement.mode='smart',s=>s.observability={enabled:true},s=>s.bindings.find(b=>b.type==='secret_text').text=VALUE]){
    await blocked(fake(c=>{if(c.path.endsWith('/settings'))mutate(c.result)}),/placement|Unknown/);
  }
});

test('server-generated trigger annotation is omitted from upload and may change after promotion',async()=>{
  const f=fake(c=>{if(c.promoted&&c.path.endsWith('/settings'))c.result.annotations['workers/triggered_by']='api_deployment'});
  assert.equal((await run(f)).status,'release-verified');
  assert.deepEqual(JSON.parse(posts(f)[0].options.body.get('metadata')).annotations,{'workers/message':'retained note'});
});

test('annotation validation and writable annotation preservation remain strict',async()=>{
  for(const mutate of [a=>a['workers/triggered_by']={},a=>a.unreviewed=VALUE]){
    await blocked(fake(c=>{if(c.path.endsWith('/settings'))mutate(c.result.annotations)}),/annotations|Unknown/);
  }
  await blocked(fake(c=>{if(c.snapshot===2&&c.path.endsWith('/settings'))c.result.annotations['workers/triggered_by']='external_operation'}),/pre-upload/);
  await blocked(fake(c=>{if(c.promoted&&c.path.endsWith('/settings'))c.result.annotations['workers/message']='changed note'}),/promoted settings/,2);
});

test('pre-upload settings drift is rejected without writes',async()=>{
  await blocked(fake(c=>{if(c.snapshot===2&&c.path.endsWith('/settings'))c.result.tags=['changed']}),/pre-upload/);
});

test('candidate binding drop, D1 swap, plain variable change and runtime change prevent promotion',async()=>{
  for(const mutate of [v=>v.resources.bindings.pop(),v=>v.resources.bindings.find(b=>b.name==='DB').id=OTHER,v=>v.resources.bindings.find(b=>b.name==='ALLOWED_ORIGINS').text='changed',v=>v.resources.script_runtime.usage_model='bundled']){
    const f=fake(c=>{if(c.path.endsWith('/versions/'+CANDIDATE))mutate(c.result)});await blocked(f,/binding inventory|candidate bindings/,1);assert.equal(f.checkpoints.at(-1).stage,'candidate-uploaded');
  }
});

test('observed AI project identity is inherited and must not change or disappear',async()=>{
  for(const mutate of [b=>b.project='changed-project',b=>delete b.project,b=>b.project={secret:VALUE}]){
    await blocked(fake(c=>{if(c.path.endsWith('/versions/'+CANDIDATE))mutate(c.result.resources.bindings.find(b=>b.name==='AI'))}),/AI project|candidate bindings/,1);
  }
  await blocked(fake(c=>{if(c.path.includes('/versions/'))c.result.resources.bindings.find(b=>b.name==='AI').unreviewed=VALUE}),/Unknown/);
});

test('pre-promotion deployment, settings and latest drift stop after upload only',async()=>{
  for(const mutate of [c=>{if(c.path.endsWith('/settings'))c.result.tags=['changed']},c=>{if(c.path.endsWith('/versions'))c.result.items[0].id=OTHER},c=>{if(c.path.endsWith('/deployments'))c.result.deployments[0].id=OTHER}]){
    await blocked(fake(c=>{if(c.snapshot===3)mutate(c)}),/drift/,1);
  }
});

test('nonempty or incompletely paginated domain inventory cannot be treated as empty',async()=>{
  for(const mutate of [c=>c.result.push({hostname:VALUE}),c=>c.envelope.result_info.total_count=1,c=>c.envelope.result_info.total_pages=2,c=>c.envelope.result_info.cursor=VALUE]){
    await blocked(fake(c=>{if(c.path.endsWith('/domains'))mutate(c)}),/domain|pagination/);
  }
});

test('post-promotion drift is reported without a retry or blind rollback',async()=>{
  await blocked(fake(c=>{if(c.promoted&&c.path.endsWith('/settings'))c.result.tags=['changed']}),/promoted settings/,2);
});

test('ambiguous upload or promotion is never retried and retains safe checkpoints',async()=>{
  for(const suffix of ['/versions','/deployments']){
    const f=fake(c=>{if(c.options.method==='POST'&&c.path.endsWith(suffix))throw new Error(TOKEN)});
    await blocked(f,/outcome unknown/,suffix==='/versions'?1:2);
    assert.equal(f.checkpoints.at(-1).stage,suffix==='/versions'?'upload-request-starting':'promotion-request-starting');
    if(suffix==='/deployments')assert.equal(f.checkpoints.at(-1).candidateVersionId,CANDIDATE);
  }
});

test('HTTP error bodies and arbitrary thrown errors are never logged',async()=>{
  let parsed=false;const f=fake(()=>({ok:false,status:403,json:async()=>{parsed=true;return{error:TOKEN}}}));
  await blocked(f,/unavailable/);assert.equal(parsed,false);
  assert(!safeReleaseError(new Error(TOKEN)).includes(TOKEN));
});

function activeRun(id=123,workflow='deploy-raluvaaa-shared-alpha.yml',status='queued'){
  return{id,path:'.github/workflows/'+workflow,repository:{full_name:REPOSITORY},status};
}
function setRuns(c,runs){c.result.workflow_runs=runs;c.result.total_count=runs.length}

test('another Worker deployment blocks upload for every active status',async()=>{
  for(const status of ['queued','in_progress','requested','waiting','pending']){
    for(const workflow of ['release-raluvaaa-code-only.yml','deploy-raluvaaa-shared-alpha.yml']){
      await blocked(fake(c=>{if(c.path.endsWith('/actions/runs')&&new URL(c.url).searchParams.get('status')===status)setRuns(c,[activeRun(123,workflow,status)])}),/Another Worker deployment/);
    }
  }
});

test('a deployment starting after upload prevents promotion',async()=>{
  const f=fake(c=>{if(c.uploaded&&c.path.endsWith('/actions/runs'))setRuns(c,[activeRun(123,'deploy-raluvaaa-shared-alpha.yml','in_progress')])});
  await blocked(f,/Another Worker deployment/,1);assert.equal(f.checkpoints.at(-1).stage,'candidate-uploaded');
});

test('only the exact current release run is excluded; unrelated work stays untouched',async()=>{
  const f=fake(c=>{if(c.path.endsWith('/actions/runs'))setRuns(c,[activeRun(987654321,'release-raluvaaa-code-only.yml','in_progress'),activeRun(456,'unrelated-user-work.yml','queued'),activeRun(789,'deploy-raluvaaa-shared-alpha.yml','completed')])});
  await run(f);
  const checks=f.calls.filter(c=>new URL(c.url).pathname.endsWith('/actions/runs'));
  assert.equal(checks.length,10);assert(checks.every(c=>c.options.method==='GET'&&!c.options.headers.authorization));
  await blocked(fake(c=>{if(c.path.endsWith('/actions/runs'))setRuns(c,[activeRun(987654321,'deploy-raluvaaa-shared-alpha.yml','queued')])}),/Another Worker deployment/);
});

test('unavailable or incomplete active-run inventory fails before upload',async()=>{
  for(const change of [c=>{c.result.total_count=101},c=>{c.result.total_count=1},c=>{setRuns(c,[activeRun()]);c.result.workflow_runs[0].repository.full_name='other/repo'},()=>({ok:false,status:403,json:async()=>{throw new Error(TOKEN)}})]){
    await blocked(fake(c=>{if(c.path.endsWith('/actions/runs'))return change(c)}),/inventory|metadata|unavailable/);
  }
});


test('unconfigured cleanup plan and helper pins cannot contact any service',async()=>{
  const plan=JSON.parse(readFileSync(new URL('./release-plan.json',import.meta.url),'utf8'));
  assert.equal(plan.enabled,false);
  for(const name of Object.keys(testPins))assert.equal(unconfigured[name],null,'production pins remain unset until reviewed');
  for(const key of ['sourceSha','codeSha256','baselineVersionId','baselineDeploymentId'])assert.equal(plan[key],null);
  let calls=0;
  for(const enabled of [false,true]){
    await assert.rejects(()=>unconfigured.releaseCodeOnly({plan:{...plan,enabled},ref:unconfigured.RELEASE_REF,repository:REPOSITORY,fetchImpl:async()=>{calls++;throw new Error('must not run')}}),/disabled|pins are incomplete/);
  }
  assert.equal(calls,0);
});


test('only a dedicated release-plan push can trigger the guarded code-only route',()=>{
  const workflow=readFileSync(new URL('../../.github/workflows/release-raluvaaa-code-only.yml',import.meta.url),'utf8');
  assert(workflow.includes('workflow_dispatch:'));
  assert(workflow.includes("  push:\n    branches:\n      - '"+RELEASE_REF.replace('refs/heads/','')+"'\n    paths:\n      - 'raluvaaa/alpha-api/release-plan.json'"));
  assert(!workflow.includes('dot/private-alpha-test-cleanup-20261016'));
  assert(workflow.includes("if: github.ref == '"+RELEASE_REF+"' && github.repository == '"+REPOSITORY+"'"));
  const validation=workflow.indexOf('validatePlan(JSON.parse(readFileSync(');
  const credentials=workflow.indexOf('CLOUDFLARE_API_TOKEN:');
  assert(validation>0&&credentials>validation,'disabled or incomplete plans fail before credentials are present');
  assert(workflow.includes('ref: process.env.GITHUB_REF, repository: process.env.GITHUB_REPOSITORY'));
  assert(workflow.includes('contents: read'));
  assert(workflow.includes('qa-fixture-hiding.mjs'));
  assert(workflow.includes("method: 'GET', redirect: 'error'"));
  assert(!/wrangler|d1 execute|secret put|deploy-trigger/.test(workflow));
});


test('public WORLD reads are fixed-origin, unauthenticated, bounded and bracket only the guarded write sequence',async()=>{
  const f=fake(),result=await run(f),worldCalls=f.calls.filter(c=>c.url===WORLD_URL);
  assert.equal(worldCalls.length,2);
  for(const call of worldCalls){
    assert.equal(call.options.method,'GET');assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');assert.equal(call.options.cache,'no-store');
    assert.deepEqual(call.options.headers,{'x-raluvaaa-room':'WORLD'});assert(call.options.signal instanceof AbortSignal);assert.equal(call.options.signal.aborted,false);assert(!('body' in call.options));
  }
  const preUploadCalls=f.calls.slice(f.calls.indexOf(worldCalls[0])+1,f.calls.indexOf(posts(f)[0]));
  assert.equal(new URL(preUploadCalls[0].url).pathname.split('/').at(-1),'deployments');
  assert(preUploadCalls.slice(-5).every(call=>new URL(call.url).pathname.endsWith('/actions/runs')));
  assert.equal(worldCalls[0].snapshot,1);assert.equal(worldCalls[1].snapshot,4);assert.equal(f.calls.at(-1),worldCalls[1]);
  const counts={beforePublicWishCount:9,afterPublicWishCount:2,fixtureRootCount:5,hiddenVisibleFixtureWishCount:7,unchangedOtherWishCount:2,newlyVisibleOtherWishCount:0};
  assert.deepEqual(result.publicVisibility,counts);assert.deepEqual(f.checkpoints.at(-1).publicVisibility,counts);
  assert(Object.values(counts).every(Number.isSafeInteger));
  // Test adapters contain the exact reviewed five roots independently of the helper.
  const workerRoots=[...CODE.toString().matchAll(/\{id:'(wish_[^']+)',ownerGroup:/g)].map(match=>match[1]);
  assert.deepEqual(ROOT_IDS,workerRoots);
});

test('every exact fixture root must be visible and have valid root pointers before any POST',async()=>{
  for(const rootId of ROOT_IDS){
    await blocked(fake(c=>{if(c.world&&!c.promoted)c.result.wishes=c.result.wishes.filter(row=>row.id!==rootId)}),/fixture baseline/);
  }
  for(const change of [row=>row.rootWishId=NEIGHBOR,row=>row.lineageId=NEIGHBOR,row=>row.parentWishId=NEIGHBOR,row=>row.kind='evolve']){
    await blocked(fake(c=>{if(c.world&&!c.promoted)change(c.result.wishes[0])}),/fixture baseline/);
  }
});

test('visible fixture family pointer mismatches block before upload',async()=>{
  for(const change of [row=>row.rootWishId=NEIGHBOR,row=>row.lineageId=NEIGHBOR,row=>row.parentWishId=NEIGHBOR,row=>row.parentWishId=null,row=>row.kind='create']){
    await blocked(fake(c=>{if(c.world&&!c.promoted)change(c.result.wishes.find(row=>row.id===CHILD))}),/fixture baseline/);
  }
});

test('an observable self-reference or cycle in a fixture family blocks before upload',async()=>{
  for(const parent of [CHILD,GRANDCHILD]){
    await blocked(fake(c=>{if(c.world&&!c.promoted)c.result.wishes.find(row=>row.id===CHILD).parentWishId=parent}),/fixture baseline/);
  }
});

test('missing or malformed public response shapes fail closed before upload and after promotion',async()=>{
  const changes=[
    data=>data.room='ALPHA',data=>delete data.room,data=>delete data.wishes,data=>data.wishes={},data=>delete data.events,data=>data.events={},
    data=>data.extra=VALUE,data=>data.wishes.push(data.wishes[0]),data=>data.wishes[0]=null,data=>data.wishes[0].id=VALUE,
    data=>delete data.wishes[0].text,data=>data.wishes[0].extra=VALUE,data=>data.wishes[0].isMine=true,data=>data.wishes[0].kind='unknown',
    data=>data.wishes[0].text={},data=>data.wishes[0].locationText={},data=>data.wishes[0].state='removed',data=>data.wishes[0].createdAt='1000',
    data=>data.wishes[0].updatedAt=-1,data=>data.wishes[0].encouragementCount=0.5,data=>data.wishes[0].rootWishId=null,data=>data.wishes[0].parentWishId={},
    data=>data.wishes=Array(601).fill(data.wishes[0]),data=>data.events=Array(3001).fill({})
  ];
  for(const promoted of [false,true])for(const change of changes){
    const f=fake(c=>{if(c.world&&c.promoted===promoted)change(c.result)});
    await blocked(f,/visibility response is invalid/,promoted?2:0);
    assert.equal(f.calls.filter(c=>c.url===WORLD_URL).length,promoted?2:1);
    if(promoted)assert.equal(f.checkpoints.at(-1).stage,'promotion-response-received');
  }
  for(const response of [null,[],{room:'WORLD',wishes:[]}]){
    await blocked(fake(c=>c.world?{ok:true,status:200,json:async()=>response}:undefined),/visibility response is invalid/);
  }
});

test('public redirect, network, HTTP and JSON failures are sanitized and never retried',async()=>{
  const failures=[
    ()=>{throw new Error('network '+TOKEN+' '+PUBLIC_TEXT)},
    ()=>{throw new TypeError('redirect '+PUBLIC_LOCATION+' '+ROOT_IDS[0])},
    ()=>({ok:false,status:302,json:async()=>{throw new Error('must not parse')}}),
    ()=>({ok:true,status:200,redirected:true,json:async()=>{throw new Error('must not parse')}}),
    ()=>({ok:false,status:503,json:async()=>{throw new Error('must not parse')}}),
    ()=>({ok:true,status:204,json:async()=>{throw new Error('must not parse')}}),
    ()=>({ok:true,status:200,json:async()=>{throw new Error(TOKEN+' '+PUBLIC_TEXT+' '+NEIGHBOR)}})
  ];
  for(const promoted of [false,true])for(const failure of failures){
    const f=fake(c=>{if(c.world&&c.promoted===promoted)return failure()});
    await blocked(f,/Public WORLD visibility (request failed|response is unreadable)/,promoted?2:0);
    assert.equal(f.calls.filter(c=>c.url===WORLD_URL).length,promoted?2:1);
  }
});

test('a fixture root or any previously visible descendant remaining after promotion fails without retry or rollback',async()=>{
  const family=fixtureWorld(false).wishes.filter(row=>!([NEIGHBOR,NEIGHBOR_TWO].includes(row.id)));
  for(const row of family){
    const f=fake(c=>{if(c.world&&c.promoted)c.result.wishes.push(row)});
    await blocked(f,/fixture visibility verification failed/,2);assert.equal(f.checkpoints.at(-1).stage,'promotion-response-received');
  }
  // A newly observed fixture descendant also must not survive the filter.
  await blocked(fake(c=>{if(c.world&&c.promoted)c.result.wishes.push(publicWish(NEW_NEIGHBOR,{rootWishId:ROOT_IDS[0],lineageId:ROOT_IDS[0],parentWishId:CHILD,kind:'split'}))}),/fixture visibility verification failed/,2);
  // Rewriting pointers cannot conceal an ID already observed in the fixture family.
  await blocked(fake(c=>{if(c.world&&c.promoted)c.result.wishes.push(publicWish(CHILD))}),/fixture visibility verification failed/,2);
});

test('any changed or deleted preexisting public neighbor makes post-promotion verification inconclusive',async()=>{
  for(const change of [
    data=>data.wishes=data.wishes.filter(row=>row.id!==NEIGHBOR),
    data=>data.wishes[0].text='changed',data=>data.wishes[0].locationText=null,data=>data.wishes[0].state='abandoned',
    data=>data.wishes[0].updatedAt++,data=>data.wishes[0].createdAt++,data=>data.wishes[0].encouragementCount++,
    data=>data.wishes[0].parentWishId=NEIGHBOR_TWO,data=>data.wishes[0].rootWishId=NEIGHBOR_TWO,data=>data.wishes[0].lineageId=NEIGHBOR_TWO,data=>data.wishes[0].kind='split'
  ]){
    const f=fake(c=>{if(c.world&&c.promoted)change(c.result)});
    await blocked(f,/neighbor verification is inconclusive/,2);assert.equal(f.checkpoints.at(-1).stage,'promotion-response-received');
  }
});

test('newly visible older public neighbors and response ordering are allowed',async()=>{
  const f=fake(c=>{if(c.world&&c.promoted){c.result.wishes.push(publicWish(NEW_NEIGHBOR,{createdAt:1,updatedAt:1}));c.result.wishes.reverse();c.result.wishes=c.result.wishes.map(row=>Object.fromEntries(Object.entries(row).reverse()))}});
  const result=await run(f);
  assert.equal(result.status,'release-verified');assert.equal(result.publicVisibility.newlyVisibleOtherWishCount,1);assert.equal(result.publicVisibility.unchangedOtherWishCount,2);assert.equal(posts(f).length,2);
  assert.equal(f.calls.filter(c=>c.url===WORLD_URL).length,2);
});

test('a full 600-row public view may reveal older neighbors without requiring unseen D1 parents',async()=>{
  const visible=Array.from({length:591},(_,i)=>publicWish('wish_'+i.toString(16).padStart(8,'0')+'-cccc-4ccc-8ccc-cccccccccccc'));
  const missingParent='wish_dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const f=fake(c=>{if(c.world){
    c.result.wishes.push(...visible);
    if(!c.promoted)c.result.wishes.find(row=>row.id===GRANDCHILD).parentWishId=missingParent;
    else c.result.wishes.push(publicWish(NEW_NEIGHBOR,{createdAt:1,updatedAt:1}));
  }});
  const result=await run(f);assert.equal(result.publicVisibility.beforePublicWishCount,600);assert.equal(result.publicVisibility.unchangedOtherWishCount,593);assert.equal(result.publicVisibility.newlyVisibleOtherWishCount,1);
});

test('public content, identities, row values and fingerprints never enter checkpoints or release results',async()=>{
  const f=fake(),result=await run(f),output=JSON.stringify([f.checkpoints,result]);
  for(const row of fixtureWorld(false).wishes){
    assert(!output.includes(row.id));assert(!output.includes(row.text));assert(!output.includes(row.locationText));
    const fingerprint=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
    assert(!output.includes(fingerprint));
  }
  for(const checkpoint of f.checkpoints)if(checkpoint.publicVisibility)assert(Object.values(checkpoint.publicVisibility).every(Number.isSafeInteger));
});
