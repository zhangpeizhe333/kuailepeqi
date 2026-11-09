-- 修复：好友列表接口变量重名问题
create or replace function public.pk_my_friends(p_uid text, p_token text)
returns table(uid text, nickname text, avatar text, smoke_days int, alcohol_days int, fit_days int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pk_players tb where tb.uid = p_uid and tb.token = p_token) then
    return;
  end if;
  return query
    select pl.uid, pl.nickname, pl.avatar, pl.smoke_days, pl.alcohol_days, pl.fit_days
      from pk_friends fr
      join pk_players pl on pl.uid = fr.friend_uid
     where fr.owner_uid = pk_my_friends.p_uid
     order by fr.created_at desc;
end $$;
