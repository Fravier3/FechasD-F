import {escapeHTML as esc,localISO} from './core.js';
import {PLATFORMS,STATUSES,observations,datesOf,mediaStats,filterMedia,normalizeTitle,validateMedia,shortDate,mediaText,mediaCSV} from './media-core.js';
import {findCovers} from './covers.js';

export function createMediaLibrary({api,canEdit,isOnline,person,toast,confirmDelete,storage,access}){
 let titles=[],loaded=false,error='',working=false,current=null,coverRequest=0;
 const filters={query:'',type:'',platform:'',year:'',order:'desc'};
 // One-time reset restores the approved light palette on existing phones too.
 if(!storage.get('media-light-default-v1')){storage.set('media-theme','light');storage.set('media-light-default-v1',true);}
 applyTheme();
 const $=id=>document.getElementById(id);
 const opt=(v,label,selected)=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label)}</option>`;
 const input=(id,label,type,value='',extra='')=>`<label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value??'')}" ${extra}>`;
 document.body.insertAdjacentHTML('beforeend',`<dialog id="media-editor" aria-labelledby="media-editor-title"><form id="media-form"><div class="dialog-heading"><div><p class="eyebrow">MIS PELÍCULAS Y SERIES</p><h2 id="media-editor-title"></h2></div><button type="button" class="icon-button" id="media-close" aria-label="Cerrar">✕</button></div><div id="media-fields"></div><p id="media-error" class="form-error hidden" role="alert"></p><div class="dialog-footer"><button type="button" id="media-delete" class="button delete">Eliminar título</button><button type="button" id="media-cancel" class="button secondary">Cancelar</button><button id="media-save" class="button primary">Guardar</button></div></form></dialog>`);
 const cached=storage.get('media');if(cached?.access===access()&&Array.isArray(cached.titles)){titles=cached.titles;loaded=true;}
 function fail(message){$('media-error').textContent=message;$('media-error').classList.remove('hidden');}
 function lock(value){working=value;$('media-editor').querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=value);$('media-save').textContent=value?'Guardando…':'Guardar';}
 function close(){if(working)return;coverRequest++;$('media-editor').close();current=null;}
 $('media-close').onclick=$('media-cancel').onclick=close;
 $('media-editor').addEventListener('cancel',e=>{if(working)e.preventDefault();else{current=null;coverRequest++;}});
 async function load(){
  if(working)return;
  try{const data=[];for(let offset=0;;offset+=500){const page=await api(`df_media_titles?select=*,df_media_views(*)&order=created_at.asc,id.asc&limit=500&offset=${offset}`);data.push(...page);if(page.length<500)break;}titles=data;loaded=true;error='';storage.set('media',{access:access(),titles});}
  catch(e){error=e.message;}
 }
 function render(root){
  if(!root.querySelector('#media-library')){
   root.innerHTML=`<div id="media-library"><div class="media-intro"><div><p class="eyebrow">NUESTRA SALA</p><h2>Mis Películas y Series</h2><p>Historias que vimos. Historias que nos faltan.</p></div><label class="media-theme-label" for="media-theme">Apariencia<select id="media-theme">${opt('light','Clara',storage.get('media-theme','light'))}${opt('system','Automática',storage.get('media-theme','light'))}${opt('dark','Oscura',storage.get('media-theme','light'))}</select></label></div><div id="media-stats" class="media-stats"></div><p id="media-period" class="media-period"></p><div class="media-tools"><label class="media-search" for="media-query">Buscar título<input type="search" id="media-query" placeholder="¿Qué quieres encontrar?" value="${esc(filters.query)}"></label><div class="media-filter-grid"><label for="media-type">Tipo<select id="media-type">${opt('','Todas',filters.type)}${opt('Serie','📺 Series',filters.type)}${opt('Película','🎬 Películas',filters.type)}</select></label><label for="media-platform">Plataforma<select id="media-platform">${opt('','Todas',filters.platform)}${PLATFORMS.map(p=>opt(p,p,filters.platform)).join('')}</select></label><label for="media-year">Año visto<select id="media-year"></select></label><label for="media-order">Ordenar<select id="media-order">${opt('desc','Más recientes',filters.order)}${opt('asc','Más antiguas',filters.order)}</select></label></div></div><div class="media-list-heading"><span id="media-count" role="status"></span><div><button id="media-copy" class="button secondary">Copiar lista</button><button id="media-csv" class="button secondary">Exportar CSV</button></div></div><p class="media-explainer">Inicio y Finalizada muestran la primera y la última fecha de visualización registradas.</p><div id="media-load-error" role="status"></div><div id="media-results"></div><p class="media-credits">Carátulas externas: <a href="https://v3-cinemeta.strem.io/" target="_blank" rel="noopener noreferrer">Cinemeta</a> · Se cargan desde su enlace; no se guardan imágenes en Supabase.</p></div>`;
   for(const key of ['query','type','platform','year','order'])$('media-'+key).addEventListener(key==='query'?'input':'change',e=>{filters[key]=e.target.value;results();});
   $('media-copy').onclick=async()=>{try{await navigator.clipboard.writeText(mediaText(visible()));toast('Listado filtrado copiado con sus fechas.');}catch{toast('No se pudo copiar. Puedes exportar el CSV.');}};
   $('media-csv').onclick=()=>{const blob=new Blob([mediaCSV(visible())],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Fran-Diana-peliculas-series-'+localISO()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
   $('media-theme').onchange=e=>{storage.set('media-theme',e.target.value);applyTheme();};
  }
  applyTheme();
  const s=mediaStats(titles);
  $('media-stats').innerHTML=[['✦',s.total,'Títulos en total','rose'],['📺',s.series,'Series registradas','lavender'],['🎬',s.movies,'Películas registradas','mint']].map(([glyph,n,label,color])=>`<article class="media-stat ${color}"><span>${glyph}</span><strong>${n}</strong><p>${label}</p></article>`).join('');
  $('media-period').textContent=s.first?`Historial disponible: ${shortDate(s.first)} — ${shortDate(s.last)}`:'Aún no hay fechas de visualización registradas.';
  const years=new Set();for(const t of titles)for(const v of observations(t)){if(v.start_date){const a=+v.start_date.slice(0,4),b=+(v.last_date||v.start_date).slice(0,4);for(let y=a;y<=b;y++)years.add(String(y));}}
  $('media-year').innerHTML=opt('','Todos',filters.year)+[...years].sort().reverse().map(y=>opt(y,y,filters.year)).join('');
  $('media-load-error').innerHTML=error?`<p class="notice">${esc(error)} ${loaded?'Mostrando la última copia disponible.':''} <button id="media-retry">Reintentar</button></p>`:'';
  if($('media-retry'))$('media-retry').onclick=async()=>{await load();render(root);};
  results();
 }
 function applyTheme(){const theme=storage.get('media-theme','light');document.documentElement.dataset.mediaTheme=theme;}
 function visible(){return filterMedia(titles,filters);}
 function poster(t){const url=t.poster_url;if(!url||!/^https:\/\//i.test(url))return `<span class="media-poster media-poster-empty" aria-label="Sin carátula">${t.type==='Serie'?'📺':'🎬'}</span>`;return `<img class="media-poster" src="${esc(url)}" alt="Carátula de ${esc(t.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;}
 function results(){
  if(!$('media-results'))return;
  const rows=visible();$('media-count').textContent=`${rows.length} de ${titles.length} títulos`;
  $('media-copy').disabled=$('media-csv').disabled=!rows.length;
  if(!loaded){$('media-results').innerHTML='<div class="empty">No se pudo cargar el historial. Usa Reintentar para recuperarlo.</div>';return;}
  $('media-results').innerHTML=rows.length?`<div class="media-table-wrap"><table class="media-table"><thead><tr><th>Título</th><th>Visualización</th><th>Plataforma</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${rows.map(t=>{const d=datesOf(t),platforms=[...new Set(observations(t).map(v=>v.platform))];return `<tr><td><div class="media-title-cell">${poster(t)}<div><span class="media-kind">${t.type==='Serie'?'📺 Serie':'🎬 Película'}</span><h3>${esc(t.name)}</h3>${t.rating?`<span class="media-stars" aria-label="${t.rating} de 5 estrellas">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</span>`:''}</div></div></td><td class="media-date-cell"><span><small>Inicio</small>${shortDate(d.first)}</span><span><small>Finalizada</small>${shortDate(d.last)}</span></td><td class="media-platform-cell">${platforms.map(p=>`<span class="platform-tag ${p==='Netflix'?'netflix':''}">${esc(p)}</span>`).join('')}</td><td class="media-state-cell"><span class="media-state state-${STATUSES.indexOf(t.status)}">${esc(t.status)}</span></td><td class="media-actions"><button data-media-edit="${t.id}" class="button secondary" ${isOnline()?'':'disabled'} aria-label="Editar ${esc(t.name)}">Editar</button><button data-media-remove="${t.id}" class="text-button" ${isOnline()?'':'disabled'} aria-label="Eliminar ${esc(t.name)}">Eliminar</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">'+(titles.length?'No hay títulos con estos filtros.':'Todavía no hay títulos. Añade una película o serie para empezar.')+'</div>';
  $('media-results').querySelectorAll('[data-media-edit]').forEach(b=>b.onclick=()=>open(titles.find(t=>t.id===b.dataset.mediaEdit)));
  $('media-results').querySelectorAll('[data-media-remove]').forEach(b=>b.onclick=()=>remove(titles.find(t=>t.id===b.dataset.mediaRemove)));
  $('media-results').querySelectorAll('img').forEach(img=>img.onerror=()=>{img.outerHTML='<span class="media-poster media-poster-empty" title="La carátula no está disponible">🎬</span>';});
 }
 function viewRow(v={platform:'Netflix',start_date:'',last_date:''}){return `<div class="media-view-row"><div class="media-view-fields"><div><label>Plataforma<select data-view-platform aria-label="Plataforma de reproducción">${PLATFORMS.map(p=>opt(p,p,v.platform)).join('')}</select></label></div><div><label>Inicio<input type="date" data-view-start aria-label="Inicio" value="${esc(v.start_date||'')}" min="1900-01-01" max="2200-12-31"></label></div><div><label>Finalizada<input type="date" data-view-last aria-label="Finalizada" value="${esc(v.last_date||'')}" min="1900-01-01" max="2200-12-31"></label></div></div><button type="button" class="text-button" data-view-remove>Quitar registro</button></div>`;}
 function wireViews(){document.querySelectorAll('[data-view-remove]').forEach(b=>b.onclick=async()=>{if(await confirmDelete())b.closest('.media-view-row').remove();});}
 function open(record=null){
  if(!canEdit())return;current=record;coverRequest++;$('media-editor-title').textContent=record?'Editar título':'Añadir título';$('media-error').classList.add('hidden');$('media-delete').classList.toggle('hidden',!record);
  const t=record||{name:'',type:'Película',status:'Pendiente',notes:'',poster_url:'',rating:null};
  $('media-fields').innerHTML=input('media-name','Nombre del título','text',t.name,'required maxlength="180" placeholder="Una historia para nuestra lista…"')+`<div class="form-row"><div><label for="media-edit-type">Tipo</label><select id="media-edit-type">${opt('Película','🎬 Película',t.type)}${opt('Serie','📺 Serie',t.type)}</select></div><div><label for="media-status">Estado</label><select id="media-status">${STATUSES.map(s=>opt(s,s,t.status)).join('')}</select></div></div><div class="media-rating-field"><label for="media-rating">Tu calificación · opcional</label><select id="media-rating">${opt('','Sin calificar',t.rating?'':null)}${[1,2,3,4,5].map(n=>opt(String(n),'★'.repeat(n),String(t.rating))).join('')}</select></div><div class="media-history-heading"><h3>Historial de visualizaciones</h3><p>Una serie, un título. Puedes añadir otra reproducción sin duplicarlo.</p></div><div id="media-views">${(record?observations(record):[{platform:'Netflix',start_date:'',last_date:''}]).map(viewRow).join('')}</div><button type="button" id="media-add-view" class="button secondary">+ Otra visualización</button><label for="media-notes">Notas · opcional</label><textarea id="media-notes" maxlength="4000">${esc(t.notes||'')}</textarea><div class="media-history-heading"><h3>Carátula desde un enlace</h3><p>Solo se guarda el enlace. Al pulsar Buscar en Cinemeta se envía el nombre a ese catálogo externo, sin tus fechas ni datos personales.</p></div>${input('media-poster','Enlace HTTPS de la carátula · opcional','url',t.poster_url,'maxlength="2000" placeholder="https://…"')}<input type="hidden" id="media-poster-source" value="${esc(t.poster_source||'')}"><button type="button" id="media-find-cover" class="button secondary">Buscar en Cinemeta</button><p id="media-cover-status" role="status"></p><div id="media-cover-options" class="media-cover-options"></div>`;
  $('media-add-view').onclick=()=>{if(document.querySelectorAll('.media-view-row').length>=200){fail('Se permiten hasta 200 registros.');return;}$('media-views').insertAdjacentHTML('beforeend',viewRow());wireViews();};wireViews();
  $('media-poster').oninput=()=>{$('media-poster-source').value='';};
  $('media-find-cover').onclick=searchCover;
  $('media-editor').showModal();$('media-name').focus();
 }
 async function searchCover(){
  const name=$('media-name').value.trim();if(!name){fail('Escribe primero el nombre del título.');return;}
  const request=++coverRequest;$('media-find-cover').disabled=true;$('media-cover-status').textContent='Buscando carátulas…';$('media-cover-options').innerHTML='';
  try{const options=await findCovers(name,$('media-edit-type').value);if(request!==coverRequest||!$('media-editor').open)return;$('media-cover-status').textContent=options.length?'Toca la carátula correcta. Esto no cambia tu título ni tus fechas.':'No se encontró una coincidencia. Prueba el nombre original o pega un enlace de imagen.';
   $('media-cover-options').innerHTML=options.map((c,i)=>`<button type="button" data-cover="${i}"><img src="${esc(c.url)}" alt="${esc(c.name)}" loading="lazy" referrerpolicy="no-referrer"><span>${esc(c.name)}<small>${esc(c.year)}</small></span></button>`).join('');
   $('media-cover-options').querySelectorAll('[data-cover]').forEach(b=>b.onclick=()=>{const c=options[+b.dataset.cover];$('media-poster').value=c.url;$('media-poster-source').value=c.source;$('media-cover-status').textContent='Carátula seleccionada. Pulsa Guardar.';$('media-cover-options').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));});
  }catch(e){if(request===coverRequest)$('media-cover-status').textContent=e.message;}finally{if(request===coverRequest)$('media-find-cover').disabled=false;}
 }
 $('media-form').onsubmit=async e=>{
  e.preventDefault();if(working||!canEdit())return;
  const title={name:$('media-name').value.trim(),type:$('media-edit-type').value,status:$('media-status').value,completed_on:$('media-status').value==='Terminada'?current?.completed_on||null:null,rating:$('media-rating').value?Number($('media-rating').value):null,notes:$('media-notes').value.trim(),poster_url:$('media-poster').value.trim()||null,poster_source:$('media-poster-source').value,updated_by:person()};
  const views=[...document.querySelectorAll('.media-view-row')].map(el=>({platform:el.querySelector('[data-view-platform]').value,start_date:el.querySelector('[data-view-start]').value||null,last_date:el.querySelector('[data-view-last]').value||null}));
  const issue=validateMedia(title,views);if(issue){fail(issue);return;}
  const duplicate=titles.find(t=>t.id!==current?.id&&t.type===title.type&&normalizeTitle(t.name)===normalizeTitle(title.name));
  if(duplicate){fail('Este título ya existe. Cierra este formulario, búscalo y usa Editar → Otra visualización para añadirlo a su historial.');return;}
  coverRequest++;lock(true);
  try{
   await api('rpc/df_media_save',{method:'POST',body:{p_title:title,p_views:views,p_id:current?.id||null,p_version:current?.version||null}});
   $('media-editor').close();current=null;working=false;await load();if($('media-library'))render($('content'));toast('Título guardado para los dos.');
  }catch(e){fail(e.message);}finally{lock(false);}
 };
 async function remove(record){if(!record||working||!canEdit()||!await confirmDelete())return;lock(true);try{const result=await api(`df_media_titles?id=eq.${record.id}&version=eq.${record.version}`,{method:'DELETE'});if(!result?.length)throw Error('El título cambió en el otro teléfono. Actualiza antes de eliminar.');$('media-editor').close();current=null;working=false;await load();if($('media-library'))render($('content'));toast('Título y sus visualizaciones eliminados.');}catch(e){if($('media-editor').open)fail(e.message);else toast(e.message);}finally{lock(false);}}
 $('media-delete').onclick=()=>remove(current);
 return {load,render,open,isBusy:()=>working};
}
