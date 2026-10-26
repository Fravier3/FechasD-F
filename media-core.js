import {validDate} from './core.js';
export const PLATFORMS=['Netflix','Disney+','Max','Prime Video','Apple TV+','Paramount+','Hulu','Peacock','Otra'];
export const STATUSES=['Sin confirmar','Pendiente','Viendo','Terminada'];
export const normalizeTitle=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
export const observations=t=>t.df_media_views||[];
export function datesOf(t){const v=observations(t),starts=v.map(x=>x.start_date).filter(Boolean).sort(),ends=v.map(x=>x.last_date||x.start_date).filter(Boolean).sort();return {first:starts[0]||'',last:ends.at(-1)||''};}
export function mediaStats(rows){const dates=rows.flatMap(t=>observations(t).flatMap(v=>[v.start_date,v.last_date])).filter(Boolean).sort();return {total:rows.length,series:rows.filter(t=>t.type==='Serie').length,movies:rows.filter(t=>t.type==='Película').length,first:dates[0]||'',last:dates.at(-1)||''};}
export function filterMedia(rows,{query='',type='',platform='',year='',order='desc'}={}){
 const q=normalizeTitle(query);
 return rows.filter(t=>(!q||normalizeTitle(t.name).includes(q))&&(!type||t.type===type)&&observations(t).some(v=>(!platform||v.platform===platform)&&(!year||(v.start_date&&v.start_date<=`${year}-12-31`&&(v.last_date||v.start_date)>=`${year}-01-01`)))).sort((a,b)=>{const x=datesOf(a).last,y=datesOf(b).last;return (order==='asc'?x.localeCompare(y):y.localeCompare(x))||a.name.localeCompare(b.name,'es');});
}
export function validateMedia(t,views){
 if(!t.name?.trim()||t.name.trim().length>180)return 'Escribe un título de hasta 180 caracteres.';
 if(!['Serie','Película'].includes(t.type)||!STATUSES.includes(t.status))return 'Selecciona un tipo y estado válidos.';
 if(t.rating!==null&&(!Number.isInteger(t.rating)||t.rating<1||t.rating>5))return 'La calificación debe ser de 1 a 5.';
 if((t.notes||'').length>4000)return 'Las notas no pueden exceder 4000 caracteres.';
 if(t.poster_url&&!/^https:\/\//i.test(t.poster_url))return 'La carátula debe ser un enlace HTTPS.';
 if(t.completed_on&&(!validDate(t.completed_on)||t.status!=='Terminada'))return 'La fecha de finalización requiere el estado Terminada.';
 if(!views.length||views.length>200)return 'Añade al menos una plataforma; se permiten hasta 200 registros.';
 const keys=new Set();
 for(const v of views){if(!PLATFORMS.includes(v.platform))return 'Selecciona una plataforma válida.';if(v.start_date&&!validDate(v.start_date)||v.last_date&&(!validDate(v.last_date)||!v.start_date||v.last_date<v.start_date))return 'Revisa las fechas: la última reproducción no puede ser anterior al inicio.';const key=JSON.stringify([v.platform,v.start_date||null,v.last_date||null]);if(keys.has(key))return 'Hay dos reproducciones iguales. Conserva solo una.';keys.add(key);}
 if(t.completed_on&&views.some(v=>(v.last_date||v.start_date||'')>t.completed_on))return 'La finalización no puede ser anterior a una reproducción registrada.';
 return '';
}
export const shortDate=s=>s?s.split('-').reverse().join('/'):'—';
export function mediaText(rows){return rows.map(t=>`${t.name} | ${t.type} | ${observations(t).map(v=>`${v.platform}: ${shortDate(v.start_date)}${v.last_date&&v.last_date!==v.start_date?' – '+shortDate(v.last_date):''}`).join('; ')} | ${t.status}`).join('\n');}
const csvCell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
export function mediaCSV(rows){const out=[['Título','Tipo','Fecha de visualización','Fecha de inicio','Última reproducción','Fecha de finalización confirmada','Plataforma','Estado','Calificación','Notas']];for(const t of rows)for(const v of observations(t))out.push([t.name,t.type,t.type==='Película'?shortDate(v.start_date):'',t.type==='Serie'?shortDate(v.start_date):'',shortDate(v.last_date),t.completed_on?shortDate(t.completed_on):'',v.platform,t.status,t.rating,t.notes]);return '\uFEFF'+out.map(r=>r.map(csvCell).join(',')).join('\r\n');}
