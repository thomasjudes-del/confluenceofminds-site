import { createHash } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Narrow, one-release helper. Never generalize a rejected shape during a live run.
// API contracts: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/
// https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/
// Wrangler 4.151.0 versions upload explicitly omits non-versioned logpush/observability;
// this helper never writes settings, triggers, secrets, D1 schema or D1 contents.
export const APPROVED_SOURCE_SHA='20914b49d834160d947c60115aaf560bd7786f2c';
export const APPROVED_CODE_SHA256='03218e265bc9c483dc183606fa03f2a6b838b2536744cf2e5baa44415f8c7eb5';
export const BASELINE_VERSION='be8ae250-463a-43da-bf3f-902d7fc5c8bd';
export const BASELINE_DEPLOYMENT='4ecb828a-b1e6-48e2-963a-444e1b4be760';
export const RELEASE_REF='refs/heads/dot/raluvaaa-code-only-release-20261015';
const REPOSITORY='thomasjudes-del/confluenceofminds-site';
const WORKER='raluvaaa-alpha-api';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BINDINGS={AI:'ai',ALLOWED_ORIGINS:'plain_text',AUTH_CODE_SECRET:'secret_text',DB:'d1',RALUVAAA_EMAIL_FROM:'secret_text',RESEND_API_KEY:'secret_text'};
const DEPLOYMENT_WORKFLOWS=['.github/workflows/release-raluvaaa-code-only.yml','.github/workflows/deploy-raluvaaa-shared-alpha.yml'];
const ACTIVE_RUN_STATUSES=['queued','in_progress','requested','waiting','pending'];
const REQUIRED_WORKFLOWS=['check-raluvaaa-alpha-api.yml','check-raluvaaa-private-alpha.yml','check-raluvaaa-shared-ui.yml'];
class ReleaseError extends Error{}
const fail=message=>{throw new ReleaseError(message)};
const obj=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('Unsupported metadata: '+label);return v};
const arr=(v,label)=>{if(!Array.isArray(v))fail('Unsupported metadata: '+label);return v};
const id=(v,label)=>{if(typeof v!=='string'||!UUID.test(v))fail('Invalid identifier: '+label);return v};
const keys=(v,allowed,label)=>{obj(v,label);if(Object.keys(v).some(k=>!allowed.includes(k)))fail('Unknown metadata fields: '+label)};
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const same=(a,b,label)=>{if(canonical(a)!==canonical(b))fail('Release blocked by drift: '+label)};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const safeReleaseError=error=>error instanceof ReleaseError?error.message:'Release failed; details suppressed; inspect retained checkpoint IDs before any retry';

export function validatePlan(plan,{ref,repository}={}){
  keys(plan,['enabled','sourceSha','codeSha256','baselineVersionId','baselineDeploymentId'],'release plan');
  if(plan.enabled!==true)fail('Release plan is disabled');
  if(ref!==RELEASE_REF||repository!==REPOSITORY)fail('Release repository or branch is not approved');
  if(plan.sourceSha!==APPROVED_SOURCE_SHA||plan.codeSha256!==APPROVED_CODE_SHA256||plan.baselineVersionId!==BASELINE_VERSION||plan.baselineDeploymentId!==BASELINE_DEPLOYMENT)fail('Release plan does not match the reviewed source and baseline');
}
function checkedBindings(value){
  const bindings=arr(value,'bindings');
  if(bindings.some(b=>b?.name==='AUTH_TEST_MODE'))fail('AUTH_TEST_MODE must be absent');
  if(bindings.length!==Object.keys(BINDINGS).length)fail('Unexpected binding inventory');
  const seen=new Set();
  for(const b of bindings){
    obj(b,'binding');
    if(!Object.hasOwn(BINDINGS,b.name)||BINDINGS[b.name]!==b.type||seen.has(b.name))fail('Unexpected binding inventory');
    seen.add(b.name);
    if(b.type==='plain_text'){keys(b,['name','type','text'],'plain text binding');if(typeof b.text!=='string')fail('Unreadable plain text binding')}
    if(b.type==='secret_text')keys(b,['name','type'],'secret binding');
    if(b.type==='ai')keys(b,['name','type'],'AI binding');
    if(b.type==='d1'){
      keys(b,['name','type','id','database_id'],'D1 binding');
      id(b.database_id??b.id,'D1 database');
      if(b.id!==undefined&&b.database_id!==undefined&&b.id!==b.database_id)fail('Ambiguous D1 database identity');
    }
  }
  return [...bindings].sort((a,b)=>a.name.localeCompare(b.name));
}
function checkedVersion(version,expectedId){
  obj(version,'version');same(id(version.id,'version'),expectedId,'version identity');
  keys(version.resources,['bindings','script','script_runtime'],'version resources');
  const runtime=obj(version.resources.script_runtime,'runtime');
  keys(runtime,['compatibility_date','compatibility_flags','usage_model'],'runtime');
  if(!['2026-09-01','2026-09-01T00:00:00Z'].includes(runtime.compatibility_date))fail('Unexpected compatibility date');
  if(runtime.compatibility_flags!==undefined&&arr(runtime.compatibility_flags,'flags').length)fail('Unexpected compatibility flags');
  if(!['standard','bundled','unbound'].includes(runtime.usage_model))fail('Unsupported usage model');
  const script=obj(version.resources.script,'script');
  keys(script,['etag','handlers','last_deployed_from','named_handlers'],'script');
  if(typeof script.etag!=='string'||!script.etag)fail('Missing script content identifier');
  same(script.handlers,['fetch'],'script handlers');
  if(script.named_handlers!==undefined&&arr(script.named_handlers,'named handlers').length)fail('Unexpected named handlers');
  return{runtime,bindings:checkedBindings(version.resources.bindings),handlers:script.handlers,namedHandlers:script.named_handlers};
}
function checkedSettings(settings,version){
  keys(settings,['annotations','bindings','compatibility_date','compatibility_flags','logpush','placement','tags','tail_consumers','usage_model'],'settings');
  same(checkedBindings(settings.bindings),version.bindings,'settings bindings');
  if(!['2026-09-01','2026-09-01T00:00:00Z'].includes(settings.compatibility_date))fail('Unexpected settings compatibility date');
  same(arr(settings.compatibility_flags,'settings flags'),[],'settings flags');
  same(settings.usage_model,version.runtime.usage_model,'settings usage model');
  if(typeof settings.logpush!=='boolean')fail('Unsupported logpush setting');
  arr(settings.tags,'tags');arr(settings.tail_consumers,'tail consumers');
  // Non-default placement is not represented in the observed version runtime.
  // Refuse it rather than guessing how to copy a potentially versioned setting.
  if(settings.placement!==null){keys(settings.placement,['mode'],'placement');if(settings.placement.mode!==undefined&&settings.placement.mode!=='off')fail('Non-default placement requires separate review')}
  const annotations=obj(settings.annotations,'annotations');
  keys(annotations,['workers/alias','workers/commit_sha','workers/message','workers/pull_request_number','workers/pull_request_title','workers/pull_request_url','workers/repository_url','workers/tag'],'annotations');
  if(Object.values(annotations).some(v=>typeof v!=='string'))fail('Unsupported annotations');
  return settings;
}

export async function releaseCodeOnly({fetchImpl=fetch,accountId,token,plan,ref,repository,code,runId,onCheckpoint=()=>{}}={}){
  validatePlan(plan,{ref,repository});
  if(typeof runId!=='string'||! /^[1-9][0-9]{0,19}$/.test(runId))fail('Current GitHub run identity is missing or invalid');
  if(!(code instanceof Uint8Array)||hash(code)!==APPROVED_CODE_SHA256)fail('Worker bytes do not match the reviewed code hash');
  if(typeof accountId!=='string'||!/^([0-9a-f]{32})$/i.test(accountId)||typeof token!=='string'||!token)fail('Existing Cloudflare credentials are missing or invalid');
  const account='/accounts/'+accountId,script=account+'/workers/scripts/'+WORKER;
  let phase='read-only',candidateId=null,deploymentId=null;
  async function request(path,label,{method='GET',body}={}){
    const upload=path===script+'/versions?bindings_inherit=strict';
    const deploy=path===script+'/deployments';
    if(method!=='GET'&&!(method==='POST'&&((phase==='upload'&&upload)||(phase==='promote'&&deploy))))fail('Disallowed release request');
    let response;
    try{response=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{method,redirect:'error',headers:{authorization:'Bearer '+token,accept:'application/json',...(method==='POST'&&deploy?{'content-type':'application/json'}:{})},...(body===undefined?{}:{body}),signal:AbortSignal.timeout(30000)})}catch{fail('Request outcome unknown: '+label+'; stop and inspect checkpoints, do not retry blindly')}
    if(!response.ok)fail('Release request failed: '+label+' (HTTP '+Number(response.status)+')');
    let data;try{data=await response.json()}catch{fail('Unreadable release response: '+label+'; inspect checkpoints before retry')}
    if(data?.success!==true||data.result===undefined)fail('Release API rejected request: '+label);
    return data;
  }
  const get=async(path,label)=>(await request(path,label)).result;
  async function githubGet(path,label){
    let response,data;
    try{response=await fetchImpl('https://api.github.com/repos/'+REPOSITORY+path,{method:'GET',redirect:'error',headers:{accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)})}catch{fail(label+' unavailable')}
    if(!response.ok)fail(label+' unavailable');
    try{data=await response.json()}catch{fail(label+' unavailable')}
    return data;
  }
  async function verifyCI(){
    for(const workflow of REQUIRED_WORKFLOWS){
      const data=await githubGet('/actions/workflows/'+workflow+'/runs?head_sha='+APPROVED_SOURCE_SHA+'&event=push&per_page=10','Source CI verification');
      const run=arr(data.workflow_runs,'CI runs')[0];
      if(!run||run.head_sha!==APPROVED_SOURCE_SHA||run.event!=='push'||run.path!=='.github/workflows/'+workflow||run.repository?.full_name!==REPOSITORY||run.status!=='completed'||run.conclusion!=='success')fail('Required source CI is not green for the reviewed commit');
    }
  }
  async function verifyNoOtherDeployments(){
    // Repository-wide status queries also see a workflow first added on a branch.
    // API contract: https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
    for(const status of ACTIVE_RUN_STATUSES){
      const data=await githubGet('/actions/runs?status='+status+'&per_page=100&page=1','Deployment run verification');
      const runs=arr(data.workflow_runs,'active workflow runs');
      if(!Number.isSafeInteger(data.total_count)||data.total_count<0||data.total_count!==runs.length||runs.length>100)fail('Incomplete deployment run inventory');
      for(const run of runs){
        if(!Number.isSafeInteger(run.id)||run.id<=0||typeof run.path!=='string'||typeof run.status!=='string'||run.repository?.full_name!==REPOSITORY)fail('Unsupported deployment run metadata');
        const workflow=run.path.split('@')[0];
        if(!DEPLOYMENT_WORKFLOWS.includes(workflow))continue;
        if(String(run.id)===runId&&workflow===DEPLOYMENT_WORKFLOWS[0])continue;
        // A run may complete between query and response; all other states block.
        if(run.status!=='completed')fail('Another Worker deployment workflow is active or queued');
      }
    }
  }
  async function current(){
    const deployments=obj(await get(script+'/deployments','deployments'),'deployments');
    const deployment=arr(deployments.deployments,'deployments list')[0];
    obj(deployment,'current deployment');id(deployment.id,'deployment');
    const active=arr(deployment.versions,'active versions');
    if(active.length!==1||active[0].percentage!==100)fail('Split or incomplete deployment is not supported');
    const activeId=id(active[0].version_id,'active version');
    const versions=obj(await get(script+'/versions','versions'),'versions');
    const latestId=id(arr(versions.items,'version list')[0]?.id,'latest version');
    const raw=await get(script+'/versions/'+activeId,'active version');
    const version=checkedVersion(raw,activeId);
    const settings=checkedSettings(await get(script+'/settings','settings'),version);
    const schedules=await get(script+'/schedules','schedules');keys(schedules,['schedules'],'schedules');
    if(arr(schedules.schedules,'schedules').length)fail('Unexpected scheduled triggers');
    const subdomain=await get(script+'/subdomain','subdomain');keys(subdomain,['enabled','previews_enabled'],'subdomain');
    same(subdomain,{enabled:true,previews_enabled:true},'workers.dev and preview settings');
    const routes=arr(await get(account+'/workers/services/'+WORKER+'/environments/production/routes','routes'),'routes');
    if(routes.length)fail('Unexpected route triggers');
    const domains=await request(account+'/workers/domains?service='+WORKER+'&environment=production&page=1&per_page=100','domains');
    if(arr(domains.result,'domains').length)fail('Unexpected custom domain triggers');
    // Only the reviewed empty inventory is supported, including paginated APIs.
    if(domains.result_info!==undefined){
      keys(domains.result_info,['page','per_page','count','total_count','total_pages'],'domain pagination');
      const p=domains.result_info;
      if((p.page!==undefined&&p.page!==1)||(p.count!==undefined&&p.count!==0)||(p.total_count!==undefined&&p.total_count!==0)||(p.total_pages!==undefined&&p.total_pages>1))fail('Unverified custom domain pagination');
    }
    return{deployment,activeId,latestId,version,settings,triggers:{schedules,subdomain,routes,domains:domains.result}};
  }
  function assertBaseline(snapshot,latestId=BASELINE_VERSION){
    same(snapshot.deployment.id,BASELINE_DEPLOYMENT,'deployment ID');
    same(snapshot.activeId,BASELINE_VERSION,'active version');same(snapshot.latestId,latestId,'latest uploaded version');
  }
  const checkpoint=stage=>onCheckpoint({stage,worker:WORKER,sourceSha:APPROVED_SOURCE_SHA,codeSha256:APPROVED_CODE_SHA256,baselineDeploymentId:BASELINE_DEPLOYMENT,baselineVersionId:BASELINE_VERSION,...(candidateId?{candidateVersionId:candidateId}:{}),...(deploymentId?{deploymentId}:{})});
  await verifyCI();
  const baseline=await current();assertBaseline(baseline);
  checkpoint('baseline-verified');
  const immediatelyBeforeUpload=await current();assertBaseline(immediatelyBeforeUpload);
  same(immediatelyBeforeUpload,baseline,'pre-upload runtime settings and triggers');
  const metadata={main_module:'worker.mjs',bindings:baseline.version.bindings.map(b=>({name:b.name,type:'inherit'})),...baseline.version.runtime,compatibility_date:baseline.version.runtime.compatibility_date.slice(0,10),annotations:baseline.settings.annotations};
  const form=new FormData();form.set('metadata',JSON.stringify(metadata));form.set('worker.mjs',new Blob([code],{type:'application/javascript+module'}),'worker.mjs');
  await verifyNoOtherDeployments();
  checkpoint('upload-request-starting');
  phase='upload';
  const uploaded=(await request(script+'/versions?bindings_inherit=strict','version upload',{method:'POST',body:form})).result;
  phase='read-only';candidateId=id(uploaded.id,'uploaded version');
  if(candidateId===BASELINE_VERSION)fail('Upload returned the baseline version');
  checkpoint('candidate-uploaded');
  const candidate=checkedVersion(await get(script+'/versions/'+candidateId,'candidate version'),candidateId);
  same(candidate,baseline.version,'candidate bindings and runtime');
  await verifyCI();
  const beforePromotion=await current();assertBaseline(beforePromotion,candidateId);
  same({...beforePromotion,latestId:BASELINE_VERSION},baseline,'pre-promotion runtime settings and triggers');
  // The API has no compare-and-swap condition. Workflow concurrency only serializes
  // this workflow: external writers can race after this check. Verify immediately
  // afterward, stop on drift, and never automatically retry or roll back a POST.
  await verifyNoOtherDeployments();
  checkpoint('promotion-request-starting');phase='promote';
  const deployed=(await request(script+'/deployments','candidate promotion',{method:'POST',body:JSON.stringify({strategy:'percentage',versions:[{version_id:candidateId,percentage:100}]})})).result;
  phase='read-only';deploymentId=id(deployed.id,'new deployment');checkpoint('promotion-response-received');
  const after=await current();
  same(after.deployment.id,deployed.id,'promoted deployment');same(after.activeId,candidateId,'promoted version');same(after.latestId,candidateId,'latest version after promotion');
  same(after.version,baseline.version,'promoted runtime');same(after.settings,baseline.settings,'promoted settings');same(after.triggers,baseline.triggers,'promoted triggers');
  checkpoint('release-verified');
  return{status:'release-verified',sourceSha:APPROVED_SOURCE_SHA,codeSha256:APPROVED_CODE_SHA256,baselineVersionId:BASELINE_VERSION,candidateVersionId:candidateId,deploymentId:deployed.id};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const plan=JSON.parse(readFileSync(new URL('./release-plan.json',import.meta.url),'utf8'));
    validatePlan(plan,{ref:process.env.GITHUB_REF,repository:process.env.GITHUB_REPOSITORY});
    const code=execFileSync('git',['show',APPROVED_SOURCE_SHA+':raluvaaa/alpha-api/worker.mjs'],{stdio:['ignore','pipe','ignore'],maxBuffer:2*1024*1024});
    const result=await releaseCodeOnly({plan,ref:process.env.GITHUB_REF,repository:process.env.GITHUB_REPOSITORY,code,runId:process.env.GITHUB_RUN_ID,accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN,onCheckpoint:value=>{
      const line=JSON.stringify(value);console.log(line);
      if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,line+'\n\n');
    }});
    console.log(JSON.stringify(result));
  }catch(error){console.error(safeReleaseError(error));process.exitCode=1}
}
