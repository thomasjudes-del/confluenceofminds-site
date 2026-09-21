const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const MAX_WISH=280,MAX_LOCATION=80,MAX_HELP=400;

export default {
  async fetch(request,env){
    const origin=request.headers.get('origin')||'';
    const cors=corsHeaders(origin,env);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    try{
      const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
      if(path==='/v1/health'&&request.method==='GET')return json({ok:true,service:'raluvaaa-alpha-api',version:1},200,cors);
      if(path==='/v1/session'&&request.method==='POST')return await createSession(request,env,cors);
      if(path==='/v1/world'&&request.method==='GET')return await getWorld(request,env,cors);
      if(path==='/v1/me'&&request.method==='GET')return await getMe(request,env,cors);
      if(path==='/v1/inbox'&&request.method==='GET')return await getInbox(request,env,cors);
      if(path==='/v1/wishes'&&request.method==='POST')return await createWish(request,env,cors);
      if(path==='/v1/proposals'&&request.method==='POST')return await createProposal(request,env,cors);
      if(path==='/v1/reports'&&request.method==='POST')return await createReport(request,env,cors);

      let m=path.match(/^\/v1\/wishes\/([^/]+)\/events$/);
      if(m&&request.method==='POST')return await addWishEvent(request,env,cors,decodeURIComponent(m[1]));
      m=path.match(/^\/v1\/wishes\/([^/]+)\/encourage$/);
      if(m&&request.method==='POST')return await encourage(request,env,cors,decodeURIComponent(m[1]));
      m=path.match(/^\/v1\/proposals\/([^/]+)\/respond$/);
      if(m&&request.method==='POST')return await respondProposal(request,env,cors,decodeURIComponent(m[1]));
      m=path.match(/^\/v1\/proposals\/([^/]+)\/cancel$/);
      if(m&&request.method==='POST')return await cancelProposal(request,env,cors,decodeURIComponent(m[1]));
      m=path.match(/^\/v1\/notifications\/([^/]+)\/read$/);
      if(m&&request.method==='POST')return await readNotification(request,env,cors,decodeURIComponent(m[1]));

      return json({error:'not_found'},404,cors);
    }catch(err){
      const status=Number(err?.status)||500;
      if(status>=500)console.error(err);
      return json({error:err?.code||'server_error',message:status>=500?'Unexpected server error':String(err?.message||err)},status,cors);
    }
  }
};

function corsHeaders(origin,env){
  const allowed=(env.ALLOWED_ORIGINS||'https://confluenceofminds.com,http://localhost:8787,http://127.0.0.1:8787').split(',').map(x=>x.trim()).filter(Boolean);
  const h={...JSON_HEADERS,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type','vary':'Origin'};
  if(allowed.includes(origin))h['access-control-allow-origin']=origin;
  return h;
}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}})}
function fail(status,code,message){const e=new Error(message||code);e.status=status;e.code=code;throw e}
function now(){return Date.now()}
function id(prefix){return `${prefix}_${crypto.randomUUID()}`}
function cleanText(v,max){return String(v??'').trim().replace(/\s+/g,' ').slice(0,max)}
function publicWish(row,isMine=false){return{id:row.id,lineageId:row.lineage_id,parentWishId:row.parent_wish_id,rootWishId:row.root_wish_id,kind:row.kind,text:row.text,locationText:row.location_text,state:row.state,createdAt:row.created_at,updatedAt:row.updated_at,encouragementCount:Number(row.encouragement_count||0),isMine:!!isMine}}
function parseJson(s,fallback={}){try{return JSON.parse(s||'{}')}catch{return fallback}}
async function body(request){try{return await request.json()}catch{fail(400,'invalid_json','Invalid JSON body')}}
async function sha256(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function randomToken(){const a=new Uint8Array(32);crypto.getRandomValues(a);let s='';for(const b of a)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function actor(request,env,required=true){
  const auth=request.headers.get('authorization')||'';
  if(!auth.startsWith('Bearer ')){if(required)fail(401,'auth_required','Authentication required');return null}
  const token=auth.slice(7).trim();if(!token){if(required)fail(401,'auth_required','Authentication required');return null}
  const hash=await sha256(token);
  const row=await env.DB.prepare('SELECT actor_id FROM sessions WHERE token_hash=?').bind(hash).first();
  if(!row){if(required)fail(401,'invalid_session','Session is invalid');return null}
  env.DB.prepare('UPDATE sessions SET last_seen_at=? WHERE token_hash=?').bind(now(),hash).run().catch(()=>{});
  return row.actor_id;
}
async function verifyTurnstile(request,env,payload){
  if(!env.TURNSTILE_SECRET)return;
  const token=payload?.cfTurnstileToken;if(!token)fail(403,'turnstile_required','Human verification required');
  const form=new FormData();form.append('secret',env.TURNSTILE_SECRET);form.append('response',token);
  const ip=request.headers.get('CF-Connecting-IP');if(ip)form.append('remoteip',ip);
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const result=await r.json();if(!result.success)fail(403,'turnstile_failed','Human verification failed');
}
function validatePublicText(text){
  if(text.length<3||text.length>MAX_WISH)fail(400,'invalid_wish','Wish must contain 3 to 280 characters');
  if(/https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text))fail(400,'contact_or_url','Public wishes cannot contain links or contact details');
  if(/(?:\+?\d[\s().-]*){8,}/.test(text))fail(400,'contact_or_url','Public wishes cannot contain phone numbers');
  const blocked=/(suicid|self[- ]?harm|kill myself|automutil|medical|diagnos|cancer|maladie|m[eé]dic|porn|explicit sex|sexe explicite|weapon|gun|firearm|bomb|arme|bombe|doxx|harass|harcel|hate crime|haine|crowdfund|donation|send money|argent|crypto)/i;
  if(blocked.test(text))fail(422,'outside_alpha_scope','This wish is outside the current alpha publication scope');
}
async function wishById(env,wishId){return env.DB.prepare('SELECT * FROM wishes WHERE id=?').bind(wishId).first()}
function assertOwner(row,actorId){if(!row||row.owner_actor_id!==actorId)fail(403,'owner_required','Only the wisher can do this')}
function assertAlive(row){if(!row||row.state!=='alive')fail(409,'wish_not_alive','This wish is no longer active')}
async function eventInsert(env,{wishId,lineageId,actorId,eventType,parentWishId=null,payload={},publicPayload={}}){
  const eid=id('evt'),t=now();await env.DB.prepare('INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(eid,wishId,lineageId,actorId,eventType,parentWishId,JSON.stringify(payload),JSON.stringify(publicPayload),t).run();return eid;
}

async function createSession(request,env,cors){
  const p=await body(request);await verifyTurnstile(request,env,p);
  const t=now(),actorId=id('actor'),token=randomToken(),hash=await sha256(token);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO actors (id,created_at) VALUES (?,?)').bind(actorId,t),
    env.DB.prepare('INSERT INTO sessions (token_hash,actor_id,created_at,last_seen_at) VALUES (?,?,?,?)').bind(hash,actorId,t,t)
  ]);
  return json({actorId,token,claimed:false},201,cors);
}
async function getMe(request,env,cors){
  const actorId=await actor(request,env,true);
  const wishes=await env.DB.prepare("SELECT *,0 AS encouragement_count FROM wishes WHERE owner_actor_id=? AND state!='removed' ORDER BY updated_at DESC LIMIT 200").bind(actorId).all();
  const unread=await env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE actor_id=? AND is_read=0').bind(actorId).first();
  const encouraged=await env.DB.prepare('SELECT wish_id FROM encouragements WHERE actor_id=? ORDER BY created_at DESC LIMIT 500').bind(actorId).all();
  return json({actorId,wishes:(wishes.results||[]).map(r=>publicWish(r,true)),unread:Number(unread?.n||0),encouragedWishIds:(encouraged.results||[]).map(r=>r.wish_id)},200,cors);
}
async function getWorld(request,env,cors){
  const actorId=await actor(request,env,false);
  const rows=await env.DB.prepare("SELECT w.*,COUNT(e.actor_id) AS encouragement_count FROM wishes w LEFT JOIN encouragements e ON e.wish_id=w.id WHERE w.is_public=1 AND w.state!='removed' GROUP BY w.id ORDER BY w.created_at DESC LIMIT 600").all();
  const events=await env.DB.prepare("SELECT id,wish_id,lineage_id,event_type,parent_wish_id,public_payload_json,created_at FROM wish_events WHERE event_type IN ('create','evolve','split','bloom','abandon','help','connect','reparent') ORDER BY created_at ASC LIMIT 3000").all();
  return json({wishes:(rows.results||[]).map(r=>publicWish(r,actorId&&r.owner_actor_id===actorId)),events:(events.results||[]).map(e=>({id:e.id,wishId:e.wish_id,lineageId:e.lineage_id,type:e.event_type,parentWishId:e.parent_wish_id,payload:parseJson(e.public_payload_json),createdAt:e.created_at}))},200,cors);
}
async function createWish(request,env,cors){
  const actorId=await actor(request,env,true),p=await body(request);await verifyTurnstile(request,env,p);
  const text=cleanText(p.text,MAX_WISH);validatePublicText(text);const loc=cleanText(p.locationText,MAX_LOCATION)||null;
  const wid=id('wish'),t=now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO wishes (id,lineage_id,owner_actor_id,parent_wish_id,root_wish_id,kind,text,location_text,state,is_public,created_at,updated_at) VALUES (?,?,?,?,?,'create',?,?, 'alive',1,?,?)").bind(wid,wid,actorId,null,wid,text,loc,t,t),
    env.DB.prepare("INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?, 'create',NULL,'{}','{}',?)").bind(id('evt'),wid,wid,actorId,t)
  ]);
  return json({wishId:wid,lineageId:wid},201,cors);
}
async function addWishEvent(request,env,cors,wishId){
  const actorId=await actor(request,env,true),p=await body(request),row=await wishById(env,wishId);assertOwner(row,actorId);
  const type=String(p.type||'');
  if(type==='evolve')return evolve(env,cors,row,actorId,p);
  if(type==='split'||type==='add_branch')return split(env,cors,row,actorId,p,type);
  if(type==='bloom'||type==='abandon')return closeWish(env,cors,row,actorId,type);
  if(type==='reparent')return reparent(env,cors,row,actorId,p);
  if(type==='remove_mistake')return removeMistake(env,cors,row,actorId);
  fail(400,'invalid_event','Unsupported wish event');
}
async function evolve(env,cors,row,actorId,p){
  assertAlive(row);const text=cleanText(p.text,MAX_WISH);validatePublicText(text);if(text.toLowerCase()===row.text.toLowerCase())fail(409,'same_text','Evolution must change the wish');
  const existing=await env.DB.prepare("SELECT id FROM wishes WHERE parent_wish_id=? AND kind='evolve' AND state!='removed' LIMIT 1").bind(row.id).first();if(existing)fail(409,'already_continued','This state already has a continuation');
  const wid=id('wish'),t=now();await env.DB.batch([
    env.DB.prepare("INSERT INTO wishes (id,lineage_id,owner_actor_id,parent_wish_id,root_wish_id,kind,text,location_text,state,is_public,created_at,updated_at) VALUES (?,?,?,?,?,'evolve',?,?, 'alive',1,?,?)").bind(wid,row.lineage_id,actorId,row.id,row.root_wish_id,text,row.location_text,t,t),
    env.DB.prepare("INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?, 'evolve',?,?,?,?)").bind(id('evt'),wid,row.lineage_id,actorId,row.id,JSON.stringify({fromWishId:row.id}),JSON.stringify({fromWishId:row.id}),t),
    env.DB.prepare('UPDATE wishes SET updated_at=? WHERE id=?').bind(t,row.root_wish_id)
  ]);return json({wishId:wid},201,cors);
}
async function split(env,cors,row,actorId,p,type){
  assertAlive(row);const raw=Array.isArray(p.children)?p.children:[];const children=raw.map(x=>cleanText(typeof x==='string'?x:x?.text,MAX_WISH)).filter(Boolean).slice(0,8);if(type==='split'&&children.length<2)fail(400,'need_two_branches','Initial split needs at least two branches');if(type==='add_branch'&&children.length<1)fail(400,'need_branch','Add at least one branch');children.forEach(validatePublicText);
  const t=now(),created=[],stmts=[];for(const text of children){const wid=id('wish');created.push(wid);stmts.push(env.DB.prepare("INSERT INTO wishes (id,lineage_id,owner_actor_id,parent_wish_id,root_wish_id,kind,text,location_text,state,is_public,created_at,updated_at) VALUES (?,?,?,?,?,'split',?,?, 'alive',1,?,?)").bind(wid,row.lineage_id,actorId,row.id,row.root_wish_id,text,row.location_text,t,t));stmts.push(env.DB.prepare("INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?, 'split',?,?,?,?)").bind(id('evt'),wid,row.lineage_id,actorId,row.id,JSON.stringify({mode:type}),JSON.stringify({mode:type}),t))}stmts.push(env.DB.prepare('UPDATE wishes SET updated_at=? WHERE id=?').bind(t,row.root_wish_id));await env.DB.batch(stmts);return json({wishIds:created},201,cors);
}
async function closeWish(env,cors,row,actorId,type){
  assertAlive(row);const state=type==='bloom'?'bloomed':'abandoned',t=now();await env.DB.batch([env.DB.prepare('UPDATE wishes SET state=?,updated_at=? WHERE id=?').bind(state,t,row.id),env.DB.prepare('UPDATE wishes SET updated_at=? WHERE id=?').bind(t,row.root_wish_id),env.DB.prepare('INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?,?,?,\'{}\',\'{}\',?)').bind(id('evt'),row.id,row.lineage_id,actorId,type,row.parent_wish_id,t)]);return json({wishId:row.id,state},200,cors);
}
async function reparent(env,cors,row,actorId,p){
  if(row.kind==='create')fail(409,'root_cannot_move','A root wish cannot be reattached');const targetId=String(p.newParentWishId||''),target=await wishById(env,targetId);assertOwner(target,actorId);assertAlive(target);if(target.lineage_id!==row.lineage_id)fail(409,'different_lineage','Reattach only within the same lineage');if(target.id===row.id)fail(409,'cycle','Cannot attach a wish to itself');
  let cur=target,guard=0;while(cur?.parent_wish_id&&guard++<100){if(cur.parent_wish_id===row.id)fail(409,'cycle','Cannot attach a wish to its descendant');cur=await wishById(env,cur.parent_wish_id)}
  const old=row.parent_wish_id,t=now();await env.DB.batch([env.DB.prepare('UPDATE wishes SET parent_wish_id=?,updated_at=? WHERE id=?').bind(target.id,t,row.id),env.DB.prepare('INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?,\'reparent\',?,?,?,?)').bind(id('evt'),row.id,row.lineage_id,actorId,target.id,JSON.stringify({oldParentWishId:old,newParentWishId:target.id}),JSON.stringify({oldParentWishId:old,newParentWishId:target.id}),t)]);return json({wishId:row.id,parentWishId:target.id},200,cors);
}
async function removeMistake(env,cors,row,actorId){
  const child=await env.DB.prepare("SELECT id FROM wishes WHERE parent_wish_id=? AND state!='removed' LIMIT 1").bind(row.id).first();if(child)fail(409,'has_descendants','Remove descendants first or abandon this path');const enc=await env.DB.prepare('SELECT 1 AS x FROM encouragements WHERE wish_id=? LIMIT 1').bind(row.id).first();if(enc)fail(409,'has_external_activity','A wish with external activity cannot be erased as a mistake');const proposal=await env.DB.prepare("SELECT 1 AS x FROM proposals WHERE (target_wish_id=? OR other_wish_id=?) AND status IN ('pending','accepted') LIMIT 1").bind(row.id,row.id).first();if(proposal)fail(409,'has_external_activity','A wish with proposals or connections cannot be erased as a mistake');const t=now();await env.DB.batch([env.DB.prepare("UPDATE wishes SET state='removed',is_public=0,updated_at=? WHERE id=?").bind(t,row.id),env.DB.prepare("INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?, 'remove_mistake',?,'{}','{}',?)").bind(id('evt'),row.id,row.lineage_id,actorId,row.parent_wish_id,t)]);return json({wishId:row.id,state:'removed'},200,cors);
}
async function encourage(request,env,cors,wishId){
  const actorId=await actor(request,env,true),row=await wishById(env,wishId);if(!row||!row.is_public||row.state==='removed')fail(404,'wish_not_found','Wish not found');if(row.owner_actor_id===actorId)fail(409,'own_wish','Encourage another human\'s wish');
  const existing=await env.DB.prepare('SELECT 1 AS x FROM encouragements WHERE wish_id=? AND actor_id=? LIMIT 1').bind(wishId,actorId).first();if(existing)fail(409,'already_encouraged','You already encouraged this wish');
  try{await env.DB.prepare('INSERT INTO encouragements (wish_id,actor_id,created_at) VALUES (?,?,?)').bind(wishId,actorId,now()).run()}catch{fail(409,'already_encouraged','You already encouraged this wish')}return json({wishId,encouraged:true},201,cors);
}

async function createProposal(request,env,cors){
  const proposer=await actor(request,env,true),p=await body(request);await verifyTurnstile(request,env,p);const type=String(p.type||'');if(!['help','suggest_branch','connect'].includes(type))fail(400,'invalid_proposal','Unsupported proposal type');
  const target=await wishById(env,String(p.targetWishId||''));if(!target||!target.is_public||target.state!=='alive')fail(404,'target_not_available','Target wish is not available');
  let other=null;if(type==='connect'){other=await wishById(env,String(p.otherWishId||''));if(!other||!other.is_public||other.state!=='alive')fail(404,'other_not_available','Other wish is not available');if(other.lineage_id===target.lineage_id)fail(409,'same_lineage','Connection must link independent lineages')}
  const privatePayload={};if(type==='help'){const note=cleanText(p.note,MAX_HELP);if(note.length<2)fail(400,'help_note_required','Describe the concrete help');privatePayload.note=note}if(type==='suggest_branch'){const steps=(Array.isArray(p.steps)?p.steps:[]).map(x=>cleanText(x,MAX_WISH)).filter(Boolean).slice(0,5);if(!steps.length)fail(400,'steps_required','Suggest at least one branch');steps.forEach(validatePublicText);privatePayload.steps=steps}
  const owners=[target.owner_actor_id];if(other)owners.push(other.owner_actor_id);const required=[...new Set(owners)];if(required.length===1&&required[0]===proposer&&type!=='connect')fail(409,'own_wish','Use wisher actions on your own wish');
  const pid=id('prop'),t=now(),stmts=[env.DB.prepare('INSERT INTO proposals (id,proposal_type,proposer_actor_id,target_wish_id,other_wish_id,private_payload_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,\'pending\',?,?)').bind(pid,type,proposer,target.id,other?.id||null,JSON.stringify(privatePayload),t,t)];
  for(const ownerId of required){const auto=ownerId===proposer?'accept':null;stmts.push(env.DB.prepare('INSERT INTO proposal_consents (proposal_id,actor_id,decision,decided_at) VALUES (?,?,?,?)').bind(pid,ownerId,auto,auto?t:null));if(!auto)stmts.push(env.DB.prepare('INSERT INTO notifications (id,actor_id,kind,object_id,title,body,is_read,created_at) VALUES (?,?,?,?,?,?,0,?)').bind(id('note'),ownerId,'proposal',pid,proposalTitle(type),null,t))}
  await env.DB.batch(stmts);await maybeMaterialize(env,pid);return json({proposalId:pid,status:'pending'},201,cors);
}
function proposalTitle(type){return type==='help'?'Someone offered help':type==='suggest_branch'?'Someone suggested a branch':'Someone proposed a connection'}
async function proposalRow(env,pid){return env.DB.prepare('SELECT * FROM proposals WHERE id=?').bind(pid).first()}
async function requiredConsents(env,pid){const r=await env.DB.prepare('SELECT actor_id,decision FROM proposal_consents WHERE proposal_id=?').bind(pid).all();return r.results||[]}
async function respondProposal(request,env,cors,pid){
  const actorId=await actor(request,env,true),p=await body(request),decision=String(p.decision||'');if(!['accept','decline'].includes(decision))fail(400,'invalid_decision','Decision must be accept or decline');const proposal=await proposalRow(env,pid);if(!proposal||proposal.status!=='pending')fail(409,'proposal_not_pending','Proposal is not pending');const consent=await env.DB.prepare('SELECT decision FROM proposal_consents WHERE proposal_id=? AND actor_id=?').bind(pid,actorId).first();if(!consent)fail(403,'consent_not_required','This proposal does not require your consent');if(consent.decision)fail(409,'already_decided','You already responded');const t=now();await env.DB.prepare('UPDATE proposal_consents SET decision=?,decided_at=? WHERE proposal_id=? AND actor_id=?').bind(decision,t,pid,actorId).run();if(decision==='decline'){await env.DB.prepare("UPDATE proposals SET status='declined',updated_at=? WHERE id=?").bind(t,pid).run();await notify(env,proposal.proposer_actor_id,'proposal_result',pid,'A proposal was declined');return json({proposalId:pid,status:'declined'},200,cors)}await maybeMaterialize(env,pid);const current=await proposalRow(env,pid);return json({proposalId:pid,status:current.status},200,cors);
}
async function cancelProposal(request,env,cors,pid){const actorId=await actor(request,env,true),p=await proposalRow(env,pid);if(!p)fail(404,'proposal_not_found','Proposal not found');if(p.proposer_actor_id!==actorId)fail(403,'proposer_required','Only the proposer can cancel');if(p.status!=='pending')fail(409,'proposal_not_pending','Only pending proposals can be cancelled');await env.DB.prepare("UPDATE proposals SET status='cancelled',updated_at=? WHERE id=?").bind(now(),pid).run();return json({proposalId:pid,status:'cancelled'},200,cors)}
async function maybeMaterialize(env,pid){
  const p=await proposalRow(env,pid);if(!p||p.status!=='pending')return;const consents=await requiredConsents(env,pid);if(!consents.length||consents.some(x=>x.decision!=='accept'))return;const target=await wishById(env,p.target_wish_id);if(!target||target.state!=='alive'){await env.DB.prepare("UPDATE proposals SET status='expired',updated_at=? WHERE id=?").bind(now(),pid).run();return}if(p.proposal_type==='connect'){const other=await wishById(env,p.other_wish_id);if(!other||other.state!=='alive'){await env.DB.prepare("UPDATE proposals SET status='expired',updated_at=? WHERE id=?").bind(now(),pid).run();return}}
  const payload=parseJson(p.private_payload_json),t=now();
  if(p.proposal_type==='help')await eventInsert(env,{wishId:target.id,lineageId:target.lineage_id,actorId:p.proposer_actor_id,eventType:'help',payload:{proposalId:pid,note:payload.note},publicPayload:{proposalId:pid}});
  if(p.proposal_type==='connect')await eventInsert(env,{wishId:target.id,lineageId:target.lineage_id,actorId:p.proposer_actor_id,eventType:'connect',payload:{proposalId:pid,otherWishId:p.other_wish_id},publicPayload:{proposalId:pid,otherWishId:p.other_wish_id}});
  if(p.proposal_type==='suggest_branch'){
    const stmts=[];for(const text of payload.steps||[]){const wid=id('wish');stmts.push(env.DB.prepare("INSERT INTO wishes (id,lineage_id,owner_actor_id,parent_wish_id,root_wish_id,kind,text,location_text,state,is_public,created_at,updated_at) VALUES (?,?,?,?,?,'split',?,?, 'alive',1,?,?)").bind(wid,target.lineage_id,target.owner_actor_id,target.id,target.root_wish_id,text,target.location_text,t,t));stmts.push(env.DB.prepare("INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?, 'split',?,?,?,?)").bind(id('evt'),wid,target.lineage_id,target.owner_actor_id,target.id,JSON.stringify({proposalId:pid,suggestedBy:p.proposer_actor_id}),JSON.stringify({proposalId:pid}),t))}if(stmts.length)await env.DB.batch(stmts)
  }
  await env.DB.prepare("UPDATE proposals SET status='accepted',updated_at=? WHERE id=?").bind(t,pid).run();await notify(env,p.proposer_actor_id,'proposal_result',pid,'A proposal was accepted');
}
async function notify(env,actorId,kind,objectId,title){return env.DB.prepare('INSERT INTO notifications (id,actor_id,kind,object_id,title,body,is_read,created_at) VALUES (?,?,?,?,?,NULL,0,?)').bind(id('note'),actorId,kind,objectId,title,now()).run()}
async function getInbox(request,env,cors){
  const actorId=await actor(request,env,true);const notes=await env.DB.prepare('SELECT * FROM notifications WHERE actor_id=? ORDER BY created_at DESC LIMIT 100').bind(actorId).all();const pending=await env.DB.prepare("SELECT p.*,c.decision FROM proposals p JOIN proposal_consents c ON c.proposal_id=p.id WHERE c.actor_id=? AND p.status='pending' AND c.decision IS NULL ORDER BY p.created_at DESC LIMIT 100").bind(actorId).all();
  return json({notifications:(notes.results||[]).map(n=>({id:n.id,kind:n.kind,objectId:n.object_id,title:n.title,body:n.body,isRead:!!n.is_read,createdAt:n.created_at})),pending:(pending.results||[]).map(p=>({id:p.id,type:p.proposal_type,proposerActorId:p.proposer_actor_id,targetWishId:p.target_wish_id,otherWishId:p.other_wish_id,privatePayload:parseJson(p.private_payload_json),createdAt:p.created_at}))},200,cors);
}
async function readNotification(request,env,cors,nid){const actorId=await actor(request,env,true);const r=await env.DB.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND actor_id=?').bind(nid,actorId).run();if(!r.meta?.changes)fail(404,'notification_not_found','Notification not found');return json({id:nid,isRead:true},200,cors)}
async function createReport(request,env,cors){const actorId=await actor(request,env,false),p=await body(request),wishId=String(p.wishId||''),reason=cleanText(p.reason,80),details=cleanText(p.details,500);if(!reason)fail(400,'reason_required','Report reason required');const w=await wishById(env,wishId);if(!w)fail(404,'wish_not_found','Wish not found');const rid=id('report');await env.DB.prepare("INSERT INTO reports (id,reporter_actor_id,wish_id,reason,details,status,created_at) VALUES (?,?,?,?,?,'open',?)").bind(rid,actorId,wishId,reason,details||null,now()).run();return json({reportId:rid},201,cors)}
