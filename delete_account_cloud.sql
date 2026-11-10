-- 快乐佩奇 · 删除账号（云端资料一并清除）
-- 用法：Supabase 控制台 → SQL Editor → New query → 全选粘贴 → Run（只需跑一次）
--
-- 作用：
--   1. 游戏里「删除这条登录记录」时，会调用 pk_delete_account 把云端资料一起删掉，
--      好友再也搜不到、好友列表里也会消失。
--   2. pk_admin_delete_nick 用来清理以前已经删掉本地记录、但云端还残留的旧账号（只在 SQL 编辑器里能调用）。

/* ---------- 1. 客户端调用：删除自己的云端资料 ---------- */
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

  delete from pk_friends    where owner_uid = p_uid or friend_uid = p_uid;
  delete from pk_blocks     where owner_uid = p_uid or blocked_uid = p_uid;
  delete from pk_dm_clears  where uid = p_uid;
  delete from pk_members    where uid = p_uid;
  delete from pk_accounts   where uid = p_uid;
  delete from pk_players    where uid = p_uid;

  return json_build_object('ok', true);
end $$;

grant execute on function public.pk_delete_account(text, text) to anon, authenticated;

/* ---------- 2. 管理员清理旧昵称残留（不授权给客户端，只能在 SQL 编辑器手动跑） ---------- */
create or replace function public.pk_admin_delete_nick(p_nick text)
returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  with hit as (select uid from pk_players where nickname = p_nick),
       d1 as (delete from pk_friends where owner_uid in (select uid from hit) or friend_uid in (select uid from hit) returning 1),
       d2 as (delete from pk_blocks  where owner_uid in (select uid from hit) or blocked_uid in (select uid from hit) returning 1),
       d3 as (delete from pk_dm_clears where uid in (select uid from hit) returning 1),
       d4 as (delete from pk_members where uid in (select uid from hit) returning 1),
       d5 as (delete from pk_accounts where uid in (select uid from hit) returning 1),
       d6 as (delete from pk_players where uid in (select uid from hit) returning 1)
  select count(*) into n from hit;
  return n;
end $$;

-- 旧账号清理示例（把昵称换成你之前的昵称，跑一次；没有就跳过）：
-- select public.pk_admin_delete_nick('大大大大大佩奇');

-- 安全：管理员函数只允许在 SQL 编辑器调用，客户端（anon）不可执行
revoke execute on function public.pk_admin_delete_nick(text) from public, anon, authenticated;
