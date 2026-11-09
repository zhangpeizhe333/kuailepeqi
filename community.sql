-- 佩奇社区 / 私信 / 拉黑 / 性别VIP 建表脚本
-- 用法：Supabase 控制台 SQL Editor → New query → 粘贴 → Run

-- 1. 玩家表加字段：性别、VIP、最后在线
alter table public.pk_players add column if not exists gender text default '';
alter table public.pk_players add column if not exists vip boolean default false;
alter table public.pk_players add column if not exists last_seen timestamptz default now();

-- 2. 旧函数先删掉（避免重名冲突）
drop function if exists public.pk_upsert(text, text, text, text, int, int, int);
drop function if exists public.pk_search(text);
drop function if exists public.pk_my_friends(text, text);

-- 3. 上报 / 更新自己的资料（带性别和VIP）
create or replace function public.pk_upsert(
  p_uid text, p_token text, p_nick text, p_avatar text,
  p_smoke int, p_alcohol int, p_fit int,
  p_gender text, p_vip boolean
) returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null or length(p_uid) < 8 or p_token is null or length(p_token) < 8 then
    return json_build_object('ok', false, 'err', 'bad_id');
  end if;
  if p_nick is null or length(trim(p_nick)) = 0 then
    return json_build_object('ok', false, 'err', 'need_nick');
  end if;

  if exists (select 1 from pk_players tb where tb.uid = p_uid) then
    update pk_players
       set nickname = trim(p_nick),
           avatar = coalesce(p_avatar, '🐣'),
           smoke_days = greatest(coalesce(p_smoke, 0), 0),
           alcohol_days = greatest(coalesce(p_alcohol, 0), 0),
           fit_days = greatest(coalesce(p_fit, 0), 0),
           gender = coalesce(p_gender, ''),
           vip = coalesce(p_vip, false),
           last_seen = now()
     where tb.uid = p_uid and tb.token = p_token;
    if not found then
      return json_build_object('ok', false, 'err', 'bad_token');
    end if;
  else
    insert into pk_players(uid, token, nickname, avatar, smoke_days, alcohol_days, fit_days, gender, vip)
    values (p_uid, p_token, trim(p_nick), coalesce(p_avatar, '🐣'),
            greatest(coalesce(p_smoke, 0), 0),
            greatest(coalesce(p_alcohol, 0), 0),
            greatest(coalesce(p_fit, 0), 0),
            coalesce(p_gender, ''), coalesce(p_vip, false));
  end if;

  -- 已加入社区的话，同步成员表里的资料
  update pk_members set nickname = trim(p_nick), avatar = coalesce(p_avatar, '🐣'),
         gender = coalesce(p_gender, ''), vip = coalesce(p_vip, false)
   where uid = p_uid;

  return json_build_object('ok', true);
end $$;

-- 4. 搜昵称（带性别、VIP）
create or replace function public.pk_search(p_q text)
returns table(uid text, nickname text, avatar text, gender text, vip boolean,
              smoke_days int, alcohol_days int, fit_days int)
language sql security definer set search_path = public as $$
  select p.uid, p.nickname, p.avatar, p.gender, p.vip, p.smoke_days, p.alcohol_days, p.fit_days
    from pk_players p
   where p_q is not null and length(trim(p_q)) > 0
     and p.nickname ilike '%' || trim(p_q) || '%'
   order by p.last_seen desc
   limit 20;
$$;

-- 5. 我的好友（带性别、VIP）
create or replace function public.pk_my_friends(p_uid text, p_token text)
returns table(uid text, nickname text, avatar text, gender text, vip boolean,
              smoke_days int, alcohol_days int, fit_days int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return;
  end if;
  return query
    select pl.uid, pl.nickname, pl.avatar, pl.gender, pl.vip, pl.smoke_days, pl.alcohol_days, pl.fit_days
      from pk_friends fr
      join pk_players pl on pl.uid = fr.friend_uid
     where fr.owner_uid = pk_my_friends.p_uid
     order by fr.created_at desc;
end $$;

-- 6. 社区成员表
create table if not exists public.pk_members (
  uid       text primary key,
  nickname  text not null,
  avatar    text default '🐣',
  gender    text default '',
  vip       boolean default false,
  joined_at timestamptz default now()
);

-- 7. 群聊消息表
create table if not exists public.pk_chat (
  id         bigserial primary key,
  uid        text not null,
  nickname   text not null,
  avatar     text default '🐣',
  gender     text default '',
  vip        boolean default false,
  body       text not null,
  created_at timestamptz default now()
);

-- 8. 私信表
create table if not exists public.pk_dms (
  id         bigserial primary key,
  sender     text not null,
  receiver   text not null,
  body       text not null,
  created_at timestamptz default now()
);

-- 9. 拉黑表
create table if not exists public.pk_blocks (
  owner_uid   text not null,
  blocked_uid text not null,
  created_at  timestamptz default now(),
  unique (owner_uid, blocked_uid)
);

-- 10. 加入社区
create or replace function public.pk_join_community(p_uid text, p_token text)
returns json
language plpgsql security definer set search_path = public as $$
declare rec pk_players%rowtype;
begin
  select * into rec from pk_players tb where tb.uid = p_uid and tb.token = p_token;
  if not found then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  insert into pk_members(uid, nickname, avatar, gender, vip)
  values (p_uid, rec.nickname, rec.avatar, coalesce(rec.gender, ''), coalesce(rec.vip, false))
  on conflict (uid) do nothing;
  return json_build_object('ok', true);
end $$;

-- 11. 退出社区
create or replace function public.pk_leave_community(p_uid text, p_token text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  delete from pk_members where uid = p_uid;
  return json_build_object('ok', true);
end $$;

-- 12. 社区成员列表（只给昵称头像性别VIP，不给打卡天数）
create or replace function public.pk_member_list()
returns table(uid text, nickname text, avatar text, gender text, vip boolean, joined_at timestamptz)
language sql security definer set search_path = public as $$
  select m.uid, m.nickname, m.avatar, m.gender, m.vip, m.joined_at
    from pk_members m
   order by m.joined_at asc
   limit 300;
$$;

-- 13. 群聊发言
create or replace function public.pk_chat_send(p_uid text, p_token text, p_body text)
returns json
language plpgsql security definer set search_path = public as $$
declare rec pk_players%rowtype;
begin
  select * into rec from pk_players tb where tb.uid = p_uid and tb.token = p_token;
  if not found then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if not exists (select 1 from pk_members mb where mb.uid = p_uid) then
    return json_build_object('ok', false, 'err', 'not_member');
  end if;
  if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 200 then
    return json_build_object('ok', false, 'err', 'bad_body');
  end if;
  insert into pk_chat(uid, nickname, avatar, gender, vip, body)
  values (p_uid, rec.nickname, rec.avatar, coalesce(rec.gender, ''), coalesce(rec.vip, false), trim(p_body));
  -- 顺手清理 3 天前的旧消息，防止表无限变大
  delete from pk_chat where created_at < now() - interval '3 days';
  return json_build_object('ok', true);
end $$;

-- 14. 读群聊最近消息
create or replace function public.pk_chat_fetch(p_since bigint default 0)
returns table(mid bigint, uid text, nickname text, avatar text, gender text, vip boolean, body text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select c.id, c.uid, c.nickname, c.avatar, c.gender, c.vip, c.body, c.created_at
    from pk_chat c
   where c.id > coalesce(p_since, 0)
   order by c.id desc
   limit 60;
$$;

-- 15. 发私信（对方把我拉黑则发不出去）
create or replace function public.pk_dm_send(p_uid text, p_token text, p_to text, p_body text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_to = p_uid then
    return json_build_object('ok', false, 'err', 'self');
  end if;
  if not exists (select 1 from pk_players tb where tb.uid = p_to) then
    return json_build_object('ok', false, 'err', 'not_found');
  end if;
  if exists (select 1 from pk_blocks bk where bk.owner_uid = p_to and bk.blocked_uid = p_uid) then
    return json_build_object('ok', false, 'err', 'blocked');
  end if;
  if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 200 then
    return json_build_object('ok', false, 'err', 'bad_body');
  end if;
  insert into pk_dms(sender, receiver, body) values (p_uid, p_to, trim(p_body));
  return json_build_object('ok', true);
end $$;

-- 16. 读私信（我和某人之间的往来，双向都读）
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
     where (d.sender = pk_dm_fetch.p_uid and d.receiver = p_with)
        or (d.sender = p_with and d.receiver = pk_dm_fetch.p_uid)
     order by d.id desc
     limit 100;
end $$;

-- 17. 拉黑 / 取消拉黑 / 拉黑名单
create or replace function public.pk_block(p_uid text, p_token text, p_target text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_target = p_uid then
    return json_build_object('ok', false, 'err', 'self');
  end if;
  insert into pk_blocks(owner_uid, blocked_uid) values (p_uid, p_target)
  on conflict (owner_uid, blocked_uid) do nothing;
  return json_build_object('ok', true);
end $$;

create or replace function public.pk_unblock(p_uid text, p_token text, p_target text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  delete from pk_blocks where owner_uid = p_uid and blocked_uid = p_target;
  return json_build_object('ok', true);
end $$;

create or replace function public.pk_block_list(p_uid text, p_token text)
returns table(blocked_uid text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return;
  end if;
  return query
    select bk.blocked_uid from pk_blocks bk where bk.owner_uid = pk_block_list.p_uid;
end $$;

-- 18. 授权网页（匿名密钥）调用
grant execute on function public.pk_upsert(text, text, text, text, int, int, int, text, boolean) to anon, authenticated;
grant execute on function public.pk_search(text) to anon, authenticated;
grant execute on function public.pk_my_friends(text, text) to anon, authenticated;
grant execute on function public.pk_add_friend(text, text, text) to anon, authenticated;
grant execute on function public.pk_del_friend(text, text, text) to anon, authenticated;
grant execute on function public.pk_join_community(text, text) to anon, authenticated;
grant execute on function public.pk_leave_community(text, text) to anon, authenticated;
grant execute on function public.pk_member_list() to anon, authenticated;
grant execute on function public.pk_chat_send(text, text, text) to anon, authenticated;
grant execute on function public.pk_chat_fetch(bigint) to anon, authenticated;
grant execute on function public.pk_dm_send(text, text, text, text) to anon, authenticated;
grant execute on function public.pk_dm_fetch(text, text, text) to anon, authenticated;
grant execute on function public.pk_block(text, text, text) to anon, authenticated;
grant execute on function public.pk_unblock(text, text, text) to anon, authenticated;
grant execute on function public.pk_block_list(text, text) to anon, authenticated;

-- 完成
