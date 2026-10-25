create schema if not exists private;
create table private.df_pin_config (
 id integer primary key check(id=1),
 pin_hash text not null,
 access_token text not null,
 failures integer not null default 0,
 window_start timestamptz not null default now()
);
create table private.df_pin_attempts (
 ip_hash text primary key,
 attempts integer not null default 0,
 window_start timestamptz not null default now()
);
alter table private.df_pin_config enable row level security;
alter table private.df_pin_attempts enable row level security;
revoke all on private.df_pin_config,private.df_pin_attempts from public,anon,authenticated;
create function public.df_exchange_pin(p_code text,p_ip_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.df_pin_config%rowtype; attempt private.df_pin_attempts%rowtype; wait_seconds integer;
begin
 if p_code is null or p_code !~ '^[0-9]{4}$' or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
   return jsonb_build_object('ok',false,'error','invalid_format');
 end if;
 select * into cfg from private.df_pin_config where id=1 for update;
 if not found then return jsonb_build_object('ok',false,'error','not_configured'); end if;
 if cfg.window_start < now()-interval '15 minutes' then
   update private.df_pin_config set failures=0,window_start=now() where id=1 returning * into cfg;
 end if;
 insert into private.df_pin_attempts(ip_hash) values(p_ip_hash) on conflict do nothing;
 select * into attempt from private.df_pin_attempts where ip_hash=p_ip_hash for update;
 if attempt.window_start < now()-interval '15 minutes' then
   update private.df_pin_attempts set attempts=0,window_start=now() where ip_hash=p_ip_hash returning * into attempt;
 end if;
 if attempt.attempts>=5 or cfg.failures>=60 then
   wait_seconds=greatest(1,ceil(extract(epoch from ((case when attempt.attempts>=5 then attempt.window_start else cfg.window_start end)+interval '15 minutes'-now())))::integer);
   return jsonb_build_object('ok',false,'error','rate_limited','retry_after',wait_seconds);
 end if;
 if extensions.crypt(p_code,cfg.pin_hash)=cfg.pin_hash then
   update private.df_pin_attempts set attempts=0 where ip_hash=p_ip_hash;
   return jsonb_build_object('ok',true,'access',cfg.access_token);
 end if;
 update private.df_pin_attempts set attempts=attempts+1 where ip_hash=p_ip_hash;
 update private.df_pin_config set failures=failures+1 where id=1;
 return jsonb_build_object('ok',false,'error','incorrect_code');
end;
$$;
revoke all on function public.df_exchange_pin(text,text) from public,anon,authenticated;
grant execute on function public.df_exchange_pin(text,text) to service_role;
