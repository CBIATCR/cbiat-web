-- Store small profile images independently of profile queries.
create table public.profile_photos (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  image bytea not null check (octet_length(image) between 8 and 524288),
  mime text generated always as (
    case when substring(image from 1 for 8) = decode('89504e470d0a1a0a','hex') then 'image/png'
         when substring(image from 1 for 3) = decode('ffd8ff','hex') then 'image/jpeg' end
  ) stored not null
);
alter table public.profile_photos enable row level security;
revoke all on public.profile_photos from public, anon, authenticated;
grant select on public.profile_photos to anon, authenticated;
grant insert (profile_id,image), update (image,profile_id), delete on public.profile_photos to authenticated;

create policy read_listed_photo on public.profile_photos for select to anon, authenticated
using (profile_id in (select id from public.directory_people()));
create policy own_photo on public.profile_photos for all to authenticated
using (profile_id = (select auth.uid()) and exists
  (select from public.profiles p where p.id = (select auth.uid()) and p.status in ('approved','pending')))
with check (profile_id = (select auth.uid()) and exists
  (select from public.profiles p where p.id = (select auth.uid()) and p.status in ('approved','pending')));

create function public.directory_cards()
returns table (id uuid, full_name text, organization text, title text, biography text,
               social_links text[], groups jsonb, has_photo boolean)
language sql stable security invoker set search_path = '' as $$
  select p.*, f.profile_id is not null
  from public.directory_people_with_groups() p
  left join public.profile_photos f on f.profile_id = p.id
  order by p.full_name, p.id;
$$;
revoke all on function public.directory_cards() from public;
grant execute on function public.directory_cards() to anon, authenticated;
