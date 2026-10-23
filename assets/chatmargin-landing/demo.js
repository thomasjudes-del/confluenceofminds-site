const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const cursor=$('#demoCursor'), progress=$('#progressBar'), toast=$('#toast');
let runId=0;
let activeScenario='notes';

const cursorArrow=cursor.querySelector('.cursor-arrow');
cursorArrow.innerHTML=`<svg viewBox="0 0 24 30" width="24" height="30" aria-hidden="true"><path d="M2.2 1.8V23.9L7.8 18.7L12.2 28.4L16.5 26.4L12.2 17.1H20.2L2.2 1.8Z" fill="#111827" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const demoStyle=document.createElement('style');
demoStyle.textContent=`
.demo-cursor{width:24px!important;height:30px!important;filter:drop-shadow(0 2px 2px rgba(0,0,0,.22))!important}
.cursor-arrow{width:24px!important;height:30px!important;border:0!important;transform:none!important;background:none!important;position:relative!important}
.cursor-arrow svg{display:block!important;width:24px!important;height:30px!important}
.cursor-arrow:after{display:none!important}
.cm-tabs .cm-tab{cursor:pointer!important;border-width:1px!important;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease!important}
.cm-tabs .cm-tab:nth-child(1){background:rgba(114,97,255,.08);border-color:rgba(114,97,255,.18)}
.cm-tabs .cm-tab:nth-child(2){background:rgba(59,130,246,.075);border-color:rgba(59,130,246,.16)}
.cm-tabs .cm-tab:nth-child(3){background:rgba(245,158,11,.085);border-color:rgba(245,158,11,.17)}
.cm-tabs .cm-tab:nth-child(4){background:rgba(16,185,129,.075);border-color:rgba(16,185,129,.17)}
.cm-tabs .cm-tab:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(35,53,97,.12),0 0 0 2px rgba(114,97,255,.13)!important;color:#25206f!important}
.cm-tabs .cm-tab.active{transform:none;box-shadow:0 3px 10px rgba(35,53,97,.12),0 0 0 2px rgba(114,97,255,.20)!important;color:#25206f!important;font-weight:850!important}
`;
document.head.appendChild(demoStyle);

const scenarioCopy={
 notes:{label:'NOTES',title:'Keep the important parts of a chat beside the chat.',text:'Watch a useful passage move from ChatGPT into a structured note, get formatted, split into a sub-page and open in Workspace.'},
 prompts:{label:'PROMPTS',title:'Reuse a prompt without breaking your flow.',text:'A saved prompt goes straight into the ChatGPT composer, then the prompt cards are reordered and collapsed.'},
 dashboard:{label:'DASHBOARD',title:'See unfinished work by priority and project.',text:'Filter the conversations that need attention, then reopen the right one instead of hunting through chat history.'},
 search:{label:'SEARCH',title:'Find the right conversation, note or prompt quickly.',text:'Search across Chat Margin, narrow by project, and jump back to the exact work you need.'},
 workspace:{label:'WORKSPACE',title:'Turn the sidebar note into a full working page.',text:'Open the same note in a larger Notion-like workspace while keeping it connected to the ChatGPT conversation.'}
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setPanel(name){$$('.cm-tab').forEach(t=>t.classList.toggle('active',t.dataset.panel===name));$$('.cm-view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));}
function pointTo(el,offsetX=.5,offsetY=.5){const stage=$('#appStage').getBoundingClientRect(), r=el.getBoundingClientRect();cursor.style.left=`${r.left-stage.left+r.width*offsetX-3}px`;cursor.style.top=`${r.top-stage.top+r.height*offsetY-2}px`;}
async function move(el,ms=700){pointTo(el);await sleep(ms)}
async function click(el){pointTo(el);await sleep(380);cursor.classList.remove('click');void cursor.offsetWidth;cursor.classList.add('click');el.classList.add('demo-click');await sleep(280);el.classList.remove('demo-click')}
function setProgress(v){progress.style.width=`${v}%`}
function updateCopy(name){const c=scenarioCopy[name];$('#stepLabel').textContent=c.label;$('#scenarioTitle').textContent=c.title;$('#scenarioText').textContent=c.text}
function reset(){runId++;const id=runId;setProgress(0);$('#copySource').classList.remove('selected');$('#insertedNote').classList.remove('show','flash');$('#insertedNoteText').innerHTML='';$('#formatToolbar').classList.remove('show');$('#feedbackPageTab').classList.add('hidden');$('.page-tab[data-page="main"]').classList.add('active');$('#feedbackPageTab').classList.remove('active');$('#noteEditor').style.display='block';$('#feedbackPage').style.display='none';$('#composer').classList.remove('has-text');$('#composerText').textContent='';$('#promptA').classList.remove('collapsed');$('#promptB').classList.remove('collapsed','dragging');$('#promptC').classList.add('collapsed');const list=$('#promptList');list.append($('#promptA'),$('#promptB'),$('#promptC'));$$('.dash-card').forEach(c=>{c.classList.remove('filtered');c.style.boxShadow=''});$('#priorityFilter').textContent='All priorities ▾';$('#projectFilter').textContent='All projects ▾';$('#searchInput').value='';$('#searchProject').textContent='All projects ▾';$('#searchResults').innerHTML='<div class="search-empty">Start typing to search across Chat Margin.</div>';$('#workspaceOverlay').classList.remove('open');$$('.workspace-pages button').forEach((b,i)=>b.classList.toggle('active',i===0));toast.classList.remove('show');$('#chatTitle').textContent='Website launch plan';$('#cmChatTitle').textContent='Website launch plan';$('#saveStatus').textContent='Just now';return id}
function check(id){return id===runId}
async function typeInto(el,text,speed=24){el.textContent='';for(let i=0;i<text.length;i++){if(!document.body.contains(el))return;el.textContent+=text[i];if(i%3===0)await sleep(speed)}}
async function repeatScenario(name,id,delay=1900){await sleep(delay);if(check(id)&&activeScenario===name)runners[name]();}

async function notesFlow(){
 const id=reset();setPanel('notes');updateCopy('notes');setProgress(6);
 await move($('#copySource'));if(!check(id))return;$('#copySource').classList.add('selected');await sleep(1000);toast.textContent='Copied from ChatGPT';toast.classList.add('show');setProgress(18);await sleep(700);toast.classList.remove('show');
 await move($('#noteEditor'));if(!check(id))return;$('#insertedNoteText').textContent='Start with Chrome and Chromium, focus on heavy ChatGPT users, and learn from the first 100 active users before expanding.';$('#insertedNote').classList.add('show','flash');$('#saveStatus').textContent='Saving…';setProgress(34);await sleep(1000);$('#insertedNote').classList.remove('flash');$('#saveStatus').textContent='Saved just now';
 $('#formatToolbar').classList.add('show');await move($('#boldBtn'));await click($('#boldBtn'));if(!check(id))return;$('#insertedNoteText').innerHTML='<strong>Start with Chrome and Chromium</strong>, focus on heavy ChatGPT users, and learn from the first 100 active users before expanding.';setProgress(50);await sleep(900);$('#formatToolbar').classList.remove('show');
 await move($('#addPage'));await click($('#addPage'));if(!check(id))return;$('#feedbackPageTab').classList.remove('hidden');setProgress(64);await sleep(700);
 await move($('#feedbackPageTab'));await click($('#feedbackPageTab'));if(!check(id))return;$('.page-tab[data-page="main"]').classList.remove('active');$('#feedbackPageTab').classList.add('active');$('#noteEditor').style.display='none';$('#feedbackPage').style.display='block';setProgress(76);await sleep(1300);
 await move($('.page-tab[data-page="main"]'));await click($('.page-tab[data-page="main"]'));if(!check(id))return;$('.page-tab[data-page="main"]').classList.add('active');$('#feedbackPageTab').classList.remove('active');$('#noteEditor').style.display='block';$('#feedbackPage').style.display='none';setProgress(86);await sleep(900);
 await move($('#workspaceBtn'));await click($('#workspaceBtn'));if(!check(id))return;$('#workspaceOverlay').classList.add('open');setProgress(94);await sleep(1400);
 await move($('#closeWorkspace'));await click($('#closeWorkspace'));if(!check(id))return;$('#workspaceOverlay').classList.remove('open');setProgress(100);
 await repeatScenario('notes',id,2100);
}

async function promptsFlow(){
 const id=reset();setPanel('prompts');updateCopy('prompts');setProgress(8);const btn=$('#promptA .send-prompt');
 await move(btn);await click(btn);if(!check(id))return;const text=btn.dataset.text;$('#composer').classList.add('has-text');setProgress(30);await typeInto($('#composerText'),text,13);if(!check(id))return;
 await move($('#sendButton'));await sleep(700);setProgress(47);
 await move($('#dragPromptB'));$('#promptB').classList.add('dragging');await sleep(600);pointTo($('#promptA'),.5,.15);await sleep(800);if(!check(id))return;$('#promptA').before($('#promptB'));$('#promptB').classList.remove('dragging');setProgress(70);await sleep(900);
 const collapse=$('#promptB .collapse-btn');await move(collapse);await click(collapse);if(!check(id))return;$('#promptB').classList.add('collapsed');collapse.textContent='⌄';setProgress(100);
 await repeatScenario('prompts',id,2100);
}

async function dashboardFlow(){
 const id=reset();setPanel('dashboard');updateCopy('dashboard');setProgress(8);
 await move($('#priorityFilter'));await click($('#priorityFilter'));if(!check(id))return;$('#priorityFilter').textContent='Urgent ▾';$$('.dash-card.medium').forEach(c=>c.classList.add('filtered'));setProgress(34);await sleep(1100);
 await move($('#projectFilter'));await click($('#projectFilter'));if(!check(id))return;$('#projectFilter').textContent='Product launch ▾';$$('.dash-card').forEach(c=>{if(c.dataset.project!=='Product launch')c.classList.add('filtered')});setProgress(62);await sleep(1100);
 const first=$('.dash-card.urgent[data-project="Product launch"]');await move(first);await click(first);if(!check(id))return;$('#chatTitle').textContent='Website launch plan';$('#cmChatTitle').textContent='Website launch plan';first.style.boxShadow='0 0 0 3px rgba(114,97,255,.12)';setProgress(100);await sleep(900);first.style.boxShadow='';
 await repeatScenario('dashboard',id,2100);
}

async function searchFlow(){
 const id=reset();setPanel('search');updateCopy('search');setProgress(8);
 await move($('#searchInput'));await click($('#searchInput'));if(!check(id))return;$('#searchInput').value='';for(const ch of 'interview'){if(!check(id))return;$('#searchInput').value+=ch;await sleep(110)}setProgress(34);
 $('#searchResults').innerHTML='<div class="search-result highlight" id="result1"><strong>User interviews</strong><span>Conversation · Product launch</span><span>…questions from early <em>interviews</em> and activation friction…</span></div><div class="search-result" id="result2"><strong>User feedback</strong><span>Note sub-page · Product launch</span><span>What do users reopen most often after an <em>interview</em>?</span></div><div class="search-result" id="result3"><strong>Interview synthesis</strong><span>Prompt · Research</span><span>Summarize recurring patterns across <em>interview</em> notes.</span></div>';await sleep(1000);
 await move($('#searchProject'));await click($('#searchProject'));if(!check(id))return;$('#searchProject').textContent='Product launch ▾';$('#result3').style.opacity='.18';setProgress(64);await sleep(900);
 await move($('#result1'));await click($('#result1'));if(!check(id))return;$('#chatTitle').textContent='User interviews';$('#cmChatTitle').textContent='User interviews';setProgress(100);
 await repeatScenario('search',id,2100);
}

async function workspaceFlow(){
 const id=reset();setPanel('notes');updateCopy('workspace');setProgress(10);
 await move($('#workspaceBtn'));await click($('#workspaceBtn'));if(!check(id))return;setProgress(38);$('#workspaceOverlay').classList.add('open');await sleep(1300);
 const nav=$('.workspace-pages button:nth-of-type(2)');await move(nav);await click(nav);if(!check(id))return;$$('.workspace-pages button').forEach(b=>b.classList.remove('active'));nav.classList.add('active');setProgress(72);await sleep(900);await move($('.workspace-doc h2'));setProgress(100);
 await repeatScenario('workspace',id,2200);
}

const runners={notes:notesFlow,prompts:promptsFlow,dashboard:dashboardFlow,search:searchFlow,workspace:workspaceFlow};
function launch(name){activeScenario=name;$$('.scenario').forEach(b=>b.classList.toggle('active',b.dataset.scenario===name));updateCopy(name);runners[name]();}
$$('.scenario').forEach(b=>b.addEventListener('click',()=>launch(b.dataset.scenario)));
$$('.cm-tab').forEach(t=>t.addEventListener('click',()=>launch(t.dataset.panel)));
$('#workspaceBtn').addEventListener('click',()=>launch('workspace'));
$('#closeWorkspace').addEventListener('click',()=>{$('#workspaceOverlay').classList.remove('open');launch('notes')});
$$('.send-prompt').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.text;$('#composer').classList.add('has-text');$('#composerText').textContent=t}));
$$('.collapse-btn').forEach(b=>b.addEventListener('click',()=>{const card=$('#'+b.dataset.card);card.classList.toggle('collapsed');b.textContent=card.classList.contains('collapsed')?'⌄':'⌃'}));
$('#replay').addEventListener('click',()=>launch(activeScenario));
launch('notes');
