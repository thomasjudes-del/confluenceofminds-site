import assert from 'node:assert/strict';
import { RaluvaaaAlphaClient } from './client.mjs';

class MemoryStorage{
  constructor(){this.m=new Map()}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}
const baseUrl=process.env.RALUVAAA_ALPHA_BASE||'http://127.0.0.1:8787';
const room='GATE'+Date.now().toString(36).toUpperCase().slice(-5);
const otherRoom='OTHER'+Date.now().toString(36).toUpperCase().slice(-4);
const make=(r=room)=>new RaluvaaaAlphaClient({baseUrl,room:r,storage:new MemoryStorage(),fetchImpl:fetch});
const A=make(),B=make(),C=make(),D=make(otherRoom);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function retry(fn,tries=30){let last;for(let i=0;i<tries;i++){try{return await fn()}catch(e){last=e;await wait(150)}}throw last}
async function rejects(fn,code){await assert.rejects(fn,e=>e&&e.code===code)}
function hasEvent(world,type,pred=()=>true){return world.events.some(e=>e.type===type&&pred(e))}
function wish(world,id){return world.wishes.find(w=>w.id===id)}

await retry(()=>A.request('/v1/health',{auth:false}));
const sessions=await Promise.all([A.ensureSession(),B.ensureSession(),C.ensureSession(),D.ensureSession()]);
assert.equal(new Set(sessions.map(x=>x.actorId)).size,4,'independent sessions required');

// Publication validation.
await rejects(()=>A.createWish({text:'x'}),'invalid_wish');
await rejects(()=>A.createWish({text:'Visit https://example.com now'}),'contact_or_url');
await rejects(()=>A.createWish({text:'Call me on 0612345678'}),'contact_or_url');
await rejects(()=>A.createWish({text:'I need a medical diagnosis'}),'outside_alpha_scope');

const wa=await A.createWish({text:'I want to learn coastal sailing.',locationText:'Nantes, France'});
const wb=await B.createWish({text:'I want to create a shared neighbourhood garden.',locationText:'Nantes, France'});
assert(wa.wishId&&wb.wishId&&wa.wishId!==wb.wishId);

let world=await B.world();
assert(wish(world,wa.wishId),'B must see A public wish');
assert(wish(world,wb.wishId),'B must see own wish');
assert(!(await D.world()).wishes.some(w=>w.id===wa.wishId),'another room must not see A wish');

// Encourage ownership and uniqueness.
await rejects(()=>A.encourage(wa.wishId),'own_wish');
await B.encourage(wa.wishId);
await rejects(()=>B.encourage(wa.wishId),'already_encouraged');

// HELP validation, duplicate pending, decline, accept, privacy.
await rejects(()=>B.proposeHelp(wa.wishId,'email me at helper@example.com'),'contact_or_url');
let help=await B.proposeHelp(wa.wishId,'I can share a practical first lesson plan.');
await rejects(()=>B.proposeHelp(wa.wishId,'Another pending help offer.'),'duplicate_pending');
let inboxA=await A.inbox();
assert(inboxA.pending.some(p=>p.id===help.proposalId&&p.type==='help'),'A must receive help proposal');
await rejects(()=>C.cancelProposal(help.proposalId),'proposer_required');
let helpResult=await A.respondProposal(help.proposalId,'decline');
assert.equal(helpResult.status,'declined');
world=await A.world();
assert(!hasEvent(world,'help',e=>e.payload&&e.payload.proposalId===help.proposalId),'declined help must not materialise');

help=await B.proposeHelp(wa.wishId,'I can bring a concrete checklist.');
helpResult=await A.respondProposal(help.proposalId,'accept');
assert.equal(helpResult.status,'accepted');
world=await A.world();
assert(hasEvent(world,'help',e=>e.payload&&e.payload.proposalId===help.proposalId),'accepted help must materialise');
assert(!JSON.stringify(world).includes('concrete checklist'),'private help note must not leak into public world');

// Suggestion decline then accept.
let suggestion=await B.suggestBranches(wa.wishId,['Book one discovery lesson','Read the harbour rules']);
let result=await A.respondProposal(suggestion.proposalId,'decline');
assert.equal(result.status,'declined');
world=await A.world();
assert(!world.wishes.some(w=>w.text==='Book one discovery lesson'),'declined suggestion must not create branch');

suggestion=await B.suggestBranches(wa.wishId,['Book one discovery lesson','Read the harbour rules']);
result=await A.respondProposal(suggestion.proposalId,'accept');
assert.equal(result.status,'accepted');
world=await A.world();
assert.equal(world.wishes.filter(w=>w.text==='Book one discovery lesson'||w.text==='Read the harbour rules').length,2,'accepted suggestion creates branches');

// Correct semantics.
await rejects(()=>A.wishEvent(wa.wishId,{type:'correct',text:'I want to learn coastal sailing.',locationText:'Nantes, France'}),'nothing_to_correct');
await A.wishEvent(wa.wishId,{type:'correct',text:'I want to learn coastal sailing confidently.',locationText:'Nantes, France'});
world=await A.world();
assert.equal(wish(world,wa.wishId).text,'I want to learn coastal sailing confidently.');

// Evolve and duplicate continuation.
await rejects(()=>A.wishEvent(wa.wishId,{type:'evolve',text:'I want to learn coastal sailing confidently.'}),'same_text');
const evo=await A.wishEvent(wa.wishId,{type:'evolve',text:'I have booked my first sailing lesson.'});
await rejects(()=>A.wishEvent(wa.wishId,{type:'evolve',text:'A second continuation should fail.'}),'already_continued');

// Split, add branch, reparent guards.
await rejects(()=>A.wishEvent(evo.wishId,{type:'split',children:['Only one']}),'need_two_branches');
const split=await A.wishEvent(evo.wishId,{type:'split',children:['Learn basic manoeuvres','Practise harbour exits']});
assert.equal(split.wishIds.length,2);
const add=await A.wishEvent(evo.wishId,{type:'add_branch',children:['Learn basic weather reading']});
assert.equal(add.wishIds.length,1);
await rejects(()=>A.wishEvent(wa.wishId,{type:'reparent',newParentWishId:evo.wishId}),'root_cannot_move');
const wa2=await A.createWish({text:'I want to grow a vegetable garden.',locationText:'Nantes, France'});
await rejects(()=>A.wishEvent(split.wishIds[0],{type:'reparent',newParentWishId:wa2.wishId}),'different_lineage');
await A.wishEvent(split.wishIds[0],{type:'reparent',newParentWishId:split.wishIds[1]});
await rejects(()=>A.wishEvent(split.wishIds[1],{type:'reparent',newParentWishId:split.wishIds[0]}),'cycle');

// Abandon and resume.
await A.wishEvent(split.wishIds[0],{type:'abandon'});
world=await A.world();
assert.equal(wish(world,split.wishIds[0]).state,'abandoned');
await A.wishEvent(split.wishIds[0],{type:'resume'});
world=await A.world();
assert.equal(wish(world,split.wishIds[0]).state,'alive');

// Whole lineage close / resume.
await A.wishEvent(wa.wishId,{type:'close_lineage'});
world=await A.world();
assert(world.wishes.filter(w=>w.lineageId===wa.wishId).some(w=>w.state==='abandoned'),'lineage close must abandon active states');
await A.wishEvent(wa.wishId,{type:'resume_lineage'});
world=await A.world();
assert(world.wishes.filter(w=>w.lineageId===wa.wishId).some(w=>w.state==='alive'),'lineage resume must restore lineage-closed states');

// Bloom terminal semantics.
await A.wishEvent(split.wishIds[0],{type:'bloom'});
await rejects(()=>A.wishEvent(split.wishIds[0],{type:'evolve',text:'Should fail after bloom'}),'wish_not_alive');
await rejects(()=>A.wishEvent(split.wishIds[0],{type:'split',children:['One','Two']}),'wish_not_alive');

// CONNECT rules: same lineage, cancel, accept.
await rejects(()=>C.proposeConnect(wa.wishId,evo.wishId),'same_lineage');
let connect=await B.proposeConnect(wa.wishId,wb.wishId);
await B.cancelProposal(connect.proposalId);
world=await A.world();
assert(!hasEvent(world,'connect',e=>e.payload&&e.payload.proposalId===connect.proposalId),'cancelled connect must not materialise');

connect=await B.proposeConnect(wa.wishId,wb.wishId);
result=await A.respondProposal(connect.proposalId,'accept');
assert.equal(result.status,'accepted');
world=await A.world();
assert(hasEvent(world,'connect',e=>e.payload&&e.payload.proposalId===connect.proposalId),'accepted connect must materialise');

// Third-party CONNECT requires both owners.
let connect2=await C.proposeConnect(wa.wishId,wb.wishId);
result=await A.respondProposal(connect2.proposalId,'accept');
assert.equal(result.status,'pending');
world=await A.world();
assert(!hasEvent(world,'connect',e=>e.payload&&e.payload.proposalId===connect2.proposalId),'one consent is insufficient');
result=await B.respondProposal(connect2.proposalId,'accept');
assert.equal(result.status,'accepted');
world=await A.world();
assert(hasEvent(world,'connect',e=>e.payload&&e.payload.proposalId===connect2.proposalId),'both owner consents required');

// Target becomes inactive before response.
const temp=await A.createWish({text:'I want to finish one small woodworking project.',locationText:'Nantes, France'});
let late=await C.proposeHelp(temp.wishId,'I can lend a simple tool list.');
await A.wishEvent(temp.wishId,{type:'abandon'});
result=await A.respondProposal(late.proposalId,'accept');
assert.equal(result.status,'expired');
world=await A.world();
assert(!hasEvent(world,'help',e=>e.payload&&e.payload.proposalId===late.proposalId),'expired help must not materialise');

// Remove mistake safety.
const removable=await A.createWish({text:'Accidental temporary wish.',locationText:'Nantes, France'});
await A.wishEvent(removable.wishId,{type:'remove_mistake'});
world=await A.world();
assert(!wish(world,removable.wishId),'removed mistake leaves public world');

const parent=await A.createWish({text:'Temporary root with child.',locationText:'Nantes, France'});
const child=await A.wishEvent(parent.wishId,{type:'evolve',text:'Temporary child state.'});
await rejects(()=>A.wishEvent(parent.wishId,{type:'remove_mistake'}),'has_descendants');
await A.wishEvent(child.wishId,{type:'remove_mistake'});
await A.wishEvent(parent.wishId,{type:'remove_mistake'});

const protectedWish=await A.createWish({text:'Wish protected by external activity.',locationText:'Nantes, France'});
await B.encourage(protectedWish.wishId);
await rejects(()=>A.wishEvent(protectedWish.wishId,{type:'remove_mistake'}),'has_external_activity');

// Notifications read/unread.
inboxA=await A.inbox();
const unread=inboxA.notifications.find(n=>!n.isRead);
assert(unread,'expected unread notification');
await A.markRead(unread.id);
inboxA=await A.inbox();
assert.equal(inboxA.notifications.find(n=>n.id===unread.id).isRead,true,'read state persists');

// Report and room isolation.
const report=await C.report({wishId:wa.wishId,reason:'other',details:'QA report'});
assert(report.reportId);
await rejects(()=>D.report({wishId:wa.wishId,reason:'other'}),'wish_not_found');

// Concurrent independent writes.
const concurrent=await Promise.all([
  A.createWish({text:'Concurrent alpha write.',locationText:'Nantes, France'}),
  B.createWish({text:'Concurrent beta write.',locationText:'Nantes, France'})
]);
world=await C.world();
assert(wish(world,concurrent[0].wishId)&&wish(world,concurrent[1].wishId),'concurrent writes must both survive');

const meA=await A.me(),meB=await B.me();
assert.equal(meA.actorId,sessions[0].actorId);
assert.equal(meB.actorId,sessions[1].actorId);
assert.equal(meA.room,room);
assert.equal(meB.room,room);
console.log('RALUVAAA exhaustive shared product gate passed');