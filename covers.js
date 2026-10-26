import {normalizeTitle} from './media-core.js';
// Metadata only: no video sources, downloads, API secrets, or image storage.
export async function findCovers(name,type,{fetcher=fetch}={}){
 const kind=type==='Serie'?'series':'movie';
 const r=await fetcher(`https://v3-cinemeta.strem.io/catalog/${kind}/top/search=${encodeURIComponent(name.trim())}.json`,{referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('No se pudieron buscar carátulas. Intenta de nuevo.');
 const data=await r.json();
 return (data.metas||[]).filter(m=>/^tt\d+$/.test(m.id)&&/^https:\/\//.test(m.poster||'')).slice(0,12).map(m=>({name:m.name,year:String(m.releaseInfo||m.year||''),url:m.poster,source:`https://www.imdb.com/title/${m.id}/`}));
}
export function exactCover(candidates,name){const hits=candidates.filter(c=>normalizeTitle(c.name)===normalizeTitle(name));return hits.length===1?hits[0]:null;}
