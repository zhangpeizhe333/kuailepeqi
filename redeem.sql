-- 会员激活码一码一用：核销表 + 核销函数
-- 幂等，可重复跑

-- 1. 核销记录表（激活过的码永久记录，谁用的、什么时候用的）
create table if not exists public.pk_codes (
  code    text primary key,
  used_by text,
  used_at timestamptz default now()
);

-- 2. 核销函数：码没用过 → 记录并返回 ok；用过 → 一律返回 used（本人也不能再用）
create or replace function public.pk_code_redeem(p_uid text, p_token text, p_code text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_code is null or length(trim(p_code)) < 8 then
    return json_build_object('ok', false, 'err', 'bad_code');
  end if;
  insert into pk_codes(code, used_by) values (trim(p_code), p_uid)
  on conflict (code) do nothing;
  if found then
    return json_build_object('ok', true);
  end if;
  return json_build_object('ok', false, 'err', 'used');
end $$;

-- 3. 权限
grant execute on function public.pk_code_redeem(text, text, text) to anon, authenticated;

-- 4. 私信删除标记表（每个用户对每个好友，删到自己这边的哪一条为止）
create table if not exists public.pk_dm_clears (
  uid       text not null,
  peer      text not null,
  until_mid bigint not null default 0,
  updated_at timestamptz default now(),
  primary key (uid, peer)
);
alter table public.pk_dm_clears enable row level security;

-- 5. 顶栏私信提醒：每个给我发过私信的人，取最新一条（最多 20 人）
--    已删除过的会话（删除边界之后没有新消息）不显示
create or replace function public.pk_dm_latest(p_uid text, p_token text)
returns table(mid bigint, sender text, nickname text, avatar text, gender text, vip boolean, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return;
  end if;
  return query
    with mine as (
      select d2.sender as s_uid, max(d2.id) as mx
        from pk_dms d2
       where d2.receiver = pk_dm_latest.p_uid
       group by d2.sender
    )
    select d.id, d.sender, pl.nickname, pl.avatar, pl.gender, pl.vip, d.body, d.created_at
      from mine m
      join pk_dms d on d.id = m.mx
      join pk_players pl on pl.uid = m.s_uid
     where d.id > coalesce((select c.until_mid from pk_dm_clears c
                             where c.uid = pk_dm_latest.p_uid and c.peer = m.s_uid), 0)
     order by d.id desc
     limit 20;
end $$;

grant execute on function public.pk_dm_latest(text, text) to anon, authenticated;

-- 6. 读私信：过滤掉自己删除过的旧消息（对方那边不受影响）
create or replace function public.pk_dm_fetch(p_uid text, p_token text, p_with text)
returns table(mid bigint, sender text, receiver text, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return;
  end if;
  return query
    select d.id, d.sender, d.receiver, d.body, d.created_at
      from pk_dms d
     where ((d.sender = pk_dm_fetch.p_uid and d.receiver = p_with)
         or (d.sender = p_with and d.receiver = pk_dm_fetch.p_uid))
       and d.id > coalesce((select c.until_mid from pk_dm_clears c
                             where c.uid = pk_dm_fetch.p_uid and c.peer = p_with), 0)
     order by d.id desc
     limit 100;
end $$;

grant execute on function public.pk_dm_fetch(text, text, text) to anon, authenticated;

-- 7. 删除私信聊天：只记录「自己这边的删除边界」，双方历史消息不动
create or replace function public.pk_dm_clear(p_uid text, p_token text, p_with text)
returns json
language plpgsql security definer set search_path = public as $$
declare mx bigint;
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_with is null or length(trim(p_with)) < 8 then
    return json_build_object('ok', false, 'err', 'bad_with');
  end if;
  select coalesce(max(d.id), 0) into mx
    from pk_dms d
   where (d.sender = p_uid and d.receiver = trim(p_with))
      or (d.sender = trim(p_with) and d.receiver = p_uid);
  insert into pk_dm_clears(uid, peer, until_mid, updated_at)
  values (p_uid, trim(p_with), mx, now())
  on conflict (uid, peer) do update
    set until_mid = greatest(pk_dm_clears.until_mid, excluded.until_mid),
        updated_at = now();
  return json_build_object('ok', true, 'until', mx);
end $$;

grant execute on function public.pk_dm_clear(text, text, text) to anon, authenticated;

-- 8. 账号密码登录（密码 bcrypt 加密存储，不存明文）
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pk_accounts (
  username   text primary key,
  pass_hash  text not null,
  uid        text unique not null,
  fail_cnt   int  not null default 0,
  lock_until timestamptz,
  created_at timestamptz default now()
);
alter table public.pk_accounts enable row level security;

-- 8.1 注册：建账号 + 建云端玩家资料，返回 uid / token
create or replace function public.pk_register(p_user text, p_pass text, p_nick text)
returns json
language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(coalesce(p_user, ''))); new_uid text; new_tk text; nick text;
begin
  if u !~ '^[a-z0-9_]{3,16}$' then
    return json_build_object('ok', false, 'err', 'bad_user');
  end if;
  if p_pass is null or length(p_pass) < 6 then
    return json_build_object('ok', false, 'err', 'bad_pass');
  end if;
  if exists (select 1 from pk_accounts a where a.username = u) then
    return json_build_object('ok', false, 'err', 'user_taken');
  end if;
  new_uid := 'u' || encode(extensions.gen_random_bytes(8), 'hex');
  new_tk  := encode(extensions.gen_random_bytes(12), 'hex');
  nick := coalesce(nullif(trim(coalesce(p_nick, '')), ''), u);
  insert into pk_accounts(username, pass_hash, uid)
  values (u, extensions.crypt(p_pass, extensions.gen_salt('bf')), new_uid);
  insert into pk_players(uid, token, nickname, avatar, smoke_days, alcohol_days, fit_days)
  values (new_uid, new_tk, nick, '🐷', 0, 0, 0);
  return json_build_object('ok', true, 'uid', new_uid, 'token', new_tk, 'nickname', nick);
end $$;

-- 8.2 登录：密码错误累计 5 次锁 10 分钟
create or replace function public.pk_login(p_user text, p_pass text)
returns json
language plpgsql security definer set search_path = public as $$
declare a pk_accounts%rowtype; rec pk_players%rowtype;
begin
  select * into a from pk_accounts tb where tb.username = lower(trim(coalesce(p_user, '')));
  if not found then
    return json_build_object('ok', false, 'err', 'no_user');
  end if;
  if a.lock_until is not null and a.lock_until > now() then
    return json_build_object('ok', false, 'err', 'locked');
  end if;
  if a.pass_hash <> extensions.crypt(coalesce(p_pass, ''), a.pass_hash) then
    update pk_accounts
       set fail_cnt = a.fail_cnt + 1,
           lock_until = case when a.fail_cnt + 1 >= 5 then now() + interval '10 minutes' else null end
     where username = a.username;
    return json_build_object('ok', false, 'err', 'bad_pass');
  end if;
  update pk_accounts set fail_cnt = 0, lock_until = null where username = a.username;
  select * into rec from pk_players pl where pl.uid = a.uid;
  if not found then
    insert into pk_players(uid, token, nickname, avatar)
    values (a.uid, encode(extensions.gen_random_bytes(12), 'hex'), a.username, '🐷');
    select * into rec from pk_players pl where pl.uid = a.uid;
  end if;
  return json_build_object('ok', true, 'uid', a.uid, 'token', rec.token,
    'nickname', rec.nickname, 'avatar', rec.avatar,
    'smoke', coalesce(rec.smoke_days, 0), 'alcohol', coalesce(rec.alcohol_days, 0), 'fit', coalesce(rec.fit_days, 0));
end $$;

-- 8.3 修改密码
create or replace function public.pk_change_pass(p_uid text, p_token text, p_old text, p_new text)
returns json
language plpgsql security definer set search_path = public as $$
declare a pk_accounts%rowtype;
begin
  if p_new is null or length(p_new) < 6 then
    return json_build_object('ok', false, 'err', 'bad_new');
  end if;
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  select * into a from pk_accounts where uid = p_uid;
  if not found then
    return json_build_object('ok', false, 'err', 'no_account');
  end if;
  if a.pass_hash <> extensions.crypt(coalesce(p_old, ''), a.pass_hash) then
    return json_build_object('ok', false, 'err', 'wrong_old');
  end if;
  update pk_accounts set pass_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where username = a.username;
  return json_build_object('ok', true);
end $$;

grant execute on function public.pk_register(text, text, text) to anon, authenticated;
grant execute on function public.pk_login(text, text) to anon, authenticated;
grant execute on function public.pk_change_pass(text, text, text, text) to anon, authenticated;

-- 完成
