import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { APPROVED_SOURCE_SHA,APPROVED_CODE_SHA256,BASELINE_VERSION,BASELINE_DEPLOYMENT,RELEASE_REF,releaseCodeOnly,safeReleaseError,validatePlan } from './release-code-only.mjs';

const CANDIDATE='11111111-1111-4111-8111-111111111111',NEW_DEPLOYMENT='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333';
const ACCOUNT='a'.repeat(32),TOKEN='SECRET-TOKEN-MUST-NOT-APPEAR',VALUE='PRIVATE-PLAINTEXT-MUST-NOT-APPEAR';
const REPOSITORY='thomasjudes-del/confluenceofminds-site';
const CODE=readFileSync(new URL('./worker.mjs',import.meta.url));
const PLAN={enabled:true,sourceSha:APPROVED_SOURCE_SHA,codeSha256:APPROVED_CODE_SHA256,baselineVersionId:BASELINE_VERSION,baselineDeploymentId:BASELINE_DEPLOYMENT};
function fake(change=()=>{}){
  const calls=[],checkpoints=[];let uploaded=false,promoted=false,snapshot=0;
  const bindings=[{name:'AI',type:'ai'},{name:'DB',type:'d1',id:'44444444-4444-4444-8444-444444444444'},{name:'ALLOWED_ORIGINS',type:'plain_text',text:VALUE},...['AUTH_CODE_SECRET','RALUVAAA_EMAIL_FROM','RESEND_API_KEY'].map(name=>({name,type:'secret_text'}))];
  const runtime={compatibility_date:'2026-09-01',usage_model:'standard'};
  const fetchImpl=async(url,options)=>{
    const u=new URL(url),path=u.pathname;calls.push({url,options,snapshot});
    let result,github=false;
    if(u.origin==='https://api.github.com'){
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
    else if(path.endsWith('/settings'))result={annotations:{},bindings:structuredClone(bindings),compatibility_date:'2026-09-01',compatibility_flags:[],usage_model:'standard',logpush:false,placement:{mode:'off'},tags:[],tail_consumers:[]};
    else if(path.endsWith('/schedules'))result={schedules:[]};
    else if(path.endsWith('/subdomain'))result={enabled:true,previews_enabled:true};
    else if(path.endsWith('/routes'))result=[];
    else if(path.endsWith('/domains'))result=[];
    else throw new Error('Unexpected URL');
    const envelope=github?result:{success:true,result,...(path.endsWith('/domains')?{result_info:{page:1,per_page:100,count:0,total_count:0,total_pages:1}}:{})};
    const context={url,options,path,snapshot,uploaded,promoted,result,envelope};
    const response=change(context);
    return response??{ok:true,status:200,json:async()=>envelope};
  };
  return{calls,checkpoints,fetchImpl};
}
const run=(f,overrides={})=>releaseCodeOnly({fetchImpl:f.fetchImpl,accountId:ACCOUNT,token:TOKEN,plan:PLAN,ref:RELEASE_REF,repository:REPOSITORY,code:CODE,runId:'987654321',onCheckpoint:c=>f.checkpoints.push(c),...overrides});
const posts=f=>f.calls.filter(c=>c.options.method==='POST');
async function blocked(f,pattern,postCount=0){await assert.rejects(()=>run(f),e=>{assert(!safeReleaseError(e).includes(VALUE));assert(!safeReleaseError(e).includes(TOKEN));return pattern.test(safeReleaseError(e))});assert.equal(posts(f).length,postCount)}

test('only exact strict-inheritance upload and exact candidate100 promotion can write',async()=>{
  const f=fake(),result=await run(f);assert.equal(result.status,'release-verified');
  assert.equal(posts(f).length,2);
  const [upload,promotion]=posts(f);
  const metadata=JSON.parse(upload.options.body.get('metadata'));
  assert.deepEqual(Object.keys(metadata).sort(),['annotations','bindings','compatibility_date','main_module','usage_model']);
  assert.equal(metadata.main_module,'worker.mjs');
  assert.equal(metadata.bindings.length,6);assert(metadata.bindings.every(b=>Object.keys(b).sort().join() === 'name,type'&&b.type==='inherit'));
  assert.equal(await upload.options.body.get('worker.mjs').text(),CODE.toString());
  assert(!JSON.stringify(metadata).includes(VALUE));assert(!JSON.stringify(metadata).includes(TOKEN));
  assert.deepEqual(JSON.parse(promotion.options.body),{strategy:'percentage',versions:[{version_id:CANDIDATE,percentage:100}]});
  assert(f.calls.indexOf(upload)>15);assert(f.calls.slice(f.calls.indexOf(upload)+1,f.calls.indexOf(promotion)).filter(c=>c.options.method==='GET').length>=11);
  for(const call of f.calls){assert.equal(call.options.redirect,'error');if(call.options.method==='GET')assert(!('body' in call.options));if(new URL(call.url).origin==='https://api.github.com')assert(!call.options.headers.authorization)}
  const output=JSON.stringify([result,f.checkpoints]);for(const privateValue of [TOKEN,VALUE,ACCOUNT,'44444444-4444-4444-8444-444444444444'])assert(!output.includes(privateValue));
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

test('pre-upload settings drift is rejected without writes',async()=>{
  await blocked(fake(c=>{if(c.snapshot===2&&c.path.endsWith('/settings'))c.result.tags=['changed']}),/pre-upload/);
});

test('candidate binding drop, D1 swap, plain variable change and runtime change prevent promotion',async()=>{
  for(const mutate of [v=>v.resources.bindings.pop(),v=>v.resources.bindings.find(b=>b.name==='DB').id=OTHER,v=>v.resources.bindings.find(b=>b.name==='ALLOWED_ORIGINS').text='changed',v=>v.resources.script_runtime.usage_model='bundled']){
    const f=fake(c=>{if(c.path.endsWith('/versions/'+CANDIDATE))mutate(c.result)});await blocked(f,/binding inventory|candidate bindings/,1);assert.equal(f.checkpoints.at(-1).stage,'candidate-uploaded');
  }
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
