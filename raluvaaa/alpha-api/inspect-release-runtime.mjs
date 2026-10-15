import { pathToFileURL } from 'node:url';

// Metadata inventory only. This script contains no Cloudflare mutation route.
// Endpoint/shape references: Cloudflare Workers API (versions, deployments,
// settings, schedules, subdomain, domains), and Wrangler 4.151.0
// fetchWorkerConfig() for the production-environment routes endpoint.
// https://developers.cloudflare.com/api/resources/workers/subresources/scripts/
// https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/list/
const API='https://api.cloudflare.com/client/v4';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/;
class InspectionError extends Error{}
const fail=message=>{throw new InspectionError(message)};
const object=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('Unexpected metadata shape: '+label);return v};
const array=(v,label)=>{if(!Array.isArray(v))fail('Unexpected metadata shape: '+label);return v};
const identifier=(v,label)=>{if(typeof v!=='string'||!UUID.test(v))fail('Unexpected identifier: '+label);return v};
const name=v=>typeof v==='string'&&NAME.test(v)?v:'[redacted-name]';
const type=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
const fieldTypes=v=>Object.entries(object(v,'field inventory')).map(([key,value])=>({name:name(key),type:type(value)})).sort((a,b)=>a.name.localeCompare(b.name));

export function sanitizeBindings(bindings){
  return array(bindings,'bindings').map(binding=>{
    object(binding,'binding');
    return{name:name(binding.name),type:name(binding.type),fields:fieldTypes(binding)};
  }).sort((a,b)=>a.name.localeCompare(b.name));
}
function runtimeSummary(version){
  const resources=object(version.resources,'version resources');
  const runtime=object(resources.script_runtime,'script runtime');
  const date=runtime.compatibility_date;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T00:00:00Z)?$/.test(date))fail('Unexpected compatibility date');
  const flags=array(runtime.compatibility_flags??[],'compatibility flags');
  if(flags.some(flag=>typeof flag!=='string'||!NAME.test(flag)))fail('Unexpected compatibility flag');
  return{
    versionId:identifier(version.id,'version'),
    compatibilityDate:date,
    compatibilityFlags:[...flags].sort(),
    bindings:sanitizeBindings(resources.bindings),
    runtimeFields:fieldTypes(runtime),
    resourceFields:fieldTypes(resources),
    scriptFields:fieldTypes(resources.script)
  };
}
function authMode(bindings){
  const binding=bindings.find(b=>b.name==='AUTH_TEST_MODE');
  if(!binding)return'absent';
  if(binding.type==='plain_text'&&typeof binding.text==='string')return binding.text==='1'?'unsafe-enabled':'configured-non-test';
  return'opaque-unverified';
}
export function safeInspectionError(error){
  return error instanceof InspectionError?error.message:'Runtime inspection failed; details suppressed';
}

export async function inspectRuntime({fetchImpl=fetch,accountId,token,workerName='raluvaaa-alpha-api'}={}){
  if(typeof accountId!=='string'||!/^([0-9a-f]{32})$/i.test(accountId)||typeof token!=='string'||!token)fail('Existing Cloudflare credentials are missing or invalid');
  if(workerName!=='raluvaaa-alpha-api')fail('Worker target is not approved');
  const account='/accounts/'+accountId;
  const script=account+'/workers/scripts/'+workerName;
  async function get(path,label){
    let response;
    try{
      response=await fetchImpl(API+path,{
        method:'GET',redirect:'error',
        headers:{authorization:'Bearer '+token,accept:'application/json'},
        signal:AbortSignal.timeout(15000)
      });
    }catch{fail('Metadata request failed: '+label)}
    if(!response.ok)fail('Metadata request failed: '+label+' (HTTP '+Number(response.status)+')');
    let data;try{data=await response.json()}catch{fail('Invalid metadata response: '+label)}
    if(data?.success!==true||data.result===undefined)fail('Metadata API rejected request: '+label);
    return data.result;
  }
  const deployments=object(await get(script+'/deployments','deployments'),'deployments');
  const current=array(deployments.deployments,'deployment list')[0];
  if(!current)fail('No active Worker deployment exists');
  const active=array(current.versions,'active versions').map(v=>({
    versionId:identifier(v.version_id,'active version'),percentage:v.percentage
  }));
  if(!active.length||active.some(v=>typeof v.percentage!=='number'||v.percentage<=0||v.percentage>100))fail('Unexpected deployment percentages');
  const versions=object(await get(script+'/versions','versions'),'versions');
  const latest=array(versions.items,'version list')[0];
  if(!latest)fail('No uploaded Worker version exists');
  const latestId=identifier(latest.id,'latest version');
  const rawVersions=[];
  for(const id of new Set([...active.map(v=>v.versionId),latestId])){
    const value=object(await get(script+'/versions/'+id,'version details'),'version');
    if(identifier(value.id,'version')!==id)fail('Version metadata identity mismatch');
    rawVersions.push(value);
  }
  const settings=object(await get(script+'/settings','settings'),'settings');
  const schedules=object(await get(script+'/schedules','schedules'),'schedules');
  const subdomain=object(await get(script+'/subdomain','subdomain'),'subdomain');
  const routes=array(await get(account+'/workers/services/'+workerName+'/environments/production/routes','routes'),'routes');
  const domains=array(await get(account+'/workers/domains?service='+workerName+'&environment=production','domains'),'domains');
  const summaries=rawVersions.map(runtimeSummary);
  const latestRaw=rawVersions.find(v=>v.id===latestId);
  const modes=rawVersions.map(v=>({versionId:v.id,authTestMode:authMode(array(v.resources.bindings,'version bindings'))}));
  const blockers=[];
  if(active.length!==1||active[0].percentage!==100)blockers.push('split-or-incomplete-deployment');
  if(active.length!==1||active[0].versionId!==latestId)blockers.push('latest-upload-differs-from-active-version');
  if(modes.some(v=>v.authTestMode==='unsafe-enabled'))blockers.push('AUTH_TEST_MODE-enabled');
  if(modes.some(v=>v.authTestMode==='opaque-unverified'))blockers.push('AUTH_TEST_MODE-not-readable-as-plain-text');
  for(const required of ['RESEND_API_KEY','AUTH_CODE_SECRET','RALUVAAA_EMAIL_FROM']){
    if(rawVersions.some(v=>!v.resources.bindings.some(b=>b.name===required)))blockers.push('missing-required-binding:'+required);
  }
  if(rawVersions.some(v=>!v.resources.bindings.some(b=>b.name==='DB'&&b.type==='d1')))blockers.push('missing-DB-d1-binding');
  if(rawVersions.some(v=>!v.resources.bindings.some(b=>b.name==='AI'&&b.type==='ai')))blockers.push('missing-AI-binding');
  // D1 UUIDs, variable values, secret values, annotations, actor emails, route
  // patterns and domain names never enter the returned/logged summary.
  return{
    inspection:'read-only-runtime-inventory',worker:workerName,
    deploymentId:identifier(current.id,'deployment'),activeVersions:active,
    latestVersionId:latestId,latestMatchesActive:active.length===1&&active[0].versionId===latestId,
    versions:summaries,authModes:modes,
    settingsFields:fieldTypes(settings),
    triggers:{scheduleCount:array(schedules.schedules,'schedule list').length,routeCount:routes.length,customDomainCount:domains.length,
      workersDevEnabled:typeof subdomain.enabled==='boolean'?subdomain.enabled:null,
      previewsEnabled:typeof subdomain.previews_enabled==='boolean'?subdomain.previews_enabled:null},
    latestBindingCount:latestRaw.resources.bindings.length,
    blockers,
    releaseReady:false,
    limitations:['Inventory only; runtime equivalence and exact D1 identity still require review.','Binding values and secret values are intentionally absent.','External Access policies, queue subscriptions and concurrent configuration changes are not certified by this inventory.']
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const summary=await inspectRuntime({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN});
    console.log(JSON.stringify(summary,null,2));
    if(summary.blockers.length)process.exitCode=2;
  }catch(error){console.error(safeInspectionError(error));process.exitCode=1}
}
