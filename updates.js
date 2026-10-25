// A release is activated only when every open app window reports it is safe.
export function reloadTarget(href, nextVersion) {
  const url=new URL(href);url.searchParams.set('v',nextVersion);return url.href;
}
export function safeToReload({busy,dialogsOpen,hidden}) {return !busy&&!dialogsOpen&&!hidden;}
export function createUpdateManager({version,canReload,canActivate=canReload,onPending=()=>{},sw=navigator.serviceWorker,fetcher=fetch,locationRef=location}) {
  let registration,checking=false,pendingVersion=null,controllerChanged=false,reloading=false,notified=false;
  let resumeTimer,periodic;
  const workers=new Set();
  const tellReady=(worker,requestId)=>worker?.postMessage({type:'DF_UPDATE_STATE',requestId,ready:canActivate()});
  function reloadOnce(next){
    if(reloading||!canReload())return;
    if(!next||next===version)return;
    const guard=`fechasdf:reload:${version}:${next}`;
    try{if(sessionStorage.getItem(guard))return;sessionStorage.setItem(guard,'1');}catch{if(new URL(locationRef.href).searchParams.get('v')===next)return;}
    reloading=true;locationRef.replace(reloadTarget(locationRef.href,next));
  }
  function pendingNotice(){if(!notified&&!canReload()){notified=true;onPending();}}
  function requestActivation(){
    if(!registration?.waiting)return;
    pendingNotice();registration.waiting.postMessage({type:'DF_CHECK_SAFE_UPDATE'});
  }
  function workerVersion(worker){return new Promise(resolve=>{
    if(!worker){resolve(null);return;}
    const channel=new MessageChannel(),timeout=setTimeout(()=>{channel.port1.close();resolve(null);},1400);
    channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data?.version||null);};
    worker.postMessage({type:'DF_GET_VERSION'},[channel.port2]);
  });}
  async function resume(){
    if(reloading)return;
    requestActivation();
    if(!canReload()){pendingNotice();return;}
    if(controllerChanged){const activeVersion=await workerVersion(sw?.controller);reloadOnce(activeVersion||pendingVersion);return;}
    if(pendingVersion&&!registration?.waiting&&!registration?.installing){
      const activeVersion=await workerVersion(sw?.controller||registration?.active);
      if(activeVersion===pendingVersion||!sw||!registration)reloadOnce(pendingVersion);
    }
  }
  function observeWorker(worker){
    if(!worker||workers.has(worker))return;workers.add(worker);
    worker.addEventListener('statechange',()=>{if(worker.state==='installed')requestActivation();if(worker.state==='activated')resume();});
  }
  async function check(){
    if(checking||reloading)return;checking=true;
    try{
      const response=await fetcher('./version.json?t='+Date.now(),{cache:'no-store'});
      if(response.ok){const info=await response.json();if(typeof info.version==='string'&&/^[\w.+-]{1,100}$/.test(info.version)&&info.version!==version){pendingVersion=info.version;pendingNotice();}}
      if(registration){await registration.update();observeWorker(registration.installing);requestActivation();}
      await resume();
    }catch{/* Keep current version and local data when offline. */}finally{checking=false;}
  }
  async function start(){
    if(sw){
      const wasControlled=!!sw.controller;
      sw.addEventListener('message',event=>{
        if(event.data?.type==='DF_PREPARE_UPDATE')tellReady(event.source,event.data.requestId);
      });
      sw.addEventListener('controllerchange',()=>{
        // First installation does not need a reload.
        if(wasControlled||pendingVersion){controllerChanged=true;resume();}
      });
      try{registration=await sw.register('./sw.js',{updateViaCache:'none'});registration.addEventListener('updatefound',()=>observeWorker(registration.installing));observeWorker(registration.installing);requestActivation();}catch{/* The app also works without offline installation. */}
    }
    await check();resumeTimer=setInterval(resume,5000);periodic=setInterval(check,60000);
  }
  return {start,check,resume,stop(){clearInterval(resumeTimer);clearInterval(periodic);}};
}
