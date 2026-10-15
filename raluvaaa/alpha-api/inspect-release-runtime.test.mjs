import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectRuntime,sanitizeBindings,safeInspectionError } from './inspect-release-runtime.mjs';

const VERSION='11111111-1111-4111-8111-111111111111';
const LATEST='22222222-2222-4222-8222-222222222222';
const DEPLOY='33333333-3333-4333-8333-333333333333';
const ACCOUNT='a'.repeat(32),TOKEN='PRIVATE-TOKEN-DO-NOT-LOG',VALUE='PRIVATE-VALUE-DO-NOT-LOG';
function fake({differentLatest=false,mode,unexpectedBindings=false}={}){
  const calls=[];
  const bindings=[{name:'DB',type:'d1',id:VALUE},{name:'AI',type:'ai'},
    ...['RESEND_API_KEY','AUTH_CODE_SECRET','RALUVAAA_EMAIL_FROM'].map(name=>({name,type:'secret_text',text:VALUE,value:VALUE})),
    {name:'ALLOWED_ORIGINS',type:'plain_text',text:VALUE,value:VALUE}];
  if(mode!==undefined)bindings.push({name:'AUTH_TEST_MODE',type:'plain_text',text:mode});
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    const path=new URL(url).pathname;let result;
    if(path.endsWith('/deployments'))result={deployments:[{id:DEPLOY,versions:[{version_id:VERSION,percentage:100}],author_email:VALUE,annotations:{message:VALUE}}]};
    else if(path.endsWith('/versions'))result={items:[{id:differentLatest?LATEST:VERSION}]};
    else if(path.includes('/versions/'))result={id:path.split('/').at(-1),metadata:{author_email:VALUE},resources:{bindings:unexpectedBindings?{}:bindings,script:{etag:VALUE},script_runtime:{compatibility_date:'2026-09-01',compatibility_flags:[],limits:{secret:VALUE}}}};
    else if(path.endsWith('/settings'))result={logpush:false,observability:{secret:VALUE},tags:[VALUE]};
    else if(path.endsWith('/schedules'))result={schedules:[{cron:VALUE}]};
    else if(path.endsWith('/subdomain'))result={enabled:true,previews_enabled:false,token:VALUE};
    else if(path.endsWith('/routes'))result=[{pattern:VALUE,secret:VALUE}];
    else if(path.endsWith('/domains'))result=[{hostname:VALUE,secret:VALUE}];
    else throw new Error('Unexpected request '+VALUE);
    return{ok:true,status:200,json:async()=>({success:true,result})};
  };
  return{calls,fetchImpl};
}
const inspect=fetchImpl=>inspectRuntime({fetchImpl,accountId:ACCOUNT,token:TOKEN});

test('only GET calls reach the fixed Cloudflare host; output omits raw values',async()=>{
  const f=fake(),summary=await inspect(f.fetchImpl);
  assert.equal(f.calls.length,8);
  for(const {url,options} of f.calls){
    assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert(!('body' in options));
    assert.equal(new URL(url).origin,'https://api.cloudflare.com');
    assert.equal(options.headers.authorization,'Bearer '+TOKEN);
  }
  const output=JSON.stringify(summary);
  for(const value of [VALUE,TOKEN,ACCOUNT,'"author_email":','"hostname":','"pattern":','"text":','"value":'])assert(!output.includes(value),value+' must not be printed');
  assert.equal(summary.latestVersionId,VERSION);assert.equal(summary.releaseReady,false);
  assert.deepEqual(summary.blockers,[]);
  assert.deepEqual(summary.versions[0].bindings.find(b=>b.name==='DB'),{name:'DB',type:'d1'});
  assert.equal(summary.triggers.routeCount,1);
});

test('sanitizer whitelists binding name/type and rejects log-control names',()=>{
  assert.deepEqual(sanitizeBindings([{name:'AUTH_CODE_SECRET',type:'secret_text',text:VALUE,secret:{value:VALUE}},{name:'\n::error::'+VALUE,type:'plain_text'}]),[
    {name:'[redacted-name]',type:'plain_text'},{name:'AUTH_CODE_SECRET',type:'secret_text'}]);
});

test('latest upload drift and live test auth are explicit release blockers',async()=>{
  const summary=await inspect(fake({differentLatest:true,mode:'1'}).fetchImpl);
  assert(summary.blockers.includes('latest-upload-differs-from-active-version'));
  assert(summary.blockers.includes('AUTH_TEST_MODE-enabled'));
  assert.equal(summary.versions.length,2);
});

test('unknown response shape fails closed without raw metadata',async()=>{
  await assert.rejects(()=>inspect(fake({unexpectedBindings:true}).fetchImpl),error=>{
    const message=safeInspectionError(error);assert(!message.includes(VALUE));return /metadata shape/.test(message);
  });
});

test('HTTP failures never parse or print API error bodies',async()=>{
  let parsed=false;
  await assert.rejects(()=>inspect(async()=>({ok:false,status:403,json:async()=>{parsed=true;return{error:VALUE}}})),error=>{
    assert.equal(safeInspectionError(error),'Metadata request failed: deployments (HTTP 403)');return true;
  });
  assert.equal(parsed,false);
});

test('network and JSON errors cannot expose credential-containing errors',async()=>{
  for(const fetchImpl of [async()=>{throw new Error(TOKEN)},async()=>({ok:true,status:200,json:async()=>{throw new Error(TOKEN)}})]){
    await assert.rejects(()=>inspect(fetchImpl),error=>!safeInspectionError(error).includes(TOKEN));
  }
  assert.equal(safeInspectionError(new Error(TOKEN)),'Runtime inspection failed; details suppressed');
});
