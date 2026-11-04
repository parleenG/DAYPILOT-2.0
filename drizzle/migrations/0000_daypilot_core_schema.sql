create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  language text not null default 'en',
  timezone text not null default 'UTC',
  areas text[] not null default '{}',
  onboarding_completed boolean not null default false,
  notification_prefs jsonb not null default '{}'::jsonb,
  appearance text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin','user')),
  unique (user_id, role)
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,8),
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null default 'personal',
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  start_date date,
  deadline date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','waiting','completed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_items (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null default 'personal',
  due_date date,
  due_time time,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  reminder_at timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus','premium','concierge')),
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

create table public.consents (
  user_id uuid primary key,
  terms_version text not null default 'v1',
  accepted_at timestamptz not null default now()
);

-- Access helpers -------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_household_member(_household uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.household_members m where m.household_id = _household and m.user_id = auth.uid()) $$;

create or replace function public.can_access_mission(_mission uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.missions m
    where m.id = _mission and (m.user_id = auth.uid() or (m.household_id is not null and public.is_household_member(m.household_id)))
  )
$$;

-- Onboarding / signup triggers -----------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger missions_touch before update on public.missions for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();

-- Grants ---------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.households to authenticated;
grant select, insert, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.missions to authenticated;
grant select, insert, update, delete on public.mission_items to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, delete on public.conversations to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.subscriptions to authenticated;
grant insert, select on public.consents to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
grant all on public.user_roles to service_role;
grant all on public.households to service_role;
grant all on public.household_members to service_role;
grant all on public.missions to service_role;
grant all on public.mission_items to service_role;
grant all on public.tasks to service_role;
grant all on public.conversations to service_role;
grant all on public.messages to service_role;
grant all on public.notifications to service_role;
grant all on public.subscriptions to service_role;
grant all on public.consents to service_role;

-- Row level security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.missions enable row level security;
alter table public.mission_items enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.consents enable row level security;

create policy "profiles own select" on public.profiles for select using (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id);
create policy "profiles public read" on public.profiles for select to anon using (true);

create policy "households owner insert" on public.households for insert with check (auth.uid() = owner_id);
create policy "households read" on public.households for select using (auth.uid() = owner_id or public.is_household_member(id));
create policy "households owner update" on public.households for update using (auth.uid() = owner_id);
create policy "households owner delete" on public.households for delete using (auth.uid() = owner_id);

create policy "members read" on public.household_members for select using (user_id = auth.uid() or public.is_household_member(household_id));
create policy "members owner insert" on public.household_members for insert with check (auth.uid() = (select owner_id from public.households h where h.id = household_id));
create policy "members leave" on public.household_members for delete using (user_id = auth.uid() or auth.uid() = (select owner_id from public.households h where h.id = household_id));

create policy "missions read" on public.missions for select using (user_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy "missions insert" on public.missions for insert with check (user_id = auth.uid());
create policy "missions update" on public.missions for update using (user_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy "missions delete" on public.missions for delete using (user_id = auth.uid());

create policy "mission_items read" on public.mission_items for select using (public.can_access_mission(mission_id));
create policy "mission_items write" on public.mission_items for insert with check (public.can_access_mission(mission_id));
create policy "mission_items update" on public.mission_items for update using (public.can_access_mission(mission_id));
create policy "mission_items delete" on public.mission_items for delete using (public.can_access_mission(mission_id));

create policy "tasks read" on public.tasks for select using (user_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy "tasks insert" on public.tasks for insert with check (user_id = auth.uid());
create policy "tasks update" on public.tasks for update using (user_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy "tasks delete" on public.tasks for delete using (user_id = auth.uid());

create policy "conversations own" on public.conversations for select using (user_id = auth.uid());
create policy "conversations insert" on public.conversations for insert with check (user_id = auth.uid());
create policy "conversations delete" on public.conversations for delete using (user_id = auth.uid());
create policy "messages read" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "messages insert" on public.messages for insert with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "messages delete" on public.messages for delete using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create policy "notifications own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications update" on public.notifications for update using (user_id = auth.uid());

create policy "subscriptions own read" on public.subscriptions for select using (user_id = auth.uid());
create policy "consents own" on public.consents for select using (user_id = auth.uid());
create policy "consents insert" on public.consents for insert with check (user_id = auth.uid());

-- Indexes --------------------------------------------------------------------
create index idx_tasks_user_due on public.tasks (user_id, due_date);
create index idx_tasks_mission on public.tasks (mission_id);
create index idx_tasks_household on public.tasks (household_id);
create index idx_missions_user on public.missions (user_id, status);
create index idx_mission_items_mission on public.mission_items (mission_id, sort_order);
create index idx_members_user on public.household_members (user_id);
create index idx_members_household on public.household_members (household_id);
create index idx_messages_conversation on public.messages (conversation_id, created_at);
create index idx_notifications_user on public.notifications (user_id, read);
create index idx_conversations_user on public.conversations (user_id, created_at);
