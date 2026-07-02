begin;

create extension if not exists pgcrypto;

create or replace function public.register_member(
  p_phone text,
  p_password text,
  p_confirm_password text,
  p_remember boolean default true
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
  v_session jsonb;
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

  v_session := public._issue_member_session(v_user_id, v_profile_id, p_remember);

  return jsonb_build_object(
    'user_id', v_user_id,
    'member_profile_id', v_profile_id,
    'phone', p_phone,
    'display_name', v_display_name,
    'level_name', coalesce(v_level_name, '普通会员'),
    'session_token', v_session->>'session_token',
    'session_expires_at', v_session->>'expires_at',
    'remember', p_remember
  );
end;
$$;

create or replace function public.login_member(
  p_phone text,
  p_password text,
  p_remember boolean default true
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
  v_session jsonb;
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

  v_session := public._issue_member_session(v_user_id, v_profile_id, p_remember);

  return jsonb_build_object(
    'user_id', v_user_id,
    'member_profile_id', v_profile_id,
    'phone', p_phone,
    'display_name', v_display_name,
    'level_name', v_level_name,
    'balance_cents', v_balance_cents,
    'points', v_points,
    'session_token', v_session->>'session_token',
    'session_expires_at', v_session->>'expires_at',
    'remember', p_remember
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
  v_session jsonb;
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

  v_session := public._issue_admin_session(v_admin_id);

  return jsonb_build_object(
    'admin_id', v_admin_id,
    'account', v_account,
    'display_name', v_display_name,
    'role', v_role,
    'session_token', v_session->>'session_token',
    'session_expires_at', v_session->>'expires_at'
  );
end;
$$;

create or replace function public.admin_create_member(
  p_session_token uuid,
  p_name text,
  p_phone text,
  p_initial_recharge integer default 0,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_user_id uuid;
  v_profile_id uuid;
  v_gift integer := 0;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  if p_name is null or trim(p_name) = '' then
    raise exception '请填写姓名';
  end if;

  if p_phone is null or p_phone !~ '^1[3-9][0-9]{9}$' then
    raise exception '请输入正确的 11 位手机号';
  end if;

  if exists(select 1 from public.app_users where phone = p_phone) then
    raise exception '该手机号已存在';
  end if;

  insert into public.app_users (phone, password_hash)
  values (p_phone, extensions.crypt('88888888', extensions.gen_salt('bf')))
  returning id into v_user_id;

  insert into public.member_profiles (user_id, display_name, remark)
  values (v_user_id, trim(p_name), coalesce(p_note, ''))
  returning id into v_profile_id;

  if coalesce(p_initial_recharge, 0) > 0 then
    select coalesce(gift_cents, 0)
      into v_gift
    from public.recharge_rules
    where enabled = true
      and threshold_cents <= p_initial_recharge * 100
    order by threshold_cents desc
    limit 1;

    update public.member_profiles
    set
      balance_cents = p_initial_recharge * 100 + v_gift,
      total_recharge_cents = p_initial_recharge * 100,
      total_gift_cents = v_gift
    where id = v_profile_id;

    insert into public.recharge_records (
      member_id,
      amount_cents,
      gift_cents,
      before_balance_cents,
      after_balance_cents,
      operator_id,
      remark
    ) values (
      v_profile_id,
      p_initial_recharge * 100,
      v_gift,
      0,
      p_initial_recharge * 100 + v_gift,
      v_admin.admin_account_id,
      '后台新增会员初始充值'
    );
  end if;

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (
    v_admin.admin_account_id,
    '新增会员',
    'member',
    v_profile_id::text,
    coalesce(p_note, '默认密码 88888888')
  );

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_upsert_staff_account(
  p_session_token uuid,
  p_admin_id uuid,
  p_name text,
  p_phone text,
  p_account text,
  p_role public.admin_role,
  p_active boolean,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_id uuid;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_account), '') = '' then
    raise exception '请填写完整账号信息';
  end if;

  if p_admin_id is null and coalesce(length(trim(p_password)), 0) < 6 then
    raise exception '新员工账号必须设置至少 6 位密码';
  end if;

  if p_admin_id is null then
    insert into public.admin_accounts (account, password_hash, display_name, role, is_active)
    values (p_account, extensions.crypt(p_password, extensions.gen_salt('bf')), p_name, p_role, p_active)
    returning id into v_id;

    update public.admin_accounts
    set phone = p_phone
    where id = v_id;
  else
    update public.admin_accounts
    set
      account = p_account,
      display_name = p_name,
      phone = p_phone,
      role = p_role,
      is_active = p_active,
      password_hash = case
        when coalesce(length(trim(p_password)), 0) >= 6 then extensions.crypt(p_password, extensions.gen_salt('bf'))
        else password_hash
      end
    where id = p_admin_id
    returning id into v_id;
  end if;

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (
    v_admin.admin_account_id,
    case when p_admin_id is null then '新增员工账号' else '编辑员工账号' end,
    'staff',
    v_id::text,
    p_name
  );

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

insert into public.admin_accounts (account, password_hash, display_name, role, is_active, phone)
values
  ('wuzhu', extensions.crypt('shisanwu888', extensions.gen_salt('bf')), '雾主 · 阿沉', 'boss', true, '13800000001'),
  ('lin_su', extensions.crypt('shisanwu888', extensions.gen_salt('bf')), '林夙', 'mgr', true, '15900002280'),
  ('dm_xiaoye', extensions.crypt('shisanwu888', extensions.gen_salt('bf')), '小野', 'dm', true, '13300007741')
on conflict (account) do update
set
  password_hash = excluded.password_hash,
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = excluded.is_active,
  phone = excluded.phone;

commit;
