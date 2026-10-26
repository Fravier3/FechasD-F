import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('app startup and media UI: filters, add, edit, replay, confirmation, offline and sync',async()=>{
 const dom=new JSDOM(await readFile(new URL('../index.html',import.meta.url),'utf8'),{url:'https://fixture.test/FechasD-F/#training',pretendToBeVisual:true});
 const w=dom.window,$=id=>w.document.getElementById(id),saved=new Map(),intervals=[];
 const expose={window:w,document:w.document,navigator:w.navigator,location:w.location,history:w.history,localStorage:w.localStorage,sessionStorage:w.sessionStorage};
 for(const [key,value] of Object.entries(expose)){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const originalFetch=globalThis.fetch,originalInterval=globalThis.setInterval,originalTimeout=globalThis.setTimeout,timeouts=[];
 globalThis.setInterval=(...args)=>{const t=originalInterval(...args);t.unref();intervals.push(t);return t;};
 globalThis.setTimeout=(...args)=>{const t=originalTimeout(...args);timeouts.push(t);return t;};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.localStorage.setItem('fechasdf-v1:access',JSON.stringify('fixture-only-not-a-real-token'));
 w.localStorage.setItem('fechasdf-v1:person',JSON.stringify('Fran'));
 w.localStorage.setItem('fechasdf-v1:media-theme',JSON.stringify('system'));
 let records=[{id:'00000000-0000-0000-0000-000000000001',name:'Serie de prueba',type:'Serie',status:'Sin confirmar',notes:'',version:1,rating:null,df_media_views:[{platform:'Netflix',start_date:'2025-11-30',last_date:'2026-01-06'}]},{id:'00000000-0000-0000-0000-000000000002',name:'Película de prueba',type:'Película',status:'Sin confirmar',notes:'',version:1,rating:null,df_media_views:[{platform:'Max',start_date:'2026-01-05',last_date:'2026-01-05'}]}];
 const calls=[];
 globalThis.fetch=async(url,opts={})=>{url=String(url);calls.push({url,opts});let value;
  if(url.startsWith('./version.json'))value={version:'1.3.1'};
  else if(url.includes('rpc/df_has_access'))value=true;
  else if(url.includes('/df_events?')||url.includes('/df_details?'))value=[];
  else if(url.includes('rpc/df_media_save')){const b=JSON.parse(opts.body),existing=records.find(r=>r.id===b.p_id),r={...b.p_title,id:b.p_id||'00000000-0000-0000-0000-000000000003',version:(existing?.version||0)+1,df_media_views:b.p_views};records=records.filter(t=>t.id!==r.id);records.push(r);value=r.id;}
  else if(url.includes('/df_media_titles?')&&opts.method==='DELETE'){const id=new URL(url).searchParams.get('id').slice(3);records=records.filter(t=>t.id!==id);value=[{id}];}
  else if(url.includes('/df_media_titles?'))value=structuredClone(records);
  else throw Error('Unexpected network request: '+url);
  return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  await import('../app.js?ui-test');
  for(let i=0;i<30&&!$('media-library');i++)await new Promise(r=>setTimeout(r,5));
  assert.ok($('media-library'),'new section initializes without JavaScript errors');
  assert.equal(w.document.documentElement.dataset.mediaTheme,'light','appearance defaults to light at startup');
  assert.equal($('media-theme').value,'light');
  assert.equal(w.localStorage.getItem('fechasdf-v1:media-light-default-v1'),'true','existing automatic preference is migrated once');
  assert.equal(w.document.querySelectorAll('.media-date-cell small').length,4,'exactly two date labels per title');
  assert.deepEqual([...w.document.querySelectorAll('.media-date-cell small')].map(e=>e.textContent),['Inicio','Finalizada','Inicio','Finalizada']);
  assert.equal(w.document.querySelectorAll('[data-section="training"]').length,2);
  for(const nav of w.document.querySelectorAll('.desktop-nav,.bottom-nav'))assert.deepEqual([...nav.querySelectorAll('[data-section]')].map(a=>a.textContent),['Dashboard','Calendario','Diana','Fran','Entretenimiento']);
  assert.equal($('page-title').textContent,'Entretenimiento.');
  assert.match($('media-count').textContent,/2 de 2/);
  assert.match($('media-period').textContent,/30\/11\/2025 — 06\/01\/2026/);
  $('media-query').value='pelicula';$('media-query').dispatchEvent(new w.Event('input'));
  assert.match($('media-count').textContent,/1 de 2/);
  await $('sync').onclick();assert.equal($('media-query').value,'pelicula','background refresh preserves search');
  $('media-platform').value='Netflix';$('media-platform').dispatchEvent(new w.Event('change'));assert.match($('media-count').textContent,/0 de 2/);
  $('media-query').value='';$('media-query').dispatchEvent(new w.Event('input'));$('media-platform').value='';$('media-platform').dispatchEvent(new w.Event('change'));
  $('add').click();assert.equal($('media-editor').open,true);assert.equal($('media-completed'),null,'no third date control');
  assert.equal($('media-fields').querySelectorAll('input[type="date"]').length,2);
  assert.equal($('media-rating').parentElement.className,'media-rating-field','rating has a full-width aligned row');
  $('media-name').value='Título nuevo';await $('media-form').onsubmit(new w.Event('submit',{cancelable:true}));
  assert.equal($('media-editor').open,false);assert.match($('media-count').textContent,/3 de 3/);assert.equal(records.at(-1).df_media_views[0].start_date,null,'pending does not invent dates');
  w.document.querySelector('[data-media-edit="00000000-0000-0000-0000-000000000001"]').click();
  $('media-status').value='Viendo';$('media-status').dispatchEvent(new w.Event('change'));$('media-add-view').click();
  const views=w.document.querySelectorAll('.media-view-row');assert.equal(views.length,2);views[1].querySelector('[data-view-start]').value='2026-10-26';
  assert.equal(views[0].querySelector('[data-view-start]').getAttribute('aria-label'),'Inicio');
  assert.equal(views[0].querySelector('[data-view-last]').getAttribute('aria-label'),'Finalizada');
  await $('media-form').onsubmit(new w.Event('submit',{cancelable:true}));
  assert.equal(records.find(r=>r.id.endsWith('1')).df_media_views.length,2);assert.equal(records.length,3);
  const removeButton=()=>w.document.querySelector('[data-media-remove="00000000-0000-0000-0000-000000000003"]');
  let action=removeButton().onclick();assert.equal($('confirm-dialog').open,true);$('confirm-cancel').click();await action;assert.equal(records.length,3);
  action=removeButton().onclick();$('confirm-delete').click();await action;assert.equal(records.length,2);assert.match($('media-count').textContent,/2 de 2/);
  w.dispatchEvent(new w.Event('offline'));assert.equal($('add').disabled,true);assert.match($('notice').textContent,/Sin conexión/);
  assert.equal(calls.some(c=>!c.url.startsWith('./')&&!c.url.startsWith('https://syyealdlapxmpeccaary.supabase.co/')),false,'no automatic disclosure to cover providers');
 }finally{for(const t of intervals)clearInterval(t);for(const t of timeouts)clearTimeout(t);w.close();globalThis.fetch=originalFetch;globalThis.setInterval=originalInterval;globalThis.setTimeout=originalTimeout;for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
