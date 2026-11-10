-- 快乐佩奇 · 成员列表函数小修复（补跑这一段即可）
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴 → Run

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

grant execute on function public.pk_member_list(text) to anon, authenticated;
