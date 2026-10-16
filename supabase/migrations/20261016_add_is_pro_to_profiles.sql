-- ============================================================================
-- Noticed App: Cross-Platform Atelier Pro Entitlement Sync
-- Adds is_pro column to public.profiles table so subscription status is
-- synchronized across devices (iOS, Android, Web).
-- Safe to run multiple times (Idempotent).
-- ============================================================================

alter table if exists public.profiles
  add column if not exists is_pro boolean not null default false;

-- Allow users to update their own profile including is_pro status
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
