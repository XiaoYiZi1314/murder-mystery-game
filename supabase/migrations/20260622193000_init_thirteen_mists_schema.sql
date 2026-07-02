begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  create type public.admin_role as enum ('boss', 'mgr', 'dm');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.permission_state as enum ('y', 'p', 'n');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.script_difficulty as enum ('入门', '进阶', '硬核');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.script_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.point_transaction_type as enum ('earn', 'redeem', 'adjust');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  phone varchar(11) not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_users_phone_format_chk check (phone ~ '^1[3-9][0-9]{9}$')
);

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  account citext not null unique,
  password_hash text not null,
  display_name text not null,
  role public.admin_role not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.member_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  min_recharge_cents integer not null,
  discount_rate numeric(5, 4) not null,
  sort_order integer not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint member_levels_min_recharge_cents_chk check (min_recharge_cents >= 0),
  constraint member_levels_discount_rate_chk check (discount_rate > 0 and discount_rate <= 1)
);

create table if not exists public.recharge_rules (
  id uuid primary key default gen_random_uuid(),
  threshold_cents integer not null unique,
  gift_cents integer not null,
  sort_order integer not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recharge_rules_threshold_cents_chk check (threshold_cents >= 0),
  constraint recharge_rules_gift_cents_chk check (gift_cents >= 0)
);

create table if not exists public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  display_name text not null default '新会员',
  avatar_url text,
  birthday date,
  title text not null default '不便透露',
  remark text not null default '',
  balance_cents integer not null default 0,
  total_recharge_cents integer not null default 0,
  total_gift_cents integer not null default 0,
  total_spend_cents integer not null default 0,
  points integer not null default 0,
  level_id uuid references public.member_levels(id),
  last_consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint member_profiles_balance_cents_chk check (balance_cents >= 0),
  constraint member_profiles_total_recharge_cents_chk check (total_recharge_cents >= 0),
  constraint member_profiles_total_gift_cents_chk check (total_gift_cents >= 0),
  constraint member_profiles_total_spend_cents_chk check (total_spend_cents >= 0),
  constraint member_profiles_points_chk check (points >= 0)
);

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  cover_url text,
  summary text,
  description text,
  player_min integer not null,
  player_max integer not null,
  duration_minutes integer not null,
  difficulty public.script_difficulty not null,
  needs_makeup boolean not null default false,
  price_cents integer,
  status public.script_status not null default 'draft',
  sort_order integer not null default 0,
  created_by uuid references public.admin_accounts(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scripts_player_range_chk check (player_min > 0 and player_max >= player_min),
  constraint scripts_duration_minutes_chk check (duration_minutes > 0),
  constraint scripts_price_cents_chk check (price_cents is null or price_cents >= 0)
);

create table if not exists public.script_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.script_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.script_category_relations (
  script_id uuid not null references public.scripts(id) on delete cascade,
  category_id uuid not null references public.script_categories(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (script_id, category_id)
);

create table if not exists public.script_tag_relations (
  script_id uuid not null references public.scripts(id) on delete cascade,
  tag_id uuid not null references public.script_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (script_id, tag_id)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  position smallint not null,
  title_override text,
  summary_override text,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recommendations_position_chk check (position between 1 and 3)
);

create unique index if not exists recommendations_enabled_position_uidx
  on public.recommendations (position)
  where enabled;

create table if not exists public.makeup_gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  thumbnail_url text,
  description text,
  style_tags text[] not null default '{}',
  related_script_id uuid references public.scripts(id) on delete set null,
  service_duration_minutes integer,
  price_cents integer,
  includes text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint makeup_gallery_items_service_duration_minutes_chk check (
    service_duration_minutes is null or service_duration_minutes > 0
  ),
  constraint makeup_gallery_items_price_cents_chk check (price_cents is null or price_cents >= 0)
);

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  wechat_account text,
  wechat_qr_url text,
  phone text,
  address text,
  business_hours text,
  description text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recharge_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete restrict,
  amount_cents integer not null,
  gift_cents integer not null default 0,
  before_balance_cents integer not null,
  after_balance_cents integer not null,
  operator_id uuid not null references public.admin_accounts(id) on delete restrict,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint recharge_records_amount_cents_chk check (amount_cents >= 0),
  constraint recharge_records_gift_cents_chk check (gift_cents >= 0),
  constraint recharge_records_balance_chk check (
    before_balance_cents >= 0 and after_balance_cents >= 0
  )
);

create table if not exists public.consumption_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete restrict,
  original_amount_cents integer not null,
  discount_rate numeric(5, 4) not null,
  paid_amount_cents integer not null,
  earned_points integer not null default 0,
  before_balance_cents integer not null,
  after_balance_cents integer not null,
  operator_id uuid not null references public.admin_accounts(id) on delete restrict,
  script_id uuid references public.scripts(id) on delete set null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint consumption_records_original_amount_cents_chk check (original_amount_cents >= 0),
  constraint consumption_records_discount_rate_chk check (discount_rate > 0 and discount_rate <= 1),
  constraint consumption_records_paid_amount_cents_chk check (paid_amount_cents >= 0),
  constraint consumption_records_earned_points_chk check (earned_points >= 0),
  constraint consumption_records_balance_chk check (
    before_balance_cents >= 0 and after_balance_cents >= 0
  )
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete restrict,
  type public.point_transaction_type not null,
  points integer not null,
  before_points integer not null,
  after_points integer not null,
  source_type text,
  source_id uuid,
  operator_id uuid references public.admin_accounts(id) on delete set null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint point_transactions_points_chk check (points >= 0),
  constraint point_transactions_before_points_chk check (before_points >= 0),
  constraint point_transactions_after_points_chk check (after_points >= 0)
);

create table if not exists public.admin_operation_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.admin_accounts(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text,
  before_json jsonb,
  after_json jsonb,
  remark text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_account_capability_overrides (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid not null references public.admin_accounts(id) on delete cascade,
  capability text not null,
  state public.permission_state not null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (admin_account_id, capability)
);

create index if not exists member_profiles_level_id_idx on public.member_profiles(level_id);
create index if not exists scripts_status_sort_order_idx on public.scripts(status, sort_order desc, created_at desc);
create index if not exists recommendations_script_id_idx on public.recommendations(script_id);
create index if not exists makeup_gallery_items_visible_sort_order_idx on public.makeup_gallery_items(visible, sort_order desc, created_at desc);
create index if not exists recharge_records_member_id_created_at_idx on public.recharge_records(member_id, created_at desc);
create index if not exists consumption_records_member_id_created_at_idx on public.consumption_records(member_id, created_at desc);
create index if not exists point_transactions_member_id_created_at_idx on public.point_transactions(member_id, created_at desc);
create index if not exists admin_operation_logs_operator_id_created_at_idx on public.admin_operation_logs(operator_id, created_at desc);

create or replace function public.sync_member_level()
returns trigger
language plpgsql
as $$
begin
  select ml.id
    into new.level_id
  from public.member_levels ml
  where ml.enabled = true
    and ml.min_recharge_cents <= new.total_recharge_cents
  order by ml.min_recharge_cents desc
  limit 1;

  return new;
end;
$$;

drop trigger if exists member_profiles_sync_member_level_tg on public.member_profiles;
create trigger member_profiles_sync_member_level_tg
before insert or update of total_recharge_cents
on public.member_profiles
for each row
execute function public.sync_member_level();

drop trigger if exists app_users_set_current_timestamp_tg on public.app_users;
create trigger app_users_set_current_timestamp_tg
before update on public.app_users
for each row
execute function public.set_current_timestamp();

drop trigger if exists admin_accounts_set_current_timestamp_tg on public.admin_accounts;
create trigger admin_accounts_set_current_timestamp_tg
before update on public.admin_accounts
for each row
execute function public.set_current_timestamp();

drop trigger if exists member_levels_set_current_timestamp_tg on public.member_levels;
create trigger member_levels_set_current_timestamp_tg
before update on public.member_levels
for each row
execute function public.set_current_timestamp();

drop trigger if exists recharge_rules_set_current_timestamp_tg on public.recharge_rules;
create trigger recharge_rules_set_current_timestamp_tg
before update on public.recharge_rules
for each row
execute function public.set_current_timestamp();

drop trigger if exists member_profiles_set_current_timestamp_tg on public.member_profiles;
create trigger member_profiles_set_current_timestamp_tg
before update on public.member_profiles
for each row
execute function public.set_current_timestamp();

drop trigger if exists scripts_set_current_timestamp_tg on public.scripts;
create trigger scripts_set_current_timestamp_tg
before update on public.scripts
for each row
execute function public.set_current_timestamp();

drop trigger if exists script_categories_set_current_timestamp_tg on public.script_categories;
create trigger script_categories_set_current_timestamp_tg
before update on public.script_categories
for each row
execute function public.set_current_timestamp();

drop trigger if exists script_tags_set_current_timestamp_tg on public.script_tags;
create trigger script_tags_set_current_timestamp_tg
before update on public.script_tags
for each row
execute function public.set_current_timestamp();

drop trigger if exists recommendations_set_current_timestamp_tg on public.recommendations;
create trigger recommendations_set_current_timestamp_tg
before update on public.recommendations
for each row
execute function public.set_current_timestamp();

drop trigger if exists makeup_gallery_items_set_current_timestamp_tg on public.makeup_gallery_items;
create trigger makeup_gallery_items_set_current_timestamp_tg
before update on public.makeup_gallery_items
for each row
execute function public.set_current_timestamp();

drop trigger if exists store_settings_set_current_timestamp_tg on public.store_settings;
create trigger store_settings_set_current_timestamp_tg
before update on public.store_settings
for each row
execute function public.set_current_timestamp();

drop trigger if exists admin_account_capability_overrides_set_current_timestamp_tg on public.admin_account_capability_overrides;
create trigger admin_account_capability_overrides_set_current_timestamp_tg
before update on public.admin_account_capability_overrides
for each row
execute function public.set_current_timestamp();

insert into public.member_levels (name, min_recharge_cents, discount_rate, sort_order, enabled)
values
  ('普通会员', 0, 0.9800, 1, true),
  ('银雾会员', 50000, 0.9500, 2, true),
  ('金雾会员', 100000, 0.9000, 3, true),
  ('黑雾会员', 300000, 0.8500, 4, true)
on conflict (name) do update
set
  min_recharge_cents = excluded.min_recharge_cents,
  discount_rate = excluded.discount_rate,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled;

insert into public.recharge_rules (threshold_cents, gift_cents, sort_order, enabled)
values
  (30000, 3000, 1, true),
  (50000, 8000, 2, true),
  (100000, 20000, 3, true),
  (200000, 50000, 4, true)
on conflict (threshold_cents) do update
set
  gift_cents = excluded.gift_cents,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled;

insert into public.script_categories (name, slug, sort_order, enabled)
values
  ('情感', 'qinggan', 1, true),
  ('欢乐', 'huanle', 2, true),
  ('推理', 'tuili', 3, true),
  ('硬核', 'yinghe', 4, true),
  ('恐怖', 'kongbu', 5, true),
  ('机制', 'jizhi', 6, true),
  ('阵营', 'zhenying', 7, true),
  ('古风', 'gufeng', 8, true),
  ('民国', 'minguo', 9, true),
  ('现代', 'xiandai', 10, true),
  ('新手友好', 'newbie', 11, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled;

insert into public.store_settings (
  store_name,
  wechat_account,
  phone,
  address,
  business_hours,
  description,
  social_links
)
select
  '十三雾沉浸式剧本体验馆',
  'shisanwu_kf',
  '021-1313-1313',
  '城市中心区 · 雾巷 13 号 2F',
  '14:00 - 次日 02:00',
  '沉浸式剧本体验馆，提供剧本、妆造与会员服务。',
  jsonb_build_object('xiaohongshu', 'https://www.xiaohongshu.com', 'douyin', 'https://www.douyin.com')
where not exists (
  select 1 from public.store_settings
);

create or replace function public.register_member(
  p_phone text,
  p_password text,
  p_confirm_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
  v_display_name text;
  v_level_name text;
begin
  if p_phone is null or p_phone !~ '^1[3-9][0-9]{9}$' then
    raise exception '手机号格式不正确';
  end if;

  if coalesce(length(trim(p_password)), 0) < 6 then
    raise exception '密码至少 6 位';
  end if;

  if p_password <> p_confirm_password then
    raise exception '两次输入的密码不一致';
  end if;

  if exists(select 1 from public.app_users where phone = p_phone) then
    raise exception '该手机号已注册';
  end if;

  insert into public.app_users (phone, password_hash)
  values (p_phone, extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning id into v_user_id;

  v_display_name := '会员' || right(p_phone, 4);

  insert into public.member_profiles (user_id, display_name)
  values (v_user_id, v_display_name)
  returning id into v_profile_id;

  select ml.name
    into v_level_name
  from public.member_profiles mp
  left join public.member_levels ml on ml.id = mp.level_id
  where mp.id = v_profile_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'member_profile_id', v_profile_id,
    'phone', p_phone,
    'display_name', v_display_name,
    'level_name', coalesce(v_level_name, '普通会员')
  );
end;
$$;

create or replace function public.login_member(
  p_phone text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
  v_display_name text;
  v_level_name text;
  v_balance_cents integer;
  v_points integer;
begin
  if p_phone is null or p_phone !~ '^1[3-9][0-9]{9}$' then
    raise exception '手机号格式不正确';
  end if;

  if coalesce(length(trim(p_password)), 0) = 0 then
    raise exception '请输入密码';
  end if;

  select
    u.id,
    mp.id,
    mp.display_name,
    ml.name,
    mp.balance_cents,
    mp.points
  into
    v_user_id,
    v_profile_id,
    v_display_name,
    v_level_name,
    v_balance_cents,
    v_points
  from public.app_users u
  left join public.member_profiles mp on mp.user_id = u.id
  left join public.member_levels ml on ml.id = mp.level_id
  where u.phone = p_phone
    and u.is_active = true
    and u.password_hash = extensions.crypt(p_password, u.password_hash);

  if v_user_id is null then
    raise exception '手机号或密码不正确';
  end if;

  update public.app_users
  set last_login_at = timezone('utc', now())
  where id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'member_profile_id', v_profile_id,
    'phone', p_phone,
    'display_name', v_display_name,
    'level_name', v_level_name,
    'balance_cents', v_balance_cents,
    'points', v_points
  );
end;
$$;

create or replace function public.login_admin(
  p_account text,
  p_password text,
  p_role public.admin_role default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_display_name text;
  v_role public.admin_role;
  v_account citext;
begin
  if coalesce(length(trim(p_account)), 0) = 0 then
    raise exception '请输入管理员账号';
  end if;

  if coalesce(length(trim(p_password)), 0) = 0 then
    raise exception '请输入登录密码';
  end if;

  select
    a.id,
    a.display_name,
    a.role,
    a.account
  into
    v_admin_id,
    v_display_name,
    v_role,
    v_account
  from public.admin_accounts a
  where a.account = p_account
    and a.is_active = true
    and (p_role is null or a.role = p_role)
    and a.password_hash = extensions.crypt(p_password, a.password_hash);

  if v_admin_id is null then
    raise exception '管理员账号、角色或密码不正确';
  end if;

  update public.admin_accounts
  set last_login_at = timezone('utc', now())
  where id = v_admin_id;

  return jsonb_build_object(
    'admin_id', v_admin_id,
    'account', v_account,
    'display_name', v_display_name,
    'role', v_role
  );
end;
$$;

revoke all on function public.register_member(text, text, text) from public;
revoke all on function public.login_member(text, text) from public;
revoke all on function public.login_admin(text, text, public.admin_role) from public;

grant execute on function public.register_member(text, text, text) to anon, authenticated;
grant execute on function public.login_member(text, text) to anon, authenticated;
grant execute on function public.login_admin(text, text, public.admin_role) to anon, authenticated;

alter table public.app_users enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.member_levels enable row level security;
alter table public.recharge_rules enable row level security;
alter table public.member_profiles enable row level security;
alter table public.scripts enable row level security;
alter table public.script_categories enable row level security;
alter table public.script_tags enable row level security;
alter table public.script_category_relations enable row level security;
alter table public.script_tag_relations enable row level security;
alter table public.recommendations enable row level security;
alter table public.makeup_gallery_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.recharge_records enable row level security;
alter table public.consumption_records enable row level security;
alter table public.point_transactions enable row level security;
alter table public.admin_operation_logs enable row level security;
alter table public.admin_account_capability_overrides enable row level security;

drop policy if exists "member_levels_public_read" on public.member_levels;
create policy "member_levels_public_read"
on public.member_levels
for select
to anon, authenticated
using (enabled = true);

drop policy if exists "recharge_rules_public_read" on public.recharge_rules;
create policy "recharge_rules_public_read"
on public.recharge_rules
for select
to anon, authenticated
using (enabled = true);

drop policy if exists "published_scripts_public_read" on public.scripts;
create policy "published_scripts_public_read"
on public.scripts
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "script_categories_public_read" on public.script_categories;
create policy "script_categories_public_read"
on public.script_categories
for select
to anon, authenticated
using (enabled = true);

drop policy if exists "script_tags_public_read" on public.script_tags;
create policy "script_tags_public_read"
on public.script_tags
for select
to anon, authenticated
using (true);

drop policy if exists "script_category_relations_public_read" on public.script_category_relations;
create policy "script_category_relations_public_read"
on public.script_category_relations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.scripts s
    where s.id = script_id
      and s.status = 'published'
  )
);

drop policy if exists "script_tag_relations_public_read" on public.script_tag_relations;
create policy "script_tag_relations_public_read"
on public.script_tag_relations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.scripts s
    where s.id = script_id
      and s.status = 'published'
  )
);

drop policy if exists "recommendations_public_read" on public.recommendations;
create policy "recommendations_public_read"
on public.recommendations
for select
to anon, authenticated
using (
  enabled = true
  and exists (
    select 1
    from public.scripts s
    where s.id = script_id
      and s.status = 'published'
  )
);

drop policy if exists "makeup_gallery_public_read" on public.makeup_gallery_items;
create policy "makeup_gallery_public_read"
on public.makeup_gallery_items
for select
to anon, authenticated
using (visible = true);

drop policy if exists "store_settings_public_read" on public.store_settings;
create policy "store_settings_public_read"
on public.store_settings
for select
to anon, authenticated
using (true);

commit;
