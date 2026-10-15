import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

// Isolated regression coverage: real SQLite, no Worker ports, email or remote D1.
// The read barrier reproduces concurrent reads before an atomic write.
const workerUrl=process.env.RALUVAAA_WORKER_MODULE
  ?pathToFileURL(resolve(process.env.RALUVAAA_WORKER_MODULE))
  :new URL('./worker.mjs',import.meta.url);
const {default:worker}=await import(workerUrl.href);
function harness(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  let barrier=null,failure=null;
  const DB={
    prepare(sql){
      return{
        args:[],
        bind(...args){this.args=args;return this},
        async first(){
          const value=sqlite.prepare(sql).get(...this.args)||null;
          if(barrier?.pattern.test(sql)){
            if(barrier.skip>0){barrier.skip--;return value}
            const current=barrier;
            return new Promise(resolve=>{
              current.waiting.push(()=>resolve(value));
              if(current.waiting.length===current.count){barrier=null;current.waiting.forEach(done=>done())}
            });
          }
          return value;
        },
        async all(){
          if(barrier?.pattern.test(sql)){
            const current=barrier;
            return new Promise(resolve=>{
              current.waiting.push(()=>resolve({results:sqlite.prepare(sql).all(...this.args)}));
              if(current.waiting.length===current.count){barrier=null;current.waiting.forEach(done=>done())}
            });
          }
          return{results:sqlite.prepare(sql).all(...this.args)};
        },
        execute(){
          if(failure?.test(sql)){failure=null;throw new Error('Injected database failure')}
          return{success:true,meta:{changes:Number(sqlite.prepare(sql).run(...this.args).changes)}}
        },
        async run(){return this.execute()}
      };
    },
    async batch(statements){
      sqlite.exec('BEGIN');
      try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result}
      catch(error){sqlite.exec('ROLLBACK');throw error}
    }
  };
  const env={DB,AUTH_TEST_MODE:'1'};
  async function request(path,{token,room='SECURITY',method='POST',...body}={}){
    const response=await worker.fetch(new Request('http://isolated.test'+path,{
      method,
      headers:{'content-type':'application/json','x-raluvaaa-room':room,...(token?{authorization:'Bearer '+token}:{})},
      ...(method==='GET'?{}:{body:JSON.stringify(body)})
    }),env);
    return{status:response.status,data:await response.json()};
  }
  async function account(email){
    const anonymous=await request('/v1/session');
    const sent=await request('/v1/auth/request-code',{email,token:anonymous.data.token});
    const verified=await request('/v1/auth/verify-code',{email,code:sent.data.testCode,token:anonymous.data.token});
    assert.equal(verified.status,200);
    return verified.data;
  }
  async function wish(owner,text='I want to learn sailing',room='SECURITY'){
    const result=await request('/v1/wishes',{token:owner.token,text,locationText:'Nantes, France',room});
    assert.equal(result.status,201);
    return result.data.wishId;
  }
  return{request,account,wish,sqlite,holdReads(pattern,count=2,skip=0){barrier={pattern,count,skip,waiting:[]}},failOnce(pattern){failure=pattern}};
}

test('public locations reject contact details on creation and correction',async()=>{
  const h=harness(),owner=await h.account('owner@security.test'),wishId=await h.wish(owner);
  for(const locationText of ['contact@example.com','https://example.com','0612345678']){
    const created=await h.request('/v1/wishes',{token:owner.token,text:'I want to learn dancing',locationText});
    assert.equal(created.status,400,'creation must reject '+locationText);
    assert.equal(created.data.error,'contact_or_url');
    const corrected=await h.request('/v1/wishes/'+wishId+'/events',{token:owner.token,type:'correct',text:'I want to learn sailing',locationText});
    assert.equal(corrected.status,400,'correction must reject '+locationText);
    assert.equal(corrected.data.error,'contact_or_url');
  }
});

test('ISO dates are publishable while phone-like numeric runs remain rejected',async()=>{
  const h=harness(),owner=await h.account('dates@security.test');
  for(const date of ['2026-10-15','2024-02-29.','(2026-10-15)']){
    const result=await h.request('/v1/wishes',{token:owner.token,text:'TEST QA '+date+' A — Verify Help and GRAFT',locationText:'Synthetic location'});
    assert.equal(result.status,201,'a real ISO date must be publishable: '+date);
  }
  for(const number of ['0612345678','+33 6 12 34 56 78','06 2026-10-15 09','+2026-10-15','2026-02-31','20261015']){
    const result=await h.request('/v1/wishes',{token:owner.token,text:'Call '+number+' for this lesson',locationText:'Synthetic location'});
    assert.equal(result.status,400,'phone-like run must stay blocked: '+number);
    assert.equal(result.data.error,'contact_or_url');
  }
});

test('notifications, unread totals and read actions stay within the selected room',async()=>{
  const h=harness(),owner=await h.account('owner@security.test'),helper=await h.account('helper@security.test');
  const wishId=await h.wish(owner);
  const proposal=await h.request('/v1/proposals',{token:helper.token,type:'help',targetWishId:wishId,title:'A first lesson',note:'I can share a practical lesson plan'});
  assert.equal(proposal.status,201);
  const inbox=await h.request('/v1/inbox',{token:owner.token,method:'GET'});
  const notification=inbox.data.notifications.find(n=>n.objectId===proposal.data.proposalId);
  assert(notification&&!notification.isRead);
  const otherInbox=await h.request('/v1/inbox',{token:owner.token,room:'OTHER',method:'GET'});
  const otherMe=await h.request('/v1/me',{token:owner.token,room:'OTHER',method:'GET'});
  assert.deepEqual(otherInbox.data.notifications,[]);
  assert.equal(otherMe.data.unread,0);
  const crossRoomRead=await h.request('/v1/notifications/'+notification.id+'/read',{token:owner.token,room:'OTHER'});
  assert.equal(crossRoomRead.status,404);
  const homeMe=await h.request('/v1/me',{token:owner.token,method:'GET'});
  assert.equal(homeMe.data.unread,1);
  const homeRead=await h.request('/v1/notifications/'+notification.id+'/read',{token:owner.token});
  assert.equal(homeRead.status,200);
});

test('final refusal or cancellation clears every recipient proposal notification',async()=>{
  const h=harness(),a=await h.account('a@security.test'),b=await h.account('b@security.test'),proposer=await h.account('c@security.test');
  const targetWishId=await h.wish(a),otherWishId=await h.wish(b,'I want to grow tomatoes');
  for(const action of ['decline','cancel']){
    const proposal=await h.request('/v1/proposals',{token:proposer.token,type:'connect',targetWishId,otherWishId});
    assert.equal(proposal.status,201);
    const result=await h.request('/v1/proposals/'+proposal.data.proposalId+'/'+(action==='cancel'?'cancel':'respond'),{
      token:action==='cancel'?proposer.token:a.token,...(action==='decline'?{decision:'decline'}:{})
    });
    assert.equal(result.status,200);
    for(const owner of [a,b]){
      const inbox=await h.request('/v1/inbox',{token:owner.token,method:'GET'});
      const notification=inbox.data.notifications.find(n=>n.objectId===proposal.data.proposalId);
      assert.equal(notification?.isRead,true,action+' must clear both owners notifications');
      assert(!inbox.data.pending.some(p=>p.id===proposal.data.proposalId));
    }
  }
});

test('concurrent verification consumes an OTP exactly once',async()=>{
  const h=harness(),email='concurrent@security.test';
  const anonymous=await h.request('/v1/session');
  const sent=await h.request('/v1/auth/request-code',{email,token:anonymous.data.token});
  h.holdReads(/SELECT \* FROM auth_codes WHERE email=/);
  const attempts=await Promise.all([1,2].map(()=>h.request('/v1/auth/verify-code',{email,code:sent.data.testCode,token:anonymous.data.token})));
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,401]);
  assert.equal(attempts.filter(r=>r.data.token).length,1);
  const replay=await h.request('/v1/auth/verify-code',{email,code:sent.data.testCode});
  assert.equal(replay.status,401);
});

test('redeeming a newer OTP never reactivates an older unused OTP',async()=>{
  const h=harness(),email='resend@security.test';
  const anonymous=await h.request('/v1/session');
  const first=await h.request('/v1/auth/request-code',{email,token:anonymous.data.token});
  h.sqlite.prepare('UPDATE auth_codes SET created_at=created_at-61000 WHERE email=?').run(email);
  const latest=await h.request('/v1/auth/request-code',{email,token:anonymous.data.token});
  assert.equal(latest.status,200);
  const verified=await h.request('/v1/auth/verify-code',{email,code:latest.data.testCode,token:anonymous.data.token});
  assert.equal(verified.status,200);
  const old=await h.request('/v1/auth/verify-code',{email,code:first.data.testCode});
  assert.equal(old.status,401);
});

test('concurrent accepts materialize one suggested branch and one result notification',async()=>{
  const h=harness(),owner=await h.account('owner@security.test'),helper=await h.account('helper@security.test');
  const targetWishId=await h.wish(owner);
  const proposal=await h.request('/v1/proposals',{token:helper.token,type:'suggest_branch',targetWishId,steps:['Learn a simple knot']});
  h.holdReads(/SELECT decision FROM proposal_consents WHERE proposal_id=/);
  const results=await Promise.all([1,2].map(()=>h.request('/v1/proposals/'+proposal.data.proposalId+'/respond',{token:owner.token,decision:'accept'})));
  assert(results.some(r=>r.status===200));
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM wishes WHERE text='Learn a simple knot'").get().n,1);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM notifications WHERE kind='proposal_result' AND object_id=?").get(proposal.data.proposalId).n,1);
});

test('both CONNECT owners may accept concurrently with one materialization',async()=>{
  const h=harness(),a=await h.account('a@security.test'),b=await h.account('b@security.test'),proposer=await h.account('c@security.test');
  const targetWishId=await h.wish(a),otherWishId=await h.wish(b,'I want to grow tomatoes');
  const proposal=await h.request('/v1/proposals',{token:proposer.token,type:'connect',targetWishId,otherWishId});
  h.holdReads(/SELECT actor_id,decision FROM proposal_consents WHERE proposal_id=/);
  await Promise.all([a,b].map(owner=>h.request('/v1/proposals/'+proposal.data.proposalId+'/respond',{token:owner.token,decision:'accept'})));
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM wish_events WHERE event_type='connect' AND json_extract(payload_json,'$.proposalId')=?").get(proposal.data.proposalId).n,1);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM notifications WHERE kind='proposal_result' AND object_id=?").get(proposal.data.proposalId).n,1);
});

test('failed materialization rolls back every effect and can be retried',async()=>{
  const h=harness(),owner=await h.account('owner@security.test'),helper=await h.account('helper@security.test');
  const targetWishId=await h.wish(owner);
  const proposal=await h.request('/v1/proposals',{token:helper.token,type:'suggest_branch',targetWishId,steps:['Learn a simple knot','Read the harbour rules']});
  h.failOnce(/INSERT INTO notifications/);
  const failed=await h.request('/v1/proposals/'+proposal.data.proposalId+'/respond',{token:owner.token,decision:'accept'});
  assert.equal(failed.status,500);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM wishes WHERE kind='split'").get().n,0);
  assert.equal(h.sqlite.prepare('SELECT status FROM proposals WHERE id=?').get(proposal.data.proposalId).status,'pending');
  const retry=await h.request('/v1/proposals/'+proposal.data.proposalId+'/respond',{token:owner.token,decision:'accept'});
  assert.equal(retry.status,200);
  assert.equal(retry.data.status,'accepted');
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM wishes WHERE kind='split'").get().n,2);
});

test('concurrent EVOLVE requests create exactly one direct successor',async()=>{
  const h=harness(),owner=await h.account('owner@security.test'),root=await h.wish(owner);
  h.holdReads(/SELECT id FROM wishes WHERE parent_wish_id=/);
  const results=await Promise.all(['Learn salsa','Learn tango'].map(text=>h.request('/v1/wishes/'+root+'/events',{token:owner.token,type:'evolve',text})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM wishes WHERE parent_wish_id=? AND kind='evolve'").get(root).n,1);
  assert.equal(h.sqlite.prepare("SELECT count(*) n FROM wish_events WHERE parent_wish_id=? AND event_type='evolve'").get(root).n,1);
});

test('concurrent different email claims cannot overwrite one anonymous actor',async()=>{
  const h=harness(),anonymous=await h.request('/v1/session');
  const emails=['alice@race.test','bob@race.test'];
  const codes=await Promise.all(emails.map(email=>h.request('/v1/auth/request-code',{email,token:anonymous.data.token})));
  h.holdReads(/SELECT \* FROM actors WHERE id=/);
  const verified=await Promise.all(emails.map((email,i)=>h.request('/v1/auth/verify-code',{email,code:codes[i].data.testCode,token:anonymous.data.token})));
  assert.deepEqual(verified.map(r=>r.status),[200,200]);
  assert.notEqual(verified[0].data.actorId,verified[1].data.actorId,'distinct emails must retain distinct actors');
  const wishIds=[];
  for(let i=0;i<verified.length;i++){
    const me=await h.request('/v1/me',{token:verified[i].data.token,method:'GET'});
    assert.equal(me.data.email,emails[i].slice(0,2)+'***@race.test');
    wishIds.push(await h.wish(verified[i].data,'I want to learn a new skill '+i));
  }
  for(let i=0;i<verified.length;i++){
    const me=await h.request('/v1/me',{token:verified[i].data.token,method:'GET'});
    assert.deepEqual(me.data.wishes.map(w=>w.id),[wishIds[i]]);
    const foreign=await h.request('/v1/wishes/'+wishIds[1-i]+'/events',{token:verified[i].data.token,type:'bloom'});
    assert.equal(foreign.status,403);
    assert.equal(foreign.data.error,'owner_required');
  }
});
