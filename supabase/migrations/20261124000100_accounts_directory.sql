-- Account approval, publication and institutional membership are independent.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  organization text,
  title text,
  phone text,
  biography text,
  social_links text[] not null default '{}',
  is_public boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','disabled')),
  role text not null default 'member' check (role in ('member','editor','admin')),
  applied_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users on delete set null,
  disabled_at timestamptz,
  disabled_by uuid references auth.users on delete set null
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles on delete cascade,
  status text not null default 'inactive' check (status in ('active','inactive')),
  plan text,
  starts_at timestamptz,
  ends_at timestamptz,
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create function public.create_account_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
revoke all on function public.create_account_profile() from public, anon, authenticated;
create trigger create_cbiat_profile after insert on auth.users
for each row execute function public.create_account_profile();
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name','') from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
revoke all on public.profiles, public.memberships from public, anon, authenticated;
grant select on public.profiles, public.memberships to authenticated;
grant update (full_name, organization, title, phone, biography, social_links, is_public)
on public.profiles to authenticated;

create function public.is_cbiat_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'approved');
$$;
revoke all on function public.is_cbiat_admin() from public, anon;
grant execute on function public.is_cbiat_admin() to authenticated;

create policy read_profile on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_cbiat_admin()));
create policy edit_own_profile on public.profiles for update to authenticated
using (id = (select auth.uid()) and status in ('pending','approved'))
with check (id = (select auth.uid()) and status in ('pending','approved'));
create policy read_membership on public.memberships for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_cbiat_admin()));

-- Explicit public projection. Never expose phone, email or the underlying profile table.
create function public.directory_people()
returns table (id uuid, full_name text, organization text, title text, biography text, social_links text[])
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.organization, p.title, p.biography, p.social_links
  from public.profiles p
  where p.status = 'approved' and p.is_public
  order by p.full_name, p.id;
$$;
revoke all on function public.directory_people() from public;
grant execute on function public.directory_people() to anon, authenticated;
