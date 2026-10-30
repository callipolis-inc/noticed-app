-- Physical files are removed through the Storage API before database/account removal.
create or replace function public.list_account_media()
returns table(name text) language sql security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'noticed-media'
    and auth.uid() is not null
    and exists(select 1 from auth.users u where u.id = auth.uid())
    and (o.owner = auth.uid() or split_part(o.name, '/', 2) = auth.uid()::text)
  order by o.name limit 100;
$$;
revoke all on function public.list_account_media() from public, anon;
grant execute on function public.list_account_media() to authenticated;

-- Only the trusted Edge Function may finalize deletion, after Apple revocation.
-- Retire the older direct-client entry point; keep it for migration compatibility.
revoke all on function public.delete_user_account() from public, anon, authenticated;
create or replace function public.delete_user_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := p_user_id;
begin
  if v_user_id is null then raise exception 'Missing account identity'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if exists(select 1 from storage.objects where bucket_id = 'noticed-media'
    and (owner = v_user_id or split_part(name, '/', 2) = v_user_id::text)) then
    raise exception 'Physical media cleanup must finish before account deletion';
  end if;
  -- Preserve the project UUID comparison/exception convention. This is metadata
  -- cleanup only; the guard above requires physical Storage API deletion first.
  begin
    delete from storage.objects where bucket_id = 'noticed-media' and owner = v_user_id;
  exception when others then null;
  end;
  delete from public.space_members where user_id = v_user_id;
  delete from public.field_notes where user_id = v_user_id;
  delete from public.spaces where user_id = v_user_id;
  delete from public.profiles where id = v_user_id;
  delete from auth.users where id = v_user_id;
end;
$$;
revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;

-- Include legacy objects whose owner is recorded even if their old path differs.
drop policy if exists "Noticed Media Authenticated Delete" on storage.objects;
create policy "Noticed Media Authenticated Delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'noticed-media' and
  (owner = (select auth.uid()) or split_part(name, '/', 2) = (select auth.uid())::text)
);
