/** StrayDogs API alpha. No provisioning, fixtures, or fallback authentication. */
const ENCODER = new TextEncoder();
const OTP_TTL = 10 * 60;
const OTP_COOLDOWN = 60;
const SESSION_TTL = 2 * 60 * 60;
const CONSENT_VERSION = 'straydogs-2026-10-22';
const PUBLIC_FIELDS = ['name','universe','discipline','projectTitle','projectUrl','website','socialType','socialUrl','interests','visualUrl'];
const DISCIPLINES = new Set(['image','words','sound','film','interactive','other']);
const INTERESTS = new Set(['imaginary','urban','nature','sound']);
class HttpError extends Error { constructor(status, code) { super(code); this.status=status; this.code=code; } }
const fail = (status,code) => { throw new HttpError(status,code); };
const seconds = () => Math.floor(Date.now()/1000);
const hex = bytes => [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
function randomCode() {
  // Rejection sampling avoids modulo bias; no Math.random or predictable test code.
  let n; do { n=crypto.getRandomValues(new Uint32Array(1))[0]; } while(n>=4200000000);
  return String(n%100000000).padStart(8,'0');
}
async function hmac(secret,value) {
  const key=await crypto.subtle.importKey('raw',ENCODER.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,ENCODER.encode(value))));
}
function email(value) {
  if(typeof value!=='string')fail(422,'INVALID_EMAIL');
  const out=value.trim().toLowerCase();
  if(out.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out))fail(422,'INVALID_EMAIL');
  return out;
}
function text(value,max,min=0) {
  if(typeof value!=='string')fail(422,'INVALID_FIELDS');
  const out=value.trim();
  if(out.length<min||out.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(out))fail(422,'INVALID_FIELDS');
  return out;
}
function link(value) {
  if(value==null||value==='')return '';
  const out=text(value,2048);let u;
  try { u=new URL(out); } catch { fail(422,'INVALID_URL'); }
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password)fail(422,'INVALID_URL');
  return out;
}
function noUploads(input) {
  if(input.visual||input.attachment||input.photo||input.files)fail(422,'UPLOADS_UNAVAILABLE');
}
function visualLink(value) {
  const url=link(value);if(url&&new URL(url).protocol!=='https:')fail(422,'INVALID_VISUAL_URL');return url;
}
function publicInput(input) {
  noUploads(input);
  if(!DISCIPLINES.has(input.discipline)||!Array.isArray(input.interests)||!input.interests.length||input.interests.length>4||input.interests.some(v=>!INTERESTS.has(v)))fail(422,'INVALID_FIELDS');
  if(typeof input.publicConsent!=='boolean')fail(422,'PUBLIC_CONSENT_REQUIRED');
  return {name:text(input.name,80,1),universe:text(input.universe,600,20),discipline:input.discipline,projectTitle:text(input.projectTitle,120,1),projectUrl:link(input.projectUrl),website:link(input.website),socialType:text(input.socialType||'',40),socialUrl:link(input.socialUrl),interests:[...new Set(input.interests)],visualUrl:visualLink(input.visualUrl)};
}
function publicOutput(input) {
  // Explicit output whitelist, including when database JSON contains extra fields.
  const out={};for(const k of PUBLIC_FIELDS)if(Object.hasOwn(input,k))out[k]=input[k];return out;
}
async function jsonBody(request) {
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))fail(415,'JSON_REQUIRED');
  if(Number(request.headers.get('content-length'))>12288)fail(413,'BODY_TOO_LARGE');
  if(!request.body)fail(400,'INVALID_JSON');
  const reader=request.body.getReader();let size=0,chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12288){await reader.cancel();fail(413,'BODY_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
  let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'INVALID_JSON');}
  if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'INVALID_JSON');return input;
}
function configuration(env) {
  if(env.LIVE_ENABLED!=='true'||!env.DB||typeof env.OTP_HMAC_SECRET!=='string'||env.OTP_HMAC_SECRET.length<32)fail(503,'SERVICE_NOT_CONFIGURED');
  let origins;
  try { origins=new Set(String(env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean));for(const s of origins){const u=new URL(s);if(u.protocol!=='https:'||u.origin!==s)throw Error();} } catch { fail(503,'SERVICE_NOT_CONFIGURED'); }
  if(!origins.size)fail(503,'SERVICE_NOT_CONFIGURED');return origins;
}
function mailConfigured(env) {
  if(!env.RESEND_API_KEY||!env.MAIL_FROM||/[\r\n]/.test(env.MAIL_FROM))fail(503,'EMAIL_NOT_CONFIGURED');
}
function result(status,body,origin=null) {
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  return new Response(status===204?null:JSON.stringify(body),{status,headers});
}
function stmt(db,sql,...args) { return db.prepare(sql).bind(...args); }
async function limits(db,secret,items,now) {
  const statements=await Promise.all(items.map(async([scope,value,period,max])=>{
    const key=await hmac(secret,'rate:'+scope+':'+value+':'+Math.floor(now/period));
    return stmt(db,'INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits',key,(Math.floor(now/period)+1)*period);
  }));
  const rows=await db.batch(statements);
  if(rows.some((r,i)=>Number(r.results?.[0]?.hits||0)>items[i][3]))fail(429,'RATE_LIMITED');
}
function sourceIp(request) { const ip=request.headers.get('CF-Connecting-IP');if(!ip)fail(503,'TRUSTED_EDGE_REQUIRED');return ip; }
function schedule(ctx,job) { if(!ctx||typeof ctx.waitUntil!=='function')fail(503,'RUNTIME_NOT_SUPPORTED');ctx.waitUntil(job); }
function parse(raw) { try{return JSON.parse(raw);}catch{return {};} }

export function resendAdapter(env,fetchImpl=fetch) {
  async function send(payload,key) {
    const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error('EMAIL_PROVIDER_FAILED'); // Do not log provider response, recipient or code.
  }
  return {
    sendCode:({to,code,challengeId})=>send({from:env.MAIL_FROM,to:[to],subject:'Votre code StrayDogs / Your StrayDogs code',text:`Votre code de connexion StrayDogs : ${code}\nValable 10 minutes, une seule fois. Ne le partagez pas.\nSi vous n’avez rien demandé, ignorez cet email.\n\nYour StrayDogs sign-in code: ${code}\nValid for 10 minutes, once only. Do not share it.\nIf you did not request this, ignore this email.`},'straydogs-otp-'+challengeId),
    notifyApplication:({applicationId,summary={}})=>send({from:env.MAIL_FROM,to:[env.ADMIN_NOTIFICATION_TO],subject:'StrayDogs : candidature à examiner',text:`Une candidature attend une revue privée.\nRéférence : ${applicationId}\n\nCréateur : ${summary.name||'—'}\nProjet : ${summary.projectTitle||'—'}\nUnivers : ${summary.universe||'—'}\nAffichage public demandé : ${summary.publicConsent?'oui, sous réserve de validation':'non'}\n\nEmail, audience et autres données privées restent dans la revue autorisée, pas dans ce message.\nAucune fiche n’a été publiée. La revue doit être effectuée avec l’outil de maintenance privé autorisé. Aucune interface d’administration web n’est encore fournie.`},'straydogs-application-'+applicationId)
  };
}

async function session(request,env,now) {
  const match=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'');if(!match)fail(401,'UNAUTHORIZED');
  const tokenHash=await hmac(env.OTP_HMAC_SECRET,'session:'+match[1]);
  const member=await stmt(env.DB,`SELECT m.id,m.email,m.display_name,m.status FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.session_version=m.session_version AND m.status='approved'`,tokenHash,now).first();
  if(!member)fail(401,'UNAUTHORIZED');return {member,tokenHash};
}

export function createWorker({now=seconds,mailerFactory=resendAdapter}={}) {
  return {async fetch(request,env,ctx) {
    let cors=null;
    try {
      const origins=configuration(env),origin=request.headers.get('Origin');
      if(new URL(request.url).protocol!=='https:')fail(403,'HTTPS_REQUIRED');
      // Keep authentication reads on a primary-consistent D1 session if replication is enabled.
      if(typeof env.DB.withSession==='function')env={...env,DB:env.DB.withSession('first-primary')};
      if(origin&&!origins.has(origin))fail(403,'ORIGIN_NOT_ALLOWED');
      if(origin)cors=origin;
      const path=new URL(request.url).pathname,method=request.method.toUpperCase();
      if(method==='OPTIONS') {
        if(!cors)fail(403,'ORIGIN_REQUIRED');
        return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Vary':'Origin','Cache-Control':'no-store'}});
      }
      if(method!=='GET'&&!cors)fail(403,'ORIGIN_REQUIRED');
      const timestamp=now();
      if(path==='/v1/members'&&method==='GET') {
        const rows=await stmt(env.DB,`SELECT m.id,p.public_data FROM member_profiles p JOIN members m ON m.id=p.member_id WHERE p.consent_public=1 AND p.approved_at IS NOT NULL AND m.status='approved' ORDER BY p.approved_at DESC LIMIT 100`).all();
        return result(200,{members:rows.results.map(r=>({id:r.id,...publicOutput(parse(r.public_data))}))},cors);
      }
      if(path==='/v1/applications'&&method==='POST') {
        const notifyEnabled=env.ADMIN_NOTIFICATIONS_ENABLED==='true';
        if(notifyEnabled){mailConfigured(env);if(!env.ADMIN_NOTIFICATION_TO)fail(503,'ADMIN_NOTIFICATION_NOT_CONFIGURED');email(env.ADMIN_NOTIFICATION_TO);if(!ctx?.waitUntil)fail(503,'RUNTIME_NOT_SUPPORTED');}
        const input=await jsonBody(request),address=email(input.email),profile=publicInput(input);
        if(input.privacyConsent!==true||input.charter!==true)fail(422,'APPLICATION_CONSENT_REQUIRED');
        const privateData={email:address,audienceChannel:text(input.audienceChannel,100,1),audience:text(input.audience,60,1)};
        await limits(env.DB,env.OTP_HMAC_SECRET,[['application-ip',sourceIp(request),3600,5],['application-email',address,3600,2]],timestamp);
        const id=crypto.randomUUID();
        const consent={version:CONSENT_VERSION,at:timestamp,privacy:true,charter:true,publicProfile:input.publicConsent,round:false,socialReuse:false};
        const inserted=await stmt(env.DB,`INSERT OR IGNORE INTO applications(id,email,private_data,public_data,consent_data,status,notification_status,created_at) SELECT ?,?,?,?,?, 'pending',?,? WHERE NOT EXISTS(SELECT 1 FROM members WHERE email=?)`,id,address,JSON.stringify(privateData),JSON.stringify(profile),JSON.stringify(consent),notifyEnabled?'pending':'not_configured',timestamp,address).run();
        if(inserted.meta.changes>0&&notifyEnabled) {
          const job=mailerFactory(env).notifyApplication({applicationId:id,summary:{name:profile.name,projectTitle:profile.projectTitle,universe:profile.universe,publicConsent:input.publicConsent}}).then(()=>stmt(env.DB,"UPDATE applications SET notification_status='sent' WHERE id=?",id).run()).catch(()=>stmt(env.DB,"UPDATE applications SET notification_status='failed' WHERE id=?",id).run()).catch(()=>{});
          schedule(ctx,job);
        }
        return result(202,{status:'received'},cors);
      }
      if(path==='/v1/auth/request-code'&&method==='POST') {
        mailConfigured(env);if(!ctx?.waitUntil)fail(503,'RUNTIME_NOT_SUPPORTED');
        const input=await jsonBody(request),address=email(input.email);
        await limits(env.DB,env.OTP_HMAC_SECRET,[['otp-ip',sourceIp(request),3600,12],['otp-email',address,3600,3]],timestamp);
        const member=await stmt(env.DB,"SELECT id FROM members WHERE email=? AND status='approved'",address).first();
        const emailKey=await hmac(env.OTP_HMAC_SECRET,'email:'+address),code=randomCode(),challengeId=crypto.randomUUID();
        const codeHash=await hmac(env.OTP_HMAC_SECRET,'otp:'+emailKey+':'+code);
        // Dummy challenges for unknown addresses keep response and storage paths equivalent.
        const challenge=await stmt(env.DB,`INSERT INTO otp_challenges(email_key,challenge_id,member_id,code_hash,expires_at,cooldown_until,attempts,consumed_at,consumed_by,created_at) VALUES(?,?,?,?,?,?,0,NULL,NULL,?) ON CONFLICT(email_key) DO UPDATE SET challenge_id=excluded.challenge_id,member_id=excluded.member_id,code_hash=excluded.code_hash,expires_at=excluded.expires_at,cooldown_until=excluded.cooldown_until,attempts=0,consumed_at=NULL,consumed_by=NULL,created_at=excluded.created_at WHERE otp_challenges.cooldown_until<=? RETURNING challenge_id`,emailKey,challengeId,member?.id||null,codeHash,timestamp+OTP_TTL,timestamp+OTP_COOLDOWN,timestamp,timestamp).first();
        if(challenge&&member) schedule(ctx,mailerFactory(env).sendCode({to:address,code,challengeId}).catch(()=>{}));
        return result(202,{status:'accepted',retryAfterSeconds:OTP_COOLDOWN},cors);
      }
      if(path==='/v1/auth/verify-code'&&method==='POST') {
        const input=await jsonBody(request),address=email(input.email);
        if(typeof input.code!=='string'||!/^\d{8}$/.test(input.code))fail(401,'INVALID_OR_EXPIRED_CODE');
        await limits(env.DB,env.OTP_HMAC_SECRET,[['verify-ip',sourceIp(request),900,30],['verify-email',address,900,15]],timestamp);
        const emailKey=await hmac(env.OTP_HMAC_SECRET,'email:'+address),codeHash=await hmac(env.OTP_HMAC_SECRET,'otp:'+emailKey+':'+input.code);
        const token=randomToken(),tokenHash=await hmac(env.OTP_HMAC_SECRET,'session:'+token),expiresAt=timestamp+SESSION_TTL;
        // D1 batch is transactional. A unique token hash ties consumption and issuance together.
        const consumed=await env.DB.batch([
          stmt(env.DB,`UPDATE otp_challenges SET attempts=attempts+1,consumed_at=CASE WHEN code_hash=? THEN ? ELSE consumed_at END,consumed_by=CASE WHEN code_hash=? THEN ? ELSE consumed_by END WHERE email_key=? AND consumed_at IS NULL AND expires_at>? AND attempts<5 AND member_id IN(SELECT id FROM members WHERE status='approved') RETURNING member_id,consumed_by`,codeHash,timestamp,codeHash,tokenHash,emailKey,timestamp),
          stmt(env.DB,`INSERT INTO sessions(token_hash,member_id,session_version,created_at,expires_at) SELECT ?,o.member_id,m.session_version,?,? FROM otp_challenges o JOIN members m ON m.id=o.member_id WHERE o.email_key=? AND o.consumed_by=? AND o.consumed_at=? AND m.status='approved'`,tokenHash,timestamp,expiresAt,emailKey,tokenHash,timestamp)
        ]);
        if(consumed[0].results?.[0]?.consumed_by!==tokenHash||consumed[1].meta.changes!==1)fail(401,'INVALID_OR_EXPIRED_CODE');
        const me=await session(new Request(request.url,{headers:{Authorization:'Bearer '+token}}),env,timestamp);
        return result(200,{token,expiresAt,member:{id:me.member.id,name:me.member.display_name,status:'approved'}},cors);
      }
      if(path==='/v1/me'&&method==='GET') {
        const {member}=await session(request,env,timestamp);
        const profile=await stmt(env.DB,'SELECT public_data,consent_public,approved_at FROM member_profiles WHERE member_id=?',member.id).first();
        const submission=await stmt(env.DB,"SELECT id,public_data,consent_public,status,created_at FROM profile_submissions WHERE member_id=? ORDER BY (status='pending') DESC,created_at DESC,rowid DESC LIMIT 1",member.id).first();
        const application=await stmt(env.DB,"SELECT private_data,public_data,consent_data FROM applications WHERE email=? AND status='approved' ORDER BY created_at DESC,rowid DESC LIMIT 1",member.email).first();
        const privateData=application?parse(application.private_data):{};
        const draft=submission?{...publicOutput(parse(submission.public_data)),publicConsent:!!submission.consent_public}:profile?{...publicOutput(parse(profile.public_data)),publicConsent:!!profile.consent_public}:application?{...publicOutput(parse(application.public_data)),publicConsent:!!parse(application.consent_data).publicProfile}:null;
        if(draft){draft.audienceChannel=typeof privateData.audienceChannel==='string'?privateData.audienceChannel:'';draft.audience=typeof privateData.audience==='string'?privateData.audience:'';}
        return result(200,{member:{id:member.id,email:member.email,name:member.display_name,status:member.status},profile:profile?{...publicOutput(parse(profile.public_data)),publicConsent:!!profile.consent_public,approvedAt:profile.approved_at}:null,submission:submission?{id:submission.id,...publicOutput(parse(submission.public_data)),publicConsent:!!submission.consent_public,status:submission.status,createdAt:submission.created_at}:null,candidate:draft},cors);
      }
      if(path==='/v1/me/profile'&&method==='PATCH') {
        const {member}=await session(request,env,timestamp),input=await jsonBody(request),profile=publicInput(input);
        await limits(env.DB,env.OTP_HMAC_SECRET,[['profile-member',member.id,3600,20]],timestamp);
        const id=crypto.randomUUID();const statements=[stmt(env.DB,"UPDATE profile_submissions SET status='superseded' WHERE member_id=? AND status='pending'",member.id),stmt(env.DB,"INSERT INTO profile_submissions(id,member_id,public_data,consent_public,consent_version,status,created_at) VALUES(?,?,?,?,?,'pending',?)",id,member.id,JSON.stringify(profile),input.publicConsent?1:0,CONSENT_VERSION,timestamp)];
        // Withdrawal is immediate; granting consent never publishes an unreviewed draft.
        if(!input.publicConsent)statements.push(stmt(env.DB,'UPDATE member_profiles SET consent_public=0,updated_at=? WHERE member_id=?',timestamp,member.id));
        await env.DB.batch(statements);return result(202,{status:'pending_review',submissionId:id},cors);
      }
      if(path==='/v1/logout'&&method==='POST') {
        const {tokenHash}=await session(request,env,timestamp);await stmt(env.DB,'UPDATE sessions SET revoked_at=? WHERE token_hash=?',timestamp,tokenHash).run();return result(204,null,cors);
      }
      fail(404,'NOT_FOUND');
    } catch(error) {
      if(error instanceof HttpError)return result(error.status,{error:error.code},cors);
      // Do not expose SQL, email addresses, provider errors or token material.
      return result(503,{error:'SERVICE_UNAVAILABLE'},cors);
    }
  }};
}

export default createWorker();
export const contract={OTP_TTL,OTP_COOLDOWN,SESSION_TTL,CONSENT_VERSION};
