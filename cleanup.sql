-- 清理测试数据（跑一次就行，以后有需要也可以重跑）
delete from public.pk_chat   where uid like 'ut%';
delete from public.pk_dms    where sender like 'ut%' or receiver like 'ut%';
delete from public.pk_members where uid like 'ut%';
delete from public.pk_blocks where owner_uid like 'ut%' or blocked_uid like 'ut%';
delete from public.pk_players where uid like 'ut%';
