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

-- 4. 顶栏私信提醒：每个给我发过私信的人，取最新一条（最多 20 人）
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
     order by d.id desc
     limit 20;
end $$;

grant execute on function public.pk_dm_latest(text, text) to anon, authenticated;

-- 完成
