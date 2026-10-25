export function validAccessCode(code){return typeof code==='string'&&/^\d{4}$/.test(code);}
export async function unlockWithCode(code,{url,key,fetcher=fetch}){
 if(!validAccessCode(code))throw Error('Escribe los cuatro números del código.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
 try{
  const response=await fetcher(url+'/functions/v1/fechas-access',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({code}),cache:'no-store',signal:controller.signal});
  const data=await response.json();
  if(response.status===429)throw Error('Demasiados intentos. Intenta de nuevo en '+Math.max(1,Math.ceil((data.retry_after||900)/60))+' minutos.');
  if(response.status===401)throw Error('El código no es correcto. Intenta otra vez.');
  if(!response.ok||typeof data.access!=='string'||!/^[A-Za-z0-9_-]{40,64}$/.test(data.access))throw Error('No pudimos abrir el espacio. Intenta de nuevo en unos momentos.');
  return data.access;
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('No se pudo conectar. Revisa tu conexión e intenta otra vez.');throw error;}finally{clearTimeout(timer);}
}
