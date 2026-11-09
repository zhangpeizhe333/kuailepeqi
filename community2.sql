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
