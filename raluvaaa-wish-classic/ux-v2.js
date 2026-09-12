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
  if(myWorld){
    myWorld.addEventListener('click',()=>document.getElementById('myWorldBtn')?.click());
  }
  if(release){
    release.addEventListener('click',()=>document.getElementById('createBtn')?.click());
  }

  /* Keep the entrusted wishes as readable full-width rows. Clicking a row
     still uses the existing product behavior: focus the wish and open its detail. */
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
