-- 快乐佩奇 · 一次性重置脚本
-- 作用：
--   1) 群成员 3 天不进群自动移出（成员列表里不再显示）
--   2) 删除登录记录时：清掉云端资料、好友关系、三个群里的成员身份、群发言；
--      和别人发过的私聊内容保留（对方消息列表里还能看到，名字显示「已注销用户」）
--   3) 清空现有所有账号（所有人重新注册）
--
-- 用法：Supabase 控制台 → SQL Editor → New query → 全选粘贴 → Run（跑一次就够）

/* ============ 1. 群成员表增加「最后进群时间」 ============ */
alter table public.pk_members add column if not exists last_seen timestamptz default now();
update public.pk_members set last_seen = coalesce(last_seen, joined_at, now());

/* 进群时刷新时间，并同步昵称 / 头像 / 会员标识 */
create or replace function public.pk_join_community(p_uid text, p_token text, p_module text)
returns json
language plpgsql security definer set search_path = public as $$
declare rec pk_players%rowtype;
begin
  select * into rec from pk_players tb where tb.uid = p_uid and tb.token = p_token;
  if not found then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_module not in ('smoke', 'alcohol', 'fit') then
    p_module := 'smoke';
  end if;
  insert into pk_members(module, uid, nickname, avatar, gender, vip, last_seen)
  values (p_module, p_uid, rec.nickname, rec.avatar, coalesce(rec.gender, ''), coalesce(rec.vip, false), now())
  on conflict (module, uid) do update
    set nickname = excluded.nickname,
        avatar   = excluded.avatar,
        gender   = excluded.gender,
        vip      = excluded.vip,
        last_seen = now();
  return json_build_object('ok', true);
end $$;

/* 成员列表：先踢掉 3 天没进群的，再返回 */
create or replace function public.pk_member_list(p_module text)
returns table(uid text, nickname text, avatar text, gender text, vip boolean, joined_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  delete from pk_members m
   where m.module = coalesce(p_module, 'smoke')
     and coalesce(m.last_seen, m.joined_at) < now() - interval '3 days';
  return query
    select m.uid, m.nickname, m.avatar, m.gender, m.vip, m.joined_at
      from pk_members m
     where m.module = coalesce(p_module, 'smoke')
     order by m.joined_at asc
     limit 300;
end $$;

/* 群发言：必须仍在本群（3 天内进过），发完顺手刷新时间 */
create or replace function public.pk_chat_send(p_uid text, p_token text, p_module text, p_body text)
returns json
language plpgsql security definer set search_path = public as $$
declare rec pk_players%rowtype;
begin
  select * into rec from pk_players tb where tb.uid = p_uid and tb.token = p_token;
  if not found then
    return json_build_object('ok', false, 'err', 'bad_token');
  end if;
  if p_module not in ('smoke', 'alcohol', 'fit') then
    p_module := 'smoke';
  end if;
  if not exists (select 1 from pk_members mb
                  where mb.uid = p_uid and mb.module = p_module
                    and coalesce(mb.last_seen, mb.joined_at) > now() - interval '3 days') then
    return json_build_object('ok', false, 'err', 'not_member');
  end if;
  if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 200 then
    return json_build_object('ok', false, 'err', 'bad_body');
  end if;
  update pk_members set last_seen = now() where uid = p_uid and module = p_module;
  insert into pk_chat(module, uid, nickname, avatar, gender, vip, body)
  values (p_module, p_uid, rec.nickname, rec.avatar, coalesce(rec.gender, ''), coalesce(rec.vip, false), trim(p_body));
  -- 顺手清理 3 天前的旧消息，防止表无限变大
  delete from pk_chat where created_at < now() - interval '3 days';
  return json_build_object('ok', true);
end $$;

/* ============ 2. 私信列表：对方注销后仍显示聊天（名字显示已注销用户） ============ */
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
    select d.id, d.sender,
           coalesce(pl.nickname, '已注销用户') as nickname,
           coalesce(pl.avatar, '🐣')          as avatar,
           coalesce(pl.gender, '')            as gender,
           coalesce(pl.vip, false)            as vip,
           d.body, d.created_at
      from mine m
      join pk_dms d on d.id = m.mx
      left join pk_players pl on pl.uid = m.s_uid
     where d.id > coalesce((select c.until_mid from pk_dm_clears c
                             where c.uid = pk_dm_latest.p_uid and c.peer = m.s_uid), 0)
     order by d.id desc
     limit 20;
end $$;

grant execute on function public.pk_dm_latest(text, text) to anon, authenticated;

/* ============ 3. 删除账号：群里消失、好友消失、群发言清除，私聊保留 ============ */
create or replace function public.pk_delete_account(p_uid text, p_token text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null or p_token is null then
    return json_build_object('ok', false, 'err', 'args');
  end if;
  if not exists (select 1 from pk_players p where p.uid = p_uid and p.token = p_token) then
    return json_build_object('ok', false, 'err', 'auth');
  end if;

  delete from pk_friends   where owner_uid = p_uid or friend_uid = p_uid;
  delete from pk_blocks    where owner_uid = p_uid or blocked_uid = p_uid;
  delete from pk_dm_clears where uid = p_uid;
  delete from pk_members   where uid = p_uid;   -- 三个群里的成员身份一起清
  delete from pk_chat      where uid = p_uid;   -- 群发言一起清
  delete from pk_accounts  where uid = p_uid;
  delete from pk_players   where uid = p_uid;   -- 好友再也搜不到

  -- 私信（pk_dms）保留：对方消息列表里还能看到聊天内容
  return json_build_object('ok', true);
end $$;

grant execute on function public.pk_delete_account(text, text) to anon, authenticated;

/* 旧版本留下的管理函数，不再需要 */
drop function if exists public.pk_admin_delete_nick(text);

/* ============ 4. 清空所有账号（一次性） ============
   注意：下面这段会删掉全部玩家、好友、群成员、群消息、私信、账号密码记录，
   所有人打开后都是全新状态（VIP 兑换码 pk_codes 保留，不受影响）。 */
delete from public.pk_chat;
delete from public.pk_dms;
delete from public.pk_dm_clears;
delete from public.pk_members;
delete from public.pk_friends;
delete from public.pk_blocks;
delete from public.pk_accounts;
delete from public.pk_players;
