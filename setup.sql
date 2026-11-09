-- 快乐佩奇 · 好友系统建表脚本
-- 用法：Supabase 控制台左侧 SQL Editor → New query → 全选粘贴 → Run

-- 1. 玩家表（只存昵称、头像、三项天数）
create table if not exists public.pk_players (
  uid          text primary key,
  token        text not null,
  nickname     text not null,
  avatar       text default '🐣',
  smoke_days   int  default 0,
  alcohol_days int  default 0,
  fit_days     int  default 0,
  updated_at   timestamptz default now()
);

-- 2. 好友关系表
create table if not exists public.pk_friends (
  id         bigserial primary key,
  owner_uid  text not null,
  friend_uid text not null,
  created_at timestamptz default now(),
  unique (owner_uid, friend_uid)
);

-- 3. 关闭直连，只允许通过下面的函数读写
alter table public.pk_players enable row level security;
alter table public.pk_friends enable row level security;

-- 4. 上报 / 更新自己的资料与天数
create or replace function public.pk_upsert(
  p_uid text, p_token text, p_nick text, p_avatar text,
  p_smoke int, p_alcohol int, p_fit int
) returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null or length(p_uid) < 8 or p_token is null or length(p_token) < 8 then
    return json_build_object('ok', false, 'err', 'bad_id');
  end if;
  if p_nick is null or length(trim(p_nick)) = 0 then
    return json_build_object('ok', false, 'err', 'need_nick');
  end if;

  if exists (select 1 from pk_players where uid = p_uid) then
    update pk_players
       set nickname = trim(p_nick),
           avatar = coalesce(p_avatar, '🐣'),
           smoke_days = greatest(coalesce(p_smoke, 0), 0),
           alcohol_days = greatest(coalesce(p_alcohol, 0), 0),
           fit_days = greatest(coalesce(p_fit, 0), 0),
           updated_at = now()
     where uid = p_uid and token = p_token;
    if not found then
      return json_build_object('ok', false, 'err', 'bad_token');
    end if;
  else
    insert into pk_players(uid, token, nickname, avatar, smoke_days, alcohol_days, fit_days)
    values (p_uid, p_token, trim(p_nick), coalesce(p_avatar, '🐣'),
            greatest(coalesce(p_smoke, 0), 0),
            greatest(coalesce(p_alcohol, 0), 0),
            greatest(coalesce(p_fit, 0), 0));
  end if;

  return json_build_object('ok', true);
end $$;

-- 5. 按昵称搜索（模糊匹配，最多 20 个）
create or replace function public.pk_search(p_q text)
returns table(uid text, nickname text, avatar text, smoke_days int, alcohol_days int, fit_days int)
language sql security definer set search_path = public as $$
  select p.uid, p.nickname, p.avatar, p.smoke_days, p.alcohol_days, p.fit_days
    from pk_players p
   where p_q is not null
     and length(trim(p_q)) > 0
     and p.nickname ilike '%' || trim(p_q) || '%'
   order by p.updated_at desc
   limit 20;
$$;

-- 6. 加好友
create or replace function public.pk_add_friend(p_uid text, p_token text, p_friend text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players where uid = p_uid and token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_friend = p_uid then
    return json_build_object('ok', false, 'err', 'self');
  end if;
  if not exists (select 1 from pk_players where uid = p_friend) then
    return json_build_object('ok', false, 'err', 'not_found');
  end if;
  insert into pk_friends(owner_uid, friend_uid)
  values (p_uid, p_friend)
  on conflict (owner_uid, friend_uid) do nothing;
  return json_build_object('ok', true);
end $$;

-- 7. 我的好友列表
create or replace function public.pk_my_friends(p_uid text, p_token text)
returns table(uid text, nickname text, avatar text, smoke_days int, alcohol_days int, fit_days int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players where uid = p_uid and token = p_token) then
    return;
  end if;
  return query
    select p.uid, p.nickname, p.avatar, p.smoke_days, p.alcohol_days, p.fit_days
      from pk_friends f
      join pk_players p on p.uid = f.friend_uid
     where f.owner_uid = p_uid
     order by f.created_at desc;
end $$;

-- 8. 删除好友
create or replace function public.pk_del_friend(p_uid text, p_token text, p_friend text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players where uid = p_uid and token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  delete from pk_friends where owner_uid = p_uid and friend_uid = p_friend;
  return json_build_object('ok', true);
end $$;

-- 9. 允许网页（匿名密钥）调用这些函数
grant execute on function public.pk_upsert(text, text, text, text, int, int, int) to anon, authenticated;
grant execute on function public.pk_search(text) to anon, authenticated;
grant execute on function public.pk_add_friend(text, text, text) to anon, authenticated;
grant execute on function public.pk_my_friends(text, text) to anon, authenticated;
grant execute on function public.pk_del_friend(text, text, text) to anon, authenticated;

-- 完成。表里不存任何手机号、微信信息，只有昵称和天数。
