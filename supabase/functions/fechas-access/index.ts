const allowedOrigin='https://fravier3.github.io';
const cors={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'content-type, apikey, authorization, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
const reply=(data:unknown,status=200,extra:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers:{...cors,...extra}});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
  const origin=req.headers.get('origin');if(origin&&origin!==allowedOrigin)return reply({error:'origin_not_allowed'},403);
  if(Number(req.headers.get('content-length')||0)>1024)return reply({error:'invalid_format'},400);
  try{
    const raw=await req.text();if(raw.length>1024)return reply({error:'invalid_format'},400);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'invalid_format'},400);}
    if(typeof body?.code!=='string'||!/^\d{4}$/.test(body.code))return reply({error:'invalid_format'},400);
    // Supabase's gateway supplies the forwarding address; only its SHA-256 is retained.
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('fechasdf-access:'+ip));
    const ipHash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const url=Deno.env.get('SUPABASE_URL');if(!key||!url)return reply({error:'unavailable'},503);
    const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
    if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
    const response=await fetch(url+'/rest/v1/rpc/df_exchange_pin',{method:'POST',headers,body:JSON.stringify({p_code:body.code,p_ip_hash:ipHash}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)return reply({error:'unavailable'},503);
    const result=await response.json();
    if(result.ok===true)return reply({access:result.access});
    if(result.error==='rate_limited')return reply({error:result.error,retry_after:result.retry_after},429,{'Retry-After':String(result.retry_after)});
    return reply({error:result.error==='incorrect_code'?'incorrect_code':'unavailable'},result.error==='incorrect_code'?401:503);
  }catch{return reply({error:'unavailable'},503);}
});
