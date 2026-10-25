create table public.df_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 start_date date not null, end_date date,
 place text not null default '' check(char_length(place)<=180),
 notes text not null default '' check(char_length(notes)<=3000),
 color text not null default 'rose' check(color in ('rose','lavender','sky','mint','peach','butter')),
 icon text not null default 'heart' check(icon in ('heart','plane','calendar','sparkles','gift','home')),
 annual boolean not null default false,
 show_dashboard boolean not null default true,
 updated_by text not null default 'Fran' check(updated_by in ('Fran','Diana')),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(end_date is null or end_date >= start_date)
);
create index df_events_dates_idx on public.df_events(start_date);
create table public.df_details (
 id uuid primary key default gen_random_uuid(),
 person text not null check(person in ('Fran','Diana')),
 label text not null check(char_length(btrim(label)) between 1 and 100),
 value text not null check(char_length(btrim(value)) between 1 and 2000),
 kind text not null default 'text' check(kind in ('text','date')),
 sort_order integer not null default 100,
 updated_by text not null default 'Fran' check(updated_by in ('Fran','Diana')),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index df_details_person_order_idx on public.df_details(person,sort_order);
create function public.df_stamp_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now();new.version=old.version+1;return new;end $$;
revoke all on function public.df_stamp_update() from public,anon,authenticated;
create trigger df_events_stamp before update on public.df_events for each row execute function public.df_stamp_update();
create trigger df_details_stamp before update on public.df_details for each row execute function public.df_stamp_update();
alter table public.df_events enable row level security;
alter table public.df_details enable row level security;
revoke all on public.df_events,public.df_details from anon,authenticated;
grant select,insert,update,delete on public.df_events,public.df_details to anon;
create policy df_private_link_events on public.df_events for all to anon
using ((select encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-client-info',''),'sha256'),'hex'))='6175c357379df63f46a5446a7554a7eddf3dc7634de3507fd4f8bef155a44888')
with check ((select encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-client-info',''),'sha256'),'hex'))='6175c357379df63f46a5446a7554a7eddf3dc7634de3507fd4f8bef155a44888');
-- Safe access check: no private rows are returned by this function.
create function public.df_has_access() returns boolean language sql stable security invoker set search_path='' as $$
select encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-client-info',''),'sha256'),'hex')='6175c357379df63f46a5446a7554a7eddf3dc7634de3507fd4f8bef155a44888';
$$;
revoke all on function public.df_has_access() from public,authenticated;
grant execute on function public.df_has_access() to anon;
create policy df_private_link_details on public.df_details for all to anon
using ((select encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-client-info',''),'sha256'),'hex'))='6175c357379df63f46a5446a7554a7eddf3dc7634de3507fd4f8bef155a44888')
with check ((select encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-client-info',''),'sha256'),'hex'))='6175c357379df63f46a5446a7554a7eddf3dc7634de3507fd4f8bef155a44888');
