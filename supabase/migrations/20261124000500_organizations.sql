create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references public.profiles(id),
 name text not null check(length(trim(name)) between 1 and 160),
 kind text not null check(kind in ('company','startup','academia','institution','investor','other')),
 description text not null check(length(trim(description)) between 1 and 1600),
 website text not null check(website ~ '^https?://[^[:space:]]+$' and length(website)<=2048),
 location text not null default '' check(length(location)<=160),
 logo text check(length(logo)<=180000 and logo ~ '^data:image/(png;base64,iVBORw0KGgo|jpeg;base64,/9j/)[A-Za-z0-9+/]*={0,2}$'),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 partner boolean not null default false,
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.organizations enable row level security;
revoke all on public.organizations from public, anon, authenticated;
grant select on public.organizations to authenticated;
grant insert(name,kind,description,website,location,logo),
 update(name,kind,description,website,location,logo) on public.organizations to authenticated;
create policy org_management_read on public.organizations for select to authenticated using (
 public.is_cbiat_admin() or (owner_id=auth.uid() and exists(select from public.profiles where id=auth.uid() and status='approved'))
);
create policy org_create on public.organizations for insert to authenticated with check (
 owner_id=auth.uid() and exists(select from public.profiles where id=auth.uid() and status='approved')
);
create policy org_edit on public.organizations for update to authenticated using (
 owner_id=auth.uid() and exists(select from public.profiles where id=auth.uid() and status='approved')
) with check(owner_id=auth.uid());
create function public.organization_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.name,new.kind,new.description,new.website,new.location,new.logo)
    is distinct from row(old.name,old.kind,old.description,old.website,old.location,old.logo) then
   new.status := 'pending';
 end if;
 new.revision := old.revision+1;
 new.updated_at := now();
 return new;
end $$;
create trigger organization_revision before update on public.organizations for each row execute function public.organization_revision();
create function public.review_organization(target uuid, expected_revision bigint, decision text, is_partner boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_cbiat_admin() then raise insufficient_privilege; end if;
 if decision not in ('approved','rejected') or decision is null then raise exception 'Invalid decision'; end if;
 update public.organizations set status=decision, partner=(decision='approved' and is_partner)
 where id=target and revision=expected_revision;
 if not found then raise exception 'Review stale'; end if;
end $$;
revoke all on function public.review_organization(uuid,bigint,text,boolean) from public,anon;
grant execute on function public.review_organization(uuid,bigint,text,boolean) to authenticated;

create function public.organization_directory() returns table(id uuid,name text,kind text,description text,website text,location text,logo text,partner boolean)
language sql stable security definer set search_path='' as $$
 select o.id,o.name,o.kind,o.description,o.website,o.location,o.logo,o.partner from public.organizations o
 where o.status='approved' order by o.name,o.id;
$$;
revoke all on function public.organization_directory() from public;
grant execute on function public.organization_directory() to anon,authenticated;
