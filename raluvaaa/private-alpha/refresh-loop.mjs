// Per-tab scheduling only: no shared/private-data cache and no missed-tick catch-up.
export const REFRESH_TIMING=Object.freeze({active:15000,idle:60000,idleAfter:60000,errorBase:30000,errorMax:300000});
export function createRefreshLoop({refresh,onError=()=>{},document,window,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
  let timer=null,started=false,running=false,lastActivity=now(),lastDone=now(),failures=0,forced=false,forceAt=0;
  const attached=new WeakSet(),listeners=[];
  const visible=()=>!document.hidden;
  function clear(){if(timer!==null){clearTimer(timer);timer=null}}
  function delay(){return failures?Math.min(REFRESH_TIMING.errorMax,REFRESH_TIMING.errorBase*2**(failures-1)):(now()-lastActivity>=REFRESH_TIMING.idleAfter?REFRESH_TIMING.idle:REFRESH_TIMING.active)}
  function plan(){
    clear();if(!started||running||!visible())return;
    timer=setTimer(run,Math.max(0,(forced?forceAt:lastDone+delay())-now()));
  }
  async function run(){
    timer=null;if(!started||!visible()||running)return;
    running=true;const force=forced;forced=false;
    try{const result=await refresh(force,true);if(!result?.skipped)failures=0}
    catch(error){if(error?.code==='refresh_paused'&&force)forced=true;if(error?.code!=='refresh_paused'&&error?.code!=='refresh_obsolete'){failures++;onError(error)}}
    finally{running=false;lastDone=now();plan()}
  }
  // Human input changes the cadence, never directly starts a request or postpones
  // an already due poll. Engine messages/snapshots are deliberately not activity.
  function activity(){lastActivity=now();plan()}
  function listen(target,type,fn){target.addEventListener(type,fn,{passive:true});listeners.push(()=>target.removeEventListener(type,fn))}
  function attach(target,reloaded=false){if(!target||(!reloaded&&attached.has(target)))return;attached.add(target);for(const type of ['pointerdown','keydown','wheel'])listen(target,type,activity)}
  function attachFrame(frame,reloaded=false){try{attach(frame.contentWindow,reloaded)}catch{}}
  function visibility(){if(visible())lastActivity=now();plan()}
  return {
    start(){if(started)return;started=true;attach(window);listen(document,'visibilitychange',visibility);listen(window,'focus',()=>plan());
      for(const frame of document.querySelectorAll('iframe')){attachFrame(frame);listen(frame,'load',()=>attachFrame(frame,true))}plan()},
    stop(){started=false;clear();for(const remove of listeners.splice(0))remove()},
    request(delayMs=250){forced=true;forceAt=now()+Math.max(0,delayMs);plan()},
    settled(error=null){if(running)return;lastDone=now();if(error)failures++;else failures=0;plan()}
  };
}
