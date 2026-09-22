import assert from 'node:assert/strict';
import { RaluvaaaAlphaClient } from './client.mjs';

class MemoryStorage{
  constructor(){this.m=new Map()}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}
const baseUrl=process.env.RALUVAAA_ALPHA_BASE||'http://127.0.0.1:8787';
const make=(room='CONTRACT')=>new RaluvaaaAlphaClient({baseUrl,room,storage:new MemoryStorage(),fetchImpl:fetch});
const A=make(),B=make(),C=make(),ISO=make('OTHER');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function retry(fn,tries=30){let last;for(let i=0;i<tries;i++){try{return await fn()}catch(e){last=e;await wait(150)}}throw last}
async function rejectsCode(fn,code){await assert.rejects(fn,e=>e?.code===code,'expected '+code)}
async function pending(client,id){return (await client.inbox()).pending.find(p=>p.id===id)}
async function note(client,objectId){return (await client.inbox()).notifications.find(n=>n.objectId===objectId)}

await retry(()=>A.request('/v1/health',{auth:false}));
await Promise.all([A.ensureSession(),B.ensureSession(),C.ensureSession(),ISO.ensureSession()]);
assert.equal(new Set([A.actorId,B.actorId,C.actorId,ISO.actorId]).size,4);

await rejectsCode(()=>A.createWish({text:'Email me at test@example.com',locationText:'Nantes'}),'contact_or_url');

const root=await A.createWish({text:'I want to learn coastal sailing.',locationText:'Nantes, France'});
assert((await B.world()).wishes.some(w=>w.id===root.wishId));
assert(!(await ISO.world()).wishes.some(w=>w.id===root.wishId));
await rejectsCode(()=>ISO.encourage(root.wishId),'wish_not_found');
await rejectsCode(()=>B.wishEvent(root.wishId,{type:'bloom'}),'owner_required');
await rejectsCode(()=>A.encourage(root.wishId),'own_wish');

await B.encourage(root.wishId);
await rejectsCode(()=>B.encourage(root.wishId),'already_encouraged');
await rejectsCode(()=>A.wishEvent(root.wishId,{type:'remove_mistake'}),'has_external_activity');

const ev=await A.wishEvent(root.wishId,{type:'evolve',text:'I will start with a beginner sailing course.'});
await rejectsCode(()=>A.wishEvent(root.wishId,{type:'evolve',text:'A second continuation should not exist.'}),'already_continued');

await rejectsCode(()=>A.wishEvent(ev.wishId,{type:'split',children:['Only one']}),'need_two_branches');
const split=await A.wishEvent(ev.wishId,{type:'split',children:['Learn essential knots','Complete one supervised outing']});
assert.equal(split.wishIds.length,2);
await rejectsCode(()=>A.wishEvent(ev.wishId,{type:'remove_mistake'}),'has_descendants');
const extra=await A.wishEvent(ev.wishId,{type:'add_branch',children:['Read the local weather before sailing']});
assert.equal(extra.wishIds.length,1);

await A.wishEvent(split.wishIds[0],{type:'reparent',newParentWishId:split.wishIds[1]});
await rejectsCode(()=>A.wishEvent(split.wishIds[1],{type:'reparent',newParentWishId:split.wishIds[0]}),'cycle');

await A.wishEvent(extra.wishIds[0],{type:'abandon'});
await rejectsCode(()=>A.wishEvent(extra.wishIds[0],{type:'evolve',text:'Should not revive implicitly'}),'wish_not_alive');
await rejectsCode(()=>A.wishEvent(split.wishIds[0],{type:'reparent',newParentWishId:extra.wishIds[0]}),'wish_not_alive');
const resumed=await A.wishEvent(extra.wishIds[0],{type:'resume'});
assert.equal(resumed.state,'alive','abandoned wish should resume as alive');
await rejectsCode(()=>A.wishEvent(root.wishId,{type:'resume'}),'resume_only_abandoned');

const helpB=await B.proposeHelp(ev.wishId,'I can share one practical sailing exercise.');
await rejectsCode(()=>B.proposeHelp(ev.wishId,'A duplicate pending help.'),'duplicate_pending');
const helpC=await C.proposeHelp(ev.wishId,'I can introduce you to a sailing instructor.');
assert(await pending(A,helpB.proposalId));
assert(await pending(A,helpC.proposalId));

let result=await A.respondProposal(helpB.proposalId,'decline');
assert.equal(result.status,'declined');
assert(await pending(A,helpC.proposalId),'other helper proposal must remain pending');
result=await A.respondProposal(helpC.proposalId,'accept');
assert.equal(result.status,'accepted');

let world=await A.world();
const helpPublic=world.events.find(e=>e.type==='help'&&e.payload?.proposalId===helpC.proposalId);
assert(helpPublic,'accepted help should materialise');
assert(!JSON.stringify(helpPublic).includes('sailing instructor'),'private help text must not leak to public events');

const beforeSplitCount=world.events.filter(e=>e.type==='split').length;
const sugDecline=await B.suggestBranches(ev.wishId,['A declined suggestion branch']);
await A.respondProposal(sugDecline.proposalId,'decline');
world=await A.world();
assert.equal(world.events.filter(e=>e.type==='split').length,beforeSplitCount,'declined suggestion must not create branches');
const sugAccept=await B.suggestBranches(ev.wishId,['Book one practice session']);
await A.respondProposal(sugAccept.proposalId,'accept');
world=await A.world();
assert(world.wishes.some(w=>w.text==='Book one practice session'));

const cancelHelp=await B.proposeHelp(ev.wishId,'This offer will be cancelled.');
assert(await pending(A,cancelHelp.proposalId));
let cancelResult=await B.cancelProposal(cancelHelp.proposalId);
assert.equal(cancelResult.status,'cancelled');
assert(!(await A.inbox()).pending.some(p=>p.id===cancelHelp.proposalId));
await rejectsCode(()=>B.cancelProposal(cancelHelp.proposalId),'proposal_not_pending');

const closeTarget=await A.createWish({text:'I want to finish one small woodworking project.',locationText:'Nantes, France'});
const lateHelp=await B.proposeHelp(closeTarget.wishId,'I can lend you the right tool.');
await A.wishEvent(closeTarget.wishId,{type:'bloom'});
const lateResult=await A.respondProposal(lateHelp.proposalId,'accept');
assert.equal(lateResult.status,'expired');
world=await A.world();
assert(!world.events.some(e=>e.type==='help'&&e.payload?.proposalId===lateHelp.proposalId));

const rootB=await B.createWish({text:'I want to create a neighbourhood seed library.',locationText:'Nantes, France'});
const conDecline=await B.proposeConnect(rootB.wishId,ev.wishId);
assert(await pending(A,conDecline.proposalId));
assert.equal((await A.respondProposal(conDecline.proposalId,'decline')).status,'declined');
world=await A.world();
assert(!world.events.some(e=>e.type==='connect'&&e.payload?.proposalId===conDecline.proposalId));
const conAccept=await B.proposeConnect(rootB.wishId,ev.wishId);
assert.equal((await A.respondProposal(conAccept.proposalId,'accept')).status,'accepted');
world=await A.world();
assert(world.events.some(e=>e.type==='connect'&&e.payload?.proposalId===conAccept.proposalId));

const nProp=await C.proposeHelp(rootB.wishId,'I can help catalogue the first seeds.');
const incomingNote=await note(B,nProp.proposalId);
assert(incomingNote&&!incomingNote.isRead,'new proposal notification should be unread');
await B.respondProposal(nProp.proposalId,'decline');
const afterRecipient=(await B.inbox()).notifications.find(n=>n.id===incomingNote.id);
assert(afterRecipient?.isRead,'responding should clear the incoming notification');
const resultNote=await note(C,nProp.proposalId);
assert(resultNote&&!resultNote.isRead,'proposer result notification should be unread');
await C.markRead(resultNote.id);
assert((await C.inbox()).notifications.find(n=>n.id===resultNote.id)?.isRead,'mark read must persist');

const inboxB=await B.inbox(),inboxC=await C.inbox();
assert(inboxB.receivedHistory.some(p=>p.id===nProp.proposalId&&p.status==='declined'));
assert(inboxC.sent.some(p=>p.id===nProp.proposalId&&p.status==='declined'));

await rejectsCode(()=>ISO.report({wishId:root.wishId,reason:'test',details:'cross-room'}),'wish_not_found');

console.log('RALUVAAA shared alpha contract/edge-case QA passed');
