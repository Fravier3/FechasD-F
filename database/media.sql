-- Shared media library. Existing event/profile tables and access remain unchanged.
create function public.df_media_key(value text) returns text language sql immutable strict security invoker set search_path='' as $$
 select regexp_replace(translate(lower(btrim(value)), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'), '[^a-z0-9]+', '', 'g');
$$;
create table public.df_media_titles (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 1 and 180),
 name_key text generated always as (public.df_media_key(name)) stored,
 type text not null check(type in ('Serie','Película')),
 status text not null default 'Sin confirmar' check(status in ('Sin confirmar','Pendiente','Viendo','Terminada')),
 completed_on date,
 rating integer check(rating between 1 and 5),
 notes text not null default '' check(char_length(notes)<=4000),
 poster_url text check(poster_url is null or (poster_url like 'https://%' and char_length(poster_url)<=2000)),
 poster_source text not null default '' check(char_length(poster_source)<=2000),
 updated_by text not null default 'Fran' check(updated_by in ('Fran','Diana')),
 version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(name_key,type), check(completed_on is null or status='Terminada')
);
create table public.df_media_views (
 id uuid primary key default gen_random_uuid(),
 title_id uuid not null references public.df_media_titles(id) on delete cascade,
 platform text not null check(platform in ('Netflix','Plex','Disney+','Max','Prime Video','Apple TV+','Paramount+','Hulu','Peacock','Otra')),
 start_date date, last_date date,
 check(last_date is null or (start_date is not null and last_date>=start_date)),
 unique nulls not distinct(title_id,platform,start_date,last_date)
);
create index df_media_views_title_idx on public.df_media_views(title_id);
create trigger df_media_stamp before update on public.df_media_titles for each row execute function public.df_stamp_update();
alter table public.df_media_titles enable row level security;
alter table public.df_media_views enable row level security;
revoke all on public.df_media_titles,public.df_media_views from public,anon,authenticated;
grant select,insert,update,delete on public.df_media_titles,public.df_media_views to anon;
create policy df_media_shared on public.df_media_titles for all to anon using ((select public.df_has_access())) with check ((select public.df_has_access()));
create policy df_media_views_shared on public.df_media_views for all to anon using ((select public.df_has_access())) with check ((select public.df_has_access()));
create function public.df_media_save(p_title jsonb,p_views jsonb,p_id uuid default null,p_version integer default null)
 returns uuid language plpgsql security invoker set search_path='' as $$
declare item_id uuid; old_version integer;
begin
 if not public.df_has_access() then raise exception 'Acceso no autorizado'; end if;
 if jsonb_typeof(p_views)<>'array' or jsonb_array_length(p_views)>200 or jsonb_array_length(p_views)=0 then raise exception 'Historial inválido'; end if;
 if p_id is not null then
  select version into old_version from public.df_media_titles where id=p_id for update;
  if old_version is null or old_version is distinct from p_version then raise exception 'El título cambió en el otro teléfono. Cierra y vuelve a abrirlo.'; end if;
  update public.df_media_titles set name=btrim(p_title->>'name'),type=p_title->>'type',status=p_title->>'status',completed_on=nullif(p_title->>'completed_on','')::date,rating=nullif(p_title->>'rating','')::integer,notes=coalesce(p_title->>'notes',''),poster_url=nullif(p_title->>'poster_url',''),poster_source=coalesce(p_title->>'poster_source',''),updated_by=p_title->>'updated_by' where id=p_id returning id into item_id;
 else
  insert into public.df_media_titles(name,type,status,completed_on,rating,notes,poster_url,poster_source,updated_by) values(btrim(p_title->>'name'),p_title->>'type',p_title->>'status',nullif(p_title->>'completed_on','')::date,nullif(p_title->>'rating','')::integer,coalesce(p_title->>'notes',''),nullif(p_title->>'poster_url',''),coalesce(p_title->>'poster_source',''),p_title->>'updated_by') returning id into item_id;
 end if;
 delete from public.df_media_views where title_id=item_id;
 insert into public.df_media_views(title_id,platform,start_date,last_date) select item_id,v->>'platform',nullif(v->>'start_date','')::date,nullif(v->>'last_date','')::date from jsonb_array_elements(p_views) v;
 return item_id;
end $$;
revoke all on function public.df_media_save(jsonb,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.df_media_save(jsonb,jsonb,uuid,integer) to anon;
