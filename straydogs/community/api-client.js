'use strict';
class StrayDogsApi {
 constructor(base,fetcher=globalThis.fetch){
  this.base=String(base||'').replace(/\/$/,'');this.fetcher=fetcher;this.token='';
  this.configured=false;
  try{const u=new URL(this.base);this.configured=u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';}catch{}
 }
 async request(path,{method='GET',body,auth=false}={}){
  if(!this.configured)throw Object.assign(new Error('not_configured'),{code:'not_configured',status:503});
  if(auth&&!this.token)throw Object.assign(new Error('not_authenticated'),{code:'not_authenticated',status:401});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const headers={'Accept':'application/json'};if(body!==undefined)headers['Content-Type']='application/json';if(auth)headers.Authorization='Bearer '+this.token;
   const r=await this.fetcher.call(globalThis,this.base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
   let data={};try{data=await r.json()}catch{}
   if(!r.ok){if(r.status===401)this.token='';throw Object.assign(new Error('request_failed'),{status:r.status,code:typeof data.error==='string'?data.error:'request_failed',retryAfter:Number(r.headers?.get('retry-after'))||0});}
   return data;
  }finally{clearTimeout(timeout)}
 }
 application(candidate){const keys=['email','name','universe','discipline','projectTitle','projectUrl','website','socialType','socialUrl','visualUrl','interests','audienceChannel','audience','publicConsent','privacyConsent','charter'];const body={};for(const k of keys)if(candidate[k]!==undefined)body[k]=candidate[k];return this.request('/v1/applications',{method:'POST',body});}
 requestCode(email){return this.request('/v1/auth/request-code',{method:'POST',body:{email}})}
 async verifyCode(email,code){const data=await this.request('/v1/auth/verify-code',{method:'POST',body:{email,code}});if(typeof data.token!=='string'||data.token.length<32)throw new Error('invalid_session');this.token=data.token;return data;}
 me(){return this.request('/v1/me',{auth:true})}
 members(){return this.request('/v1/members')}
 updateProfile(candidate){const keys=['name','universe','discipline','projectTitle','projectUrl','website','socialType','socialUrl','visualUrl','interests','publicConsent'];const body={};for(const k of keys)if(candidate[k]!==undefined)body[k]=candidate[k];return this.request('/v1/me/profile',{method:'PATCH',body,auth:true})}
 async logout(){try{if(this.token)await this.request('/v1/logout',{method:'POST',body:{},auth:true})}finally{this.token=''}}
}
globalThis.StrayDogsApi=StrayDogsApi;
