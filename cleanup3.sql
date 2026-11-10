-- 1. 账号位数规则：3-16 位 → 6-16 位字母或数字（云端校验同步更新，幂等可重复跑）
create or replace function public.pk_register(p_user text, p_pass text, p_nick text)
returns json
language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(coalesce(p_user, ''))); new_uid text; new_tk text; nick text;
begin
  if u !~ '^[a-z0-9_]{6,16}$' then
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

grant execute on function public.pk_register(text, text, text) to anon, authenticated;

-- 2. 删除昵称叫「佩奇的朋友」的测试账号（含所有关联数据，不影响真实玩家）
delete from pk_dms       where sender in (select uid from pk_players where nickname like '%佩奇的朋友%') or receiver in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_dm_clears where uid     in (select uid from pk_players where nickname like '%佩奇的朋友%') or peer     in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_friends   where owner_uid in (select uid from pk_players where nickname like '%佩奇的朋友%') or friend_uid in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_members   where uid in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_chat      where uid in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_blocks    where owner_uid in (select uid from pk_players where nickname like '%佩奇的朋友%') or blocked_uid in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_codes     where used_by in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_accounts  where uid in (select uid from pk_players where nickname like '%佩奇的朋友%');
delete from pk_players   where nickname like '%佩奇的朋友%';

-- 完成：账号注册规则已改为 6-16 位，「佩奇的朋友」测试账号已全部删除
