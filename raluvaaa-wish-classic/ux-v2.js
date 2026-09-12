(function(){
  'use strict';
  const entrusted=document.getElementById('entrusted');
  const collapse=document.getElementById('entrustedCollapse');
  const myWorld=document.getElementById('quickMyWorld');
  const release=document.getElementById('quickRelease');

  if(collapse&&entrusted){
    collapse.addEventListener('click',()=>{
      entrusted.classList.toggle('collapsed');
      collapse.setAttribute('aria-expanded',String(!entrusted.classList.contains('collapsed')));
    });
  }

  function bindAction(button,targetId){
    if(!button)return;
    let timer=null,longPress=false;
    button.addEventListener('touchstart',()=>{
      longPress=false;
      clearTimeout(timer);
      timer=setTimeout(()=>{
        longPress=true;
        button.classList.add('tip-visible');
        setTimeout(()=>button.classList.remove('tip-visible'),1600);
      },520);
    },{passive:true});
    button.addEventListener('touchend',()=>clearTimeout(timer),{passive:true});
    button.addEventListener('touchcancel',()=>clearTimeout(timer),{passive:true});
    button.addEventListener('click',e=>{
      if(longPress){e.preventDefault();longPress=false;return;}
      document.getElementById(targetId)?.click();
    });
  }

  bindAction(myWorld,'myWorldBtn');
  bindAction(release,'createBtn');

  const grid=document.getElementById('entrustedGrid');
  if(grid){
    const polish=()=>{
      grid.querySelectorAll('.entrusted-item').forEach(item=>{
        item.setAttribute('title','Open this entrusted wish');
        item.setAttribute('aria-label',(item.querySelector('.t')?.textContent||'Entrusted wish')+'. Open details');
      });
    };
    new MutationObserver(polish).observe(grid,{childList:true,subtree:true});
    polish();
  }
})();
