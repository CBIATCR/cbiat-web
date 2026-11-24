create function public.review_account(target uuid, account_status text, account_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_cbiat_admin() or target = auth.uid() then
    raise exception 'Review forbidden' using errcode = '42501';
  end if;
  update public.profiles set
    approved_at = case when account_status = 'approved' and status <> 'approved' then now() else approved_at end,
    approved_by = case when account_status = 'approved' and status <> 'approved' then auth.uid() else approved_by end,
    disabled_at = case when account_status = 'disabled' and status <> 'disabled' then now() else disabled_at end,
    disabled_by = case when account_status = 'disabled' and status <> 'disabled' then auth.uid() else disabled_by end,
    status = account_status, role = account_role
  where id = target;
  if not found then raise exception 'Unknown account'; end if;
end;
$$;
revoke all on function public.review_account(uuid,text,text) from public, anon;
grant execute on function public.review_account(uuid,text,text) to authenticated;

create function public.review_queue(status_filter text default null)
returns table(id uuid, full_name text, email text, organization text, title text, applied_at timestamptz, status text, role text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, u.email::text, p.organization, p.title, p.applied_at, p.status, p.role
  from public.profiles p join auth.users u on p.id = u.id
  where public.is_cbiat_admin() and (status_filter is null or p.status = status_filter)
  order by p.applied_at desc, p.id;
$$;
revoke all on function public.review_queue(text) from public, anon;
grant execute on function public.review_queue(text) to authenticated;
