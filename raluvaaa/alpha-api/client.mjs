export class RaluvaaaAlphaClient {
  constructor({baseUrl,room='ALPHA',storage=window.localStorage,fetchImpl=window.fetch.bind(window)}={}){
    if(!baseUrl)throw new Error('baseUrl required');
    this.baseUrl=baseUrl.replace(/\/+$/,'');
    this.room=String(room||'ALPHA').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16)||'ALPHA';
    this.storage=storage;
    this.fetchImpl=fetchImpl;
    this.tokenKey='raluvaaaAlphaSessionTokenV1:'+this.room;
    this.actorKey='raluvaaaAlphaActorIdV1:'+this.room;
  }
  get token(){return this.storage.getItem(this.tokenKey)||''}
  get actorId(){return this.storage.getItem(this.actorKey)||''}
  async request(path,{method='GET',body,auth=true}={}){
    const headers={'content-type':'application/json','x-raluvaaa-room':this.room};
    if(auth&&this.token)headers.authorization=`Bearer ${this.token}`;
    const r=await this.fetchImpl(`${this.baseUrl}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data.message||data.error||`HTTP ${r.status}`);e.status=r.status;e.code=data.error;e.data=data;throw e}
    return data;
  }
  async ensureSession(cfTurnstileToken){
    if(this.token&&this.actorId){try{await this.me();return{actorId:this.actorId,token:this.token,reused:true}}catch(e){if(e.status!==401)throw e}}
    const s=await this.request('/v1/session',{method:'POST',auth:false,body:{cfTurnstileToken}});
    this.storage.setItem(this.tokenKey,s.token);this.storage.setItem(this.actorKey,s.actorId);return{...s,reused:false};
  }
  world(){return this.request('/v1/world',{auth:!!this.token})}
  me(){return this.request('/v1/me')}
  inbox(){return this.request('/v1/inbox')}
  createWish({text,locationText,cfTurnstileToken}){return this.request('/v1/wishes',{method:'POST',body:{text,locationText,cfTurnstileToken}})}
  wishEvent(wishId,payload){return this.request(`/v1/wishes/${encodeURIComponent(wishId)}/events`,{method:'POST',body:payload})}
  encourage(wishId){return this.request(`/v1/wishes/${encodeURIComponent(wishId)}/encourage`,{method:'POST',body:{}})}
  proposeHelp(targetWishId,note,cfTurnstileToken){return this.request('/v1/proposals',{method:'POST',body:{type:'help',targetWishId,note,cfTurnstileToken}})}
  suggestBranches(targetWishId,steps,cfTurnstileToken){return this.request('/v1/proposals',{method:'POST',body:{type:'suggest_branch',targetWishId,steps,cfTurnstileToken}})}
  proposeConnect(targetWishId,otherWishId,cfTurnstileToken){return this.request('/v1/proposals',{method:'POST',body:{type:'connect',targetWishId,otherWishId,cfTurnstileToken}})}
  respondProposal(proposalId,decision){return this.request(`/v1/proposals/${encodeURIComponent(proposalId)}/respond`,{method:'POST',body:{decision}})}
  cancelProposal(proposalId){return this.request(`/v1/proposals/${encodeURIComponent(proposalId)}/cancel`,{method:'POST',body:{}})}
  markRead(notificationId){return this.request(`/v1/notifications/${encodeURIComponent(notificationId)}/read`,{method:'POST',body:{}})}
  report({wishId,reason,details}){return this.request('/v1/reports',{method:'POST',body:{wishId,reason,details}})}
}
