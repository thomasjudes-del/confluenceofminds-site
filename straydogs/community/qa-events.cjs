const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=__dirname,listeners={},elements={},windowListeners={};let hash='',checks=[];
function element(id){return elements[id]||(elements[id]={id,innerHTML:'',textContent:'',open:false,dataset:{},isConnected:true,value:'',focus(){},select(){},setSelectionRange(){},close(){this.open=false},showModal(){this.open=true},addEventListener(n,fn){this[n]=fn},getBoundingClientRect(){return {left:0,right:100,top:0,bottom:100}}});}
const document={documentElement:{lang:'fr'},activeElement:element('active'),title:'',querySelector:s=>element(s.replace(/^#/,'')),querySelectorAll:s=>[],addEventListener:(n,fn)=>listeners[n]=fn};
const location={get hash(){return hash},set hash(v){hash=v.startsWith('#')?v:'#'+v;if(windowListeners.hashchange)windowListeners.hashchange()}};
class FD{constructor(f){this.values=f.values||{}}get(n){return this.values[n]??null}has(n){return n in this.values}}
const ctx=vm.createContext({console,URL,document,location,window:{addEventListener:(n,fn)=>windowListeners[n]=fn,scrollTo(){}},FormData:FD,FileReader:class{readAsDataURL(){throw Error('No real files should be read in this test')}}});
for(const f of ['fixtures.js','art.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const D=ctx.StrayDogsDemo;
function click(action,data={}){const b={dataset:{action,...data}};listeners.click({target:{closest:()=>b}})}
function submit(id,values={},dataset={}){listeners.submit({preventDefault(){},target:{id,values,dataset,reportValidity:()=>true}})}
function check(n,f){f();checks.push(n)}
check('Initial app boot renders public discovery',()=>assert(element('main').innerHTML.includes('Les villes qui dérivent')));
check('Join route renders questionnaire, no email-first gate',()=>{location.hash='/join';assert(element('main').innerHTML.includes('application-form'))});
check('Fill sample action updates the questionnaire',()=>{click('fill-demo');assert.equal(D.getState().candidate.name,'Alex Sillage')});
check('Questionnaire submit opens preview',()=>{submit('application-form');assert.equal(hash,'#/preview')});
check('Public consent event changes only choice before submit',()=>{listeners.change({target:{dataset:{candidate:'publicConsent'},type:'checkbox',checked:true}});assert.equal(D.getState().published,null)});
check('Submission action opens receipt step, not public profile',()=>{click('submit-application');assert.equal(hash,'#/submitted');assert.equal(D.getState().published,null)});
check('Admin email is a modal preview with no delivery',()=>{click('admin-receipt');assert(element('dialog').open);assert(element('dialog-body').innerHTML.includes('NON ENVOYÉ'))});
check('Review route closes previous modal and renders pending application',()=>{location.hash='/moderation';assert.equal(element('dialog').open,false);assert(element('main').innerHTML.includes('Valider & publier'))});
check('Approval action publishes consenting profile only',()=>{click('moderate',{decision:'approve'});assert.equal(D.getState().published.name,'Alex Sillage')});
check('Member navigation opens studio',()=>{location.hash='/studio';assert(element('main').innerHTML.includes('Bonjour'))});
check('Work form opens from member CTA',()=>{click('open-submit-work');assert(element('dialog-body').innerHTML.includes('work-form'))});
check('Work form submit queues and routes to submissions',()=>{submit('work-form',{title:'Demo zine',url:'https://example.invalid/zine',context:'An example of a small shared publication.',need:'A fresh perspective',consent:'on'});assert.equal(D.getState().tab,'works');assert.equal(D.getState().works[0].status,'pending')});
check('Review and approve actions feature the submitted work',()=>{const id=D.getState().works[0].id;click('review-work',{id});assert(element('dialog-body').innerHTML.includes('Demo zine'));click('approve-work',{id});assert.equal(D.getState().works[0].status,'selected')});
check('Public round contains the new approved work',()=>{location.hash='/round';assert(element('main').innerHTML.includes('Demo zine'))});
check('Share action opens editable credited recommendation',()=>{click('share',{id:'villes'});assert(element('dialog-body').innerHTML.includes('share-text'));assert(element('dialog-body').innerHTML.includes('Crédit'))});
check('External demo link never navigates away',()=>{const prior=hash;click('external',{url:'https://example.invalid/site'});assert.equal(hash,prior);assert(element('dialog-body').innerHTML.includes('ne sera pas ouverte'))});
check('Concrete co-creation form opens',()=>{click('message',{person:'mila',kind:'collaboration'});assert(element('dialog-body').innerHTML.includes('name="format"'))});
check('Collaboration form creates pending request',()=>{submit('message-form',{text:'I would like to try a two-page publication with you.',format:'One spread',timing:'Two hours in November'},{person:'mila',kind:'collaboration'});assert.equal(D.getState().messages[0].status,'pending')});
check('Decline action does not exchange contacts',()=>{click('respond',{id:String(D.getState().messages[0].id),status:'declined'});assert.equal(D.getState().messages[0].status,'declined');assert(element('main').innerHTML.includes('DÉCLINÉ'))});
check('Opportunity form produces pending unpublished proposal',()=>{click('open-opportunity');submit('opportunity-form',{title:'One small project',description:'Create a small publication together.',format:'One spread',timing:'One afternoon',terms:'Exploratory exchange; discuss rights first.',consent:'on'});assert.equal(D.getState().opportunities[0].status,'pending')});
check('Opportunity approval action publishes only within demo',()=>{click('publish-opportunity',{id:D.getState().opportunities[0].id});location.hash='/collaborations';assert(element('main').innerHTML.includes('One small project'))});
check('Language switch re-renders in English',()=>{click('lang',{lang:'en'});assert.equal(document.documentElement.lang,'en');assert(element('header').innerHTML.includes('Join the pack'))});
check('Directory filter action re-renders selected discipline',()=>{location.hash='/portfolio';click('filter',{filter:'sound'});assert.equal(D.getState().filter,'sound');assert(element('main').innerHTML.includes('Sami'));assert(!element('main').innerHTML.includes('Mila Rive'))});
check('Withdraw profile action removes approved snapshot',()=>{location.hash='/studio';click('withdraw-profile');assert.equal(D.getState().published,null)});
check('Unknown/private profile route stays non-public',()=>{location.hash='/creator/alex';assert(element('main').innerHTML.includes('PROFILE NOT PUBLIC'))});
check('Invalid attachment type rejected before reading',()=>{listeners.change({target:{id:'attachment-file',dataset:{},files:[{type:'text/javascript',size:10,name:'bad.js'}],value:'bad.js'}});assert(!D.getState().candidate.attachment.includes('bad.js'))});
check('Valid attachment stores only local filename, never contents',()=>{listeners.change({target:{id:'attachment-file',dataset:{},files:[{type:'application/pdf',size:10,name:'fictional.pdf'}]}});assert(D.getState().candidate.attachment.includes('fictional.pdf'))});
check('Oversized visual is rejected before FileReader',()=>{const old=D.getState().candidate.visual;listeners.change({target:{id:'visual-file',dataset:{},files:[{type:'image/png',size:4*1024*1024,name:'oversize.png'}],value:''}});assert.equal(D.getState().candidate.visual,old)});
check('Contact is distinct from joining and contains no active email action',()=>{click('contact');assert(element('dialog-body').innerHTML.includes('dialog-title'));assert(!element('dialog-body').innerHTML.includes('mailto:'))});
check('Reset confirmation clears demo and returns home',()=>{click('reset');assert(element('dialog').open);click('confirm-reset');assert.equal(hash,'#/home');assert.equal(D.getState().messages.length,0);assert.equal(D.getState().opportunities.length,0)});
fs.writeFileSync(path.join(root,'qa-events-result.json'),JSON.stringify({status:'passed',checks:checks.length,details:checks,limitations:'Actual application event handlers invoked with lightweight DOM stubs. This is not browser execution or visual QA; native validation, focus trapping and responsive layout remain unverified.'},null,2));console.log(JSON.stringify({status:'passed',checks:checks.length}));
