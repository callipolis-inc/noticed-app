-- Run after the candidate media migration inside BEGIN ... ROLLBACK.
-- All accounts, notes, and object metadata below are disposable transaction fixtures.
do $$
declare
 owner_id uuid := '00000000-0000-4000-a000-000000000001';
 member_id uuid := '00000000-0000-4000-a000-000000000002';
 outsider_id uuid := '00000000-0000-4000-a000-000000000003';
 shared_object uuid := '00000000-0000-4000-b000-000000000001';
 private_object uuid := '00000000-0000-4000-b000-000000000002';
 member_object uuid := '00000000-0000-4000-b000-000000000003';
 base text := 'https://ienbkpjldpzaewzewxfz.supabase.co/storage/v1/object/authenticated/noticed-media/';
 shared_path text := 'photos/00000000-0000-4000-a000-000000000001/readiness-shared.jpg';
 private_path text := 'photos/00000000-0000-4000-a000-000000000001/readiness-private.jpg';
 member_path text := 'photos/00000000-0000-4000-a000-000000000002/readiness-member.jpg';
 rejected boolean := false;
begin
 insert into auth.users(id) values(owner_id),(member_id),(outsider_id);
 insert into public.spaces(id,user_id,name,is_shared) values
 ('readiness-shared',owner_id,'Readiness shared fixture',true),
 ('readiness-outsider',outsider_id,'Readiness outsider fixture',false);
 insert into public.space_members(space_id,user_id,role) values('readiness-shared',member_id,'editor');
 insert into storage.objects(id,bucket_id,name,owner) values
 (shared_object,'noticed-media',shared_path,owner_id),
 (private_object,'noticed-media',private_path,owner_id),
 (member_object,'noticed-media',member_path,member_id);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 insert into public.field_notes(id,space_id,user_id,photos) values
 ('readiness-owner-note','readiness-shared',owner_id,jsonb_build_array(base||shared_path));
 if not noticed_private.can_read_media(shared_object) or not noticed_private.can_read_media(private_object) then raise exception 'Owner access failed'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 if not noticed_private.can_read_media(shared_object) then raise exception 'Member shared-media access failed'; end if;
 if noticed_private.can_read_media(private_object) then raise exception 'Member accessed unshared media'; end if;
 insert into public.field_notes(id,space_id,user_id,photos) values
 ('readiness-member-note','readiness-shared',member_id,jsonb_build_array(base||member_path));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 if not noticed_private.can_read_media(member_object) then raise exception 'Owner cannot read member attachment'; end if;
 -- Knowledge of another member's private URL must not grant access.
 update public.field_notes set photos=jsonb_build_array(base||shared_path,base||private_path) where id='readiness-member-note';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true);
 if noticed_private.can_read_media(shared_object) then raise exception 'Outsider accessed shared media'; end if;
 insert into public.field_notes(id,space_id,user_id,photos) values
 ('readiness-forged-url','readiness-outsider',outsider_id,jsonb_build_array(base||private_path));
 if noticed_private.can_read_media(private_object) then raise exception 'Forged URL granted access'; end if;
 begin
   insert into public.field_notes(id,space_id,user_id,photos) values
   ('readiness-forged-author','readiness-outsider',owner_id,jsonb_build_array(base||private_path));
 exception when raise_exception then
   if sqlerrm not like 'Note author must match%' then raise; end if;
   rejected := true;
 end;
 if not rejected then raise exception 'Forged author accepted'; end if;
 delete from public.space_members where space_id='readiness-shared' and user_id=member_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
 if noticed_private.can_read_media(shared_object) then raise exception 'Revoked member retained new read authorization'; end if;
 perform set_config('request.jwt.claims','{}',true);
 if noticed_private.can_read_media(shared_object) then raise exception 'Unauthenticated access succeeded'; end if;
end;
$$;
select 'owner/member/outsider/forged-reference/revocation checks passed' as media_access_tests;

-- Exercise the actual Storage SELECT policies as both API roles, not only helpers.
set local role anon;
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='noticed-media') then
   raise exception 'Anonymous Storage SELECT policy permits private objects';
 end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='noticed-media') then
   raise exception 'Outsider Storage SELECT policy permits private objects';
 end if;
end $$;
reset role;
select 'helper and actual anonymous/outsider Storage policies passed' as media_access_tests;
