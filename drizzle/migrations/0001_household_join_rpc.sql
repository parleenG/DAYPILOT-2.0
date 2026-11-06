create or replace function public.join_household(_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  select * into h from public.households where invite_code = lower(trim(_code));
  if not found then
    raise exception 'No household found with that invite code';
  end if;
  if exists (select 1 from public.household_members where household_id = h.id and user_id = auth.uid()) then
    return;
  end if;
  insert into public.household_members (household_id, user_id, role)
  values (h.id, auth.uid(), 'member');
end;
$$;

grant execute on function public.join_household(text) to authenticated;