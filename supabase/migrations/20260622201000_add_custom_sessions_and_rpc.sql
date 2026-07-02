begin;

alter table public.admin_accounts
add column if not exists phone text;

create table if not exists public.member_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  member_profile_id uuid not null references public.member_profiles(id) on delete cascade,
  session_token uuid not null default gen_random_uuid() unique,
  remember boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid not null references public.admin_accounts(id) on delete cascade,
  session_token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists member_sessions_user_id_idx on public.member_sessions(user_id);
create index if not exists member_sessions_member_profile_id_idx on public.member_sessions(member_profile_id);
create index if not exists admin_sessions_admin_account_id_idx on public.admin_sessions(admin_account_id);

drop trigger if exists member_sessions_set_current_timestamp_tg on public.member_sessions;
create trigger member_sessions_set_current_timestamp_tg
before update on public.member_sessions
for each row
execute function public.set_current_timestamp();

drop trigger if exists admin_sessions_set_current_timestamp_tg on public.admin_sessions;
create trigger admin_sessions_set_current_timestamp_tg
before update on public.admin_sessions
for each row
execute function public.set_current_timestamp();

create or replace function public._mask_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when p_phone ~ '^1[3-9][0-9]{9}$' then left(p_phone, 3) || '****' || right(p_phone, 4)
    else p_phone
  end;
$$;

create or replace function public._humanize_time(p_time timestamptz)
returns text
language plpgsql
stable
as $$
declare
  v_diff interval;
begin
  v_diff := timezone('utc', now()) - p_time;

  if v_diff < interval '1 minute' then
    return '刚刚';
  elsif v_diff < interval '1 hour' then
    return floor(extract(epoch from v_diff) / 60)::int || ' 分钟前';
  elsif v_diff < interval '1 day' then
    return floor(extract(epoch from v_diff) / 3600)::int || ' 小时前';
  else
    return to_char(p_time at time zone 'Asia/Shanghai', 'MM-DD HH24:MI');
  end if;
end;
$$;

create or replace function public._require_member_session(p_session_token uuid)
returns public.member_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.member_sessions;
begin
  select *
    into v_session
  from public.member_sessions
  where session_token = p_session_token
    and expires_at > timezone('utc', now())
  order by created_at desc
  limit 1;

  if v_session.id is null then
    raise exception '会员会话已失效，请重新登录';
  end if;

  return v_session;
end;
$$;

create or replace function public._require_admin_session(p_session_token uuid)
returns table (
  session_id uuid,
  admin_account_id uuid,
  role public.admin_role,
  display_name text,
  account citext
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    s.id,
    a.id,
    a.role,
    a.display_name,
    a.account
  from public.admin_sessions s
  join public.admin_accounts a on a.id = s.admin_account_id
  where s.session_token = p_session_token
    and s.expires_at > timezone('utc', now())
    and a.is_active = true
  order by s.created_at desc
  limit 1;

  if not found then
    raise exception '管理员会话已失效，请重新登录';
  end if;
end;
$$;

create or replace function public._issue_member_session(
  p_user_id uuid,
  p_member_profile_id uuid,
  p_remember boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.member_sessions;
  v_days integer;
begin
  v_days := case when p_remember then 30 else 1 end;

  insert into public.member_sessions (user_id, member_profile_id, remember, expires_at)
  values (
    p_user_id,
    p_member_profile_id,
    p_remember,
    timezone('utc', now()) + make_interval(days => v_days)
  )
  returning * into v_session;

  return jsonb_build_object(
    'session_token', v_session.session_token,
    'expires_at', v_session.expires_at,
    'remember', v_session.remember
  );
end;
$$;

create or replace function public._issue_admin_session(p_admin_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.admin_sessions;
begin
  insert into public.admin_sessions (admin_account_id, expires_at)
  values (
    p_admin_account_id,
    timezone('utc', now()) + interval '7 days'
  )
  returning * into v_session;

  return jsonb_build_object(
    'session_token', v_session.session_token,
    'expires_at', v_session.expires_at
  );
end;
$$;

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

create or replace function public.logout_member(p_session_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.member_sessions where session_token = p_session_token;
$$;

create or replace function public.logout_admin(p_session_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.admin_sessions where session_token = p_session_token;
$$;

create or replace function public.get_member_dashboard(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.member_sessions;
  v_profile jsonb;
  v_consume_logs jsonb;
  v_recharge_logs jsonb;
  v_point_logs jsonb;
  v_recharge_rules jsonb;
  v_level_rules jsonb;
begin
  v_session := public._require_member_session(p_session_token);

  select jsonb_build_object(
    'id', mp.id,
    'name', mp.display_name,
    'phone', au.phone,
    'maskedPhone', public._mask_phone(au.phone),
    'avatarText', left(mp.display_name, 1),
    'balance', round((mp.balance_cents / 100.0)::numeric, 2),
    'totalRecharge', round((mp.total_recharge_cents / 100.0)::numeric, 2),
    'totalSpend', round((mp.total_spend_cents / 100.0)::numeric, 2),
    'points', mp.points,
    'levelLabel', coalesce(ml.name, '普通会员'),
    'discountLabel', trim(trailing '.0' from trim(trailing '0' from ((coalesce(ml.discount_rate, 0.98) * 10)::text))) || ' 折',
    'birthday', coalesce(to_char(mp.birthday, 'YYYY-MM-DD'), ''),
    'greetingName', '你好，' || mp.display_name,
    'title', mp.title,
    'remark', mp.remark
  )
  into v_profile
  from public.member_profiles mp
  join public.app_users au on au.id = mp.user_id
  left join public.member_levels ml on ml.id = mp.level_id
  where mp.id = v_session.member_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'time', to_char(cr.created_at at time zone 'Asia/Shanghai', 'MM-DD HH24:MI'),
        'title', coalesce(s.title, '到店消费'),
        'amount', '-' || to_char(cr.paid_amount_cents / 100.0, 'FM¥999999990.00'),
        'points', '+' || cr.earned_points::text
      )
      order by cr.created_at desc
    ),
    '[]'::jsonb
  )
  into v_consume_logs
  from public.consumption_records cr
  left join public.scripts s on s.id = cr.script_id
  where cr.member_id = v_session.member_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'time', to_char(rr.created_at at time zone 'Asia/Shanghai', 'MM-DD HH24:MI'),
        'amount', to_char(rr.amount_cents / 100.0, 'FM¥999999990.00'),
        'gift', '+' || to_char(rr.gift_cents / 100.0, 'FM¥999999990.00'),
        'balance', to_char(rr.after_balance_cents / 100.0, 'FM¥999999990.00')
      )
      order by rr.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recharge_logs
  from public.recharge_records rr
  where rr.member_id = v_session.member_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'time', to_char(pt.created_at at time zone 'Asia/Shanghai', 'MM-DD HH24:MI'),
        'source', case
          when pt.source_type = 'consumption' then '消费获得积分'
          when pt.source_type = 'redeem' then '权益兑换'
          when pt.source_type = 'adjust' then '后台调整'
          else coalesce(pt.source_type, '积分变动')
        end,
        'type', case
          when pt.type = 'earn' then '获得'
          when pt.type = 'redeem' then '使用'
          else '调整'
        end,
        'amount', case
          when pt.type = 'earn' then '+' || pt.points::text
          when pt.type = 'redeem' then '-' || pt.points::text
          else case when pt.after_points >= pt.before_points then '+' else '-' end || abs(pt.after_points - pt.before_points)::text
        end
      )
      order by pt.created_at desc
    ),
    '[]'::jsonb
  )
  into v_point_logs
  from public.point_transactions pt
  where pt.member_id = v_session.member_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'amount', rr.threshold_cents / 100,
        'gift', rr.gift_cents / 100
      )
      order by rr.sort_order asc
    ),
    '[]'::jsonb
  )
  into v_recharge_rules
  from public.recharge_rules rr
  where rr.enabled = true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', ml.name,
        'min', ml.min_recharge_cents / 100,
        'discount', trim(trailing '.0' from trim(trailing '0' from ((ml.discount_rate * 10)::text)))
      )
      order by ml.sort_order asc
    ),
    '[]'::jsonb
  )
  into v_level_rules
  from public.member_levels ml
  where ml.enabled = true;

  return jsonb_build_object(
    'profile', v_profile,
    'consumeLogs', v_consume_logs,
    'rechargeLogs', v_recharge_logs,
    'pointLogs', v_point_logs,
    'rechargeRules', v_recharge_rules,
    'levelRules', v_level_rules
  );
end;
$$;

create or replace function public.update_member_profile_settings(
  p_session_token uuid,
  p_display_name text,
  p_birthday date,
  p_title text,
  p_remark text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.member_sessions;
begin
  v_session := public._require_member_session(p_session_token);

  update public.member_profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    birthday = p_birthday,
    title = coalesce(nullif(trim(p_title), ''), title),
    remark = coalesce(p_remark, '')
  where id = v_session.member_profile_id;

  return public.get_member_dashboard(p_session_token);
end;
$$;

create or replace function public.get_admin_bootstrap(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_dashboard jsonb;
  v_members jsonb;
  v_scripts jsonb;
  v_recommendations jsonb;
  v_makeup jsonb;
  v_recharge_rules jsonb;
  v_level_rules jsonb;
  v_staff_accounts jsonb;
  v_logs jsonb;
  v_store_settings jsonb;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  with member_count as (
    select count(*)::int as total from public.member_profiles
  ),
  script_count as (
    select count(*)::int as total, count(*) filter (where status = 'published')::int as published_total from public.scripts
  ),
  today_recharge as (
    select coalesce(sum(amount_cents + gift_cents), 0)::int as total
    from public.recharge_records
    where created_at >= date_trunc('day', timezone('utc', now()))
  ),
  today_spend as (
    select coalesce(sum(paid_amount_cents), 0)::int as total
    from public.consumption_records
    where created_at >= date_trunc('day', timezone('utc', now()))
  )
  select jsonb_build_object(
    'stats', jsonb_build_array(
      jsonb_build_object('title', '今日充值', 'value', to_char((tr.total / 100.0), 'FM¥999999990.00'), 'trend', '实时汇总', 'accent', 'seal'),
      jsonb_build_object('title', '今日消费', 'value', to_char((ts.total / 100.0), 'FM¥999999990.00'), 'trend', '实时汇总'),
      jsonb_build_object('title', '会员总数', 'value', mc.total::text, 'trend', '当前注册会员'),
      jsonb_build_object('title', '在库剧本', 'value', sc.total::text || ' · 上架 ' || sc.published_total::text, 'trend', '主推位实时同步')
    ),
    'monthSummary', jsonb_build_object(
      'rechargeTotal', to_char((coalesce((select sum(amount_cents + gift_cents) from public.recharge_records where created_at >= date_trunc('month', timezone('utc', now()))), 0) / 100.0), 'FM¥999999990.00'),
      'spendTotal', to_char((coalesce((select sum(paid_amount_cents) from public.consumption_records where created_at >= date_trunc('month', timezone('utc', now()))), 0) / 100.0), 'FM¥999999990.00'),
      'giftTotal', to_char((coalesce((select sum(gift_cents) from public.recharge_records where created_at >= date_trunc('month', timezone('utc', now()))), 0) / 100.0), 'FM¥999999990.00'),
      'newMembers', coalesce((select count(*)::int from public.app_users where created_at >= date_trunc('month', timezone('utc', now()))), 0),
      'avgSpend', to_char((coalesce((select avg(paid_amount_cents) from public.consumption_records where created_at >= date_trunc('month', timezone('utc', now()))), 0) / 100.0), 'FM¥999999990.00')
    ),
    'todos', jsonb_build_array(
      jsonb_build_object('color', 'var(--tm-seal)', 'text', '实时数据模式已启用，请按需补充种子数据。'),
      jsonb_build_object('color', 'var(--tm-info)', 'text', '建议先在 Supabase SQL Editor 执行迁移并插入初始化内容。')
    )
  )
  into v_dashboard
  from member_count mc, script_count sc, today_recharge tr, today_spend ts;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', mp.id,
        'name', mp.display_name,
        'phone', public._mask_phone(au.phone),
        'level', greatest(0, ml.sort_order - 1),
        'balance', round((mp.balance_cents / 100.0)::numeric, 2),
        'totalRecharge', round((mp.total_recharge_cents / 100.0)::numeric, 2),
        'totalSpend', round((mp.total_spend_cents / 100.0)::numeric, 2),
        'points', mp.points,
        'last', coalesce(to_char(mp.last_consumed_at at time zone 'Asia/Shanghai', 'MM-DD'), '—'),
        'join', to_char(mp.created_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD'),
        'ledger', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'type', item.type,
              'description', item.description,
              'amount', item.amount,
              'time', item.time
            )
            order by item.sort_time desc
          )
          from (
            select
              'recharge'::text as type,
              '充值 ' || to_char(rr.amount_cents / 100.0, 'FM¥999999990.00') || '，赠 ' || to_char(rr.gift_cents / 100.0, 'FM¥999999990.00') || coalesce(case when rr.remark is not null and rr.remark <> '' then ' · ' || rr.remark else '' end, '') as description,
              round(((rr.amount_cents + rr.gift_cents) / 100.0)::numeric, 2) as amount,
              public._humanize_time(rr.created_at) as time,
              rr.created_at as sort_time
            from public.recharge_records rr
            where rr.member_id = mp.id
            union all
            select
              'spend'::text,
              coalesce(s.title, '到店消费') || ' · ' || trim(trailing '.0' from trim(trailing '0' from ((coalesce(ml2.discount_rate, 0.98) * 10)::text))) || ' 折',
              round((-cr.paid_amount_cents / 100.0)::numeric, 2),
              public._humanize_time(cr.created_at),
              cr.created_at
            from public.consumption_records cr
            left join public.scripts s on s.id = cr.script_id
            left join public.member_levels ml2 on ml2.id = mp.level_id
            where cr.member_id = mp.id
            union all
            select
              'adjust'::text,
              coalesce(aol.action, '后台调整') || coalesce(case when aol.remark is not null and aol.remark <> '' then ' · ' || aol.remark else '' end, ''),
              0::numeric,
              public._humanize_time(aol.created_at),
              aol.created_at
            from public.admin_operation_logs aol
            where aol.target_type = 'member'
              and aol.target_id = mp.id::text
              and aol.action like '手动调整%'
          ) as item
        ), '[]'::jsonb)
      )
      order by mp.created_at desc
    ),
    '[]'::jsonb
  )
  into v_members
  from public.member_profiles mp
  join public.app_users au on au.id = mp.user_id
  left join public.member_levels ml on ml.id = mp.level_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.title,
        'cover', coalesce(s.cover_url, '#3a4a63'),
        'players', s.player_min::text || case when s.player_max > s.player_min then '（' || s.player_min::text || '-' || s.player_max::text || '）' else '（限定）' end,
        'duration', (s.duration_minutes / 60.0)::numeric(10,1)::text || ' 小时',
        'difficulty', s.difficulty,
        'makeup', case when s.needs_makeup then 'yes' else 'no' end,
        'tags', coalesce((
          select jsonb_agg(sc.name order by sc.sort_order asc)
          from public.script_category_relations scr
          join public.script_categories sc on sc.id = scr.category_id
          where scr.script_id = s.id
        ), '[]'::jsonb),
        'on', s.status = 'published',
        'intro', coalesce(s.summary, s.description, '')
      )
      order by s.created_at desc
    ),
    '[]'::jsonb
  )
  into v_scripts
  from public.scripts s;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.script_id,
        'copy', coalesce(r.title_override, '')
      )
      order by r.position asc
    ),
    '[]'::jsonb
  )
  into v_recommendations
  from public.recommendations r;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', mgi.id,
        'name', mgi.title,
        'style', coalesce(mgi.style_tags[1], '未分类'),
        'time', coalesce(mgi.service_duration_minutes::text || ' 分钟', ''),
        'scripts', coalesce(s.title, ''),
        'price', coalesce(round((mgi.price_cents / 100.0)::numeric, 2), 0),
        'on', mgi.visible,
        'cover', coalesce(mgi.thumbnail_url, '#5a3550'),
        'description', coalesce(mgi.description, '')
      )
      order by mgi.sort_order desc, mgi.created_at desc
    ),
    '[]'::jsonb
  )
  into v_makeup
  from public.makeup_gallery_items mgi
  left join public.scripts s on s.id = mgi.related_script_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'min', threshold_cents / 100,
        'gift', gift_cents / 100
      )
      order by sort_order asc
    ),
    '[]'::jsonb
  )
  into v_recharge_rules
  from public.recharge_rules;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'min', min_recharge_cents / 100,
        'discount', trim(trailing '.0' from trim(trailing '0' from ((discount_rate * 10)::text)))
      )
      order by sort_order asc
    ),
    '[]'::jsonb
  )
  into v_level_rules
  from public.member_levels;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', aa.id,
        'name', aa.display_name,
        'phone', coalesce(public._mask_phone(aa.phone), ''),
        'account', aa.account,
        'role', aa.role,
        'active', aa.is_active,
        'last', coalesce(public._humanize_time(aa.last_login_at), '—'),
        'locked', aa.role = 'boss'
      )
      order by aa.created_at asc
    ),
    '[]'::jsonb
  )
  into v_staff_accounts
  from public.admin_accounts aa;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', aol.id,
        'time', to_char(aol.created_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS'),
        'operator', aa.display_name,
        'role', case aa.role when 'boss' then '老板' when 'mgr' then '店长' else '员工' end,
        'type', case
          when aol.target_type in ('member', 'recharge', 'consume', 'points') then 'money'
          when aol.target_type in ('script', 'recommendation', 'makeup', 'setting') then 'content'
          else 'member'
        end,
        'action', aol.action,
        'target', coalesce(aol.target_type, '') || coalesce(case when aol.target_id is not null then ' · ' || aol.target_id else '' end, ''),
        'ip', 'N/A',
        'description', coalesce(aol.remark, ''),
        'diff', jsonb_build_array(),
        'sensitive', aol.target_type in ('member', 'recharge', 'consume', 'points')
      )
      order by aol.created_at desc
    ),
    '[]'::jsonb
  )
  into v_logs
  from public.admin_operation_logs aol
  join public.admin_accounts aa on aa.id = aol.operator_id;

  select jsonb_build_object(
    'storeName', ss.store_name,
    'wechatAccount', coalesce(ss.wechat_account, ''),
    'wechatQrUrl', coalesce(ss.wechat_qr_url, ''),
    'phone', coalesce(ss.phone, ''),
    'address', coalesce(ss.address, ''),
    'businessHours', coalesce(ss.business_hours, ''),
    'description', coalesce(ss.description, ''),
    'socialLinks', coalesce(ss.social_links, '{}'::jsonb)
  )
  into v_store_settings
  from public.store_settings ss
  order by ss.created_at asc
  limit 1;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'adminId', v_admin.admin_account_id,
      'role', v_admin.role,
      'displayName', v_admin.display_name,
      'account', v_admin.account
    ),
    'dashboard', v_dashboard,
    'members', v_members,
    'scripts', v_scripts,
    'recommendations', v_recommendations,
    'makeup', v_makeup,
    'rechargeRules', v_recharge_rules,
    'levelRules', v_level_rules,
    'staffAccounts', v_staff_accounts,
    'logs', v_logs,
    'storeSettings', coalesce(v_store_settings, '{}'::jsonb)
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

create or replace function public.admin_recharge_member(
  p_session_token uuid,
  p_member_id uuid,
  p_amount integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_profile public.member_profiles;
  v_gift integer := 0;
  v_after integer;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  if coalesce(p_amount, 0) <= 0 then
    raise exception '请输入充值金额';
  end if;

  select * into v_profile from public.member_profiles where id = p_member_id for update;
  if v_profile.id is null then
    raise exception '会员不存在';
  end if;

  select coalesce(gift_cents, 0)
    into v_gift
  from public.recharge_rules
  where enabled = true
    and threshold_cents <= p_amount * 100
  order by threshold_cents desc
  limit 1;

  v_after := v_profile.balance_cents + p_amount * 100 + v_gift;

  update public.member_profiles
  set
    balance_cents = v_after,
    total_recharge_cents = total_recharge_cents + p_amount * 100,
    total_gift_cents = total_gift_cents + v_gift
  where id = p_member_id;

  insert into public.recharge_records (
    member_id, amount_cents, gift_cents, before_balance_cents, after_balance_cents, operator_id, remark
  ) values (
    p_member_id, p_amount * 100, v_gift, v_profile.balance_cents, v_after, v_admin.admin_account_id, p_note
  );

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (v_admin.admin_account_id, '会员充值', 'recharge', p_member_id::text, p_note);

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_consume_member(
  p_session_token uuid,
  p_member_id uuid,
  p_item text,
  p_amount integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_profile public.member_profiles;
  v_discount numeric(5,4);
  v_paid integer;
  v_points integer;
  v_after integer;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  if coalesce(p_amount, 0) <= 0 then
    raise exception '请输入消费金额';
  end if;

  select mp.*
    into v_profile
  from public.member_profiles mp
  where mp.id = p_member_id
  for update;

  if v_profile.id is null then
    raise exception '会员不存在';
  end if;

  select discount_rate
    into v_discount
  from public.member_levels
  where id = v_profile.level_id;

  v_discount := coalesce(v_discount, 0.98);
  v_paid := round(p_amount * 100 * v_discount);

  if v_profile.balance_cents < v_paid then
    raise exception '余额不足，消费失败';
  end if;

  v_points := floor(v_paid / 100.0);
  v_after := v_profile.balance_cents - v_paid;

  update public.member_profiles
  set
    balance_cents = v_after,
    total_spend_cents = total_spend_cents + v_paid,
    points = points + v_points,
    last_consumed_at = timezone('utc', now())
  where id = p_member_id;

  insert into public.consumption_records (
    member_id,
    original_amount_cents,
    discount_rate,
    paid_amount_cents,
    earned_points,
    before_balance_cents,
    after_balance_cents,
    operator_id,
    remark
  ) values (
    p_member_id,
    p_amount * 100,
    v_discount,
    v_paid,
    v_points,
    v_profile.balance_cents,
    v_after,
    v_admin.admin_account_id,
    coalesce(p_item, '到店消费') || coalesce(case when p_note is not null and p_note <> '' then ' · ' || p_note else '' end, '')
  );

  insert into public.point_transactions (
    member_id,
    type,
    points,
    before_points,
    after_points,
    source_type,
    operator_id,
    remark
  ) values (
    p_member_id,
    'earn',
    v_points,
    v_profile.points,
    v_profile.points + v_points,
    'consumption',
    v_admin.admin_account_id,
    p_item
  );

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (v_admin.admin_account_id, '会员消费', 'consume', p_member_id::text, coalesce(p_item, '到店消费'));

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_adjust_member(
  p_session_token uuid,
  p_member_id uuid,
  p_field text,
  p_delta integer default 0,
  p_new_level_name text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_profile public.member_profiles;
  v_new_level_id uuid;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  if coalesce(trim(p_note), '') = '' then
    raise exception '手动调整必须填写备注';
  end if;

  select * into v_profile from public.member_profiles where id = p_member_id for update;
  if v_profile.id is null then
    raise exception '会员不存在';
  end if;

  if p_field = 'balance' then
    update public.member_profiles
    set balance_cents = greatest(0, balance_cents + p_delta * 100)
    where id = p_member_id;
  elsif p_field = 'points' then
    update public.member_profiles
    set points = greatest(0, points + p_delta)
    where id = p_member_id;
  elsif p_field = 'level' then
    select id into v_new_level_id
    from public.member_levels
    where name = p_new_level_name
    limit 1;

    if v_new_level_id is null then
      raise exception '目标等级不存在';
    end if;

    update public.member_profiles
    set level_id = v_new_level_id
    where id = p_member_id;
  else
    raise exception '不支持的调整类型';
  end if;

  if p_field = 'points' then
    insert into public.point_transactions (
      member_id, type, points, before_points, after_points, source_type, operator_id, remark
    )
    values (
      p_member_id,
      'adjust',
      abs(p_delta),
      v_profile.points,
      greatest(0, v_profile.points + p_delta),
      'adjust',
      v_admin.admin_account_id,
      p_note
    );
  end if;

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (
    v_admin.admin_account_id,
    '手动调整' || case p_field when 'balance' then '余额' when 'points' then '积分' else '等级' end,
    'member',
    p_member_id::text,
    p_note
  );

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_upsert_script(
  p_session_token uuid,
  p_script_id uuid,
  p_title text,
  p_cover_url text,
  p_player_min integer,
  p_player_max integer,
  p_duration_minutes integer,
  p_difficulty public.script_difficulty,
  p_needs_makeup boolean,
  p_summary text,
  p_status public.script_status,
  p_tags text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_id uuid;
  v_slug text;
  v_tag text;
  v_category_id uuid;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  if coalesce(trim(p_title), '') = '' then
    raise exception '请填写剧本名称';
  end if;

  v_slug := lower(regexp_replace(trim(p_title), '[^a-zA-Z0-9一-龥]+', '-', 'g'));
  if v_slug = '' then
    v_slug := 'script-' || extract(epoch from timezone('utc', now()))::bigint::text;
  end if;

  if p_script_id is null then
    insert into public.scripts (
      title, slug, cover_url, summary, player_min, player_max, duration_minutes, difficulty, needs_makeup, status, created_by
    ) values (
      trim(p_title), v_slug || '-' || substr(gen_random_uuid()::text, 1, 8), p_cover_url, p_summary, p_player_min, p_player_max, p_duration_minutes, p_difficulty, p_needs_makeup, p_status, v_admin.admin_account_id
    )
    returning id into v_id;
  else
    update public.scripts
    set
      title = trim(p_title),
      cover_url = p_cover_url,
      summary = p_summary,
      player_min = p_player_min,
      player_max = p_player_max,
      duration_minutes = p_duration_minutes,
      difficulty = p_difficulty,
      needs_makeup = p_needs_makeup,
      status = p_status
    where id = p_script_id
    returning id into v_id;
  end if;

  delete from public.script_category_relations where script_id = v_id;

  foreach v_tag in array coalesce(p_tags, '{}') loop
    select id into v_category_id from public.script_categories where name = v_tag limit 1;
    if v_category_id is not null then
      insert into public.script_category_relations (script_id, category_id)
      values (v_id, v_category_id)
      on conflict do nothing;
    end if;
  end loop;

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (v_admin.admin_account_id, case when p_script_id is null then '新增剧本' else '编辑剧本' end, 'script', v_id::text, trim(p_title));

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_set_script_status(
  p_session_token uuid,
  p_script_id uuid,
  p_status public.script_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  update public.scripts
  set status = p_status
  where id = p_script_id;

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (v_admin.admin_account_id, '剧本状态变更', 'script', p_script_id::text, p_status::text);

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_save_recommendations(
  p_session_token uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_item jsonb;
  v_index integer := 0;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  delete from public.recommendations;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_index := v_index + 1;
    insert into public.recommendations (script_id, position, title_override, enabled)
    values (
      (v_item->>'id')::uuid,
      v_index,
      nullif(v_item->>'copy', ''),
      true
    );
  end loop;

  insert into public.admin_operation_logs (operator_id, action, target_type, remark)
  values (v_admin.admin_account_id, '更新推荐位', 'recommendation', '保存首页推荐位');

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_upsert_makeup(
  p_session_token uuid,
  p_makeup_id uuid,
  p_title text,
  p_style text,
  p_service_duration_minutes integer,
  p_related_script_id uuid,
  p_price numeric,
  p_visible boolean,
  p_cover text,
  p_description text
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

  if p_makeup_id is null then
    insert into public.makeup_gallery_items (
      title, image_url, thumbnail_url, description, style_tags, related_script_id, service_duration_minutes, price_cents, visible
    ) values (
      p_title, coalesce(p_cover, '#5a3550'), coalesce(p_cover, '#5a3550'), p_description, array[p_style], p_related_script_id, p_service_duration_minutes, round(coalesce(p_price, 0) * 100), p_visible
    )
    returning id into v_id;
  else
    update public.makeup_gallery_items
    set
      title = p_title,
      image_url = coalesce(p_cover, image_url),
      thumbnail_url = coalesce(p_cover, thumbnail_url),
      description = p_description,
      style_tags = array[p_style],
      related_script_id = p_related_script_id,
      service_duration_minutes = p_service_duration_minutes,
      price_cents = round(coalesce(p_price, 0) * 100),
      visible = p_visible
    where id = p_makeup_id
    returning id into v_id;
  end if;

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (v_admin.admin_account_id, case when p_makeup_id is null then '新增妆造' else '编辑妆造' end, 'makeup', v_id::text, p_title);

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_save_settings(
  p_session_token uuid,
  p_store jsonb,
  p_recharge_rules jsonb,
  p_level_rules jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_store_id uuid;
  v_item jsonb;
  v_order integer;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  select id into v_store_id from public.store_settings order by created_at asc limit 1;

  if v_store_id is null then
    insert into public.store_settings (
      store_name, wechat_account, wechat_qr_url, phone, address, business_hours, description, social_links
    ) values (
      coalesce(p_store->>'storeName', '十三雾沉浸式剧本体验馆'),
      p_store->>'wechatAccount',
      p_store->>'wechatQrUrl',
      p_store->>'phone',
      p_store->>'address',
      p_store->>'businessHours',
      p_store->>'description',
      coalesce(p_store->'socialLinks', '{}'::jsonb)
    );
  else
    update public.store_settings
    set
      store_name = coalesce(p_store->>'storeName', store_name),
      wechat_account = p_store->>'wechatAccount',
      wechat_qr_url = p_store->>'wechatQrUrl',
      phone = p_store->>'phone',
      address = p_store->>'address',
      business_hours = p_store->>'businessHours',
      description = p_store->>'description',
      social_links = coalesce(p_store->'socialLinks', '{}'::jsonb)
    where id = v_store_id;
  end if;

  delete from public.recharge_rules;
  v_order := 0;
  for v_item in select * from jsonb_array_elements(coalesce(p_recharge_rules, '[]'::jsonb))
  loop
    v_order := v_order + 1;
    insert into public.recharge_rules (threshold_cents, gift_cents, sort_order, enabled)
    values (((v_item->>'min')::int * 100), ((v_item->>'gift')::int * 100), v_order, true);
  end loop;

  delete from public.member_levels;
  v_order := 0;
  for v_item in select * from jsonb_array_elements(coalesce(p_level_rules, '[]'::jsonb))
  loop
    v_order := v_order + 1;
    insert into public.member_levels (name, min_recharge_cents, discount_rate, sort_order, enabled)
    values (
      v_item->>'name',
      (v_item->>'min')::int * 100,
      ((v_item->>'discount')::numeric / 10.0),
      v_order,
      true
    );
  end loop;

  insert into public.admin_operation_logs (operator_id, action, target_type, remark)
  values (v_admin.admin_account_id, '更新门店设置', 'setting', '保存门店设置与会员规则');

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
  values (v_admin.admin_account_id, case when p_admin_id is null then '新增员工账号' else '编辑员工账号' end, 'staff', v_id::text, p_name);

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

create or replace function public.admin_delete_staff_account(
  p_session_token uuid,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
begin
  select * into v_admin from public._require_admin_session(p_session_token);

  delete from public.admin_accounts
  where id = p_admin_id
    and role <> 'boss';

  insert into public.admin_operation_logs (operator_id, action, target_type, target_id, remark)
  values (v_admin.admin_account_id, '删除员工账号', 'staff', p_admin_id::text, '后台删除员工账号');

  return public.get_admin_bootstrap(p_session_token);
end;
$$;

revoke all on table public.member_sessions from public;
revoke all on table public.admin_sessions from public;

alter table public.member_sessions enable row level security;
alter table public.admin_sessions enable row level security;

revoke all on function public.get_member_dashboard(uuid) from public;
revoke all on function public.update_member_profile_settings(uuid, text, date, text, text) from public;
revoke all on function public.get_admin_bootstrap(uuid) from public;
revoke all on function public.admin_create_member(uuid, text, text, integer, text) from public;
revoke all on function public.admin_recharge_member(uuid, uuid, integer, text) from public;
revoke all on function public.admin_consume_member(uuid, uuid, text, integer, text) from public;
revoke all on function public.admin_adjust_member(uuid, uuid, text, integer, text, text) from public;
revoke all on function public.admin_upsert_script(uuid, uuid, text, text, integer, integer, integer, public.script_difficulty, boolean, text, public.script_status, text[]) from public;
revoke all on function public.admin_set_script_status(uuid, uuid, public.script_status) from public;
revoke all on function public.admin_save_recommendations(uuid, jsonb) from public;
revoke all on function public.admin_upsert_makeup(uuid, uuid, text, text, integer, uuid, numeric, boolean, text, text) from public;
revoke all on function public.admin_save_settings(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.admin_upsert_staff_account(uuid, uuid, text, text, text, public.admin_role, boolean, text) from public;
revoke all on function public.admin_delete_staff_account(uuid, uuid) from public;
revoke all on function public.logout_member(uuid) from public;
revoke all on function public.logout_admin(uuid) from public;

grant execute on function public.register_member(text, text, text, boolean) to anon, authenticated;
grant execute on function public.login_member(text, text, boolean) to anon, authenticated;
grant execute on function public.login_admin(text, text, public.admin_role) to anon, authenticated;
grant execute on function public.logout_member(uuid) to anon, authenticated;
grant execute on function public.logout_admin(uuid) to anon, authenticated;
grant execute on function public.get_member_dashboard(uuid) to anon, authenticated;
grant execute on function public.update_member_profile_settings(uuid, text, date, text, text) to anon, authenticated;
grant execute on function public.get_admin_bootstrap(uuid) to anon, authenticated;
grant execute on function public.admin_create_member(uuid, text, text, integer, text) to anon, authenticated;
grant execute on function public.admin_recharge_member(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function public.admin_consume_member(uuid, uuid, text, integer, text) to anon, authenticated;
grant execute on function public.admin_adjust_member(uuid, uuid, text, integer, text, text) to anon, authenticated;
grant execute on function public.admin_upsert_script(uuid, uuid, text, text, integer, integer, integer, public.script_difficulty, boolean, text, public.script_status, text[]) to anon, authenticated;
grant execute on function public.admin_set_script_status(uuid, uuid, public.script_status) to anon, authenticated;
grant execute on function public.admin_save_recommendations(uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_makeup(uuid, uuid, text, text, integer, uuid, numeric, boolean, text, text) to anon, authenticated;
grant execute on function public.admin_save_settings(uuid, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_staff_account(uuid, uuid, text, text, text, public.admin_role, boolean, text) to anon, authenticated;
grant execute on function public.admin_delete_staff_account(uuid, uuid) to anon, authenticated;

insert into public.admin_accounts (account, password_hash, display_name, role, is_active, phone)
values
  ('wuzhu', extensions.crypt('shisanwu888', extensions.gen_salt('bf')), '雾主 · 阿沉', 'boss', true, '13800000001'),
  ('lin_su', extensions.crypt('shisanwu888', extensions.gen_salt('bf')), '林夙', 'mgr', true, '15900002280'),
  ('dm_xiaoye', extensions.crypt('shisanwu888', extensions.gen_salt('bf')), '小野', 'dm', true, '13300007741')
on conflict (account) do nothing;

commit;
