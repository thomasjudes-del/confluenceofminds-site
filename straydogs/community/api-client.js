'use strict';
class StrayDogsApi {
 constructor(base,fetcher=globalThis.fetch){
  this.base=String(base||'').replace(/\/$/,'');this.fetcher=fetcher;this.authenticated=false;this.expiresAt=0;
  this.configured=false;
  try{const u=new URL(this.base);this.configured=u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';}catch{}
 }
 async request(path,{method='GET',body,auth=false}={}){
  if(!this.configured)throw Object.assign(new Error('not_configured'),{code:'not_configured',status:503});
  if(auth&&!this.authenticated)throw Object.assign(new Error('not_authenticated'),{code:'not_authenticated',status:401});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const headers={'Accept':'application/json','X-StrayDogs-Client':'web'};if(body!==undefined)headers['Content-Type']='application/json';
   const r=await this.fetcher.call(globalThis,this.base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:path==='/v1/members'||path==='/v1/applications'||path==='/v1/auth/request-code'?'omit':'include',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
   let data={};try{data=await r.json()}catch{}
   if(!r.ok){if(r.status===401){this.authenticated=false;this.expiresAt=0;}throw Object.assign(new Error('request_failed'),{status:r.status,code:typeof data.error==='string'?data.error:'request_failed',retryAfter:Number(r.headers?.get('retry-after'))||0});}
   return data;
  }finally{clearTimeout(timeout)}
 }
 application(candidate){const keys=['email','name','universe','discipline','projectTitle','projectUrl','website','socialType','socialUrl','visualUrl','interests','audienceChannel','audience','publicConsent','privacyConsent','charter'];const body={};for(const k of keys)if(candidate[k]!==undefined)body[k]=candidate[k];return this.request('/v1/applications',{method:'POST',body});}
 requestCode(email){return this.request('/v1/auth/request-code',{method:'POST',body:{email}})}
 establish(data){if(!data?.member?.id||!Number.isFinite(data.expiresAt)||Object.hasOwn(data,'token'))throw new Error('invalid_session');this.authenticated=true;this.expiresAt=data.expiresAt;return data;}
 async verifyCode(email,code){return this.establish(await this.request('/v1/auth/verify-code',{method:'POST',body:{email,code}}));}
 async restore(){return this.establish(await this.request('/v1/auth/session',{method:'POST',body:{}}));}
 me(){return this.request('/v1/me',{auth:true})}
 members(){return this.request('/v1/members')}
 updateProfile(candidate){const keys=['name','universe','discipline','projectTitle','projectUrl','website','socialType','socialUrl','visualUrl','interests','publicConsent'];const body={};for(const k of keys)if(candidate[k]!==undefined)body[k]=candidate[k];return this.request('/v1/me/profile',{method:'PATCH',body,auth:true})}
 async logout(){await this.request('/v1/logout',{method:'POST',body:{}});this.authenticated=false;this.expiresAt=0;}
}
globalThis.StrayDogsApi=StrayDogsApi;

