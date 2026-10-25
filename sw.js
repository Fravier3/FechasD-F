const VERSION = '__DF_VERSION__';
const CACHE = 'fechasdf-shell-' + VERSION;
const FILES = /*__DF_SHELL__*/[];
const scope = self.registration.scope;
const known = new Set(FILES.map(path=>new URL(path,scope).href));
const checks = new Map();
let checkingActivation=false;
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try{
      for(const path of FILES){
        const response=await fetch(new URL(path,scope),{cache:'reload'});
        if(!response.ok)throw Error('Incomplete release: '+path);
        if(path==='./index.html'){
          const html=await response.clone().text();
          if(!html.includes(`data-app-version="${VERSION}"`))throw Error('HTML release mismatch');
        }
        await cache.put(new URL(path,scope),response);
      }
    }catch(error){await caches.delete(CACHE);throw error;}
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=(await caches.keys()).filter(key=>key.startsWith('fechasdf-shell-')&&key!==CACHE);
    await Promise.all(keys.slice(0,-2).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
async function activateWhenSafe(){
  if(checkingActivation)return;checkingActivation=true;
  try{
    const clients=(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>client.url.startsWith(scope));
    if(!clients.length){await self.skipWaiting();return;}
    const requestId=Date.now()+'-'+Math.random();
    const states=new Map();checks.set(requestId,states);
    let finish;
    const done=new Promise(resolve=>finish=resolve);
    states.finish=()=>{if(clients.every(client=>states.has(client.id)))finish();};
    const timer=setTimeout(finish,1800);
    clients.forEach(client=>client.postMessage({type:'DF_PREPARE_UPDATE',requestId}));
    await done;clearTimeout(timer);checks.delete(requestId);
    if(clients.every(client=>states.get(client.id)===true))await self.skipWaiting();
  }finally{checkingActivation=false;}
}
self.addEventListener('message',event=>{
  if(event.data?.type==='DF_GET_VERSION'){event.ports?.[0]?.postMessage({version:VERSION});return;}
  if(event.data?.type==='DF_UPDATE_STATE'){
    const states=checks.get(event.data.requestId);
    if(states&&event.source?.id){states.set(event.source.id,event.data.ready===true);states.finish();}
    return;
  }
  if(event.data?.type==='DF_CHECK_SAFE_UPDATE')event.waitUntil(activateWhenSafe());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(scope))return;
  if(url.pathname.endsWith('/version.json')){event.respondWith(fetch(request,{cache:'no-store'}));return;}
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),shell=new URL('./index.html',scope);
      try{
        const response=await fetch(request,{cache:'no-cache'});
        if(!response.ok)return await cache.match(shell)||response;
        const html=await response.clone().text();
        if(html.includes(`data-app-version="${VERSION}"`))event.waitUntil(cache.put(shell,response.clone()));
        else {
          const match=html.match(/data-app-version="([^"]+)"/);
          if(!match||match[1]===new URL(request.url).searchParams.get('v'))return response;
          if(new URL(request.url).searchParams.get('v')===VERSION)return await cache.match(shell)||response;
        }
        return response;
      }catch{return await cache.match(shell)||Response.error();}
    })());return;
  }
  if(known.has(url.href))event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(url.href)||fetch(request)));
});
