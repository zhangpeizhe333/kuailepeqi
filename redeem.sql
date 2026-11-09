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

-- 完成
