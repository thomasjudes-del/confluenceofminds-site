import assert from 'node:assert/strict';
import { RaluvaaaAlphaClient } from './client.mjs';

class MemoryStorage{
  constructor(){this.m=new Map()}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}
const baseUrl=process.env.RALUVAAA_ALPHA_BASE||'http://127.0.0.1:8787';
const make=()=>new RaluvaaaAlphaClient({baseUrl,storage:new MemoryStorage(),fetchImpl:fetch});
const A=make(),B=make();

const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function retry(fn,tries=30){let last;for(let i=0;i<tries;i++){try{return await fn()}catch(e){last=e;await wait(150)}}throw last}

await retry(()=>A.request('/v1/health',{auth:false}));
const sa=await A.ensureSession();
const sb=await B.ensureSession();
assert(sa.actorId&&sb.actorId&&sa.actorId!==sb.actorId,'two independent actors required');

const wa=await A.createWish({text:'I want to learn to sail across a bay.',locationText:'Nantes, France'});
const wb=await B.createWish({text:'I want to create a shared neighbourhood garden.',locationText:'Nantes, France'});
assert(wa.wishId&&wb.wishId&&wa.wishId!==wb.wishId);

let world=await B.world();
assert(world.wishes.some(w=>w.id===wa.wishId),'B must see A public wish');
assert(world.wishes.some(w=>w.id===wb.wishId),'B must see own wish');

await B.encourage(wa.wishId);
await assert.rejects(()=>B.encourage(wa.wishId),e=>e.code==='already_encouraged');

const help=await B.proposeHelp(wa.wishId,'I can introduce you to a beginner-friendly sailing club.');
let inboxA=await A.inbox();
assert(inboxA.pending.some(p=>p.id===help.proposalId&&p.type==='help'),'A must receive help proposal');
const helpResult=await A.respondProposal(help.proposalId,'accept');
assert.equal(helpResult.status,'accepted');

const suggestion=await B.suggestBranches(wa.wishId,['Find one beginner course','Book one first session']);
inboxA=await A.inbox();
assert(inboxA.pending.some(p=>p.id===suggestion.proposalId&&p.type==='suggest_branch'),'A must receive branch suggestion');
const suggestionResult=await A.respondProposal(suggestion.proposalId,'accept');
assert.equal(suggestionResult.status,'accepted');

const connect=await B.proposeConnect(wa.wishId,wb.wishId);
inboxA=await A.inbox();
assert(inboxA.pending.some(p=>p.id===connect.proposalId&&p.type==='connect'),'A must receive connection proposal');
const connectResult=await A.respondProposal(connect.proposalId,'accept');
assert.equal(connectResult.status,'accepted');

const declined=await B.proposeHelp(wa.wishId,'I can also send an unrelated second idea.');
inboxA=await A.inbox();
assert(inboxA.pending.some(p=>p.id===declined.proposalId),'decline path must be pending first');
const declineResult=await A.respondProposal(declined.proposalId,'decline');
assert.equal(declineResult.status,'declined');

world=await A.world();
assert(world.events.some(e=>e.type==='help'),'accepted help must materialise in shared event log');
assert(world.events.some(e=>e.type==='connect'),'accepted connection must materialise in shared event log');
assert(world.events.some(e=>e.type==='split'),'accepted branch suggestion must materialise in shared event log');

const meA=await A.me(),meB=await B.me();
assert(meA.wishes.some(w=>w.id===wa.wishId));
assert(meB.wishes.some(w=>w.id===wb.wishId));
console.log('RALUVAAA shared alpha two-client QA passed');
