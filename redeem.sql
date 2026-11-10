-- 会员激活码一码一用：核销表 + 核销函数
-- 幂等，可重复跑

-- 1. 核销记录表（激活过的码永久记录，谁用的、什么时候用的）
create table if not exists public.pk_codes (
  code    text primary key,
  used_by text,
  used_at timestamptz default now()
);

-- 2. 核销函数：码没用过 → 记录并返回 ok；用过 → 返回 used
create or replace function public.pk_code_redeem(p_uid text, p_token text, p_code text)
returns json
language plpgsql security definer set search_path = public as $$
declare rec record;
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
  select used_by into rec from pk_codes where code = trim(p_code);
  if rec.used_by = p_uid then
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

-- 完成
