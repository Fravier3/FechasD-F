import { VERSION, ICON_URL, COLORS, localISO, parseISO, validDate, fullDate, prettyRange, eventsOnDate, monthCells, daysBetween, nextAnnual, validateEvent, recurrenceInfo, escapeHTML as esc } from './core.js';
import { createUpdateManager, safeToReload } from './updates.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { unlockWithCode } from './access.js';
import { createMediaLibrary } from './media.js';

const $ = id => document.getElementById(id);
const STORAGE = 'fechasdf-v1';
const store = { get(key,fallback=null) {try{return JSON.parse(localStorage.getItem(`${STORAGE}:${key}`))??fallback}catch{return fallback}}, set(key,value){try{localStorage.setItem(`${STORAGE}:${key}`,JSON.stringify(value));return true}catch{return false}} };
const paths={
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-13 5h2m4 0h2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  plane:'<path d="m22 2-7 20-4-9-9-4L22 2Zm0 0L11 13"/>',
  sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-1v4m-2-2h4"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-8h6v8"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',
  pencil:'<path d="m16 3 5 5L9 20l-6 1 1-6L16 3Zm-2 2 5 5"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>','chevron-left':'<path d="m15 6-6 6 6 6"/>','chevron-right':'<path d="m9 6 6 6-6 6"/>',
  link:'<path d="m10 13 4-4m-5-2 3-3a5 5 0 0 1 7 7l-3 3M8 10l-3 3a5 5 0 0 0 7 7l3-3"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12a20 20 0 0 0 18 0M12 11v4"/>',
  book:'<path d="M12 6C7 2 2 4 2 4v16s5-2 10 2c5-4 10-2 10-2V4s-5-2-10 2Zm0 0v16"/>',
  tv:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 2 4 4 4-4M8 23h8m-6-13 5 3-5 3z"/>',
  music:'<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  check:'<path d="m5 12 4 4L19 6"/>', refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>'
};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.heart}</svg>`;
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
const sections=[['dashboard','grid','Dashboard'],['calendar','calendar','Calendario'],['diana','user','Diana'],['fran','user','Fran'],['training','tv','Entretenimiento']];
document.querySelectorAll('.desktop-nav,.bottom-nav').forEach(nav=>nav.innerHTML=sections.map(([id,glyph,label])=>`<a class="nav-link" href="#${id}" data-section="${id}">${icon(glyph)}<span>${label}</span></a>`).join(''));
hydrate();
let access=store.get('access','');
const inbound=new URLSearchParams(location.hash.slice(1)).get('access');
if(inbound && /^[A-Za-z0-9_-]{40,64}$/.test(inbound)){access=inbound;store.set('access',access);history.replaceState(null,'',location.pathname+location.search+'#dashboard');}
let person=store.get('person');if(!['Fran','Diana'].includes(person))person=null;
let events=[],details=[],verified=false,online=false,loading=false,section='dashboard',editing=null,toastTimer,deleteResolve,busy=false;
let monthDate=new Date();monthDate=new Date(monthDate.getFullYear(),monthDate.getMonth(),1,12);
let selectedDate=localISO(),lastSync=0;
const media=createMediaLibrary({api,canEdit,isOnline:()=>online,person:()=>nowName(),toast,confirmDelete,storage:store,access:()=>access});
const nowName=()=>person||'Fran';
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4500);}
function updateProfile(){ $('profile-initial').textContent=person?.[0]||'?';$('profile-name').textContent=person||'Elegir'; }
function setStatus(text,isOnline=online){$('sync-label').textContent=text;$('sync').classList.toggle('offline',!isOnline);$('sync').title=text+' · Toca para actualizar';}
function alertNotice(message=''){const el=$('notice');el.textContent=message;el.classList.toggle('hidden',!message);}
function privateURL(){return new URL('./',location.href).href;}
async function api(path,{method='GET',body}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
  try{
    const response=await fetch(SUPABASE_URL+'/rest/v1/'+path,{method,headers:{apikey:SUPABASE_KEY,'x-client-info':'fechasdf/'+access,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:controller.signal});
    const text=await response.text();let payload;try{payload=text?JSON.parse(text):null}catch{throw Error('No se pudo leer la respuesta. Intenta de nuevo.');}
    if(!response.ok){if(response.status===401||response.status===403)throw Error('No se pudo verificar el acceso. Escribe el código nuevamente.');if(payload?.code==='23505')throw Error('Este título o reproducción ya existe. Edita el registro existente.');if(payload?.code==='P0001')throw Error(payload.message);throw Error(payload?.message?.includes('check constraint')?'Revisa las fechas y los campos del formulario.':'No se pudo guardar o cargar. Vuelve a intentarlo.');}
    return payload;
  }catch(err){if(err.name==='AbortError')throw Error('La conexión tardó demasiado. Intenta de nuevo.');if(err instanceof TypeError)throw Error('Sin conexión. Conecta el teléfono y vuelve a intentar.');throw err;}finally{clearTimeout(timer);}
}
function restoreSnapshot(){const cache=store.get('snapshot');if(cache?.access===access&&Array.isArray(cache.events)&&Array.isArray(cache.details)){events=cache.events;details=cache.details;return true;}return false;}
async function sync({silent=false}={}){
  if(!access||loading||busy||media.isBusy())return;
  loading=true;setStatus('Sincronizando…');
  try{
    const allowed=await api('rpc/df_has_access',{method:'POST',body:{}});
    if(allowed!==true){verified=false;online=false;events=[];details=[];access='';store.set('access','');renderAccess('Escribe el código para entrar a su espacio.');return;}
    const [remoteEvents,remoteDetails]=await Promise.all([api('df_events?select=*&order=start_date.asc,created_at.asc'),api('df_details?select=*&order=sort_order.asc,created_at.asc')]);
    events=remoteEvents;details=remoteDetails;verified=true;online=true;lastSync=Date.now();
    await media.load();
    store.set('snapshot',{access,events,details});setStatus('Sincronizado',true);alertNotice();renderSection();
    if(!person&&!$('chooser').open)showChooser();
  }catch(err){online=false;setStatus('Sin conexión',false);if(!verified&&restoreSnapshot())verified=true;if(verified){renderSection();alertNotice('Sin sincronizar. Puedes consultar la última copia guardada; conecta el teléfono para editar.');}else renderAccess(err.message);if(!silent)toast(err.message);}finally{loading=false;}
}
function showChooser(){if(busy)return;$('chooser-close').classList.toggle('hidden',!person);$('chooser').showModal();}
$('chooser').addEventListener('cancel',e=>{if(!person)e.preventDefault();});
document.querySelectorAll('[data-person]').forEach(button=>button.onclick=()=>{person=button.dataset.person;if(!store.set('person',person))toast('Este navegador no permite recordar el perfil.');updateProfile();$('chooser').close();renderSection();});
$('chooser-close').onclick=()=>$('chooser').close();$('profile').onclick=showChooser;
$('share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'Nuestro espacio · Fran & Diana',url:privateURL()});else{await navigator.clipboard.writeText(privateURL());toast('Enlace de la app copiado.');}}catch(err){if(err.name!=='AbortError')toast('No se pudo compartir el enlace.');}};
$('chooser-share').onclick=()=>$('share').click();
$('sync').onclick=()=>sync();
function route(){const key=location.hash.slice(1);section=sections.some(([id])=>id===key)?key:'dashboard';if(!access){renderAccess();return;}if(verified)renderSection();}
window.addEventListener('hashchange',route);
function renderAccess(message='Escribe el código que comparten para entrar.'){
  $('add').classList.add('hidden');$('page-title').textContent='Nuestro espacio.';$('page-description').textContent='Sus recuerdos, en un solo lugar.';$('eyebrow').textContent='FRAN & DIANA';
  $('content').innerHTML=`<div class="access-screen"><img src="${ICON_URL}" alt="Una pareja con corazones"><h2>Bienvenidos a su espacio</h2><p>${esc(message)}</p><form id="access-form"><label for="access-code">Código de acceso</label><input id="access-code" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" placeholder="• • • •" required autocomplete="off" aria-describedby="access-hint"><p id="access-hint" class="access-hint">Son cuatro números. Este teléfono recordará el acceso.</p><p id="access-error" class="form-error hidden" role="alert"></p><button id="access-submit" class="button primary full">Entrar</button></form></div>`;
  $('access-code').oninput=()=>{$('access-code').value=$('access-code').value.replace(/\D/g,'').slice(0,4);$('access-error').classList.add('hidden');};
  $('access-form').onsubmit=async e=>{
    e.preventDefault();if(busy)return;busy=true;const button=$('access-submit');button.disabled=true;button.textContent='Abriendo…';
    try{const token=await unlockWithCode($('access-code').value,{url:SUPABASE_URL,key:SUPABASE_KEY});access=token;store.set('access',access);verified=false;events=[];details=[];busy=false;await sync();}
    catch(error){$('access-error').textContent=error.message;$('access-error').classList.remove('hidden');$('access-code').select();}
    finally{busy=false;if(button.isConnected){button.disabled=false;button.textContent='Entrar';}}
  };
}
const personName=p=>details.find(d=>d.person===p&&d.label.toLowerCase()==='nombre completo')?.value||p;
function renderSection(){
  if(!verified)return;
  document.querySelectorAll('[data-section]').forEach(el=>{el.classList.toggle('active',el.dataset.section===section);if(el.dataset.section===section)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('add').classList.remove('hidden');$('add').disabled=!online;
  const setting={dashboard:['NUESTRA HISTORIA','Fechas que nos unen','Cada momento importante, siempre cerquita.','Añadir fecha'],calendar:['DÍA A DÍA','Nuestro calendario','Un día cualquiera puede convertirse en un gran recuerdo.','Nuevo evento'],training:['PARA RECORDAR','Entretenimiento','Nuestro historial de películas y series, en un solo lugar.','Añadir título'],diana:['CONOCERNOS MEJOR','Los detalles de Diana','Pequeñas cosas que la hacen única.','Añadir detalle'],fran:['CONOCERNOS MEJOR','Los detalles de Fran','Pequeñas cosas que lo hacen único.','Añadir detalle']}[section];
  $('eyebrow').textContent=setting[0];$('page-title').innerHTML=esc(setting[1])+'<span>.</span>';$('page-description').textContent=setting[2];$('add-label').textContent=setting[3];
  if(section==='dashboard')renderDashboard();else if(section==='calendar')renderCalendar();else if(section==='training')media.render($('content'));else renderDetails(section==='diana'?'Diana':'Fran');
}
function eventCard(e){const formatted=prettyRange(e.start_date,e.end_date);return `<article class="date-card ${COLORS.includes(e.color)?e.color:'rose'}"><div class="card-top"><div class="card-icon">${icon(e.icon)}</div><button class="card-edit" data-edit-event="${esc(e.id)}" aria-label="Editar ${esc(e.title)}" ${online?'':'disabled'}>${icon('pencil')}</button></div><h3>${esc(e.title)}</h3><p class="date-value">${esc(formatted.main)}</p>${formatted.year?`<span class="date-year">${formatted.year}</span>`:''}${e.place?`<p class="date-location">${icon('pin')}${esc(e.place)}</p>`:''}${e.notes?`<div class="notes">${esc(e.notes)}</div>`:''}</article>`;}
function wireEventEdits(root=$('content')){root.querySelectorAll('[data-edit-event]').forEach(b=>b.onclick=()=>openEvent(events.find(e=>e.id===b.dataset.editEvent)));}
function renderDashboard(){
  const milestones=events.filter(e=>e.show_dashboard),first=events[0],days=first?Math.max(0,daysBetween(first.start_date,localISO())):0;
  const next=nextAnnual(events),left=next?daysBetween(localISO(),next.next):0;
  $('content').innerHTML=`<div class="dashboard-overview"><div class="story-card"><div><p class="eyebrow">FRAN & DIANA PAOLA</p><h2>${first?days.toLocaleString('es')+' días de recuerdos':'Nuestra historia empieza aquí'}</h2><p>${first?'Desde el '+esc(fullDate(first.start_date)):'Añadan su primera fecha importante.'}</p></div><img class="story-art" src="${ICON_URL}" alt="Una pareja con corazones"></div><div class="next-card"><span class="next-icon">${icon('heart')}</span><div><p class="eyebrow">PRÓXIMA FECHA ESPECIAL</p><strong>${next?esc(next.title):'Más historias por vivir'}</strong><p>${next?(left===0?'¡Es hoy!':`En ${left} días · ${esc(prettyRange(next.next).main)}`):'Marca una fecha para repetir cada año.'}</p></div></div></div><div class="section-subhead"><h2>Nuestros momentos</h2><span>${milestones.length} fechas importantes</span></div><div class="dates-grid">${milestones.length?milestones.map(eventCard).join(''):`<div class="empty">${icon('heart')}Aún no hay fechas destacadas.<br><button class="button primary" id="empty-add">Añadir nuestra primera fecha</button></div>`}</div>`;
  wireEventEdits();if($('empty-add'))$('empty-add').onclick=()=>openEvent();
}
function detailIcon(label){const s=label.toLowerCase();if(s.includes('nacimiento'))return 'gift';if(s.includes('trabajo')||s.includes('ocupación'))return 'briefcase';if(s.includes('profesión'))return 'book';if(s.includes('pasatiempo'))return 'music';if(s.includes('padre')||s.includes('madre')||s.includes('nombre'))return 'user';return 'heart';}
function renderDetails(who){const rows=details.filter(d=>d.person===who);$('content').innerHTML=`<div class="profile-banner ${who==='Fran'?'fran-theme':''}"><span class="avatar ${who.toLowerCase()}">${who[0]}</span><div><p class="eyebrow">TODO SOBRE ${who.toUpperCase()}</p><h2>${esc(personName(who))}</h2><p>${rows.length} detalles para recordar</p></div></div><div class="details-grid">${rows.length?rows.map(d=>`<article class="detail-card"><span class="detail-symbol">${icon(detailIcon(d.label))}</span><div class="detail-body"><h3>${esc(d.label)}</h3><p>${esc(d.kind==='date'&&validDate(d.value)?fullDate(d.value):d.value)}</p></div><button class="card-edit" data-edit-detail="${esc(d.id)}" aria-label="Editar ${esc(d.label)}" ${online?'':'disabled'}>${icon('pencil')}</button></article>`).join(''):`<div class="empty">Aún no hay detalles. Añade el primero.</div>`}</div>`;$('content').querySelectorAll('[data-edit-detail]').forEach(b=>b.onclick=()=>openDetail(who,details.find(d=>d.id===b.dataset.editDetail)));}
function birthdayEvents(){return details.filter(d=>d.kind==='date'&&d.label.toLowerCase().includes('nacimiento')&&validDate(d.value)).map(d=>({id:'birthday-'+d.id,detailId:d.id,person:d.person,title:'Cumpleaños de '+d.person,start_date:d.value,end_date:null,annual:true,color:d.person==='Fran'?'mint':'lavender',place:'',notes:'',icon:'gift'}));}
function calendarEvents(){return [...events,...birthdayEvents()];}
function renderCalendar(){
  const y=monthDate.getFullYear(),m=monthDate.getMonth(),cells=monthCells(y,m),today=localISO(),all=calendarEvents();
  const monthLabel=monthDate.toLocaleDateString('es',{month:'long',year:'numeric'});
  const agenda=all.map(e=>{const hit=cells.find(iso=>parseISO(iso).getMonth()===m&&eventsOnDate([e],iso).length);return hit?{...e,occurrence:hit}:null;}).filter(Boolean).sort((a,b)=>a.occurrence.localeCompare(b.occurrence));
  $('content').innerHTML=`<div class="calendar-layout"><div class="calendar-panel"><div class="calendar-toolbar"><h2>${esc(monthLabel)}</h2><div class="calendar-controls"><button id="prev-month" class="icon-button" aria-label="Mes anterior">${icon('chevron-left')}</button><button id="today-month" class="today-button">Hoy</button><button id="next-month" class="icon-button" aria-label="Mes siguiente">${icon('chevron-right')}</button></div></div><div class="weekdays">${['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(s=>`<span>${s}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="${esc(monthLabel)}">${cells.map(iso=>{const date=parseISO(iso),dayEvents=eventsOnDate(all,iso);return `<button class="calendar-day ${date.getMonth()!==m?'outside':''} ${dayEvents.length?'has-event':''} ${iso===selectedDate?'selected':''} ${iso===today?'is-today':''}" data-day="${iso}" aria-label="${esc(fullDate(iso))}${dayEvents.length?', '+dayEvents.length+' eventos':''}" ${iso===today?'aria-current="date"':''}><span>${date.getDate()}</span><span class="day-dots">${dayEvents.slice(0,3).map(()=>'<i></i>').join('')}</span></button>`}).join('')}</div><div class="calendar-legend"><i></i>Un recuerdo o evento · Toca un día para ver o añadir</div></div><div class="month-agenda"><h3>Este mes, en nuestra historia</h3>${agenda.length?agenda.map(e=>`<button class="agenda-item" data-agenda="${e.occurrence}"><span class="agenda-date">${parseISO(e.occurrence).getDate()}<small>${parseISO(e.occurrence).toLocaleDateString('es',{month:'short'})}</small></span><span><h4>${esc(e.title)}</h4><p>${e.place?esc(e.place):e.annual?'Una fecha para celebrar':'Nuestro recuerdo'}</p><p class="occurrence-date">${esc(prettyRange(e.start_date,e.end_date).main)} ${esc(prettyRange(e.start_date,e.end_date).year)}</p>${originalYearNote(e,e.occurrence)}</span>${icon('chevron-right')}</button>`).join(''):'<p class="no-events">Este mes está listo para nuevos recuerdos.</p>'}</div></div>`;
  $('prev-month').onclick=()=>{if(monthDate.getFullYear()>1900){monthDate=new Date(y,m-1,1,12);renderCalendar();}};$('next-month').onclick=()=>{if(monthDate.getFullYear()<2200){monthDate=new Date(y,m+1,1,12);renderCalendar();}};$('today-month').onclick=()=>{const now=new Date();monthDate=new Date(now.getFullYear(),now.getMonth(),1,12);selectedDate=localISO();renderCalendar();};
  $('content').querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day));$('content').querySelectorAll('[data-agenda]').forEach(b=>b.onclick=()=>openDay(b.dataset.agenda));
}
function originalYearNote(event,iso){const {note}=recurrenceInfo(event,iso);return note?`<p class="original-year-note">${esc(note)}</p>`:'';}
function openDay(iso){selectedDate=iso;renderCalendar();$('day-title').textContent=fullDate(iso);const matches=eventsOnDate(calendarEvents(),iso);$('day-events').innerHTML=matches.length?matches.map(e=>`<article class="day-event ${e.color}"><h3>${esc(e.title)}</h3><p>${esc(prettyRange(e.start_date,e.end_date).main)} ${esc(prettyRange(e.start_date,e.end_date).year)}${e.annual?' · Cada año':''}</p>${e.place?`<p>${esc(e.place)}</p>`:''}${e.notes?`<p>${esc(e.notes)}</p>`:''}${originalYearNote(e,iso)}<button class="button secondary" data-day-edit="${esc(e.id)}" ${online?'':'disabled'}>Editar ${e.detailId?'detalle':'evento'}</button></article>`).join(''):'<p class="no-events">Todavía no hay eventos para este día.</p>';
  $('day-events').querySelectorAll('[data-day-edit]').forEach(b=>b.onclick=()=>{const e=matches.find(x=>x.id===b.dataset.dayEdit);$('day-dialog').close();if(e.detailId)openDetail(e.person,details.find(d=>d.id===e.detailId));else openEvent(e);});$('day-add').disabled=!online;$('day-dialog').showModal();}
$('day-close').onclick=()=>$('day-dialog').close();$('day-add').onclick=()=>{$('day-dialog').close();openEvent(null,selectedDate,false);};
const field=(id,label,type,value='',attrs='')=>`<label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${attrs}>`;
const option=(val,label,current)=>`<option value="${val}" ${val===current?'selected':''}>${label}</option>`;
function canEdit(){if(!person){showChooser();return false;}if(!online){toast('Conecta el teléfono para editar sin perder cambios.');return false;}return true;}
function prepareEditor(type,record,title){if(!canEdit())return false;editing={type,record};$('editor-title').textContent=title;$('editor-kicker').textContent=type==='event'?'NUESTRA HISTORIA':'LOS PEQUEÑOS DETALLES';$('form-error').classList.add('hidden');$('delete-record').classList.toggle('hidden',!record);$('save-record').disabled=false;return true;}
function openEvent(record=null,date=null,dashboard=true){if(!prepareEditor('event',record,record?'Editar fecha':'Añadir fecha'))return;
  const e=record||{title:'',start_date:date||'',end_date:'',place:'',notes:'',color:COLORS[events.length%COLORS.length],icon:'heart',annual:false,show_dashboard:dashboard};
  $('editor-fields').innerHTML=field('event-title','Nombre del evento','text',e.title,'required maxlength="120" placeholder="Un momento importante…"')+`<div class="form-row"><div>${field('start-date','Fecha inicial','date',e.start_date,'required min="1900-01-01" max="2200-12-31"')}</div><div>${field('end-date','Fecha final · opcional','date',e.end_date||'','min="1900-01-01" max="2200-12-31"')}</div></div>`+field('event-place','Lugar · opcional','text',e.place,'maxlength="180" placeholder="¿Dónde fue?"')+`<label for="event-notes">Detalles · opcional</label><textarea id="event-notes" maxlength="3000" placeholder="Un detalle que no quieren olvidar…">${esc(e.notes)}</textarea><div class="form-row"><div><label for="event-color">Color pastel</label><select id="event-color">${COLORS.map((c,i)=>option(c,['Rosa','Lavanda','Azul cielo','Menta','Durazno','Amarillo'][i],e.color)).join('')}</select></div><div><label for="event-icon">Icono</label><select id="event-icon">${['heart','plane','calendar','sparkles','gift','home'].map((c,i)=>option(c,['Corazón','Viaje','Calendario','Compromiso','Celebración','Visita'][i],e.icon)).join('')}</select></div></div><label class="check-label"><input type="checkbox" id="event-annual" ${e.annual?'checked':''}>Repetir cada año en el calendario (una sola fecha)</label><label class="check-label"><input type="checkbox" id="event-dashboard" ${e.show_dashboard?'checked':''}>Mostrar también en el Dashboard</label>`;
  $('editor').showModal();$('event-title').focus();
}
function openDetail(who,record=null){if(!prepareEditor('detail',record,record?'Editar detalle':'Añadir detalle'))return;editing.person=who;
  $('editor-fields').innerHTML=field('detail-label','Nombre del detalle','text',record?.label||'','required maxlength="100" placeholder="Por ejemplo: Comida favorita"')+`<label for="detail-kind">Tipo de dato</label><select id="detail-kind">${option('text','Texto',record?.kind||'text')}${option('date','Fecha',record?.kind)}</select><div id="detail-value-slot"></div>`;
  const renderValue=(value='')=>{$('detail-value-slot').innerHTML=$('detail-kind').value==='date'?field('detail-value','Fecha','date',value,'required min="1900-01-01" max="2200-12-31"'):`<label for="detail-value">Detalle de ${esc(who)}</label><textarea id="detail-value" required maxlength="2000" placeholder="Escribe el detalle…">${esc(value)}</textarea>`;};renderValue(record?.value||'');$('detail-kind').onchange=()=>{const value=$('detail-value').value;renderValue($('detail-kind').value==='text'||validDate(value)?value:'');};$('editor').showModal();$('detail-label').focus();
}
$('add').onclick=()=>{if(section==='training')media.open();else if(section==='diana'||section==='fran')openDetail(section==='diana'?'Diana':'Fran');else openEvent(null,section==='calendar'?selectedDate:null,section==='dashboard');};
function closeEditor(){if(busy)return;$('editor').close();editing=null;}
$('editor-close').onclick=$('cancel-edit').onclick=closeEditor;
$('editor').addEventListener('cancel',e=>{if(busy)e.preventDefault();else editing=null;});
function setBusy(value){busy=value;['save-record','delete-record','cancel-edit','editor-close','confirm-delete','confirm-cancel'].forEach(id=>$(id).disabled=value);$('save-record').textContent=value?'Guardando…':'Guardar';}
function formError(message){$('form-error').textContent=message;$('form-error').classList.remove('hidden');}
$('edit-form').onsubmit=async event=>{
  event.preventDefault();if(busy||!editing)return;let payload,table;
  if(editing.type==='event'){table='df_events';payload={title:$('event-title').value.trim(),start_date:$('start-date').value,end_date:$('end-date').value||null,place:$('event-place').value.trim(),notes:$('event-notes').value.trim(),color:$('event-color').value,icon:$('event-icon').value,annual:$('event-annual').checked,show_dashboard:$('event-dashboard').checked,updated_by:nowName()};const error=validateEvent(payload);if(error){formError(error);return;}}
  else{table='df_details';payload={person:editing.person,label:$('detail-label').value.trim(),value:$('detail-value').value.trim(),kind:$('detail-kind').value,sort_order:editing.record?.sort_order??(Math.max(0,...details.filter(d=>d.person===editing.person).map(d=>d.sort_order))+1),updated_by:nowName()};if(!payload.label||!payload.value){formError('Completa el nombre y el valor del detalle.');return;}if(payload.kind==='date'&&!validDate(payload.value)){formError('Selecciona una fecha válida.');return;}}
  setBusy(true);const original=editing.record;
  try{const result=await api(original?`${table}?id=eq.${encodeURIComponent(original.id)}&version=eq.${original.version}`:table,{method:original?'PATCH':'POST',body:payload});if(!result?.length)throw Error('Este registro cambió en el otro teléfono. Tus cambios siguen aquí: copia lo necesario y vuelve a abrir el registro para actualizarlo.');$('editor').close();editing=null;setBusy(false);await sync({silent:true});toast('Guardado para los dos.');}catch(err){formError(err.message);}finally{setBusy(false);}
};
function confirmDelete(){return new Promise(resolve=>{deleteResolve=resolve;$('confirm-dialog').showModal();});}
function resolveDelete(value){$('confirm-dialog').close();deleteResolve?.(value);deleteResolve=null;}
$('confirm-cancel').onclick=()=>resolveDelete(false);$('confirm-delete').onclick=()=>resolveDelete(true);$('confirm-dialog').addEventListener('cancel',()=>{deleteResolve?.(false);deleteResolve=null;});
$('delete-record').onclick=async()=>{if(!editing?.record||busy)return;if(!await confirmDelete())return;setBusy(true);const {record,type}=editing;try{const result=await api(`${type==='event'?'df_events':'df_details'}?id=eq.${encodeURIComponent(record.id)}&version=eq.${record.version}`,{method:'DELETE'});if(!result?.length)throw Error('El registro cambió en otro teléfono. Cierra y vuelve a abrirlo antes de eliminar.');$('editor').close();editing=null;setBusy(false);await sync({silent:true});toast('Registro eliminado.');}catch(err){formError(err.message);}finally{setBusy(false);}};
window.addEventListener('offline',()=>{online=false;setStatus('Sin conexión',false);if(verified){renderSection();alertNotice('Sin conexión. Mostrando la última copia guardada.');}});
window.addEventListener('online',()=>sync({silent:true}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){sync({silent:true});updater.check();}});
setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()-lastSync>25000)sync({silent:true});},30000);
const hasOpenWork=()=>busy||media.isBusy()||!!document.querySelector('dialog[open]')||!!document.querySelector('#access-code')?.value;
const updater=createUpdateManager({version:VERSION,canActivate:()=>!hasOpenWork(),canReload:()=>safeToReload({busy,dialogsOpen:hasOpenWork(),hidden:document.visibilityState!=='visible'}),onPending:()=>toast('Hay una actualización lista. Se aplicará cuando cierres el formulario.')});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>updater.resume()));
window.addEventListener('pageshow',()=>updater.check());
document.documentElement.dataset.appVersion=VERSION;
document.querySelector('.footer').insertAdjacentHTML('beforeend',`<span class="app-version" title="Versión instalada">v${esc(VERSION)}</span>`);
updateProfile();route();if(access){restoreSnapshot();sync();}updater.start();
