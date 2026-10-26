-- Extend only the platform allowlist. RLS, existing titles and viewing dates stay intact.
alter table public.df_media_views drop constraint df_media_views_platform_check;
alter table public.df_media_views add constraint df_media_views_platform_check
 check(platform in ('Netflix','Plex','Disney+','Max','Prime Video','Apple TV+','Paramount+','Hulu','Peacock','Otra'));
