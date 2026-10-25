export const VERSION = '1.0.2';
export const COLORS = ['rose', 'lavender', 'sky', 'mint', 'peach', 'butter'];
export const localISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function parseISO(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d,12); }
export function validDate(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && localISO(parseISO(iso)) === iso && Number(iso.slice(0,4)) >= 1900 && Number(iso.slice(0,4)) <= 2200; }
export function fullDate(iso) { return parseISO(iso).toLocaleDateString('es', {day:'numeric',month:'long',year:'numeric'}); }
export function prettyRange(start,end) {
  const a=parseISO(start), b=end?parseISO(end):null;
  const month=d=>d.toLocaleDateString('es',{month:'long'});
  if(!b || start===end) return {main:`${a.getDate()} de ${month(a)}`,year:String(a.getFullYear())};
  if(a.getFullYear()!==b.getFullYear()) return {main:`${a.getDate()} ${a.toLocaleDateString('es',{month:'short'})} ${a.getFullYear()} – ${b.getDate()} ${b.toLocaleDateString('es',{month:'short'})} ${b.getFullYear()}`,year:''};
  if(a.getMonth()===b.getMonth()) return {main:`${a.getDate()}–${b.getDate()} de ${month(a)}`,year:String(a.getFullYear())};
  return {main:`${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`,year:String(a.getFullYear())};
}
export function eventsOnDate(events,iso) { return events.filter(e => (iso>=e.start_date && iso<=(e.end_date||e.start_date)) || (e.annual && (!e.end_date || e.end_date===e.start_date) && iso>=e.start_date && iso.slice(5)===e.start_date.slice(5))); }
export function monthCells(year,month) { const first=new Date(year,month,1,12); const offset=(first.getDay()+6)%7; const count=Math.ceil((offset+new Date(year,month+1,0).getDate())/7)*7;return Array.from({length:count},(_,i)=>localISO(new Date(year,month,1-offset+i,12))); }
export function daysBetween(a,b) {const utc=iso=>{const [y,m,d]=iso.split('-').map(Number);return Date.UTC(y,m-1,d)};return Math.round((utc(b)-utc(a))/86400000);}
export function nextAnnual(events,today=localISO()) { return events.filter(e=>e.annual).map(e=>{let next=`${today.slice(0,4)}-${e.start_date.slice(5)}`;if(next<today)next=`${Number(today.slice(0,4))+1}-${e.start_date.slice(5)}`;return {...e,next};}).sort((a,b)=>a.next.localeCompare(b.next))[0]; }
export function validateEvent(event) { if(!event.title?.trim())return 'Escribe el nombre del evento.';if(!validDate(event.start_date))return 'Selecciona una fecha válida entre 1900 y 2200.';if(event.end_date && (!validDate(event.end_date)||event.end_date<event.start_date))return 'La fecha final debe ser igual o posterior a la inicial.';if(event.annual&&event.end_date&&event.end_date!==event.start_date)return 'Los aniversarios anuales necesitan una sola fecha; desmarca la repetición para guardar un viaje por rango.';return ''; }
export const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
