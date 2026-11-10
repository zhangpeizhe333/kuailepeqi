-- 清理 2026-11-10 自动化测试产生的账号与数据（幂等，可重复跑）
-- 只删下面列出的测试账号，不影响真实玩家

-- 测试账号：
--   t109608536  （自动化测试）  uid ua6c12e8d22b08ec4
--   t109608536b （测试B）       uid ubc6e3308efc8382e
--   ui272439686 （真实测试号）  uid uef55f195e52d6e2a

delete from pk_dms        where sender in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a') or receiver in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a');
delete from pk_dm_clears  where uid in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a') or peer in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a');
delete from pk_friends    where uid in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a') or fid in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a');
delete from pk_members    where uid in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a');
delete from pk_chat       where uid in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a');
delete from pk_codes      where used_by in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a') or code like 'KP-TEST%';
delete from pk_players    where uid in ('ua6c12e8d22b08ec4','ubc6e3308efc8382e','uef55f195e52d6e2a');
delete from pk_accounts   where username in ('t109608536','t109608536b','ui272439686');

-- 完成：上面 3 个测试账号及其消息、核销记录已全部删除
