const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(base,f),'utf8');
const title='RALUVAAA — Private Alpha',sub='PRIVATE ALPHA';
const sources=['mvp-v26/alpha-v0-polish.js','solo-organic-v27/organic-v27.js','solo-mobile-v28/mobile-v28.js','solo-experience-v30/experience-v30.js','solo-experience-v33/experience-v33.js','solo-experience-v37/experience-v37.js','solo-experience-v38/patch-v38.js','solo-experience-v39/exact-icons-v39.js','solo-experience-v42/ui-v42.js'];
function guards(source){
 const result=[],start="if(document.body?.dataset.alpha!=='private-alpha'){";let at=0;
 while((at=source.indexOf(start,at))!==-1){let end=at+start.length,depth=1;while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++}assert.equal(depth,0);result.push(source.slice(at,end));at=end}
 return result;
}
for(const file of sources)test(file+' leaves private branding untouched and retains the legacy identity',()=>{
 const source=read(file),blocks=guards(source);assert(blocks.length>0);
 assert.equal(blocks.reduce((n,b)=>n+(b.match(/document\.title=/g)||[]).length,0),(source.match(/document\.title=/g)||[]).length,'every title writer must be covered');
 for(const alpha of ['private-alpha','shared-alpha',undefined])for(const solo of [false,true]){
  const writes=[],subtitle={get textContent(){return sub},set textContent(value){writes.push(['sub',value])}};
  const document={body:{dataset:{alpha}},querySelector:selector=>selector==='#brand .sub'?subtitle:null,get title(){return title},set title(value){writes.push(['title',value])}};
  const context={document,window:{RALUVAAA_SOLO:solo},params:new URLSearchParams()};vm.createContext(context);
  for(let i=0;i<3;i++)for(const block of blocks)vm.runInContext(block,context);
  if(alpha==='private-alpha')assert.deepEqual(writes,[],'no repeated writes, even when a legacy SOLO flag is present');
  else if(solo||!file.includes('organic-v27')){
   assert(writes.some(([key,value])=>key==='title'&&/^RALUVAAA · (Solo|Experience|Alpha V0)/.test(value)),'legacy title preserved');
   if(source.includes("#brand .sub"))assert(writes.some(([key,value])=>key==='sub'&&value!==sub),'legacy subtitle preserved');
  }
 }
});
test('the static private shell owns its title and subtitle, with no private JavaScript writer',()=>{
 const html=read('private-alpha/index.html');assert(html.includes('<title>'+title+'</title>'));assert(html.includes('<div class="sub">'+sub+'</div>'));
 for(const f of ['private-alpha/features.js','private-alpha/bootstrap.js']){
  assert(!/document\.title\s*=/.test(read(f)),f+' must not compete with the static title');
  assert(!/querySelector\(['"]#brand \.sub/.test(read(f)),f+' must not rewrite the static subtitle');
 }
 for(const file of sources){const name=path.basename(file);assert((html+read('private-alpha/bootstrap.js')).includes(name+'?build=private-alpha-stable-title-20261016'),'changed legacy module has a private-alpha cache bump: '+name)}
});
