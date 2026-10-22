// Read-only account metadata check. Never prints credentials, queries rows,
// creates resources, changes subscriptions or sends mail.
import { writeFile } from 'node:fs/promises';
const env=process.env;
const configured={cloudflareToken:Boolean(env.CLOUDFLARE_API_TOKEN),cloudflareAccount:Boolean(env.CLOUDFLARE_ACCOUNT_ID),resendKey:Boolean(env.RESEND_API_KEY),existingEmailFrom:Boolean(env.RALUVAAA_EMAIL_FROM)};
const report={commit:env.GITHUB_SHA||null,readOnly:true,configured,resourcesCreated:0,emailsSent:0,checks:{}};
async function get(path){
 if(!configured.cloudflareToken||!configured.cloudflareAccount)return {status:'not_configured'};
 try{
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)+path,{method:'GET',headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {status:'unavailable',httpStatus:response.status};
  const data=await response.json();
  if(!data.success)return {status:'unavailable',codes:(data.errors||[]).map(x=>x.code)};
  return {status:'verified',data:data.result,info:data.result_info};
 }catch{return {status:'unavailable',reason:'network_or_response_error'}}
}
const subscriptions=await get('/subscriptions');
report.checks.subscriptions={status:subscriptions.status,httpStatus:subscriptions.httpStatus};
if(subscriptions.status==='verified'){
 const list=Array.isArray(subscriptions.data)?subscriptions.data:[];
 report.checks.subscriptions.workerPlans=list.filter(x=>/worker|serverless/i.test(JSON.stringify(x.rate_plan||{}))).map(x=>({id:x.rate_plan?.id,name:x.rate_plan?.public_name||x.rate_plan?.name,price:x.price,currency:x.currency,state:x.state}));
 report.checks.subscriptions.freePlanProven=report.checks.subscriptions.workerPlans.some(x=>/free/i.test((x.id||'')+' '+(x.name||'')))&&!report.checks.subscriptions.workerPlans.some(x=>Number(x.price)>0);
 report.checks.subscriptions.warning='Absence of a paid subscription is not proof of a free plan or remaining quota. Usage/overage settings are not verified.';
}
const databases=await get('/d1/database?per_page=100');
report.checks.databases={status:databases.status,httpStatus:databases.httpStatus};
if(databases.status==='verified'){
 const list=Array.isArray(databases.data)?databases.data:[];
 report.checks.databases.count=list.length;
 report.checks.databases.countExact=list.length<100;
 report.checks.databases.straydogsExisting=list.filter(x=>/stray.?dogs/i.test(x.name||'')).map(x=>({name:x.name,id:x.uuid||x.id}));
 report.checks.databases.rowContentsRead=false;
}
const workers=await get('/workers/scripts');
report.checks.workers={status:workers.status,httpStatus:workers.httpStatus};
if(workers.status==='verified'){
 const list=Array.isArray(workers.data)?workers.data:[];
 report.checks.workers.count=list.length;
 report.checks.workers.straydogsExisting=list.filter(x=>/stray.?dogs/i.test(x.id||'')).map(x=>x.id);
}
report.activation='NOT AUTHORIZED BY THIS CHECK. No deploy, secret write, database mutation or billing change has occurred.';
await writeFile('straydogs-readonly-preflight.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
