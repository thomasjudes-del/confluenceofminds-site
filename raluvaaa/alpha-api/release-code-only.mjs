import { createHash } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Narrow, one-release helper. Never generalize a rejected shape during a live run.
// API contracts: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/
// https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/
// Wrangler 4.151.0 versions upload explicitly omits non-versioned logpush/observability;
// this helper never writes settings, triggers, secrets, D1 schema or D1 contents.
// Intentionally unpinned: the SQL-only source and a fresh GET-only runtime
// inventory must be reviewed before these four values and the plan are enabled.
export const APPROVED_SOURCE_SHA=null;
export const APPROVED_CODE_SHA256=null;
export const BASELINE_VERSION=null;
export const BASELINE_DEPLOYMENT=null;
export const RELEASE_REF='refs/heads/dot/raluvaaa-query-only-release-20261016';
const REPOSITORY='thomasjudes-del/confluenceofminds-site';
const WORKER='raluvaaa-alpha-api';
const PUBLIC_WORLD_URL='https://raluvaaa-alpha-api.thomas-judes.workers.dev/v1/world';
const QA_FIXTURE_ROOT_IDS=Object.freeze([
  'wish_57b208a2-c381-4bbd-bca5-4b0c1d76a19d',
  'wish_93c9de27-c022-483f-975a-5452bdd9f06e',
  'wish_841df73a-7c30-4f8d-b7bd-df945e4c563a',
  'wish_558a976c-173a-4034-9503-f92a51c5c0b7',
  'wish_cc52e794-db66-413d-bb25-9f97d5c80c5a'
]);
const PUBLIC_WISH_FIELDS=['id','lineageId','parentWishId','rootWishId','kind','text','locationText','state','createdAt','updatedAt','encouragementCount','isMine'];
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
  if(typeof APPROVED_SOURCE_SHA!=='string'||! /^[0-9a-f]{40}$/.test(APPROVED_SOURCE_SHA)||typeof APPROVED_CODE_SHA256!=='string'||! /^[0-9a-f]{64}$/.test(APPROVED_CODE_SHA256)||typeof BASELINE_VERSION!=='string'||!UUID.test(BASELINE_VERSION)||typeof BASELINE_DEPLOYMENT!=='string'||!UUID.test(BASELINE_DEPLOYMENT))fail('Release pins are incomplete; review exact source and fresh runtime inventory before enabling');
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
    // Observed GET metadata includes an opaque project identity. Inherit it
    // and compare it unchanged; never log or resubmit its value explicitly.
    if(b.type==='ai'){keys(b,['name','type','project'],'AI binding');if(typeof b.project!=='string')fail('Unreadable AI project identity')}
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
  keys(annotations,['workers/alias','workers/commit_sha','workers/message','workers/pull_request_number','workers/pull_request_title','workers/pull_request_url','workers/repository_url','workers/tag','workers/triggered_by'],'annotations');
  if(Object.values(annotations).some(v=>typeof v!=='string'))fail('Unsupported annotations');
  return settings;
}

// Cloudflare documents workers/triggered_by as read-only operation metadata:
// https://developers.cloudflare.com/api/typescript/resources/workers/subresources/scripts/subresources/script_and_version_settings/methods/get/
// Do not resubmit it. All user annotations and runtime settings stay exact.
const writableAnnotations=annotations=>Object.fromEntries(Object.entries(annotations).filter(([key])=>key!=='workers/triggered_by'));
const promotionSettings=settings=>({...settings,annotations:writableAnnotations(settings.annotations)});

// These snapshots prove only the observed public WORLD wish visibility (600-row
// cap), not the contents or preservation of all D1 rows. Keep identities, public
// row contents and fingerprints in memory; report only aggregate counts.
function checkedPublicWorld(data){
  const invalid=()=>fail('Public WORLD visibility response is invalid');
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==3||data.room!=='WORLD'||!Array.isArray(data.wishes)||data.wishes.length>600||!Array.isArray(data.events)||data.events.length>3000)invalid();
  const wishId=value=>typeof value==='string'&&value.startsWith('wish_')&&UUID.test(value.slice(5));
  const nonnegativeInteger=value=>Number.isSafeInteger(value)&&value>=0;
  const rows=new Map();
  for(const row of data.wishes){
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==PUBLIC_WISH_FIELDS.length||PUBLIC_WISH_FIELDS.some(key=>!Object.hasOwn(row,key)))invalid();
    if(!wishId(row.id)||!wishId(row.lineageId)||!wishId(row.rootWishId)||(row.parentWishId!==null&&!wishId(row.parentWishId))||rows.has(row.id))invalid();
    if(!['create','evolve','split'].includes(row.kind)||!['alive','bloomed','abandoned'].includes(row.state)||typeof row.text!=='string'||(row.locationText!==null&&typeof row.locationText!=='string')||row.isMine!==false)invalid();
    if(!nonnegativeInteger(row.createdAt)||!nonnegativeInteger(row.updatedAt)||!nonnegativeInteger(row.encouragementCount))invalid();
    rows.set(row.id,row);
  }
  return rows;
}
function assertPublicFixtureAbsence(rows){
  const roots=new Set(QA_FIXTURE_ROOT_IDS);
  for(const row of rows.values()){
    // The five roots are already hidden. A root or any structural reference to
    // one in this bounded public view blocks both before and after deployment.
    if([row.id,row.rootWishId,row.lineageId,row.parentWishId].some(reference=>roots.has(reference)))fail('Public WORLD fixture absence verification failed; inspect checkpoints, do not retry or roll back automatically');
  }
  // Reject every observable parent cycle, including unrelated public wishes.
  // A parent outside the 600-row view is allowed; its ancestry is not proven.
  for(const rowId of rows.keys()){
    const path=new Set();let current=rowId;
    while(rows.has(current)){
      if(path.has(current))fail('Public WORLD visibility response contains an observable parent cycle');
      path.add(current);current=rows.get(current).parentWishId;
    }
  }
}
function snapshotPublicVisibility(rows){
  assertPublicFixtureAbsence(rows);
  const fingerprints=new Map([...rows].map(([rowId,row])=>[rowId,hash(canonical(row))]));
  return{fingerprints,publicWishCount:rows.size};
}
function verifyPublicVisibility(before,after){
  assertPublicFixtureAbsence(after);
  for(const [rowId,fingerprint] of before.fingerprints){
    if(!after.has(rowId)||hash(canonical(after.get(rowId)))!==fingerprint)fail('Public WORLD neighbor verification is inconclusive; concurrent changes are possible; inspect checkpoints, do not retry or roll back automatically');
  }
  // Additional unrelated rows are allowed. No observed pre-release row may be
  // changed or lost, even through concurrent edits/deletions or cap displacement.
  // Neither a successful comparison nor an absent root proves unseen D1 rows.
  return{beforePublicWishCount:before.publicWishCount,afterPublicWishCount:after.size,absentFixtureRootCount:QA_FIXTURE_ROOT_IDS.length,unchangedPublicWishCount:before.fingerprints.size,newlyVisiblePublicWishCount:after.size-before.fingerprints.size};
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
  async function publicWorld(){
    let response,data;
    // Separate fixed-origin request: never inherit the Cloudflare API token or
    // session cookies, and never follow a redirect to another destination.
    try{response=await fetchImpl(PUBLIC_WORLD_URL,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',headers:{'x-raluvaaa-room':'WORLD'},signal:AbortSignal.timeout(15000)})}catch{fail('Public WORLD visibility request failed; inspect checkpoints before any retry')}
    if(!response||response.ok!==true||response.status!==200||response.redirected===true)fail('Public WORLD visibility request failed; inspect checkpoints before any retry');
    try{data=await response.json()}catch{fail('Public WORLD visibility response is unreadable')}
    return checkedPublicWorld(data);
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
  const checkpoint=(stage,visibility)=>onCheckpoint({stage,...(visibility?{publicVisibility:visibility}:{}),worker:WORKER,sourceSha:APPROVED_SOURCE_SHA,codeSha256:APPROVED_CODE_SHA256,baselineDeploymentId:BASELINE_DEPLOYMENT,baselineVersionId:BASELINE_VERSION,...(candidateId?{candidateVersionId:candidateId}:{}),...(deploymentId?{deploymentId}:{})});
  await verifyCI();
  const baseline=await current();assertBaseline(baseline);
  checkpoint('baseline-verified');
  const publicBefore=snapshotPublicVisibility(await publicWorld());
  const immediatelyBeforeUpload=await current();assertBaseline(immediatelyBeforeUpload);
  same(immediatelyBeforeUpload,baseline,'pre-upload runtime settings and triggers');
  const metadata={main_module:'worker.mjs',bindings:baseline.version.bindings.map(b=>({name:b.name,type:'inherit'})),...baseline.version.runtime,compatibility_date:baseline.version.runtime.compatibility_date.slice(0,10),annotations:writableAnnotations(baseline.settings.annotations)};
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
  same(after.version,baseline.version,'promoted runtime');same(promotionSettings(after.settings),promotionSettings(baseline.settings),'promoted settings');same(after.triggers,baseline.triggers,'promoted triggers');
  const publicVisibility=verifyPublicVisibility(publicBefore,await publicWorld());
  checkpoint('release-verified',publicVisibility);
  return{status:'release-verified',publicVisibility,sourceSha:APPROVED_SOURCE_SHA,codeSha256:APPROVED_CODE_SHA256,baselineVersionId:BASELINE_VERSION,candidateVersionId:candidateId,deploymentId:deployed.id};
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
