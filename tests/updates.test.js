import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadTarget,safeToReload,createUpdateManager} from '../updates.js';
test('conserva ruta, enlace privado y parámetros durante una actualización',()=>{
 const url=new URL(reloadTarget('https://example.com/FechasD-F/?a=1#access=private-test','1.1.0-a'));
 assert.equal(url.pathname,'/FechasD-F/');assert.equal(url.hash,'#access=private-test');assert.equal(url.searchParams.get('a'),'1');assert.equal(url.searchParams.get('v'),'1.1.0-a');
});
test('no actualiza mientras hay formularios, guardados o ventanas ocultas',()=>{
 for(const state of [{busy:true},{dialogsOpen:true},{hidden:true}])assert.equal(safeToReload(state),false);
 assert.equal(safeToReload({busy:false,dialogsOpen:false,hidden:false}),true);
});
test('espera al cerrar formulario y recarga una sola vez',async()=>{
 let ready=false,count=0,notices=0;const locationRef={href:'https://example.com/app/#diana',replace(url){this.href=url;count++;}};
 const manager=createUpdateManager({version:'1.0.2',canReload:()=>ready,onPending:()=>notices++,sw:null,locationRef,fetcher:async()=>({ok:true,json:async()=>({version:'1.1.0-test'})})});
 try{await manager.start();assert.equal(count,0);assert.equal(notices,1);ready=true;await manager.resume();await manager.resume();assert.equal(count,1);assert.equal(new URL(locationRef.href).hash,'#diana');}finally{manager.stop();}
});
test('una versión igual o la falta de conexión no recarga',async()=>{
 for(const fail of [false,true]){let count=0;const manager=createUpdateManager({version:'1.1.0',canReload:()=>true,sw:null,locationRef:{href:'https://example.com/',replace(){count++;}},fetcher:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>({version:'1.1.0'})};}});try{await manager.start();assert.equal(count,0);}finally{manager.stop();}}
});
