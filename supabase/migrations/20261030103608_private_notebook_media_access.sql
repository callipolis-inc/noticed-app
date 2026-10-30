-- Media references are granted by the uploader, never by knowing an object's URL.
create schema if not exists noticed_private;
revoke all on schema noticed_private from public, anon;
grant usage on schema noticed_private to authenticated;
create table if not exists noticed_private.note_media (
  note_id text not null references public.field_notes(id) on delete cascade,
  object_id uuid not null references storage.objects(id) on delete cascade,
  primary key (note_id, object_id)
);
alter table noticed_private.note_media enable row level security;
revoke all on noticed_private.note_media from public, anon, authenticated;

create or replace function noticed_private.active_account()
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from auth.users where id = auth.uid());
$$;
revoke all on function noticed_private.active_account() from public, anon;
grant execute on function noticed_private.active_account() to authenticated;

create or replace function noticed_private.media_path(value text)
returns text language plpgsql immutable set search_path = '' as $$
declare path text; decoded text;
begin
 path := (regexp_match(split_part(value, '?', 1), '^https://ienbkpjldpzaewzewxfz[.]supabase[.]co/storage/v1/object/(public|sign|authenticated)/noticed-media/(.+)$'))[2];
 if path is null then return null; end if;
 select convert_from(decode(string_agg(case when token[1] ~ '^%[0-9A-Fa-f]{2}$' then substring(token[1],2) else encode(convert_to(token[1],'UTF8'),'hex') end, ''), 'hex'), 'UTF8') into decoded
 from regexp_matches(path, '(%[0-9A-Fa-f]{2}|.)', 'g') as token;
 return decoded;
exception when others then return null;
end;
$$;
revoke all on function noticed_private.media_path(text) from public, anon, authenticated;

create or replace function noticed_private.note_paths(photos jsonb, photos_meta jsonb, videos jsonb, voice_memo jsonb, author jsonb)
returns table(path text) language sql immutable set search_path = '' as $$
 select distinct noticed_private.media_path(value #>> '{}')
 from jsonb_path_query(jsonb_build_array(photos, photos_meta, videos, voice_memo, author), 'strict $.** ? (@.type() == "string")') as item(value);
$$;
revoke all on function noticed_private.note_paths(jsonb,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;

create or replace function noticed_private.preserve_note_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'UPDATE' then
   if new.user_id is distinct from old.user_id then raise exception 'Note author cannot change'; end if;
 elsif new.user_id is distinct from auth.uid() and not exists (
   select 1 from public.field_notes where id = new.id and user_id = new.user_id
 ) then raise exception 'Note author must match the authenticated uploader';
 end if;
 return new;
end;
$$;
revoke all on function noticed_private.preserve_note_author() from public, anon, authenticated;
drop trigger if exists noticed_preserve_note_author on public.field_notes;
create trigger noticed_preserve_note_author before insert or update on public.field_notes
for each row execute function noticed_private.preserve_note_author();

create or replace function noticed_private.sync_note_media()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 delete from noticed_private.note_media r where r.note_id = new.id and not exists (
   select 1 from storage.objects o join noticed_private.note_paths(new.photos,new.photos_meta,new.videos,new.voice_memo,new.author) p on p.path = o.name
   where o.id = r.object_id and o.bucket_id = 'noticed-media'
 );
 insert into noticed_private.note_media(note_id,object_id)
 select new.id,o.id from storage.objects o
 join noticed_private.note_paths(new.photos,new.photos_meta,new.videos,new.voice_memo,new.author) p on p.path = o.name
 where o.bucket_id = 'noticed-media' and auth.uid() is not null
   and (o.owner = auth.uid() or split_part(o.name,'/',2) = auth.uid()::text)
 on conflict do nothing;
 return new;
end;
$$;
revoke all on function noticed_private.sync_note_media() from public, anon, authenticated;
drop trigger if exists noticed_sync_note_media on public.field_notes;
create trigger noticed_sync_note_media after insert or update of photos,photos_meta,videos,voice_memo,author on public.field_notes
for each row execute function noticed_private.sync_note_media();

-- Preserve existing attachments only where their recorded uploader matches the note author.
insert into noticed_private.note_media(note_id,object_id)
select n.id,o.id from public.field_notes n
cross join lateral noticed_private.note_paths(n.photos,n.photos_meta,n.videos,n.voice_memo,n.author) p
join storage.objects o on o.bucket_id = 'noticed-media' and o.name = p.path
where o.owner = n.user_id
on conflict do nothing;

create or replace function noticed_private.can_read_media(object_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select noticed_private.active_account() and exists (
  select 1 from storage.objects o where o.id = object_id and o.bucket_id = 'noticed-media' and (
   o.owner = auth.uid() or split_part(o.name,'/',2) = auth.uid()::text
   or exists (
    select 1 from noticed_private.note_media r join public.field_notes n on n.id = r.note_id
    where r.object_id = o.id and (public.is_space_owner(n.space_id,auth.uid()) or public.is_space_member(n.space_id,auth.uid(),null::text[]))
   )
   or exists (
    select 1 from public.profiles p where noticed_private.media_path(p.avatar_url) = o.name
    and (o.owner = p.id or split_part(o.name,'/',2) = p.id::text)
    and exists(select 1 from public.spaces s
      where (public.is_space_owner(s.id,auth.uid()) or public.is_space_member(s.id,auth.uid(),null::text[]))
      and (s.user_id = p.id or public.is_space_member(s.id,p.id,null::text[])))
   )
  )
 );
$$;
revoke all on function noticed_private.can_read_media(uuid) from public, anon;
grant execute on function noticed_private.can_read_media(uuid) to authenticated;

drop policy if exists "Noticed Media Public Read" on storage.objects;
drop policy if exists "Noticed Media Authenticated Read" on storage.objects;
create policy "Noticed Media Authenticated Read" on storage.objects for select to authenticated
using (bucket_id = 'noticed-media' and noticed_private.can_read_media(id));
-- Serialize upload metadata with final account deletion, including other devices.
create or replace function noticed_private.can_upload_media()
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
 if auth.uid() is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 return exists(select 1 from auth.users where id = auth.uid());
end;
$$;
revoke all on function noticed_private.can_upload_media() from public, anon;
grant execute on function noticed_private.can_upload_media() to authenticated;

drop policy if exists "Noticed Media Authenticated Upload" on storage.objects;
create policy "Noticed Media Authenticated Upload" on storage.objects for insert to authenticated
with check (bucket_id = 'noticed-media' and noticed_private.can_upload_media() and split_part(name,'/',2) = (select auth.uid())::text);
drop policy if exists "Noticed Media Authenticated Update" on storage.objects;
create policy "Noticed Media Authenticated Update" on storage.objects for update to authenticated
using (bucket_id = 'noticed-media' and noticed_private.can_upload_media() and split_part(name,'/',2) = (select auth.uid())::text)
with check (bucket_id = 'noticed-media' and noticed_private.can_upload_media() and split_part(name,'/',2) = (select auth.uid())::text);

-- Enable only together with the candidate client, which resolves signed URLs.
update storage.buckets set public = false where id = 'noticed-media';
