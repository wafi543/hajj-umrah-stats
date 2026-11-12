-- =====================================================
-- قاعدة بيانات نظام إحصائيات رحلات ضيوف الرحمن
-- الصق هذا الملف كاملاً في Supabase > SQL Editor ثم اضغط Run
-- =====================================================

-- ---------- الجداول ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  role text not null default 'entry' check (role in ('admin','entry')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.officials (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.trip_seq start 1;

create table if not exists public.trips (
  id bigint generated always as identity primary key,
  trip_no text not null unique default ('R-' || lpad(nextval('public.trip_seq')::text, 6, '0')),
  count integer not null check (count > 0),
  official_id bigint not null references public.officials(id),
  service_id bigint not null references public.services(id),
  entered_date date not null,
  entered_time time not null,
  notes text default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Multiple services per trip; service_id remains as a legacy compatibility field.
create table if not exists public.trip_services (
  trip_id bigint not null references public.trips(id) on delete cascade,
  service_id bigint not null references public.services(id) on delete restrict,
  primary key (trip_id, service_id)
);
insert into public.trip_services (trip_id, service_id)
select id, service_id from public.trips where service_id is not null
on conflict do nothing;
create index if not exists trips_date_idx on public.trips(entered_date);
create index if not exists trips_creator_idx on public.trips(created_by);

-- ---------- تحديث تاريخ التعديل تلقائياً ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','officials','services','trips'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- إنشاء ملف المستخدم تلقائياً عند إضافة حساب ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- دالة فحص المدير ----------
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- الصلاحيات (Row Level Security) ----------
alter table public.profiles  enable row level security;
alter table public.officials enable row level security;
alter table public.services enable row level security;
alter table public.trips     enable row level security;
alter table public.trip_services enable row level security;

-- profiles: المستخدم يرى ملفه، والمدير يرى ويعدّل الجميع (ولا يستطيع أحد تغيير دوره بنفسه إلا المدير)
drop policy if exists p_sel on public.profiles;
drop policy if exists p_upd on public.profiles;
create policy p_sel on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy p_upd on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- officials / services: القراءة للجميع بعد الدخول، والتعديل للمدير فقط
do $$ declare t text; begin
  foreach t in array array['officials','services'] loop
    execute format('drop policy if exists %1$s_sel on public.%1$s', t);
    execute format('drop policy if exists %1$s_all on public.%1$s', t);
    execute format('create policy %1$s_sel on public.%1$s for select to authenticated using (true)', t);
    execute format('create policy %1$s_all on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- trips: المدير يرى الكل، ومدخل البيانات يرى ما أدخله فقط، الإضافة للجميع، التعديل والحذف للمدير فقط
drop policy if exists t_sel on public.trips;
drop policy if exists t_ins on public.trips;
drop policy if exists t_upd on public.trips;
drop policy if exists t_del on public.trips;
create policy t_sel on public.trips for select to authenticated using (public.is_admin() or created_by = auth.uid());
create policy t_ins on public.trips for insert to authenticated with check (created_by = auth.uid());
create policy t_upd on public.trips for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy t_del on public.trips for delete to authenticated using (public.is_admin());

drop policy if exists ts_sel on public.trip_services;
drop policy if exists ts_ins on public.trip_services;
drop policy if exists ts_del on public.trip_services;
create policy ts_sel on public.trip_services for select to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and (public.is_admin() or t.created_by = auth.uid()))
);
create policy ts_ins on public.trip_services for insert to authenticated with check (
  exists (select 1 from public.trips t where t.id = trip_id and (public.is_admin() or t.created_by = auth.uid()))
);
create policy ts_del on public.trip_services for delete to authenticated using (public.is_admin());

-- ---------- التحديث المباشر (Realtime) ----------
do $$ begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null; end $$;

-- ---------- بيانات أولية (يمكن للمدير تغييرها من التطبيق) ----------
insert into public.services (name) values ('إرشاد'), ('نقل'), ('إسكان'), ('رعاية صحية')
on conflict (name) do nothing;


-- =====================================================
-- Hardening applied to the live project after the first version
-- (idempotent; keep this block when re-creating the database)
-- =====================================================
create index if not exists trips_official_idx on public.trips(official_id);
create index if not exists trips_service_idx on public.trips(service_id);
create index if not exists trip_services_service_idx on public.trip_services(service_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

do $$ declare t text; begin
  foreach t in array array['officials','services'] loop
    execute format('drop policy if exists %1$s_all on public.%1$s', t);
    execute format('drop policy if exists %1$s_ins on public.%1$s', t);
    execute format('drop policy if exists %1$s_upd on public.%1$s', t);
    execute format('drop policy if exists %1$s_del on public.%1$s', t);
    execute format('create policy %1$s_ins on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy %1$s_upd on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy %1$s_del on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Promote the first admin (run once after creating the user in Authentication > Users):
-- update public.profiles set role = 'admin' where lower(email) = lower('you@example.com');
