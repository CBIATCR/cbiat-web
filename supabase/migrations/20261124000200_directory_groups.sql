-- Assignments are separate from account roles and directory visibility.
create table public.institutional_groups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('board', 'commission')),
  name_es text not null check (length(trim(name_es)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  unique (kind, name_es)
);
create table public.profile_groups (
  profile_id uuid not null references public.profiles on delete cascade,
  group_id uuid not null references public.institutional_groups on delete cascade,
  primary key (profile_id, group_id)
);
insert into public.institutional_groups (kind, name_es, name_en)
values ('board', 'Junta Directiva', 'Board of Directors');

alter table public.institutional_groups enable row level security;
alter table public.profile_groups enable row level security;
revoke all on public.institutional_groups, public.profile_groups from public, anon, authenticated;
grant select, insert, update, delete on public.institutional_groups, public.profile_groups to authenticated;
create policy manage_groups on public.institutional_groups for all to authenticated
using ((select public.is_cbiat_admin())) with check ((select public.is_cbiat_admin()));
create policy manage_assignments on public.profile_groups for all to authenticated
using ((select public.is_cbiat_admin())) with check ((select public.is_cbiat_admin()));

create function public.directory_people_with_groups()
returns table (id uuid, full_name text, organization text, title text, biography text, social_links text[], groups jsonb)
language sql stable security definer set search_path = '' as $$
  select p.*, coalesce((
    select jsonb_agg(jsonb_build_object('id', g.id, 'name_es', g.name_es, 'name_en', g.name_en)
                     order by g.kind, g.name_es, g.id)
    from public.profile_groups pg
    join public.institutional_groups g on g.id = pg.group_id
    where pg.profile_id = p.id
  ), '[]'::jsonb)
  from public.directory_people() p order by p.full_name, p.id;
$$;
revoke all on function public.directory_people_with_groups() from public;
grant execute on function public.directory_people_with_groups() to anon, authenticated;
