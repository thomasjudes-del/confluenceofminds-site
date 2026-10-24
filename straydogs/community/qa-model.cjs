const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=__dirname,ctx=vm.createContext({console,URL});
for(const f of ['fixtures.js','art.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const D=ctx.StrayDogsDemo,M=D.Model;let checks=[];
function check(name,fn){fn();checks.push(name)}
check('Blank application rejected',()=>assert(D.Model.validateCandidate(D.getState().candidate).length>=8));
check('Fictional sample satisfies required fields',()=>{D.getState().candidate=D.demoCandidate();assert.equal(M.validateCandidate(D.getState().candidate).length,0)});
check('No work submission without member access',()=>assert.equal(M.queueWork({title:'A',url:'https://example.invalid',context:'C',consent:true}),false));
check('Submission queued once, no automatic publication',()=>{assert(M.submit());assert.equal(M.submit(),false);assert.equal(D.getState().application,'pending');assert.equal(D.getState().published,null);assert.equal(D.getState().member,false)});
check('Review can request changes without publishing',()=>{assert(M.moderate('changes'));assert.equal(D.getState().application,'changes');assert.equal(D.getState().published,null)});
check('Approval without public consent grants membership only',()=>{assert(M.submit());assert(M.moderate('approve'));assert(D.getState().member);assert.equal(D.getState().published,null);assert.equal(M.moderate('approve'),false)});
check('Public consent plus review publishes a separate snapshot',()=>{D.getState().candidate.publicConsent=true;D.getState().application='draft';assert(M.submit());assert(M.moderate('approve'));assert.equal(D.getState().published.name,'Alex Sillage');assert.equal(D.creators().length,5)});
check('Private application fields absent from public profile object and markup',()=>{const s=D.getState(),p=s.published,html=D.publicProfile(p);for(const k of ['email','audience','audienceChannel','attachment','privacyConsent'])assert(!(k in p));assert(!html.includes(s.candidate.email));assert(!html.includes(s.candidate.attachment));assert(!html.includes(s.candidate.audienceChannel))});
check('Unreviewed edits do not mutate public snapshot',()=>{const old=D.getState().published.name;D.getState().candidate.name='Edited draft';D.getState().candidate.interests.push('nature');assert.equal(D.getState().published.name,old);assert(!D.getState().published.interests.includes('nature'))});
check('Text injection escaped in public rendering',()=>{const p=D.publicCopy({...D.demoCandidate(),name:'<img src=x onerror=alert(1)>'});const html=D.publicProfile(p);assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'))});
check('Unsafe URL protocols rejected',()=>{for(const u of ['javascript:alert(1)','data:text/html,test','file:///tmp/a'])assert(!D.safeUrl(u));assert(D.safeUrl('https://example.invalid/work'))});
check('Candidate URL validation rejects script links',()=>{const c=D.demoCandidate();c.website='javascript:alert(1)';assert(M.validateCandidate(c).includes('website'))});
check('Round submission requires explicit consent and safe link',()=>{assert(!M.queueWork({title:'Work',url:'javascript:a',context:'Context',consent:true}));assert(!M.queueWork({title:'Work',url:'https://example.invalid',context:'Context',consent:false}));assert(M.queueWork({title:'Work',url:'https://example.invalid',context:'A thoughtful context',need:'Feedback',consent:true,socialPermission:false}));assert(!D.works().some(w=>w.submitted))});
check('Work appears only after editorial approval',()=>{const w=D.getState().works[0];assert(M.moderateWork(w.id,'approve'));assert(D.works().some(x=>x.id===w.id));assert.equal(M.moderateWork(w.id,'approve'),false)});
check('Round retains three slots after a new approved work',()=>assert.equal((D.round().match(/<article class="work">/g)||[]).length,3));
check('Short requests rejected; one pending request per person and type',()=>{assert(!M.request('mila','collaboration','Too short','',''));assert(M.request('mila','collaboration','A small concrete shared project together.','One spread','Two hours'));assert(!M.request('mila','collaboration','A duplicate concrete project proposal.','One spread','Two hours'))});
check('Recipient response is a distinct transition and not replayable',()=>{const id=D.getState().messages[0].id;assert(M.respond(id,'accepted'));assert(!M.respond(id,'accepted'));assert.equal(D.getState().messages[0].status,'accepted')});
check('Withdrawal removes public profile without revoking membership',()=>{M.withdraw();assert.equal(D.getState().published,null);assert(D.getState().member);assert.equal(D.creators().length,4)});
check('Draft text and social recommendation are escaped',()=>assert.equal(D.esc('<b>"&'), '&lt;b&gt;&quot;&amp;'));
check('Reset removes local profile, requests, submissions and permissions',()=>{M.reset();assert.equal(D.getState().works.length,0);assert.equal(D.getState().messages.length,0);assert.equal(D.getState().member,false);assert.equal(D.getState().candidate.publicConsent,false)});
const snapshots=path.join(root,'qa-snapshots');fs.mkdirSync(snapshots,{recursive:true});
for(const lang of ['fr','en']){
 D.getState().lang=lang;
 const screens={home:()=>D.home(),portfolio:()=>D.portfolio(),round:()=>D.round(),join:()=>D.join(),collaborations:()=>D.collaborations(),studio_guest:()=>D.studio(),moderation_empty:()=>D.moderation()};
 for(const [name,fn]of Object.entries(screens)){check(`${lang}: ${name} renders without undefined values`,()=>{const h=fn();assert(!h.includes('undefined'));fs.writeFileSync(path.join(snapshots,`${lang}-${name}.html`),h)})}
 D.getState().candidate=D.demoCandidate();D.getState().candidate.publicConsent=true;M.submit();
 for(const [name,fn]of Object.entries({preview:()=>D.preview(),submitted:()=>D.submitted(),moderation_pending:()=>D.moderation()})){check(`${lang}: ${name} renders`,()=>fs.writeFileSync(path.join(snapshots,`${lang}-${name}.html`),fn()))}
 M.moderate('approve');
 for(const tab of ['home','works','messages','profile']){D.getState().tab=tab;check(`${lang}: studio ${tab} renders`,()=>fs.writeFileSync(path.join(snapshots,`${lang}-studio-${tab}.html`),D.studio()))}
 check(`${lang}: approved creator and work render`,()=>{fs.writeFileSync(path.join(snapshots,`${lang}-creator.html`),D.publicProfile(D.creators()[0]));fs.writeFileSync(path.join(snapshots,`${lang}-work.html`),D.workPage(D.works()[0]));});M.reset();
}
fs.writeFileSync(path.join(root,'qa-model-result.json'),JSON.stringify({status:'passed',checks:checks.length,details:checks,limitations:'State-machine and HTML rendering tests in Node VM. Browser layout, file picker, keyboard, hash navigation and actual DOM event dispatch not executed. No backend/auth/email delivery exists.'},null,2));
console.log(JSON.stringify({status:'passed',checks:checks.length}));
