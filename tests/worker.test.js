import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../sw.js',import.meta.url),'utf8')).replace('__DF_VERSION__','test-release');
function harness(readyStates){const handlers={},clients=[],skips=[],deleted=[];const self={registration:{scope:'https://example.com/FechasD-F/'},location:{origin:'https://example.com'},clients:{matchAll:async()=>clients,claim:async()=>{}},skipWaiting:async()=>skips.push(true),addEventListener:(name,fn)=>handlers[name]=fn};
 readyStates.forEach((ready,i)=>clients.push({id:String(i),url:'https://example.com/FechasD-F/',postMessage(msg){handlers.message({data:{type:'DF_UPDATE_STATE',requestId:msg.requestId,ready},source:{id:String(i)}});}}));
 vm.runInNewContext(source,{self,URL,Map,Set,Date,Math,setTimeout,clearTimeout,Response,caches:{open:async()=>({put:async()=>{}}),delete:async key=>deleted.push(key),keys:async()=>['other-app-cache','fechasdf-shell-old1','fechasdf-shell-old2','fechasdf-shell-old3']},fetch:async()=>new Response('ok')});return {handlers,skips,deleted};}
test('el worker espera a que todas las ventanas estén listas',async()=>{
 for(const ready of [[true,true],[true,false]]){const h=harness(ready);let done;h.handlers.message({data:{type:'DF_CHECK_SAFE_UPDATE'},waitUntil:p=>done=p});await done;assert.equal(h.skips.length,ready.every(Boolean)?1:0);}
});
test('no toca caché de otras apps ni intercepta Supabase',async()=>{
 const h=harness([]);let done;h.handlers.activate({waitUntil:p=>done=p});await done;assert.deepEqual(h.deleted,['fechasdf-shell-old1']);let intercepted=false;
 h.handlers.fetch({request:{method:'GET',url:'https://example.supabase.co/rest/v1/df_events'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);
});
