import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import test from 'node:test';

// Real SQLite, following qa-security.mjs's in-memory D1 adapter. This suite never
// accesses a Worker port, remote D1, real email, credentials or a live account.
// Exercise the exact code-only switch in an isolated import; no runtime binding.
const source=readFileSync(new URL('./worker.mjs',import.meta.url),'utf8');
const switchPattern=/const QA_FIXTURE_HIDING_ENABLED=(?:true|false);/;
assert(switchPattern.test(source),'expected one code-only reversible switch');
const isolatedWorker=enabled=>import('data:text/javascript;base64,'+Buffer.from(source.replace(switchPattern,'const QA_FIXTURE_HIDING_ENABLED='+enabled+';')).toString('base64'));
const [{default:worker},{default:hiddenWorker}]=await Promise.all([isolatedWorker(false),isolatedWorker(true)]);
const ROOTS=[
  'wish_57b208a2-c381-4bbd-bca5-4b0c1d76a19d',
  'wish_93c9de27-c022-483f-975a-5452bdd9f06e',
  'wish_841df73a-7c30-4f8d-b7bd-df945e4c563a',
  'wish_558a976c-173a-4034-9503-f92a51c5c0b7',
  'wish_cc52e794-db66-413d-bb25-9f97d5c80c5a'
];
const ROOT_OWNERS=['a','b','a','one','two'];
const ACTORS=['a','b','one','two','neighbor'];
const TITLES=[
  'TEST Cloud alpha A — Verify Help and GRAFT between two test accounts.',
  'TEST Cloud alpha B — Connect this test wish to TEST Cloud alpha A.',
  'TEST QA 2026-10-15 — Verify date validation after release.',
  'TEST Confluence one — Synthetic QA root',
  'TEST Confluence two — Synthetic QA root'
];
const HIDDEN=[...ROOTS,'qa-child-a','qa-grandchild-a','qa-suggested-one','qa-suggested-one-continuation'];
const REAL=['real-test-alpha','real-shfg','real-lgi','real-identical-title'];
const DOMAIN_TABLES=['wishes','wish_events','encouragements','saved_wishes','proposals','proposal_consents','notifications','reports','translation_cache','actors'];

function harness(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  const DB={
    prepare(sql){return{
      args:[],bind(...args){this.args=args;return this},
      async first(){return sqlite.prepare(sql).get(...this.args)||null},
      async all(){return{results:sqlite.prepare(sql).all(...this.args)}},
      execute(){return{success:true,meta:{changes:Number(sqlite.prepare(sql).run(...this.args).changes)}}},
      async run(){return this.execute()}
    }},
    async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}
  };
  const env={DB,AUTH_TEST_MODE:'1'};
  for(const owner of ACTORS){
    sqlite.prepare('INSERT INTO actors (id,created_at,claimed_email,claimed_at) VALUES (?,?,?,?)').run(owner,1,owner+'@isolated.test',1);
    sqlite.prepare('INSERT INTO sessions (token_hash,actor_id,created_at,last_seen_at) VALUES (?,?,?,?)').run(createHash('sha256').update(owner+'-token').digest('hex'),owner,1,1);
  }
  let timestamp=1700000000000;
  function event(wishId,type='create',payload={},options={}){
    const w=sqlite.prepare('SELECT * FROM wishes WHERE id=?').get(wishId);
    const eventId=options.id||'evt-'+wishId+'-'+type;
    sqlite.prepare('INSERT INTO wish_events (id,wish_id,lineage_id,actor_id,event_type,parent_wish_id,payload_json,public_payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(eventId,wishId,w.lineage_id,options.actor||w.owner_actor_id,type,options.parent===undefined?w.parent_wish_id:options.parent,JSON.stringify(payload),JSON.stringify(payload),type==='create'?w.created_at:++timestamp);
    return eventId;
  }
  function wish(id,owner,text,{root=id,parent=null,room='WORLD',kind=parent?'split':'create',lineage=root}={}){
    const t=++timestamp;
    sqlite.prepare("INSERT INTO wishes (id,lineage_id,owner_actor_id,room_key,parent_wish_id,root_wish_id,kind,text,location_text,state,is_public,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'alive',1,?,?)")
      .run(id,lineage,owner,room,parent,root,kind,text,'TEST — synthetic location',t,t);
    event(id,parent?kind:'create',parent?{fromWishId:parent}:{});
    return id;
  }
  ROOTS.forEach((id,i)=>wish(id,ROOT_OWNERS[i],TITLES[i]));
  wish('qa-child-a','a','A child of the known QA fixture',{root:ROOTS[0],parent:ROOTS[0]});
  wish('qa-grandchild-a','a','A continuation of the child',{root:ROOTS[0],parent:'qa-child-a',kind:'evolve'});
  wish('qa-suggested-one','one','An accepted QA suggestion',{root:ROOTS[3],parent:ROOTS[3]});
  wish('qa-suggested-one-continuation','one','Continuation of the accepted suggestion',{root:ROOTS[3],parent:'qa-suggested-one',kind:'evolve'});
  REAL.forEach((id,i)=>wish(id,i===2?'b':i===1?'neighbor':'a',['Test Alpha A','Shfg','LGI prior wish',TITLES[0]][i]));
  wish('other-room-wish','a','TEST Cloud alpha in another room',{room:'OTHER'});
  function proposal(id,target,other=null,{type=other?'connect':'help',status='pending',proposer='b'}={}){
    const t=++timestamp;
    sqlite.prepare('INSERT INTO proposals (id,proposal_type,proposer_actor_id,target_wish_id,other_wish_id,private_payload_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id,type,proposer,target,other,JSON.stringify(type==='suggest_branch'?{steps:['Try one small step']}:{title:'A practical lesson',note:'A complete private help note'}),status,t,t);
    const owners=[...new Set([target,other].filter(Boolean).map(id=>sqlite.prepare('SELECT owner_actor_id FROM wishes WHERE id=?').get(id).owner_actor_id))];
    for(const owner of owners){
      sqlite.prepare('INSERT INTO proposal_consents (proposal_id,actor_id,decision,decided_at) VALUES (?,?,?,?)').run(id,owner,status==='pending'?null:'accept',status==='pending'?null:t);
      sqlite.prepare("INSERT INTO notifications (id,actor_id,kind,object_id,title,body,is_read,created_at) VALUES (?,?,'proposal',?,?,'private body',0,?)").run('note-'+id+'-'+owner,owner,id,'A private proposal',t);
    }
    sqlite.prepare("INSERT INTO notifications (id,actor_id,kind,object_id,title,body,is_read,created_at) VALUES (?,?,'proposal_result',?,?,'private result',0,?)").run('result-'+id,proposer,id,'Proposal result',t);
    if(status==='accepted')event(target,type,{proposalId:id,...(other?{otherWishId:other}:{})},{id:'evt-'+id,actor:proposer,parent:null});
    return id;
  }
  proposal('qa-help-accepted',ROOTS[0],null,{status:'accepted'});
  proposal('qa-graft-accepted',ROOTS[0],ROOTS[1],{status:'accepted'});
  proposal('qa-help-pending',ROOTS[0]);
  proposal('qa-branch-pending',ROOTS[2],null,{type:'suggest_branch'});
  proposal('neighbor-to-qa',REAL[1],ROOTS[1],{status:'accepted',proposer:'a'});
  proposal('neighbor-to-qa-pending',REAL[1],ROOTS[1],{proposer:'a'});
  proposal('qa-to-neighbor',ROOTS[2],REAL[1],{proposer:'b'});
  proposal('qa-current-help-accepted',ROOTS[3],null,{status:'accepted',proposer:'two'});
  proposal('qa-current-graft-accepted',ROOTS[3],ROOTS[4],{status:'accepted',proposer:'two'});
  proposal('qa-current-help-pending',ROOTS[3],null,{proposer:'two'});
  proposal('qa-current-branch-pending',ROOTS[4],null,{type:'suggest_branch',proposer:'one'});
  proposal('real-help-accepted',REAL[0],null,{status:'accepted'});
  proposal('real-help-pending',REAL[0]);
  for(const owner of ACTORS)for(const id of [...HIDDEN,...REAL,'other-room-wish']){
    sqlite.prepare('INSERT INTO saved_wishes (actor_id,wish_id,created_at) VALUES (?,?,?)').run(owner,id,++timestamp);
  }
  for(const id of [ROOTS[0],ROOTS[2],ROOTS[3],ROOTS[4],'qa-child-a','qa-suggested-one',REAL[0]])sqlite.prepare('INSERT INTO encouragements (wish_id,actor_id,created_at) VALUES (?,?,?)').run(id,'b',++timestamp);
  sqlite.prepare("INSERT INTO reports (id,reporter_actor_id,wish_id,reason,details,status,created_at) VALUES ('qa-report','b',?,'Synthetic reason','Synthetic context','open',?)").run(ROOTS[0],++timestamp);
  sqlite.prepare("INSERT INTO translation_cache (cache_key,source_text,source_lang,target_lang,translated_text,created_at,updated_at) VALUES ('qa-translation',?,'en','fr','Traduction de test',?,?)").run(TITLES[0],timestamp,timestamp);
  async function request(path,{actor='a',method='GET',enabled=true,room='WORLD',...body}={}){
    const response=await(enabled?hiddenWorker:worker).fetch(new Request('http://isolated.test'+path,{
      method,headers:{'content-type':'application/json','x-raluvaaa-room':room,...(actor?{authorization:'Bearer '+actor+'-token'}:{})},
      ...(method==='GET'?{}:{body:JSON.stringify(body)})
    }),env);
    return{status:response.status,data:await response.json()};
  }
  function snapshot(){return Object.fromEntries(DOMAIN_TABLES.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()]))}
  return{sqlite,env,request,snapshot,wish,event,proposal};
}
function assertNoHiddenReferences(data){
  const serialized=JSON.stringify(data);
  for(const id of HIDDEN)assert(!serialized.includes(id),'hidden reference leaked: '+id);
}
async function surfaces(h,enabled=true,actor='a'){
  const values={};
  for(const path of ['/v1/world','/v1/me','/v1/saved','/v1/inbox']){
    const result=await h.request(path,{enabled,actor});assert.equal(result.status,200,path);values[path]=result.data;
  }
  return values;
}

test('disabled baseline includes exact fixtures; switch reversal restores identical views and domain rows',async()=>{
  const h=harness(),before=h.snapshot();
  for(const actor of ACTORS){
    const baseline=await surfaces(h,false,actor),hidden=await surfaces(h,true,actor),restored=await surfaces(h,false,actor);
    for(const id of HIDDEN)assert(baseline['/v1/world'].wishes.some(w=>w.id===id));
    assertNoHiddenReferences(hidden);
    assert.deepEqual(restored,baseline,'switch reversal restores wishes, private context, Saved and unread counts for '+actor);
  }
  assert.deepEqual(h.snapshot(),before,'all fixture/domain rows and relationships remain byte-for-byte unchanged');
});

test('all four response surfaces, counts and all four fixture owners consistently hide fixture relations',async()=>{
  const h=harness();
  for(const actor of ACTORS){
    const value=await surfaces(h,true,actor);assertNoHiddenReferences(value);
    assert.deepEqual(value['/v1/world'].wishes.map(w=>w.id).sort(),REAL.slice().sort());
    assert.deepEqual(value['/v1/saved'].saved.map(w=>w.id).sort(),REAL.slice().sort());
    const inbox=value['/v1/inbox'];
    for(const category of ['pending','sent','receivedHistory'])for(const p of inbox[category])assert(p.id.startsWith('real-'));
    for(const n of inbox.notifications)assert(n.objectId.startsWith('real-'));
    assert.equal(value['/v1/me'].unread,inbox.notifications.filter(n=>!n.isRead).length);
    assert(value['/v1/me'].encouragedWishIds.every(id=>!HIDDEN.includes(id)));
  }
  const anonymous=await h.request('/v1/world',{actor:null});assert.equal(anonymous.status,200);assertNoHiddenReferences(anonymous.data);
});

test('real neighbors and identically titled wishes stay visible while only their fixture relation is concealed',async()=>{
  const h=harness(),before=h.snapshot(),{data}=await h.request('/v1/world');
  for(const id of REAL)assert(data.wishes.some(w=>w.id===id));
  assert(data.wishes.some(w=>w.text===TITLES[0]&&w.id==='real-identical-title'));
  assert(!data.events.some(e=>e.id==='evt-neighbor-to-qa'));
  assert(data.events.some(e=>e.id==='evt-real-help-accepted'));
  assert(data.events.some(e=>e.wishId===REAL[1]&&e.type==='create'));
  assert.deepEqual(h.snapshot(),before);
});

test('events referencing hidden wishes in every supported public relation field are omitted',async()=>{
  const h=harness();
  for(const key of ['fromWishId','otherWishId','oldParentWishId','newParentWishId'])h.event(REAL[0],'reparent',{[key]:ROOTS[0]},{id:'cross-'+key,parent:null});
  h.event(REAL[0],'split',{}, {id:'cross-parent',parent:ROOTS[0]});
  const {data}=await h.request('/v1/world');assertNoHiddenReferences(data);
  assert(!data.events.some(e=>e.id.startsWith('cross-')));
});

test('all wish mutations and direct URLs reject hidden roots and descendants without touching domain rows',async()=>{
  const h=harness(),before=h.snapshot();
  for(const wishId of HIDDEN){
    for(const type of ['evolve','split','add_branch','bloom','abandon','resume','wake','close_lineage','resume_lineage','correct','reparent','set_help','remove_mistake']){
      const result=await h.request('/v1/wishes/'+wishId+'/events',{method:'POST',actor:h.sqlite.prepare('SELECT owner_actor_id FROM wishes WHERE id=?').get(wishId).owner_actor_id,type,text:'A valid correction',locationText:'Synthetic location',children:['First child','Second child'],newParentWishId:REAL[0]});
      assert.equal(result.status,404,type+' '+wishId);
    }
    for(const [path,options] of [
      ['/v1/wishes/'+wishId+'/encourage',{method:'POST',actor:'neighbor'}],
      ['/v1/saved/'+wishId,{method:'POST'}],
      ['/v1/saved/'+wishId,{method:'DELETE'}],
      ['/v1/reports',{method:'POST',wishId,reason:'Synthetic reason'}],
      ['/v1/wishes/'+wishId,{}]
    ])assert.equal((await h.request(path,options)).status,404,path);
  }
  assert.deepEqual(h.snapshot(),before);
});

test('proposal creation and direct proposal/notification actions check both GRAFT endpoints',async()=>{
  const h=harness(),before=h.snapshot();
  for(const [targetWishId,otherWishId] of ROOTS.flatMap(root=>[[root,REAL[1]],[REAL[1],root]])){
    const result=await h.request('/v1/proposals',{method:'POST',actor:'neighbor',type:'connect',targetWishId,otherWishId});assert.equal(result.status,404);
  }
  for(const type of ['help','suggest_branch'])assert.equal((await h.request('/v1/proposals',{method:'POST',actor:'b',type,targetWishId:ROOTS[0],title:'A small lesson',note:'I can teach this',steps:['Try a first step']})).status,404);
  for(const id of ['qa-help-pending','qa-branch-pending','neighbor-to-qa-pending','qa-to-neighbor','qa-graft-accepted','qa-current-help-pending','qa-current-branch-pending','qa-current-graft-accepted']){
    for(const actor of ACTORS){
      for(const action of ['respond','cancel'])assert.equal((await h.request('/v1/proposals/'+id+'/'+action,{method:'POST',actor,decision:'accept'})).status,404,id+' '+action);
    }
  }
  const notes=h.sqlite.prepare("SELECT id,actor_id FROM notifications WHERE object_id NOT LIKE 'real-%'").all();
  for(const note of notes)assert.equal((await h.request('/v1/notifications/'+note.id+'/read',{method:'POST',actor:note.actor_id})).status,404,note.id);
  assert.deepEqual(h.snapshot(),before);
});

test('ordinary real-wish actions, proposals and notification read state remain available',async()=>{
  const h=harness();
  assert.equal((await h.request('/v1/wishes/'+REAL[0]+'/events',{method:'POST',type:'wake'})).status,200);
  assert.equal((await h.request('/v1/saved/'+REAL[0],{method:'DELETE'})).status,200);
  assert.equal((await h.request('/v1/saved/'+REAL[0],{method:'POST'})).status,201);
  assert.equal((await h.request('/v1/wishes/'+REAL[1]+'/encourage',{method:'POST',actor:'a'})).status,201);
  assert.equal((await h.request('/v1/notifications/note-real-help-pending-a/read',{method:'POST'})).status,200);
  assert.equal((await h.request('/v1/proposals/real-help-pending/respond',{method:'POST',decision:'accept'})).status,200);
});

test('room isolation is retained, with a separate non-fixture room unchanged',async()=>{
  const h=harness();
  for(const path of ['/v1/world','/v1/me','/v1/saved','/v1/inbox']){
    const active=await h.request(path,{room:'OTHER'}),baseline=await h.request(path,{room:'OTHER',enabled:false});assert.deepEqual(active,baseline);
  }
});

for(const [name,change] of [
  ['missing original creation',"DELETE FROM wish_events WHERE wish_id='"+ROOTS[0]+"' AND event_type='create'"],
  ['incorrect original create actor',"UPDATE wish_events SET actor_id='neighbor' WHERE wish_id='"+ROOTS[0]+"' AND event_type='create'"],
  ['incorrect original create timestamp',"UPDATE wish_events SET created_at=created_at+1 WHERE wish_id='"+ROOTS[0]+"' AND event_type='create'"],
  ['different root room',"UPDATE wishes SET room_key='OTHER' WHERE id='"+ROOTS[0]+"'"],
  ['different root lineage',"UPDATE wishes SET lineage_id='unexpected-lineage' WHERE id='"+ROOTS[0]+"'"],
  ['different root kind',"UPDATE wishes SET kind='split' WHERE id='"+ROOTS[0]+"'"],
  ['changed A/C ownership',"UPDATE wishes SET owner_actor_id='neighbor' WHERE id='"+ROOTS[2]+"'; UPDATE wish_events SET actor_id='neighbor' WHERE wish_id='"+ROOTS[2]+"'"],
  ['B no longer distinct',"UPDATE wishes SET owner_actor_id='a' WHERE id='"+ROOTS[1]+"'; UPDATE wish_events SET actor_id='a' WHERE wish_id='"+ROOTS[1]+"'"]
])test('provenance guard fails open: '+name,async()=>{
  const h=harness();h.sqlite.exec(change);
  assert.deepEqual(await surfaces(h,true),await surfaces(h,false),'provenance mismatch must not hide anything');
});

test('provenance is reevaluated on the next request; no environment or database cache can retain a stale hide',async()=>{
  const h=harness();assertNoHiddenReferences((await h.request('/v1/world')).data);
  h.sqlite.prepare("UPDATE wish_events SET actor_id='neighbor' WHERE wish_id=? AND event_type='create'").run(ROOTS[0]);
  assert.deepEqual(await surfaces(h,true),await surfaces(h,false));
});

test('exact fixture IDs cannot broaden into owner-wide or text-wide cleanup',async()=>{
  const h=harness();
  h.wish('another-test-by-a','a','TEST QA synthetic root');
  h.wish('another-test-by-b','b',TITLES[1]);
  const {data}=await h.request('/v1/world');
  for(const id of ['another-test-by-a','another-test-by-b',...REAL])assert(data.wishes.some(w=>w.id===id));
});

test('filter runs before LIMIT, preserving the full page of real notifications and saved wishes',async()=>{
  const h=harness();
  // The fixture notifications are intentionally newer than the real queue.
  for(let i=0;i<105;i++){
    h.proposal('bulk-real-'+i,REAL[0]);
    h.proposal('bulk-qa-'+i,ROOTS[0]);
  }
  const inbox=await h.request('/v1/inbox');
  assert.equal(inbox.data.notifications.length,100);
  assert(inbox.data.notifications.every(n=>n.objectId.startsWith('bulk-real-')));
  assert.equal(inbox.data.pending.length,100);
  for(let i=0;i<251;i++){
    const id='bulk-real-wish-'+i;h.wish(id,'a','A preserved ordinary wish');
    h.sqlite.prepare('INSERT INTO saved_wishes (actor_id,wish_id,created_at) VALUES (?,?,?)').run('a',id,1000+i);
  }
  const saved=await h.request('/v1/saved');assert.equal(saved.data.saved.length,250);assertNoHiddenReferences(saved.data);
});

test('a visible branch cannot be reattached to a hidden fixture by supplying its ID',async()=>{
  const h=harness(),branch=h.wish('real-visible-child','a','A genuine branch',{root:REAL[0],parent:REAL[0]}),before=h.snapshot();
  const result=await h.request('/v1/wishes/'+branch+'/events',{method:'POST',type:'reparent',newParentWishId:ROOTS[0]});
  assert.equal(result.status,403);
  assert.deepEqual(h.snapshot(),before);
});

test('deployment environment bindings cannot activate the code-only filter',async()=>{
  const h=harness();h.env.QA_FIXTURE_HIDING_ENABLED='1';h.env.HIDE_QA_FIXTURES='true';
  const {data}=await h.request('/v1/world',{enabled:false});
  for(const id of HIDDEN)assert(data.wishes.some(w=>w.id===id));
});

test('reviewed five-root fixture filter is enabled while reversal remains covered',()=>{
  assert(source.includes('const QA_FIXTURE_HIDING_ENABLED=true;'));
});

for(const [name,alter] of [
  ['parent in unrelated real lineage',h=>h.wish('wrong-parent-branch','a','An unrelated branch',{root:ROOTS[0],lineage:ROOTS[0],parent:REAL[0]})],
  ['foreign owner attached to fixture root',h=>h.wish('foreign-owner-branch','neighbor','An unrelated owner branch',{root:ROOTS[0],lineage:ROOTS[0],parent:ROOTS[0]})],
  ['different root pointer',h=>h.sqlite.prepare('UPDATE wishes SET root_wish_id=? WHERE id=?').run(REAL[0],'qa-child-a')],
  ['different lineage pointer',h=>h.sqlite.prepare('UPDATE wishes SET lineage_id=? WHERE id=?').run(REAL[0],'qa-child-a')],
  ['different room',h=>h.sqlite.prepare("UPDATE wishes SET room_key='OTHER' WHERE id='qa-child-a'").run()],
  ['parent crosses between known fixture lineages',h=>h.sqlite.prepare('UPDATE wishes SET parent_wish_id=? WHERE id=?').run(ROOTS[2],'qa-child-a')],
  ['parent cycle',h=>h.sqlite.prepare("UPDATE wishes SET parent_wish_id='qa-grandchild-a' WHERE id='qa-child-a'").run()],
  ['detached parent',h=>h.sqlite.prepare("UPDATE wishes SET parent_wish_id=NULL WHERE id='qa-child-a'").run()],
  ['missing parent',h=>{h.sqlite.exec('PRAGMA foreign_keys=OFF');h.sqlite.prepare("UPDATE wishes SET parent_wish_id='missing-parent' WHERE id='qa-child-a'").run()}],
  ['root creation kind on a descendant',h=>h.sqlite.prepare("UPDATE wishes SET kind='create' WHERE id='qa-child-a'").run()],
  ['foreign owner attached through a second generation',h=>h.wish('foreign-grandchild','neighbor','An unrelated nested branch',{root:REAL[1],lineage:REAL[1],parent:'qa-grandchild-a'})],
  ['only parent points into fixture',h=>h.wish('foreign-parent-link','a','An unrelated linked branch',{root:REAL[0],lineage:REAL[0],parent:ROOTS[0]})],
  ['root points to a fixture descendant',h=>h.wish('foreign-descendant-root','a','An unrelated root reference',{root:'qa-child-a',lineage:'foreign-descendant-root'})],
  ['lineage points to a fixture descendant',h=>h.wish('foreign-descendant-lineage','a','An unrelated lineage reference',{root:'foreign-descendant-lineage',lineage:'qa-grandchild-a'})]
])test('ambiguous fixture ancestry fails open: '+name,async()=>{
  const h=harness();alter(h);const before=h.snapshot();
  for(const actor of ACTORS){
    assert.deepEqual(await surfaces(h,true,actor),await surfaces(h,false,actor),'an ambiguous family must leave every response identical to the unfiltered baseline');
  }
  assert.deepEqual(h.snapshot(),before,'provenance checks never modify ambiguous or unrelated rows');
});


for(const [index,changedOwner] of [[3,'a'],[3,'b'],[3,'two'],[4,'a'],[4,'b'],[4,'one']])test('new fixture owner group remains distinct: root '+index+' vs '+changedOwner,async()=>{
  const h=harness(),rootId=ROOTS[index];
  // Keep creation and lineage internally consistent so only the owner-group
  // invariant rejects the ambiguous match.
  h.sqlite.prepare('UPDATE wishes SET owner_actor_id=? WHERE root_wish_id=?').run(changedOwner,rootId);
  h.sqlite.prepare('UPDATE wish_events SET actor_id=? WHERE lineage_id=?').run(changedOwner,rootId);
  const before=h.snapshot();
  for(const actor of ACTORS)assert.deepEqual(await surfaces(h,true,actor),await surfaces(h,false,actor));
  assert.deepEqual(h.snapshot(),before);
});

for(const index of [3,4])test('new fixture original-create proof is required: root '+index,async()=>{
  const h=harness();
  h.sqlite.prepare("UPDATE wish_events SET actor_id='neighbor' WHERE wish_id=? AND event_type='create'").run(ROOTS[index]);
  assert.deepEqual(await surfaces(h,true),await surfaces(h,false));
});

test('new suggested descendants retain strict ancestry validation',async()=>{
  const h=harness();
  h.sqlite.prepare('UPDATE wishes SET parent_wish_id=? WHERE id=?').run(REAL[0],'qa-suggested-one');
  const before=h.snapshot();
  for(const actor of ACTORS)assert.deepEqual(await surfaces(h,true,actor),await surfaces(h,false,actor));
  assert.deepEqual(h.snapshot(),before);
});

test('additional unlisted wishes by each new QA owner remain visible',async()=>{
  const h=harness();
  h.wish('unlisted-one','one',TITLES[3]);h.wish('unlisted-two','two',TITLES[4]);
  for(const [actor,id] of [['one','unlisted-one'],['two','unlisted-two']]){
    const value=await surfaces(h,true,actor);
    assert(value['/v1/world'].wishes.some(w=>w.id===id));
    assert(value['/v1/me'].wishes.some(w=>w.id===id));
    assertNoHiddenReferences(value);
  }
});

test('actual accepted suggestions and evolved descendants on both new roots hide and restore without changing data',async()=>{
  const h=harness(),created=[];
  // Clear the seeded pending suggestion through its normal proposer action.
  assert.equal((await h.request('/v1/proposals/qa-current-branch-pending/cancel',{enabled:false,method:'POST',actor:'one'})).status,200);
  for(const [index,proposer] of [[3,'two'],[4,'one']]){
    const owner=ROOT_OWNERS[index],root=ROOTS[index],step='A suggested first step for '+owner;
    const proposal=await h.request('/v1/proposals',{enabled:false,method:'POST',actor:proposer,type:'suggest_branch',targetWishId:root,steps:[step]});
    assert.equal(proposal.status,201);
    const accepted=await h.request('/v1/proposals/'+proposal.data.proposalId+'/respond',{enabled:false,method:'POST',actor:owner,decision:'accept'});
    assert.equal(accepted.status,200);assert.equal(accepted.data.status,'accepted');
    const children=h.sqlite.prepare('SELECT id FROM wishes WHERE parent_wish_id=? AND text=?').all(root,step);
    assert.equal(children.length,1,'an accepted suggestion materializes exactly one child');
    const child=children[0].id;
    const evolved=await h.request('/v1/wishes/'+child+'/events',{enabled:false,method:'POST',actor:owner,type:'evolve',text:'A smaller follow-up step for '+owner});
    assert.equal(evolved.status,201);
    for(const wishId of [child,evolved.data.wishId]){
      assert.equal((await h.request('/v1/saved/'+wishId,{enabled:false,method:'POST',actor:proposer})).status,201);
      assert.equal((await h.request('/v1/wishes/'+wishId+'/encourage',{enabled:false,method:'POST',actor:proposer})).status,201);
      created.push({wishId,owner});
    }
  }
  const before=h.snapshot();
  for(const actor of ACTORS){
    const baseline=await surfaces(h,false,actor),hidden=await surfaces(h,true,actor),restored=await surfaces(h,false,actor);
    assertNoHiddenReferences(hidden);
    for(const {wishId} of created){
      assert(baseline['/v1/world'].wishes.some(w=>w.id===wishId));
      assert(!JSON.stringify(hidden).includes(wishId),'materialized descendant must disappear from every response');
    }
    assert.deepEqual(restored,baseline,'code-only reversal restores actual API-created branches and related activity');
  }
  for(const {wishId,owner} of created)assert.equal((await h.request('/v1/wishes/'+wishId+'/events',{method:'POST',actor:owner,type:'wake'})).status,404);
  assert.deepEqual(h.snapshot(),before,'hide, denied mutation and reversal preserve every domain row');
});
