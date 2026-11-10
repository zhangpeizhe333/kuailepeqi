/* 戒烟戒酒跟我走 · 主逻辑（单机 · localStorage 存档 · 多存档） */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const pad2 = (n) => String(n).padStart(2, '0');
  const startLabel = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日<span class="stat-sub">${pad2(d.getHours())}:${pad2(d.getMinutes())}</span>`; };
  /* 今日已得积分：打卡最多 3 分 + 逗一逗最多 2 分 = 5 分 */
  function todayPoints() {
    const d = todayStr();
    const a = S && S.pointsToday && S.pointsToday.d === d ? S.pointsToday.n : 0;
    const b = S && S.teaseToday && S.teaseToday.d === d ? S.teaseToday.n : 0;
    return a + b;
  }

  const DB_KEY = 'quitwalk_accounts_v1';
  const AVATARS = ['🐣', '🐰', '🐻', '🦊', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸'];

  let DB = null;
  let S = null;
  let tab = 'peki';
  const sceneIdxs = { smoke: 0, alcohol: 0, fit: 0 };
  const infoOpen = { smoke: false, alcohol: false, fit: false };

  /* ---------------- 存档 ---------------- */
  function loadDB() {
    try { DB = JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { DB = null; }
    if (!DB || typeof DB !== 'object' || !DB.accounts) DB = { current: null, accounts: {} };
  }
  function persist() { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  function freshSave() {
    return {
      wx: null, nickname: '', gender: 'boy', age: '', signature: '无语中..', avatar: '🐣',
      smoke: null, alcohol: null, fit: null,
      points: 0, pointsToday: { d: '', n: 0 }, teaseToday: { d: '', n: 0 }, notes: [], msgs: [], pekiCheer: 0,
      vip: { until: 0 }, vipFree: { d: '', used: false }, cloud: null, acct: '',
      peki: { charm: 0, lastFeed: 0, lastTease: 0, ghostUntil: 0, bigUntil: 0, girlUntil: 0, ptUntil: 0, dead: false },
      clock: { target: 0 },
      createdAt: Date.now()
    };
  }
  function fixSave(s) {
    const f = freshSave();
    for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    /* 打卡日历历史：老存档补 days 数组（把最近打卡日算进去） */
    for (const k of ['smoke', 'alcohol', 'fit']) {
      const m = s[k];
      if (m && typeof m === 'object') {
        if (!Array.isArray(m.days)) m.days = m.lastDate ? [m.lastDate] : [];
      }
    }
    return s;
  }

  /* ---------------- 弹层 / 提示 ---------------- */
  function sheet(html) {
    $('#sheetRoot').innerHTML = `<div class="sheet-mask in"><div class="sheet in">${html}</div></div>`;
    $('.sheet-mask').addEventListener('click', (e) => { if (e.target.classList.contains('sheet-mask')) closeSheet(); });
  }
  function closeSheet() {
    $('#sheetRoot').innerHTML = '';
    if (typeof feedTimer !== 'undefined' && feedTimer) { clearInterval(feedTimer); feedTimer = null; }
  }
  function toast(msg, ico) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${ico || '💬'} ${esc(msg)}`;
    $('#toastWrap').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---------------- 称号 ---------------- */
  const SMOKE_TITLES = [
    [0, '游客', '还没有开始打卡，先定个小目标：明天见！'],
    [1, '小趴菜', '打卡第 1 天，腿软手抖但方向对了。'],
    [2, '打不死的小强', '连续两天顶住了，生命力和小强一样顽强。'],
    [7, '热血少年', '一周整！肺已经开始感谢你了。'],
    [15, '铁血硬汉', '半个月不动摇，意志力钢铁一般。'],
    [30, '空气净化器', '一个月不吸烟，走到哪都是清新空气。'],
    [50, '世外高人', '五十天看破烟云，境界已经不一样了。'],
    [75, '法外狂徒', '七十五天了，烟见了你都得绕道走。'],
    [100, '纯爱战神', '一百天！对自己的身体爱得彻彻底底。'],
  ];
  const ALCOHOL_TITLES = [
    [0, '游客', '还没有开始打卡，清醒之旅从明天开始。'],
    [1, '欢乐戒酒人', '第一天没喝，快乐是清醒的快乐。'],
    [2, '酒蒙子觉醒', '两天了，酒蒙子的眼睛开始睁开。'],
    [7, '清醒大佐', '一周滴酒未沾，头脑清晰指挥若定。'],
    [15, '人间清醒', '半个月，整个世界都清楚了。'],
    [30, '无情哈拉少', '一个月不碰酒，又猛又清醒，哈拉少！'],
    [50, '反酒同盟会', '五十天，你已经是我们同盟的中坚力量。'],
    [75, '酒精过敏综合症', '七十五天，看酒就想绕着走。'],
    [100, '酒局终结者', '一百天！酒局来了你都能笑着挡回去。'],
  ];
  const FIT_TITLES = [
    [0, '游客', '还没打卡，运动会等你第一天。'],
    [1, '推门就跑', '第一天就冲了，气势拉满。'],
    [7, '办卡会员', '一周了，健身房都记住你的脸了。'],
    [15, '铁汁附体', '半个月，肌肉开始跟你称兄道弟。'],
    [30, '挥汗机器', '一个月，汗水都快汇成小河了。'],
    [60, '撸铁大师', '两个月，铁见了你都服气。'],
    [90, '吨位怪兽', '三个月，深蹲架都是你的主场。'],
    [180, '施瓦辛格', '半年，体型已经开始有大佬的影子。'],
    [360, '人形高达', '一年！你已经不是普通人，是人形高达。'],
  ];
  function titleOf(list, days) {
    let cur = list[0];
    for (const t of list) if (days >= t[0]) cur = t;
    return cur;
  }

  /* ---------------- 健康恢复 ---------------- */
  const SMOKE_HEALTH = [['气色', 60], ['抽烟习惯', 90], ['味觉与嗅觉', 150], ['烟瘾', 300], ['抵抗力', 1000], ['循环代谢', 3000]];
  const ALCOHOL_HEALTH = [['身体代谢', 60], ['气色', 90], ['精力状态', 150], ['酒瘾', 300], ['睡眠与专注', 1000], ['脑力状态', 3000]];
  function elapsedDays(started) { return started ? (Date.now() - started) / 86400000 : 0; }
  function pctText(p) {
    if (p <= 0) return '0%';
    if (p >= 100) return '100%';
    return (p < 10 ? p.toFixed(1) : Math.round(p)) + '%';
  }
  function fmtDur(ms) {
    if (ms < 60000) return '0分钟';
    const mins = Math.floor(ms / 60000);
    const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    if (d > 0) return `${d}天${h}小时${m}分钟`;
    if (h > 0) return `${h}小时${m}分钟`;
    return `${m}分钟`;
  }

  /* ---------------- 登录 ---------------- */
  function showLogin() { $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); }
  function openWxAuth() {
    /* 一键登录只列本机存档，账号密码注册的账号不在这里显示（走「账号密码登录」按钮） */
    const ids = Object.keys(DB.accounts).filter((id) => !id.startsWith('acct_'));
    const rows = ids.map((id) => {
      const a = DB.accounts[id];
      return `<div class="wx-account">
        <button class="wx-pick" data-wx="${id}">
          <span class="ava big">${a.avatar}</span>
          <span class="wx-nick">${esc(a.nickname || '玩家')}</span>
          <em>${a.smoke || a.alcohol || a.fit ? '已在坚持' : '还没开始'}</em>
        </button>
        <button class="wx-del" data-del="${id}" title="删除这条登录记录">✕</button>
      </div>`;
    }).join('');
    sheet(`<h3>一键登录</h3>
      <p class="sheet-sub">每个存档独立记录，换存档就是换一份坚持</p>
      <div class="wx-accounts">${rows || '<p class="muted tiny" style="text-align:center;padding:10px 0">还没有登录记录，新建一个吧</p>'}</div>
      <button class="wx-new" id="wxNew"><span>＋</span>新建一个存档</button>
      <p class="muted tiny" style="text-align:center;margin-top:12px">每个存档相互独立，换一个就是换一份坚持</p>`);
    $$('.wx-pick').forEach((b) => b.addEventListener('click', () => {
      const acc = DB.accounts[b.dataset.wx];
      if (acc && acc.acct) { closeSheet(); return openAcctLogin(acc.acct); }
      S = fixSave(DB.accounts[b.dataset.wx]);
      DB.current = b.dataset.wx;
      persist(); closeSheet();
      setTimeout(enterApp, 150);
    }));
    $$('.wx-del').forEach((b) => b.addEventListener('click', () => delAccount(b.dataset.del)));
    $('#wxNew').onclick = openRegForm;
  }
  function delAccount(id) {
    const a = DB.accounts[id];
    if (!a) return openWxAuth();
    sheet(`<h3>删除这条登录记录？</h3>
      <p class="sheet-sub">「${esc(a.nickname || '玩家')}」的打卡记录、积分、小纸条和小秘密都会被删除，无法恢复。</p>
      <div class="sheet-actions">
        <button class="btn btn-ghost" id="delNo">取消</button>
        <button class="btn btn-danger" id="delYes">删除记录</button>
      </div>`);
    $('#delNo').onclick = openWxAuth;
    $('#delYes').onclick = () => {
      delete DB.accounts[id];
      if (DB.current === id) DB.current = null;
      persist(); closeSheet();
      toast('已删除该登录记录', '🗑️');
      setTimeout(openWxAuth, 200);
    };
  }
  function openRegForm() {
    sheet(`<h3>创建角色</h3>
      <div class="form">
        <label>昵称</label>
        <input id="regNick" maxlength="12" placeholder="给自己起个昵称">
        <label>性别</label>
        <div class="seg" id="regGender">
          <button class="seg-b active" data-v="boy">👦 男孩</button>
          <button class="seg-b" data-v="girl">👧 女孩</button>
        </div>
        <label>年龄</label>
        <input id="regAge" type="number" min="1" max="120" placeholder="几岁了？">
        <button class="btn btn-primary btn-lg" id="regGo" style="margin-top:10px">进入小镇</button>
      </div>`);
    $$('#regGender .seg-b').forEach((b) => b.addEventListener('click', () => {
      $$('#regGender .seg-b').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    }));
    $('#regGo').onclick = () => {
      const nick = $('#regNick').value.trim();
      const age = parseInt($('#regAge').value, 10);
      if (!nick) return toast('先给自己起个昵称吧', '✏️');
      if (!age || age < 1) return toast('填一下年龄呀', '🎂');
      const gender = $('#regGender .active').dataset.v;
      S = fixSave(freshSave());
      S.wx = { wxid: 'wx_' + Date.now().toString(36), nick };
      S.nickname = nick; S.gender = gender; S.age = age;
      S.avatar = pick(AVATARS);
      DB.accounts[S.wx.wxid] = S;
      DB.current = S.wx.wxid;
      persist(); closeSheet();
      setTimeout(() => { toast(`欢迎你，${nick}！`, '🎉'); enterApp(); }, 150);
    };
  }
  /* ---------------- 账号密码登录（与本地一键登录并存） ---------------- */
  function restoreDays(acc, r) {
    const now = Date.now();
    if (r.smoke > 0 && !acc.smoke) acc.smoke = { cfg: { years: 0, cigs: 0, price: 0, started: now - r.smoke * DAY }, total: r.smoke, lastDate: '', lastTime: null, kidName: '', days: [] };
    if (r.alcohol > 0 && !acc.alcohol) acc.alcohol = { cfg: { years: 0, baijiu: 0, baijiuP: 0, bottle: 0, bottleP: 0, started: now - r.alcohol * DAY }, total: r.alcohol, lastDate: '', lastTime: null, days: [] };
    if (r.fit > 0 && !acc.fit) acc.fit = { cfg: { h: 170, w: 65, started: now - r.fit * DAY }, total: r.fit, lastDate: '', lastTime: null, days: [] };
  }
  function applyAcctLogin(user, r) {
    const key = 'acct_' + user;
    let acc = DB.accounts[key];
    if (!acc) {
      acc = fixSave(freshSave());
      acc.wx = { wxid: key, nick: r.nickname || user };
      acc.nickname = r.nickname || user;
      acc.avatar = r.avatar || '🐷';
      restoreDays(acc, r);
    }
    acc.acct = user;
    acc.cloud = { uid: r.uid, token: r.token };
    DB.accounts[key] = acc;
    DB.current = key;
    S = acc;
    persist(); closeSheet();
    setTimeout(() => { toast(`欢迎回来，${acc.nickname}！`, '🎉'); enterApp(); }, 150);
  }
  function acctErrMsg(err, mode) {
    const map = {
      user_taken: '这个账号已经被注册了，换一个吧',
      bad_user: '账号要 6-16 位字母或数字',
      bad_pass: mode === 'login' ? '密码不对，再想想' : '密码至少 6 位',
      no_user: '没有这个账号，切到「注册新账号」吧',
      locked: '密码错太多次了，10 分钟后再试',
    };
    return map[err] || '操作失败，稍后再试';
  }
  function openAcctLogin(prefill) {
    sheet(`<h3>🔑 账号登录</h3>
      <p class="sheet-sub">登录后换手机、换浏览器也能找回打卡记录</p>
      <div class="seg" id="acctMode">
        <button class="seg-b active" data-m="login">登录</button>
        <button class="seg-b" data-m="reg">注册新账号</button>
      </div>
      <div class="form">
        <label>账号</label>
        <input id="acctUser" maxlength="16" placeholder="6-16 位字母或数字" autocomplete="username" value="${esc(prefill || '')}">
        <label>密码</label>
        <input id="acctPass" type="password" maxlength="32" placeholder="至少 6 位" autocomplete="current-password">
        <div id="acctNickWrap" class="hidden"><label>昵称</label>
          <input id="acctNick" maxlength="12" placeholder="显示在好友列表里的名字"></div>
        <button class="btn btn-primary btn-lg" id="acctGo" style="margin-top:12px">登录</button>
      </div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">忘记密码无法找回，请记牢 · 账号只用来同步记录</p>`);
    let mode = 'login';
    const go = $('#acctGo');
    $$('#acctMode .seg-b').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.m;
      $$('#acctMode .seg-b').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      $('#acctNickWrap').classList.toggle('hidden', mode !== 'reg');
      go.textContent = mode === 'reg' ? '注册并登录' : '登录';
    }));
    const submit = async () => {
      const user = $('#acctUser').value.trim().toLowerCase();
      const pass = $('#acctPass').value;
      if (!/^[a-z0-9_]{3,16}$/.test(user)) return toast('账号要 6-16 位字母或数字', '🔑');
      /* 注册要求 6-16 位；登录放宽到 3-16 位，兼容早期注册的老账号 */
      if (mode === 'reg' && user.length < 6) return toast('账号要 6-16 位字母或数字', '🔑');
      if (pass.length < 6) return toast('密码至少 6 位', '🔒');
      go.disabled = true;
      try {
        const r = mode === 'reg'
          ? await sbRpc('pk_register', { p_user: user, p_pass: pass, p_nick: ($('#acctNick').value || '').trim() })
          : await sbRpc('pk_login', { p_user: user, p_pass: pass });
        if (!r || !r.ok) { go.disabled = false; return toast(acctErrMsg(r && r.err, mode), '⚠️'); }
        applyAcctLogin(user, r);
      } catch (e) { go.disabled = false; toast('连不上云端，检查一下网络', '📡'); }
    };
    go.onclick = submit;
    $('#acctPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }
  function acctChangePass() {
    if (!S || !S.acct) return;
    sheet(`<h3>🔒 修改密码</h3>
      <p class="sheet-sub">账号：${esc(S.acct)}</p>
      <div class="form">
        <label>当前密码</label><input id="pwOld" type="password" maxlength="32">
        <label>新密码</label><input id="pwNew" type="password" maxlength="32" placeholder="至少 6 位">
        <button class="btn btn-primary btn-lg" id="pwGo" style="margin-top:12px">保存新密码</button>
      </div>`);
    $('#pwGo').onclick = async () => {
      const o = $('#pwOld').value, n = $('#pwNew').value;
      if (n.length < 6) return toast('新密码至少 6 位', '🔒');
      const c = cloudId();
      try {
        const r = await sbRpc('pk_change_pass', { p_uid: c.uid, p_token: c.token, p_old: o, p_new: n });
        if (r && r.ok) { closeSheet(); toast('密码已更新，记牢它', '🔒'); }
        else if (r && r.err === 'wrong_old') toast('当前密码不对', '⚠️');
        else if (r && r.err === 'bad_new') toast('新密码至少 6 位', '⚠️');
        else toast('没改成，稍后再试', '⚠️');
      } catch (e) { toast('连不上云端，检查一下网络', '📡'); }
    };
  }
  function accountSheet() {
    if (!S || !S.acct) return openAcctLogin();
    sheet(`<h3>🔑 我的账号</h3>
      <p class="sheet-sub">当前账号：${esc(S.acct)} · 换手机登录这个账号就能找回记录</p>
      <div class="sheet-actions col">
        <button class="btn btn-primary btn-lg" id="acctPwd">修改密码</button>
      </div>`);
    $('#acctPwd').onclick = acctChangePass;
  }

  function logout() {
    sheet(`<h3>退出当前账号？</h3><p class="sheet-sub">退出后这份坚持记录会保留，重新登录即可继续。</p>
      <div class="sheet-actions"><button class="btn btn-ghost" id="noOut">取消</button>
      <button class="btn btn-danger" id="yesOut">退出登录</button></div>`);
    $('#noOut').onclick = closeSheet;
    $('#yesOut').onclick = () => { DB.current = null; persist(); location.reload(); };
  }
  function resetModule(mod) {
    const names = { smoke: '戒烟', alcohol: '戒酒', fit: '运动' };
    sheet(`<h3>重新开始${names[mod]}？</h3><p class="sheet-sub">会清空${names[mod]}的全部打卡记录和开始时间，不能撤销。</p>
      <div class="sheet-actions"><button class="btn btn-ghost" id="noReset">取消</button>
      <button class="btn btn-danger" id="yesReset">重新开始</button></div>`);
    $('#noReset').onclick = closeSheet;
    $('#yesReset').onclick = () => {
      S[mod] = null;
      persist(); closeSheet();
      toast(`已重新开始${names[mod]}`, '🌱');
      render();
    };
  }

  /* ---------------- 入口 ---------------- */
  function enterApp() {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    render();
    if (window.QuitMusic && QuitMusic.enabled()) QuitMusic.play();
    /* 静默把昵称和天数同步到云端，好友才搜得到 */
    setTimeout(() => { if (S && S.nickname) sbSync().catch(() => {}); }, 2500);
    /* 私信提醒：马上查一次，之后每 30 秒查一次 */
    setTimeout(dmCheck, 3000);
    if (dmPollTimer) clearInterval(dmPollTimer);
    dmPollTimer = setInterval(dmCheck, 30000);
    const bell = $('#dmBell');
    if (bell) bell.onclick = dmBellSheet;
  }

  /* ---------------- 打卡 ---------------- */
  function doCheckin(mod, replyIco) {
    const m = S[mod];
    if (!m) return;
    if (m.lastDate === todayStr()) return toast('今天已经打卡过啦，明天再来～', '✅');
    if (!m.cfg.started) m.cfg.started = Date.now();     // 首次打卡才算开始
    m.total = (m.total || 0) + 1;
    m.lastDate = todayStr();
    m.lastTime = Date.now();
    if (!Array.isArray(m.days)) m.days = [];
    if (!m.days.includes(m.lastDate)) m.days.push(m.lastDate);   // 打卡日历历史
    if (S.pointsToday.d !== todayStr()) S.pointsToday = { d: todayStr(), n: 0 };
    let pts = 0;
    if (S.pointsToday.n < 3) { S.points += 1; S.pointsToday.n += 1; pts = 1; }
    persist();
    toast('加油，宝贝' + (pts ? '  ⭐+1' : ''), replyIco || '💪');
    render();
  }

  /* ---------------- 场景 / 小朋友 ---------------- */
  function sceneK(mod) {
    const hairC = S.gender === 'boy' ? '#3d3244' : '#5a3d3d';
    const shirt = mod === 'smoke' ? '#8fd6b8' : mod === 'alcohol' ? '#f0b48c' : '#9fc4ff';
    if (mod === 'fit') {
      const c = S.fit && S.fit.cfg;
      let body = 'normal';
      if (c && c.h && c.w) {
        const bmi = c.w / Math.pow(c.h / 100, 2);
        body = bmi > 23.9 ? 'fat' : bmi < 18.5 ? 'thin' : 'normal';
      }
      return { gender: S.gender, stage: 2, body, hairC, shirt };
    }
    const m = S[mod];
    const years = m.cfg.years;
    const stage = QuitArt.stageOf(years, m.total || 0);
    return { gender: S.gender, stage, hairC, shirt, iv: mod === 'alcohol' && years > 10 && (m.total || 0) < 5 };
  }
  function isDay() {
    const f = localStorage.getItem('quitwalk_force_period');
    if (f === 'day') return true;
    if (f === 'night') return false;
    const h = new Date().getHours();
    return h >= 7 && h < 19;
  }
  function stageHTML(mod, goalText) {
    const sceneSvg = QuitArt.scene(isDay() ? 'day' : 'night', sceneIdxs[mod], sceneK(mod));
    return `<div class="stage">
      ${sceneSvg}
      <button class="scene-btn" data-act="scene" title="换个场景">🖼️</button>
      <div class="goal-banner">${goalText}</div>
      ${S.signature ? `<div class="goal-sign">“${esc(S.signature)}”</div>` : ''}
    </div>`;
  }
  function titleBar(mod, list) {
    return `<div class="title-bar">
      ${titleBadge(list, S[mod].total || 0)}
      <button class="lv-mini" data-lv="${mod}">等级说明</button>
    </div>`;
  }
  function titleBadge(list, days) {
    const t = titleOf(list, days);
    return `<button class="title-badge" data-act="titleInfo"><span class="tb-ico">🎖️</span>${t[1]}<small>· 第 ${days} 天</small></button>`;
  }
  function healthHTML(list, started) {
    const days = elapsedDays(started);
    const rows = list.map(([name, dur]) => {
      const p = Math.min(100, days / dur * 100);
      return `<div class="hp-row"><span class="hp-name">${name}</span>
        <div class="hp-bar"><i style="width:${p}%"></i></div><b class="hp-pct ${p >= 100 ? 'gold' : ''}">${pctText(p)}</b></div>`;
    }).join('');
    return `<div class="card"><h3>🌿 身体变化参考</h3>${rows}
      <p class="muted tiny" style="margin:10px 0 0;line-height:1.65;text-align:left">上面的进度是常见科普里提到的大致时间，用来给自己打气的参考，不是体检结果，也不能代替医生的建议。</p></div>`;
  }
  function statsRow(items) {
    return `<div class="stats-grid">${items.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;
  }
  function bindScene() {
    const b = $('.scene-btn');
    if (b) b.addEventListener('click', () => { sceneIdxs[tab] = 1 - sceneIdxs[tab]; render(); });
  }
  function bindTitle(list, mod) {
    const tb = $('.title-badge');
    if (tb) tb.addEventListener('click', () => {
      const t = titleOf(list, S[mod].total || 0);
      sheet(`<h3>🎖️ ${t[1]}</h3><p class="sheet-sub">${t[2]}</p>
        <p class="muted tiny">打卡断了也不影响称号，随时可以接着打。当前累计打卡 ${S[mod].total || 0} 天。</p>
        <button class="btn btn-primary btn-lg" onclick="document.querySelector('.sheet-mask').remove()">知道啦</button>`);
    });
  }
  function levelsSheet(list, mod) {
    const total = (S[mod] && S[mod].total) || 0;
    const rows = list.map(([d, name, desc]) => `<div class="lv-row ${total >= d && total > 0 ? '' : ''}">
      <span class="lv-day">${d === 0 ? '未打卡' : '第 ' + d + ' 天'}</span>
      <span class="lv-name">${name}</span>
      <small>${desc}</small></div>`).join('');
    sheet(`<h3>🏅 等级说明</h3><p class="sheet-sub">按累计打卡天数升级，断了也不掉级</p>
      <div class="lv-list">${rows}</div>
      <button class="btn btn-primary btn-lg" style="margin-top:12px" onclick="document.querySelector('.sheet-mask').remove()">看完了</button>`);
  }
  function infoCard(mod, title, fieldsHtml, saveHandler) {
    const open = infoOpen[mod];
    const el = `<div class="card info-card">
      <button class="info-toggle" data-info="${mod}">⚙️ 基本信息 <em>${open ? '收起' : '点击展开'}</em></button>
      <div class="info-body ${open ? '' : 'hidden'}" id="info_${mod}">
        <div class="form form-row">${fieldsHtml}</div>
        <button class="btn btn-ghost sm save-btn" id="save_${mod}">保存修改</button>
        <button class="btn btn-danger sm restart-btn" data-restart="${mod}">🔄 重新开始${title}</button>
      </div>
    </div>`;
    return el;
  }
  function bindInfo(mod, handler) {
    const tb = $(`[data-info="${mod}"]`);
    if (tb) tb.addEventListener('click', () => { infoOpen[mod] = !infoOpen[mod]; render(); });
    const sb = $(`#save_${mod}`);
    if (sb) sb.onclick = handler;
    const rb = $(`[data-restart="${mod}"]`);
    if (rb) rb.onclick = () => resetModule(mod);
  }

  /* ---------------- 戒烟 ---------------- */
  function renderSmoke() {
    const m = S.smoke;
    if (!m || !m.cfg) return smokeForm();
    const days = elapsedDays(m.cfg.started);
    const cigs = days * m.cfg.cigs;
    const money = days * m.cfg.cigs / 20 * m.cfg.price;
    const life = (days * 0.3).toFixed(1);
    const started = m.cfg.started;
    const t = titleOf(SMOKE_TITLES, m.total || 0);
    const today = m.lastDate === todayStr();

    $('#main').innerHTML = `
      ${stageHTML('smoke', '断崖式戒烟，目标100天！')}
      <div class="dock">
        <button class="act" data-act="hug">🤗 抱一抱</button>
        <button class="act" data-act="punch">👊 打一拳</button>
        <button class="act" data-act="chest">🩻 肺部小窗</button>
        <button class="act primary" data-act="checkin" ${today ? 'disabled' : ''}>${today ? '✅ 今日已打卡' : '戒烟打卡'}</button>
      </div>
      ${titleBar('smoke', SMOKE_TITLES)}
      <div class="card">
        <h3>📊 戒烟数据</h3>
        ${statsRow([
          ['开始戒烟', started ? startLabel(started) : '未开始'],
          ['已戒烟', started ? fmtDur(Date.now() - started) : '未开始'],
          ['累计少吸', cigs.toFixed(1) + ' 支'],
          ['节省金额', money.toFixed(1) + ' 元'],
          ['寿命', life + ' 天']
        ])}
      </div>
      ${healthHTML(SMOKE_HEALTH, started)}
      ${communityCard('smoke')}
      ${infoCard('smoke', '戒烟', `
        <div><label>烟龄（年）</label><input id="eYears" type="number" min="0" value="${m.cfg.years}"></div>
        <div><label>每天（支）</label><input id="eCigs" type="number" min="1" value="${m.cfg.cigs}"></div>
        <div><label>元/包</label><input id="ePrice" type="number" min="1" step="0.5" value="${m.cfg.price}"></div>
        <div style="flex-basis:100%"><label>个性签名</label><input id="eSign" maxlength="20" value="${esc(S.signature || '')}"></div>`)}
    `;
    bindScene(); bindTitle(SMOKE_TITLES, 'smoke');
    const kidBox = () => $('.scene-kid');
    $$('.act').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'hug') { anim(kidBox(), 'jump'); toast(pick(['爱你哦～', '抱抱最温暖啦', '嘿嘿，被你抱住啦']), '🤗'); }
      if (a === 'punch') { anim(kidBox(), 'shake'); toast(pick(['我错了', '别打脸！', '呜呜下次不敢了']), '👊'); }
      if (a === 'chest') openChest();
      if (a === 'checkin') doCheckin('smoke', '🚭');
    }));
    bindInfo('smoke', () => {
      S.smoke.cfg.years = Math.max(0, parseInt($('#eYears').value, 10) || 0);
      S.smoke.cfg.cigs = Math.max(1, parseInt($('#eCigs').value, 10) || 20);
      S.smoke.cfg.price = Math.max(0.5, parseFloat($('#ePrice').value) || 10);
      S.signature = $('#eSign').value.trim();
      persist(); toast('已保存', '✏️'); render();
    });
    const lv = $('[data-lv="smoke"]');
    if (lv) lv.onclick = () => levelsSheet(SMOKE_TITLES, 'smoke');
  }

  function smokeForm() {
    $('#main').innerHTML = `
      <div class="card setup-card">
        <h3>🚬 开始戒烟</h3>
        <p class="muted tiny">先填几项基本信息，开始时间从你第一次打卡开始算</p>
        <div class="form">
          <label>烟龄（年）</label><input id="smYears" type="number" min="0" max="80" value="10">
          <label>每天抽烟数量（支）</label><input id="smCigs" type="number" min="1" max="100" value="20">
          <label>香烟价格（元/包 20支）</label><input id="smPrice" type="number" min="1" step="0.5" value="10">
          <label>个性签名（选填）</label><input id="smSign" maxlength="20" placeholder="默认：无语中..">
          <button class="btn btn-primary btn-lg" id="smGo" style="margin-top:12px">断崖式戒烟，开始！</button>
        </div>
      </div>`;
    $('#smGo').onclick = () => {
      const years = Math.max(0, parseInt($('#smYears').value, 10) || 0);
      const cigs = Math.max(1, parseInt($('#smCigs').value, 10) || 20);
      const price = Math.max(0.5, parseFloat($('#smPrice').value) || 10);
      const sign = $('#smSign').value.trim() || '无语中..';
      S.smoke = { cfg: { years, cigs, price, started: null }, total: 0, lastDate: '', lastTime: null, kidName: '' };
      S.signature = sign;
      persist();
      toast('填好啦，点打卡就算正式开始！', '🚬');
      render();
    };
  }

  function openChest() {
    const gone = Math.min(100, S.smoke.total || 0);
    sheet(`<h3>🩻 肺部小窗</h3><div class="organ-box">${QuitArt.lungs(gone)}</div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">趣味示意，不是医学影像，也不能用来判断身体情况。</p>`);
  }

  /* ---------------- 戒酒 ---------------- */
  function renderAlcohol() {
    const m = S.alcohol;
    if (!m || !m.cfg) return alcoholForm();
    const days = elapsedDays(m.cfg.started);
    const bj = (days * m.cfg.baijiu).toFixed(1);
    const beer = (days * m.cfg.bottle).toFixed(1);
    const money = days * (m.cfg.baijiu * m.cfg.baijiuP + m.cfg.bottle * m.cfg.bottleP);
    const life = (days * 0.3).toFixed(1);
    const started = m.cfg.started;
    const today = m.lastDate === todayStr();

    $('#main').innerHTML = `
      ${stageHTML('alcohol', '保持清醒，目标 100 天！')}
      <div class="dock">
        <button class="act" data-act="kick">🦵 踹一脚</button>
        <button class="act" data-act="pat">🖐️ 拍拍肩</button>
        <button class="act" data-act="liver">🫀 肝脏小窗</button>
        <button class="act primary" data-act="checkin" ${today ? 'disabled' : ''}>${today ? '✅ 今日已打卡' : '戒酒打卡'}</button>
      </div>
      ${titleBar('alcohol', ALCOHOL_TITLES)}
      <div class="card">
        <h3>📊 戒酒数据</h3>
        ${statsRow([
          ['开始戒酒', started ? startLabel(started) : '未开始'],
          ['已戒酒', started ? fmtDur(Date.now() - started) : '未开始'],
          ['少喝白酒', bj + ' 斤'],
          ['少喝啤酒', beer + ' 瓶'],
          ['节省金额', money.toFixed(1) + ' 元'],
          ['寿命', life + ' 天']
        ])}
      </div>
      ${healthHTML(ALCOHOL_HEALTH, started)}
      ${communityCard('alcohol')}
      ${infoCard('alcohol', '戒酒', `
        <div><label>酒龄（年）</label><input id="aYears" type="number" min="0" value="${m.cfg.years}"></div>
        <div><label>白酒（斤/天）</label><input id="aBJ" type="number" min="0" step="0.1" value="${m.cfg.baijiu}"></div>
        <div><label>白酒 元/斤</label><input id="aBJP" type="number" min="0" value="${m.cfg.baijiuP}"></div>
        <div><label>啤酒（瓶/天）</label><input id="aBeer" type="number" min="0" value="${m.cfg.bottle}"></div>
        <div><label>啤酒 元/瓶</label><input id="aBeerP" type="number" min="0" step="0.5" value="${m.cfg.bottleP}"></div>
        <div style="flex-basis:100%"><label>个性签名</label><input id="aSign" maxlength="20" value="${esc(S.signature || '')}"></div>`)}
    `;
    bindScene(); bindTitle(ALCOHOL_TITLES, 'alcohol');
    const kidBox = () => $('.scene-kid');
    $$('.act').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'kick') { anim(kidBox(), 'shake'); toast(pick(['哎哟！我错了', '再也不喝了', '疼疼疼，知道错了']), '🦵'); }
      if (a === 'pat') { anim(kidBox(), 'nod'); toast(pick(['肩膀都松快了', '谢谢你的手', '一下子清醒了']), '🖐️'); }
      if (a === 'liver') openLiver();
      if (a === 'checkin') doCheckin('alcohol', '🍺');
    }));
    bindInfo('alcohol', () => {
      const c = S.alcohol.cfg;
      c.years = Math.max(0, parseInt($('#aYears').value, 10) || 0);
      c.baijiu = Math.max(0, parseFloat($('#aBJ').value) || 0);
      c.baijiuP = Math.max(0, parseFloat($('#aBJP').value) || 0);
      c.bottle = Math.max(0, parseFloat($('#aBeer').value) || 0);
      c.bottleP = Math.max(0, parseFloat($('#aBeerP').value) || 0);
      S.signature = $('#aSign').value.trim();
      persist(); toast('已保存', '✏️'); render();
    });
    const lv = $('[data-lv="alcohol"]');
    if (lv) lv.onclick = () => levelsSheet(ALCOHOL_TITLES, 'alcohol');
  }

  function alcoholForm() {
    $('#main').innerHTML = `
      <div class="card setup-card">
        <h3>🍺 开始戒酒</h3>
        <p class="muted tiny">填一下基本信息，看看小朋友现在被酒泡成什么样了</p>
        <div class="form">
          <label>酒龄（年）</label><input id="alYears" type="number" min="0" max="80" value="10">
          <label>平均每天白酒（斤）</label><input id="alBJ" type="number" min="0" step="0.1" value="1">
          <label>白酒价格（元/斤）</label><input id="alBJP" type="number" min="0" value="50">
          <label>平均每天啤酒（瓶 500ML）</label><input id="alBeer" type="number" min="0" value="2">
          <label>啤酒价格（元/瓶 500ML）</label><input id="alBeerP" type="number" min="0" step="0.5" value="3">
          <label>个性签名（选填）</label><input id="alSign" maxlength="20" placeholder="默认：无语中..">
          <button class="btn btn-primary btn-lg" id="alGo" style="margin-top:12px">保持清醒，开始！</button>
        </div>
      </div>`;
    $('#alGo').onclick = () => {
      S.alcohol = {
        cfg: {
          years: Math.max(0, parseInt($('#alYears').value, 10) || 0),
          baijiu: Math.max(0, parseFloat($('#alBJ').value) || 0),
          baijiuP: Math.max(0, parseFloat($('#alBJP').value) || 0),
          bottle: Math.max(0, parseFloat($('#alBeer').value) || 0),
          bottleP: Math.max(0, parseFloat($('#alBeerP').value) || 0),
          started: null
        }, total: 0, lastDate: '', lastTime: null
      };
      const sg = $('#alSign').value.trim();
      if (sg) S.signature = sg;
      persist();
      toast('填好啦，点打卡就算正式开始！', '🍺');
      render();
    };
  }

  function openLiver() {
    const gone = Math.min(100, S.alcohol.total || 0);
    sheet(`<h3>🫀 肝脏小窗</h3><div class="organ-box">${QuitArt.liver(gone)}</div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">趣味示意，不是医学影像，也不能用来判断身体情况。</p>`);
  }

  function openBelly() {
    const gone = Math.min(100, S.fit.total || 0);
    sheet(`<h3>🫃 体脂小窗</h3><div class="organ-box">${QuitArt.belly(gone)}</div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">趣味示意，不是医学测量，也不能用来判断身体情况。</p>`);
  }

  /* ---------------- 减肥健身 ---------------- */
  function renderFit() {
    const m = S.fit;
    if (!m || !m.cfg) return fitForm();
    const c = m.cfg;
    const bmi = c.w / Math.pow(c.h / 100, 2);
    const today = m.lastDate === todayStr();

    $('#main').innerHTML = `
      ${stageHTML('fit', '生命在于运动，目标360天！')}
      <div class="dock">
        <button class="act" data-act="pat">🤚 摸摸头</button>
        <button class="act" data-act="feed">🍗 疯狂喂食</button>
        <button class="act" data-act="belly">🫃 体脂小窗</button>
        <button class="act primary" data-act="checkin" ${today ? 'disabled' : ''}>${today ? '✅ 今日已打卡' : '运动打卡'}</button>
      </div>
      ${titleBar('fit', FIT_TITLES)}
      <div class="card">
        <h3>📊 运动数据</h3>
        ${statsRow([['BMI', bmi.toFixed(1)], ['身材', bmi > 23.9 ? '偏胖' : bmi < 18.5 ? '偏瘦' : '完美'], ['已坚持', Math.max(0, Math.floor((Date.now() - c.started) / DAY)) + ' 天'], ['开始日期', (() => { const d = new Date(c.started); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; })()]])}
      </div>
      ${communityCard('fit')}
      ${infoCard('fit', '健身', `
        <div><label>身高（cm）</label><input id="fH" type="number" min="50" max="250" value="${c.h}"></div>
        <div><label>体重（kg）</label><input id="fW" type="number" min="10" max="400" step="0.1" value="${c.w}"></div>
        <div style="flex-basis:100%"><label>个性签名</label><input id="fSign" maxlength="20" value="${esc(S.signature || '')}"></div>`)}
    `;
    bindScene(); bindTitle(FIT_TITLES, 'fit');
    const kidBox = () => $('.scene-kid');
    $$('.act').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'pat') { anim(kidBox(), 'nod'); toast(pick(['好舒服呀', '头头被摸聪明了', '再摸摸～']), '🤚'); }
      if (a === 'feed') {
        anim(kidBox(), 'eat');
        toast(pick(['嗷呜——好吃！', '咔嚓咔嚓真香', bmi > 23.9 ? '再喂真要成球啦！' : '能量满满，练起来！']), '🍗');
      }
      if (a === 'belly') openBelly();
      if (a === 'checkin') doCheckin('fit', '🏃');
    }));
    bindInfo('fit', () => {
      c.h = Math.max(50, parseFloat($('#fH').value) || 0);
      c.w = Math.max(10, parseFloat($('#fW').value) || 0);
      S.signature = $('#fSign').value.trim();
      persist(); toast('已保存', '✏️'); render();
    });
    const lv = $('[data-lv="fit"]');
    if (lv) lv.onclick = () => levelsSheet(FIT_TITLES, 'fit');
  }

  function fitForm() {
    $('#main').innerHTML = `
      <div class="card setup-card">
        <h3>🏃 开始健身打卡</h3>
        <p class="muted tiny">填一下身高体重，小朋友会变成你的抽象身材镜子</p>
        <div class="form">
          <label>身高（cm）</label><input id="ftH" type="number" min="50" max="250" placeholder="例如 170">
          <label>体重（kg）</label><input id="ftW" type="number" min="10" max="400" step="0.1" placeholder="例如 65">
          <button class="btn btn-primary btn-lg" id="ftGo" style="margin-top:12px">生命在于运动，开始！</button>
        </div>
      </div>`;
    $('#ftGo').onclick = () => {
      const h = parseFloat($('#ftH').value), w = parseFloat($('#ftW').value);
      if (!h || !w) return toast('身高体重都要填哦', '📏');
      S.fit = { cfg: { h, w, started: Date.now() }, total: 0, lastDate: '', lastTime: null };
      persist();
      const bmi = w / Math.pow(h / 100, 2);
      toast(bmi > 23.9 ? '胖成球的小盆友来陪你练！' : bmi < 18.5 ? '瘦成棍的小盆友来陪你吃！' : '完美身材的小伙伴来啦！', '🏃');
      render();
    };
  }

  /* ---------------- 佩奇 ---------------- */
  /* 小纸条：古诗词与句子（共 47 张） */
  const NOTES = [
    '顺其自然，随遇而安。——《庄子》',
    '本来无一物，何处惹尘埃。—— 惠能',
    '人生如逆旅，我亦是行人。—— 苏轼',
    '乱花渐欲迷人眼，浅草才能没马蹄。—— 白居易',
    '知足者常乐，终身不辱。—— 老子',
    '盛年不重来，一日难再晨。—— 陶渊明',
    '浆声灯影里的日子，过一天，少一天。—— 朱自清',
    '水满则溢，月盈则亏。——《淮南子》',
    '天下事有难易乎？为之，则难者亦易矣。—— 彭端淑',
    '临渊羡鱼，不如退而结网。——《汉书》',
    '志士惜日短，愁人知夜长。—— 傅玄',
    '海纳百川，有容乃大。—— 林则徐',
    '绳锯木断，水滴石穿。—— 罗大经',
    '锲而不舍，金石可镂。——《荀子·劝学》',
    '千里之行，始于足下。——《老子》',
    '业精于勤，荒于嬉。—— 韩愈',
    '己所不欲，勿施于人。—— 孔子',
    '世事一场大梦，人生几度秋凉。—— 苏轼',
    '莫道桑榆晚，为霞尚满天。—— 刘禹锡',
    '回首向来萧瑟处，归去，也无风雨也无晴。—— 苏轼',
    '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。—— 苏轼',
    '长风破浪会有时，直挂云帆济沧海。—— 李白',
    '天行健，君子以自强不息。——《周易》',
    '胜人者有力，自胜者强。—— 老子',
    '路漫漫其修远兮，吾将上下而求索。—— 屈原',
    '博观而约取，厚积而薄发。—— 苏轼',
    '一个人只拥有此生此世是不够的。——《爱你就像爱生命》',
    '岁月极美，在于它必然的流逝。——《温柔的夜》',
    '我们听过无数的道理，却仍旧过不好这一生。——《后会无期》',
    '世事离局，局内人迷里糊涂。——《围城》',
    '你如果认识从前的我，就会原谅我。——《倾城之恋》',
    '孤独从一开始就注定要跟随你一生。——《百年孤独》',
    '人是为了活着本身而活着的。——《活着》',
    '现在无法挽留，未来无法预期。——《解忧杂货店》',
    '越是深沉的痛苦，越是无声。——《平凡的世界》',
    '我爱这土地，眼里常含泪水。——《艾青诗选》',
    '习惯了黑暗，就不要恐惧光明。——《黑暗的左手》',
    '一个人可以被毁灭，但不能被打败。——《老人与海》',
    '逃避现实的人，才会沉溺于幻想。——《呼啸山庄》',
    '生存还是毁灭，这是一个问题。——《哈姆雷特》',
    '人是生而自由的，却无往不在枷锁中。——《社会契约论》',
    '知者不惑，仁者不忧，勇者不惧。——《论语》',
    '路遥知马力，日久见人心。——《元曲选》',
    '过去都是假的，回忆是一条没有归途的路。——《百年孤独》',
    '天生我材必有用，千金散尽还复来。—— 李白',
    '宝剑锋从磨砺出，梅花香自苦寒来。——《警世贤文》',
    '行路难，行路难，多歧路，今安在？—— 李白',
  ];
  /* 点头像时的回应（睡着时不回应） */
  const TAP_LINES = {
    peki: [['嘿嘿，被你戳到啦', '🐷'], ['我在呢我在呢', '🐷'], ['摸摸头～', '🥰'], ['今天也要好好加油鸭', '💪']],
    girl: [['诶？是在叫我吗', '👧'], ['我叫小美，你好呀', '👧'], ['佩奇的朋友就是我', '✨'], ['别戳啦，痒痒的', '😆']],
    mini: [['小小的我在这里', '✨'], ['我是小佩奇', '✨'], ['戳我干嘛呀', '😝'], ['嘿咻～', '🌟']],
  };
  const FEED_CD = 5 * 60 * 1000;
  const PK_DUR = 24 * 3600 * 1000;
  const TEASE_CD = 60 * 1000;
  const DOG_AT = 50;
  const JOY_MAX = 10 * 60 * 1000;
  const DAY = 86400000;
  const LIFE_FOODS = ['apple', 'cake', 'mushroom'];
  let pkClockTimer = null;
  let feedTimer = null;
  let dmPollTimer = null;

  /* 生命值：满值 100% = 72 小时（1% = 43.2 分钟）。
     苹果/蛋糕/蘑菇各最多贡献 24 小时（33%），随现实时间消耗；
     初始 1%：只在生命 ≤1% 时按 43.2 分钟倒计时（不喂就归零变十字架），
     生命高于 1% 时初始 1% 固定保留、不消耗 */
  const BASE_MS = 2592e3; /* 43.2 分钟 = 1% */
  function lifeLeft(st) {
    const now = Date.now();
    const food = LIFE_FOODS.reduce((sum, k) => sum + Math.max(0, Math.min(DAY, (st.life[k] || 0) - now)), 0);
    const foodPct = food / (DAY * 3) * 100;
    const base = foodPct >= 1 ? BASE_MS : Math.max(0, (st.graceUntil || 0) - now);
    return food + base;
  }
  function lifePct(st) {
    const left = lifeLeft(st);
    if (left <= 0) return 0;
    /* 只要还活着就至少显示 1%（初始 1% 会随 43.2 分钟倒计时，但显示不为 0） */
    return Math.max(1, Math.min(100, Math.floor(left / (DAY * 3) * 100)));
  }
  function effectPct(st, k) {
    const until = k === 'apple' ? st.ghostUntil : k === 'cake' ? st.bigUntil : st.girlUntil;
    return Math.round(Math.max(0, until - Date.now()) / PK_DUR * 100);
  }

  function clockText() {
    const t = S.clock && S.clock.target;
    if (!t) return '⏰ 小闹钟 · 点我设倒计时';
    const left = t - Date.now();
    if (left <= 0) return '⏰ 时间到啦！🎉';
    const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000);
    return `⏰ 距离目标还剩 ${d}天${h}小时${m}分`;
  }

  /* 小闹钟：自绘日历 + 时分步进器，网页 / 安卓 App / iOS 三端完全一致。
     不用系统原生 datetime 选择器——各端弹的界面都不同，安卓 WebView 里还会闪退，
     原生选择器自带的「清除」键也一并去掉。 */
  function openClock() {
    if (!S.clock || typeof S.clock !== 'object') S.clock = { target: 0 };
    const base = S.clock.target > Date.now() ? new Date(S.clock.target) : new Date(Date.now() + 100 * 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const WK = ['日', '一', '二', '三', '四', '五', '六'];
    const pick = { y: base.getFullYear(), m: base.getMonth(), d: base.getDate(), h: base.getHours(), mi: base.getMinutes() };
    const view = { y: pick.y, m: pick.m };
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);

    const sumText = () => `${pick.y} 年 ${pick.m + 1} 月 ${pick.d} 日 周${WK[new Date(pick.y, pick.m, pick.d).getDay()]} · ${pad(pick.h)}:${pad(pick.mi)}`;

    const calHtml = () => {
      const days = new Date(view.y, view.m + 1, 0).getDate();
      const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7; /* 周一开头 */
      let cells = ['一', '二', '三', '四', '五', '六', '日'].map((w) => `<i class="cal-cell cal-w">${w}</i>`).join('');
      for (let i = 0; i < lead; i++) cells += '<i class="cal-cell empty"></i>';
      for (let d = 1; d <= days; d++) {
        const sel = view.y === pick.y && view.m === pick.m && d === pick.d;
        const past = new Date(view.y, view.m, d).getTime() < today0.getTime();
        cells += `<i class="cal-cell${sel ? ' sel' : ''}${past ? ' dis' : ''}" data-cd="${d}">${d}</i>`;
      }
      const canPrev = new Date(view.y, view.m, 1).getTime() > today0.getTime();
      return `<div class="cal-box ck-cal">
        <div class="cal-head">
          <button class="cal-nav" data-ckm="-1"${canPrev ? '' : ' disabled'}>‹</button>
          <b>${view.y} 年 ${view.m + 1} 月</b>
          <button class="cal-nav" data-ckm="1">›</button>
        </div>
        <div class="cal-grid">${cells}</div>
      </div>`;
    };

    sheet(`<h3>⏰ 小闹钟</h3>
      <p class="sheet-sub">定一个目标时间，页面顶部会一直显示倒计时</p>
      <div class="ck-sum" id="ckSum">${sumText()}</div>
      <div class="clock-presets">
        <button class="btn btn-ghost" data-p="7">7 天后</button>
        <button class="btn btn-ghost" data-p="30">30 天后</button>
        <button class="btn btn-ghost" data-p="100">100 天后</button>
      </div>
      <p class="ck-label">选日期</p>
      <div id="ckCal">${calHtml()}</div>
      <p class="ck-label">选时间</p>
      <div class="ck-time">
        <div class="ck-step"><button data-ck="h-1" aria-label="小时减">−</button><b id="ckH">${pad(pick.h)}</b><span class="ck-unit">时</span><button data-ck="h1" aria-label="小时加">＋</button></div>
        <div class="ck-step"><button data-ck="m-5" aria-label="分钟减">−</button><b id="ckM">${pad(pick.mi)}</b><span class="ck-unit">分</span><button data-ck="m5" aria-label="分钟加">＋</button></div>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" id="clockNo">取消</button>
        <button class="btn btn-primary" id="clockSave">保存</button>
      </div>`);

    const bindCal = () => {
      $$('.ck-cal .cal-nav').forEach((b) => b.onclick = () => {
        const t = new Date(view.y, view.m + (+b.dataset.ckm), 1);
        view.y = t.getFullYear(); view.m = t.getMonth();
        $('#ckCal').innerHTML = calHtml();
        bindCal();
      });
      $$('.ck-cal .cal-cell[data-cd]').forEach((el) => el.onclick = () => {
        if (el.classList.contains('dis')) return;
        pick.y = view.y; pick.m = view.m; pick.d = +el.dataset.cd;
        $('#ckCal').innerHTML = calHtml();
        bindCal();
        $('#ckSum').textContent = sumText();
      });
    };
    bindCal();

    $$('.clock-presets .btn').forEach((b) => b.onclick = () => {
      const t = new Date(Date.now() + parseInt(b.dataset.p, 10) * 86400000);
      pick.y = t.getFullYear(); pick.m = t.getMonth(); pick.d = t.getDate();
      pick.h = t.getHours(); pick.mi = t.getMinutes();
      view.y = pick.y; view.m = pick.m;
      $('#ckCal').innerHTML = calHtml();
      bindCal();
      $('#ckSum').textContent = sumText();
      $('#ckH').textContent = pad(pick.h);
      $('#ckM').textContent = pad(pick.mi);
    });

    $$('.ck-step button').forEach((b) => b.onclick = () => {
      const k = b.dataset.ck;
      if (k === 'h-1') pick.h = (pick.h + 23) % 24;
      else if (k === 'h1') pick.h = (pick.h + 1) % 24;
      else if (k === 'm-5') pick.mi = (pick.mi + 55) % 60;
      else pick.mi = (pick.mi + 5) % 60;
      $('#ckH').textContent = pad(pick.h);
      $('#ckM').textContent = pad(pick.mi);
      $('#ckSum').textContent = sumText();
    });

    $('#clockSave').onclick = () => {
      const t = new Date(pick.y, pick.m, pick.d, pick.h, pick.mi).getTime();
      if (!t || t <= Date.now()) return toast('要定一个将来的时间哦', '⏰');
      S.clock.target = t;
      persist(); closeSheet();
      toast('小闹钟设好啦', '⏰');
      renderPeki();
    };
    $('#clockNo').onclick = closeSheet;
  }

  function spawnCat() {
    if (tab !== 'peki') return;
    const svg = document.querySelector('.peki-stage .scene-svg');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const outer = document.createElementNS(NS, 'g');
    outer.setAttribute('transform', 'translate(648 500) scale(1.45)');
    const inner = document.createElementNS(NS, 'g');
    inner.innerHTML = QuitArt.catSit();
    outer.appendChild(inner);
    svg.appendChild(outer);
    inner.classList.add('cat-drop');
    toast('🐱 喵呜…', '🐱');
    setTimeout(() => inner.classList.replace('cat-drop', 'cat-lick'), 2400);
    setTimeout(() => inner.classList.replace('cat-lick', 'cat-leave'), 6400);
    setTimeout(() => outer.remove(), 8300);
  }
  const STARVE = 3 * 24 * 3600 * 1000;

  function pkState() {
    if (!S.peki || typeof S.peki !== 'object') S.peki = {};
    const st = S.peki;
    if (typeof st.charm !== 'number') st.charm = 0;
    ['lastFeed', 'lastTease', 'ghostUntil', 'bigUntil', 'girlUntil', 'ptUntil'].forEach((k) => {
      if (typeof st[k] !== 'number') st[k] = 0;
    });
    if (typeof st.dead !== 'boolean') st.dead = false;
    if (typeof st.graceUntil !== 'number') st.graceUntil = 0;
    if (typeof st.teaseCount !== 'number') st.teaseCount = 0;
    if (typeof st.cheerTotal !== 'number') st.cheerTotal = 0;
    if (typeof st.joy !== 'number') st.joy = 0;
    /* 快乐值 = 剩余快乐额度（上限 10 分钟），用到期时间戳存，随时间实时减少 */
    if (typeof st.joyUntil !== 'number' || !(st.joyUntil > 0)) st.joyUntil = Date.now() + Math.max(0, Math.min(10, st.joy)) * 60000;
    if (!st.lastFeed) st.lastFeed = Date.now();
    if (!st.life || typeof st.life !== 'object') {
      /* 老存档迁移：原来 3 天不喂才离开，等于三种食物各留 1 天 */
      const base = st.lastFeed;
      st.life = { apple: base + DAY, cake: base + DAY, mushroom: base + DAY };
    }
    LIFE_FOODS.forEach((k) => { if (typeof st.life[k] !== 'number') st.life[k] = 0; });
    return st;
  }
  /* 剩余快乐毫秒数（0 ~ 10 分钟） */
  function joyLeft(st) {
    return Math.max(0, Math.min(JOY_MAX, (st.joyUntil || 0) - Date.now()));
  }
  function pkTick() {
    const st = pkState();
    const now = Date.now();
    /* 生命高于 1% 时持续为初始 1% 续期；跌破 1% 后用剩余宽限（43.2 分钟）倒计时 */
    const food = LIFE_FOODS.reduce((s, k) => s + Math.max(0, Math.min(DAY, (st.life[k] || 0) - now)), 0);
    if (!st.dead && food / (DAY * 3) * 100 >= 1) st.graceUntil = now + BASE_MS;
    if (!st.dead && lifeLeft(st) <= 0) {
      st.dead = true;
      st.charm = 0;
      st.joy = 0;
      st.joyUntil = 0;
      st.ghostUntil = st.bigUntil = st.girlUntil = 0;
      persist();
    }
    if (!st.dead) st.joy = joyLeft(st) / 60000;
    return st;
  }
  function fmtLeft(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 3600) return Math.floor(s / 3600) + '小时' + (Math.floor((s % 3600) / 60) ? Math.floor((s % 3600) / 60) + '分' : '');
    if (s >= 60) return Math.floor(s / 60) + '分' + (s % 60) + '秒';
    return s + '秒';
  }

  function openFeed() {
    const st = pkTick();
    if (st.dead) return toast('佩奇已经不在了…', '🪦');
    const now = Date.now();
    const cd = FEED_CD - (now - st.lastFeed);
    const items = [
      ['apple', '🍎', '苹果', st.ghostUntil > now],
      ['cake', '🍰', '蛋糕', st.bigUntil > now],
      ['mushroom', '🍄', '蘑菇', st.girlUntil > now],
    ];
    sheet(`<h3>🍽️ 喂佩奇吃点东西</h3>
      <p class="sheet-sub" id="feedCd">${cd > 0 ? `刚喂过啦，${Math.ceil(cd / 1000)} 秒后才能再喂` : '每 300 秒可以喂一次，效果持续 24 小时'}</p>
      <div class="food-list">${items.map(([k, ico, nm, on]) => {
        const pc = effectPct(st, k);
        return `<button class="food-row" data-food="${k}" ${cd > 0 ? 'disabled' : ''}>
        <span class="food-ico">${ico}</span>
        <span class="food-main">
          <b>${nm}${on ? '<em class="on">生效中 +1</em>' : ''}</b>
          <span class="food-meter"><span class="food-bar"><i data-bar="${k}" style="width:${pc}%"></i></span><em data-pct="${k}">${pc}%</em></span>
        </span>
      </button>`;
      }).join('')}</div>`);
    $$('.food-row').forEach((b) => { b.onclick = () => feedPeki(b.dataset.food); });
    clearInterval(feedTimer);
    feedTimer = setInterval(() => {
      const rows = $$('.food-row');
      if (!rows.length) return clearInterval(feedTimer);
      const nowSt = pkState();
      $$('[data-bar]').forEach((el) => { el.style.width = effectPct(nowSt, el.dataset.bar) + '%'; });
      $$('[data-pct]').forEach((el) => { el.textContent = effectPct(nowSt, el.dataset.pct) + '%'; });
      const cd = Math.max(0, FEED_CD - (Date.now() - nowSt.lastFeed));
      const cdEl = $('#feedCd');
      if (cdEl) cdEl.textContent = cd > 0 ? `刚喂过啦，${Math.ceil(cd / 1000)} 秒后才能再喂` : '每 300 秒可以喂一次，效果持续 24 小时';
      rows.forEach((b) => { if (cd > 0) b.setAttribute('disabled', ''); else b.removeAttribute('disabled'); });
    }, 1000);
  }

  function feedPeki(kind) {
    const st = pkTick();
    if (st.dead) return;
    const now = Date.now();
    const cd = FEED_CD - (now - st.lastFeed);
    if (cd > 0) { closeSheet(); return toast(`佩奇刚吃过，${Math.ceil(cd / 1000)} 秒后再喂`, '⏳'); }
    st.lastFeed = now;
    st.life[kind] = now + DAY;
    let msg = '', ico = '🍽️', gotCharm = false;
    if (kind === 'apple') {
      if (st.ghostUntil > now) { st.charm += 1; gotCharm = true; msg = '佩奇已经在泡澡啦，魅力 +1'; }
      else { st.ghostUntil = now + PK_DUR; msg = '佩奇跳进洗澡池里啦！'; }
      ico = '👻';
    } else if (kind === 'cake') {
      if (st.bigUntil > now) { st.charm += 1; gotCharm = true; msg = '脑袋已经很大了，魅力 +1'; }
      else { st.bigUntil = now + PK_DUR; msg = '佩奇的脑袋大了一圈！'; }
      ico = '🍰';
    } else {
      if (st.girlUntil > now) { st.charm += 1; gotCharm = true; msg = '女孩已经在啦，魅力 +1'; }
      else { st.girlUntil = now + PK_DUR; msg = '旁边出现了一个双马尾女孩！'; }
      ico = '🍄';
    }
    persist();
    closeSheet();
    toast(gotCharm ? `${msg} · 魅力 ${st.charm}` : msg, ico);
    renderPeki();
  }

  function teasePeki() {
    const st = pkTick();
    if (st.dead) return toast('佩奇已经不在了…', '🪦');
    if (joyLeft(st) <= 0) return toast('佩奇睡着啦，先陪它玩一下～', '😴');
    const now = Date.now();
    const left = TEASE_CD - (now - st.lastTease);
    if (left > 0) return toast(`佩奇喘口气，${Math.ceil(left / 1000)} 秒后再逗`, '⏳');
    st.lastTease = now;
    st.teaseCount = (st.teaseCount || 0) + 1;
    const catDue = st.teaseCount >= 10;
    if (catDue) st.teaseCount = 0;
    /* 逗一逗也能加分：每次 +1 分，一天最多 2 分 */
    if (!S.teaseToday || typeof S.teaseToday !== 'object' || S.teaseToday.d !== todayStr()) S.teaseToday = { d: todayStr(), n: 0 };
    let tp = 0;
    if (S.teaseToday.n < 2) { S.points += 1; S.teaseToday.n += 1; tp = 1; }
    persist();
    const el = $('.peki-kid');
    if (el) { el.classList.remove('dance'); void el.offsetWidth; el.classList.add('dance'); setTimeout(() => el.classList.remove('dance'), 5100); }
    toast(pick(['佩奇跳起了小舞～', '扭起来了！', '佩奇：快看我表演']) + (tp ? '  ⭐+1' : ''), '💃');
    if (catDue) setTimeout(spawnCat, 900);
    updatePekiBtns();
    const dt = $('#todayPts');
    if (dt) dt.textContent = todayPoints() + '/5';
    const cp = $('#curPts');
    if (cp) cp.textContent = S.points;
  }

  function playPeki() {
    const st = pkTick();
    if (st.dead) return toast('佩奇已经不在了…', '🪦');
    const now = Date.now();
    const left = joyLeft(st);
    const wasFull = left >= JOY_MAX - 1000;
    const wasAsleep = left <= 0;
    /* 玩耍 +1 分钟快乐，上限 10 分钟（已经归零就从现在重新算） */
    if (!wasFull) st.joyUntil = Math.min(now + JOY_MAX, Math.max(now, st.joyUntil) + 60000);
    st.joy = joyLeft(st) / 60000;
    persist();
    if (wasAsleep) {
      renderPeki();
      toast(pick(['唔…睡醒了！', '佩奇揉揉眼睛爬起来啦', '呀，你回来啦～']), '🌞');
      return;
    }
    if (wasFull) toast(pick(['我很快乐！！', '已经快乐到满格啦～', '嘿嘿，我超快乐！']), '🌈');
    else toast(pick(['佩奇开心地转圈圈', '嘿嘿，最喜欢和你玩啦', '再来一次！', '佩奇笑得眼睛都没了']), '🎈');
    const fill = $('#joyFill'), txt = $('#joyTxt');
    if (fill) fill.style.width = (st.joy * 10).toFixed(1) + '%';
    if (txt) txt.textContent = st.joy.toFixed(1) + '/10 分';
  }

  function updatePekiBtns() {
    const st = pkState();
    if (st.dead) return;
    const now = Date.now();
    const fb = $('#feedBtn'), tb = $('#teaseBtn');
    if (fb) {
      const d = FEED_CD - (now - st.lastFeed);
      fb.innerHTML = d > 0 ? '🍽️ 冷却 ' + Math.ceil(d / 1000) + 's' : '🍽️ 喂食';
    }
    if (tb) {
      const d = TEASE_CD - (now - st.lastTease);
      tb.innerHTML = d > 0 ? `💃 冷却 ${Math.ceil(d / 1000)}s` : '💃 逗一逗';
    }
  }

  function pekiRules() {
    sheet(`<h3>📖 佩奇规则说明</h3>
      <div class="rule-list">
        <p><b>🍽️ 喂食</b>每 300 秒可以喂一次，每次选苹果、蛋糕或蘑菇其中的一样。</p>
        <p><b>🍎 苹果</b>佩奇跳进一个大洗澡池里泡澡（有泡泡和小黄鸭），持续 24 小时。</p>
        <p><b>🍰 蛋糕</b>佩奇脑袋变大 30%，持续 24 小时。</p>
        <p><b>🍄 蘑菇</b>佩奇旁边出现一个漂亮的双马尾女孩，持续 24 小时。</p>
        <p><b>＋1 魅力</b>状态已经在生效时，再喂同一样东西，魅力值 +1。</p>
        <p><b>💃 逗一逗</b>每 1 分钟可以逗一次，佩奇会跳舞 5 秒。</p>
        <p><b>📝 小纸条</b>：戒烟、戒酒、运动每打卡一次 +1 积分，一天最多 3 积分；逗一逗佩奇每次 +1 积分，一天最多 2 积分。20 积分抽一张小纸条，随机抽，佩奇写给你的话都在这儿。</p>
        <p><b>⏰ 小闹钟</b>点顶部的「小闹钟」可以定一个目标时间，之后会一直显示距离目标还剩多少天多少小时多少分。</p>
        <p><b>✨ 小佩奇</b>魅力 10 / 50 / 200 会出现 1 / 2 / 3 个小佩奇，发色依次是黄、白、红，最多 3 个。</p>
        <p><b>🪦 会离开</b>现实时间 3 天没有喂佩奇，佩奇就会离开，魅力值清零。之后可以重新养一只。</p>
      </div>
      <button class="btn btn-primary btn-lg" style="margin-top:14px" onclick="document.querySelector('.sheet-mask').remove()">看完了</button>`);
  }

  function revivePeki() {
    /* 直接重新开始，不再二次确认 */
    const keep = S.peki && typeof S.peki.cheerTotal === 'number' ? S.peki.cheerTotal : 0;
    const t0 = Date.now();
    S.peki = { charm: 0, lastFeed: t0, lastTease: 0, ghostUntil: 0, bigUntil: 0, girlUntil: 0, ptUntil: 0, dead: false, cheerTotal: keep, teaseCount: 0, joy: 0, joyUntil: 0, graceUntil: t0 + BASE_MS, life: { apple: 0, cake: 0, mushroom: 0 } };
    persist();
    toast('新佩奇来啦，43 分钟内记得喂它', '🐣');
    renderPeki();
  }

  /* 已抽到的纸条索引（去重，按抽到的先后排；重复抽到只保留一条） */
  function noteUniq() {
    const seen = [];
    (S.notes || []).forEach((i) => {
      if (NOTES[i] !== undefined && !seen.includes(i)) seen.push(i);
    });
    return seen;
  }

  /* 已抽到的小纸条：单独一页展示 */
  function noteAllSheet() {
    const seen = noteUniq();
    sheet(`<h3>📝 已抽到的小纸条</h3>
      <p class="sheet-sub">共 ${seen.length} 张${seen.length ? ' · 点一条看全文' : ''}</p>
      ${seen.length
        ? `<div class="note-list note-list-all">${seen.map((i, j) => `<button class="note-item" data-note="${i}" data-idx="${j + 1}"><span class="note-idx">${j + 1}</span><span class="note-txt">${esc(NOTES[i])}</span></button>`).join('')}</div>`
        : '<p class="muted tiny" style="text-align:center;padding:26px 0">还没有抽过小纸条，攒够 20 积分来抽一张吧</p>'}
      <button class="btn btn-ghost btn-lg" id="noteAllClose" style="margin-top:14px">收起</button>`);
    $('#noteAllClose').onclick = closeSheet;
    $$('.note-item[data-note]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.note, idx = +b.dataset.idx;
        sheet(`<h3>📝 第 ${idx} 张纸条</h3>
          <div class="note-big" style="margin-top:10px">${esc(NOTES[i])}</div>
          <div class="sheet-actions">
            <button class="btn btn-ghost" id="noteBack">返回列表</button>
            <button class="btn btn-primary" id="noteDone">收好了</button>
          </div>`);
        $('#noteBack').onclick = noteAllSheet;
        $('#noteDone').onclick = closeSheet;
      };
    });
  }

  function renderPeki() {
    const got = noteUniq().length;
    const todayN = todayPoints();
    const st = pkTick();
    const now = Date.now();
    if (!S.clock || typeof S.clock !== 'object') S.clock = { target: 0 };
    const dead = st.dead;
    const bathing = !dead && st.ghostUntil > now;
    const big = !dead && st.bigUntil > now;
    const girlOn = !dead && st.girlUntil > now;
    const dogOn = !dead && (st.cheerTotal || 0) >= DOG_AT;
    const ptOn = !dead && !dogOn && st.ptUntil > now;
    const charm = dead ? 0 : st.charm;
    /* 小佩奇：魅力 10 / 50 / 200 各出现一个，发色依次黄、白、红 */
    const MINI_AT = [10, 50, 200];
    const MINI_HAIR = ['#e8b93e', '#f3effa', '#d95a4e'];
    const minis = charm >= MINI_AT[2] ? 3 : charm >= MINI_AT[1] ? 2 : charm >= MINI_AT[0] ? 1 : 0;
    const ps = big ? 2.275 : 1.75;
    const gs = ps * 1.06;
    const lifeP = dead ? 0 : lifePct(st);
    const joyV = dead ? 0 : joyLeft(st) / 60000;
    const sleepy = !dead && joyV <= 0;

    const bgSvg = ptOn ? QuitArt.pekiBg() : `<svg class="scene-svg" viewBox="0 0 800 588" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
          <defs><radialGradient id="pkG" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#3a3158"/><stop offset="1" stop-color="#241f38"/></radialGradient></defs>
          <rect width="800" height="588" fill="url(#pkG)"/>
          ${[[260, 110], [520, 130], [380, 80], [460, 210], [320, 220], [600, 200]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#ffe9a8" class="spk" style="animation-delay:${i * .5}s"/>`).join('')}
        </svg>`;

    let actors = '';
    if (dead) {
      actors = QuitArt.grave();
    } else {
      const tub = bathing ? QuitArt.bath(girlOn ? 412 : 400, girlOn ? (big ? 210 : 198) : (big ? 164 : 150)) : null;
      const px = girlOn ? 328 : 400;
      if (tub) actors += tub.back;
      if (girlOn) {
        /* 女孩先画：马尾垂在佩奇脸后面，不会挡住佩奇 */
        actors += `<g transform="translate(508 300)"><g class="peki-float" style="animation-delay:-1.4s">
          <g class="pk-tap" data-who="girl">${QuitArt.girlHead(gs, sleepy)}</g>
        </g></g>`;
      }
      actors += `<g transform="translate(${px} 300)"><g class="peki-float">
          <g class="kid-anim peki-kid pk-tap" data-who="peki">${QuitArt.pekiHead(ps, sleepy)}</g>
        </g></g>`;
      if (sleepy) {
        const zf = ps / 1.75;
        actors += `<g transform="translate(${(px - 88 * zf).toFixed(0)} ${(300 - 92 * zf).toFixed(0)})">
          <text class="zzz" x="0" y="0" font-family="Helvetica, Arial, sans-serif" font-size="${(20 * zf).toFixed(1)}" font-weight="700" fill="#cfc6f0">Z</text>
          <text class="zzz" style="animation-delay:1.1s" x="${(20 * zf).toFixed(0)}" y="${(-18 * zf).toFixed(0)}" font-family="Helvetica, Arial, sans-serif" font-size="${(15 * zf).toFixed(1)}" font-weight="700" fill="#cfc6f0">z</text>
          <text class="zzz" style="animation-delay:2.2s" x="${(36 * zf).toFixed(0)}" y="${(-34 * zf).toFixed(0)}" font-family="Helvetica, Arial, sans-serif" font-size="${(11 * zf).toFixed(1)}" font-weight="700" fill="#cfc6f0">z</text>
        </g>`;
        if (girlOn) {
          const gf = gs / 1.75;
          actors += `<g transform="translate(${(508 + 40 * gf).toFixed(0)} ${(300 - 88 * gf).toFixed(0)})">
            <text class="zzz" style="animation-delay:.6s" x="0" y="0" font-family="Helvetica, Arial, sans-serif" font-size="${(17 * gf).toFixed(1)}" font-weight="700" fill="#f0c6d6">Z</text>
            <text class="zzz" style="animation-delay:1.8s" x="${(18 * gf).toFixed(0)}" y="${(-16 * gf).toFixed(0)}" font-family="Helvetica, Arial, sans-serif" font-size="${(12 * gf).toFixed(1)}" font-weight="700" fill="#f0c6d6">z</text>
          </g>`;
        }
      }
      if (tub) actors += tub.front;
      const miniPos = [[150, 198], [670, 166], [126, 392]];
      for (let i = 0; i < minis; i++) {
        actors += `<g transform="translate(${miniPos[i][0]} ${miniPos[i][1]})"><g class="peki-float" style="animation-delay:-${(i * 1.1).toFixed(1)}s"><g class="pk-tap mini-tap" data-who="mini" data-i="${i}">${QuitArt.pekiHead(0.82, sleepy, MINI_HAIR[i])}</g></g></g>`;
      }
      if (dogOn) actors += `<g class="dog-actor" transform="translate(168 498) scale(1.5)"><g>${QuitArt.dog()}</g></g>`;
    }

    $('#main').innerHTML = `
      <div class="stage peki-stage${sleepy ? ' sleepy' : ''}">
        ${bgSvg.replace('</svg>', actors + '</svg>')}
        <div class="goal-banner" id="clockBanner">${clockText()}</div>
        <div class="charm-chip">✨ ${charm}</div>
        <div class="stat-bars">
          <div class="sbar">
            <div class="sbar-top"><span>❤️ 生命</span><b id="lifeTxt">${lifeP}%</b></div>
            <div class="sbar-track"><i id="lifeFill" class="life" style="width:${lifeP}%"></i></div>
          </div>
          <div class="sbar">
            <div class="sbar-top"><span>😄 快乐</span><b id="joyTxt">${joyV.toFixed(1)}/10 分</b></div>
            <div class="sbar-track"><i id="joyFill" class="joy" style="width:${(joyV * 10).toFixed(1)}%"></i></div>
          </div>
        </div>
      </div>
      ${dead
        ? `<div class="dock single"><button class="act primary" id="revivePk">🔄 重新开始</button></div>`
        : `<div class="dock">
            <button class="act" id="feedBtn">🍽️ 喂食</button>
            <button class="act" id="teaseBtn">💃 逗一逗</button>
            <button class="act" id="playBtn">${sleepy ? '🎈 叫醒佩奇' : '🎈 玩耍'}</button>
            <button class="act primary" id="cheerPeki">💖 鼓励佩奇${ptOn ? '<small class="cheer-num">已解锁 🇵🇹 主场</small>' : ''}</button>
          </div>`}
      <div class="card">
        <h3>🤫 跟佩奇说悄悄话</h3>
        <div class="form">
          <input id="msgInput" maxlength="60" placeholder="只说给佩奇一个人听…">
          <button class="btn btn-primary" id="msgSend">悄悄告诉佩奇</button>
        </div>
        <div id="msgList">${S.msgs.length ? '' : '<p class="muted tiny" style="text-align:center">还没有悄悄话</p>'}</div>
      </div>
      <div class="card">
        <h3>⭐ 我的积分 · 抽小纸条${vipOn() ? '<span class="vip-tag">VIP</span>' : ''}</h3>
        ${statsRow([['当前积分', `<span id="curPts">${S.points}</span>`], ['今日已得', `<span id="todayPts">${todayN}/5</span>`]])}
        <button class="btn btn-primary btn-lg" id="drawBox" ${(!vipFreeLeft() && S.points < 20) ? 'disabled' : ''} style="margin-top:14px">${vipFreeLeft() ? '🎫 会员免费抽一张' : '抽一张小纸条（⭐20）'}</button>
        <button class="btn btn-ghost btn-lg" id="noteAll" style="margin-top:10px">📝 已抽到的小纸条（${got} 张）</button>
      </div>
      <button class="btn btn-ghost btn-lg rules-btn" id="pekiRules">📖 佩奇规则说明</button>
    `;
    if (dead) {
      $('#revivePk').onclick = revivePeki;
    } else {
      $('#feedBtn').onclick = openFeed;
      $('#teaseBtn').onclick = teasePeki;
      $('#playBtn').onclick = playPeki;
      $('#cheerPeki').onclick = () => {
        heartsBurst($('.peki-stage'));
        anim($('.peki-stage .kid-anim'), 'jump');
        const prev = S.pekiCheer || 0;
        S.pekiCheer = prev + 1;
        st.cheerTotal = (st.cheerTotal || 0) + 1;
        const wasPt = st.ptUntil > Date.now();
        if (st.cheerTotal === DOG_AT) {
          st.ptUntil = 0; S.pekiCheer = 0;
          persist();
          setTimeout(() => { toast('🐶 汪！汪！', '🐶'); if (tab === 'peki') renderPeki(); }, 1300);
          return;
        }
        if (st.cheerTotal > DOG_AT) { /* 小狗已经在啦 */ }
        else if (S.pekiCheer >= 10) { st.ptUntil = Date.now() + PK_DUR; S.pekiCheer = 0; }
        persist();
        toast(pick(['谢谢你呀，我今天超有干劲！', '收到爱心，满分回血！', '嘿嘿，被鼓励到了～', '有你在，我什么都不怕']), '💖');
        if (!wasPt && st.ptUntil > Date.now()) setTimeout(() => { if (tab === 'peki') renderPeki(); }, 1400);
      };
      updatePekiBtns();
    }
    const dg = $('.dog-actor');
    if (dg) {
      dg.style.cursor = 'pointer';
      dg.addEventListener('click', () => {
        toast(pick(['汪汪！', '汪！', '汪汪汪！']), '🐶');
        const inner = dg.querySelector('g');
        if (inner) { inner.classList.remove('dog-wiggle'); inner.getBBox(); inner.classList.add('dog-wiggle'); setTimeout(() => inner.classList.remove('dog-wiggle'), 600); }
      });
    }
    $('#clockBanner').onclick = openClock;
    $('#pekiRules').onclick = pekiRules;
    /* 点头像回应：佩奇 / 女孩 / 小佩奇都能点，睡着时安安静静不回应 */
    $$('.peki-stage .pk-tap').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sleepy) return;
        const who = el.dataset.who;
        const [txt, ico] = pick(TAP_LINES[who] || TAP_LINES.peki);
        toast(txt, ico);
        if (who === 'peki') anim($('.peki-kid'), 'nod');
        if (who === 'mini') { el.classList.remove('mini-bop'); void el.getBBox().width; el.classList.add('mini-bop'); }
      });
    });
    /* 已抽到的小纸条：点按钮进单独一页查看 */
    const noteAllBtn = $('#noteAll');
    if (noteAllBtn) noteAllBtn.onclick = noteAllSheet;
    clearInterval(pkClockTimer);
    let pkSec = 0;
    pkClockTimer = setInterval(() => {
      const el = $('#clockBanner');
      if (!el) return clearInterval(pkClockTimer);
      pkSec++;
      if (pkSec % 15 === 0) el.textContent = clockText();
      if (tab !== 'peki') return;
      const nowSt = pkTick();
      if (nowSt.dead) return renderPeki();
      if (pkSec % 15 === 0) {
        const lp = lifePct(nowSt);
        const lf = $('#lifeFill'), lt = $('#lifeTxt');
        if (lf) lf.style.width = lp + '%';
        if (lt) lt.textContent = lp + '%';
      }
      /* 快乐值每秒都在减少：实时刷新数字和进度条 */
      const jl = joyLeft(nowSt), jv = jl / 60000;
      const jf = $('#joyFill'), jt = $('#joyTxt');
      if (jf) jf.style.width = (jv * 10).toFixed(1) + '%';
      if (jt) jt.textContent = jv.toFixed(1) + '/10 分';
      const stageEl = $('.peki-stage');
      if (stageEl && (jl <= 0) !== stageEl.classList.contains('sleepy')) {
        renderPeki();
        if (jl <= 0) toast('佩奇等你等到睡着了…', '😴');
      }
    }, 1000);
    $('#drawBox').onclick = () => {
      const free = vipFreeLeft();
      if (!free && S.points < 20) return toast('积分不够，先去打卡攒 20 分', '⭐');
      /* 全池随机抽，可能抽到重复的；重复的纸条只记一次 */
      const got2 = Math.floor(Math.random() * NOTES.length);
      const dup = (S.notes || []).includes(got2);
      if (free) S.vipFree = { d: todayStr(), used: true };
      else S.points -= 20;
      if (!dup) S.notes.push(got2);
      persist();
      sheet(`<h3>📝 佩奇写给你的</h3>
        <div class="note-big">${NOTES[got2]}</div>
        <p class="muted tiny" style="text-align:center">${dup ? '这张你之前抽到过啦，只记一次 · ' : ''}已抽 ${noteUniq().length} 张 · ${free ? '会员今日免费次数已用' : '剩余积分 ⭐' + S.points}</p>
        <button class="btn btn-primary btn-lg" onclick="document.querySelector('.sheet-mask').remove()">收好了</button>`);
      render();
    };
    $('#msgSend').onclick = () => {
      const v = $('#msgInput').value.trim();
      if (!v) return toast('想说点什么呀', '🤫');
      S.msgs.unshift({ txt: v, ts: Date.now() });
      persist();
      toast('佩奇记在心里了', '🐷');
      renderPeki();
    };
    const d = new Date(), hr = d.getHours();
    const greet = hr < 6 ? '这么晚还不睡？' : hr < 11 ? '早上好，今天也要加油！' : hr < 14 ? '中午好，饭后走一走～' : hr < 19 ? '下午好，来抽张纸条吗？' : '晚上好，今天打卡了吗？';
    const list = $('#msgList');
    if (S.msgs.length) {
      list.innerHTML = S.msgs.map((m, i) => `<div class="msg-item"><div><p>${esc(m.txt)}</p>
        <small class="muted tiny">${new Date(m.ts).getMonth() + 1}月${new Date(m.ts).getDate()}日 · 佩奇：${greet}</small></div>
        <button class="msg-del" data-i="${i}">删</button></div>`).join('');
      $$('#msgList .msg-del').forEach((b) => b.addEventListener('click', () => {
        S.msgs.splice(parseInt(b.dataset.i, 10), 1);
        persist(); renderPeki();
      }));
    }
  }

  /* ---------------- 分享 ---------------- */
  const gameUrl = () => location.href.split('#')[0];
  function copyText(t) {
    return new Promise((resolve) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(() => resolve(true)).catch(() => resolve(fallbackCopy(t)));
      } else resolve(fallbackCopy(t));
    });
  }
  function fallbackCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, t.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  /* 分享链接：复制网页链接或安装包链接 */
  function shareSheet() {
    sheet(`<h3>🔗 分享链接</h3>
      <p class="sheet-sub">选一个复制，粘贴给朋友就行</p>
      <div class="sheet-actions col">
        <button class="btn btn-primary btn-lg" id="shWeb">📋 复制网页链接</button>
        <button class="btn btn-ghost btn-lg" id="shCancel">取消</button>
      </div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">粘贴给好友，点开就能玩</p>`);
    $('#shWeb').onclick = async () => {
      const ok = await copyText(gameUrl());
      closeSheet();
      toast(ok ? '网页链接已复制' : '复制失败，请手动复制', ok ? '🔗' : '⚠️');
    };
    $('#shCancel').onclick = closeSheet;
  }

  /* ---------------- iOS 内购（StoreKit 2） ---------------- */
  const IAP_SKUS = {
    vip_month: { days: 30, plan: '30 天' },
    vip_year: { days: 365, plan: '1 年' },
    vip_forever: { days: 36500, plan: '永久' },
  };
  function iapApply(sku, txId) {
    const p = IAP_SKUS[sku];
    if (!p) return;
    const base = Math.max(Date.now(), (S.vip && S.vip.until) || 0);
    S.vip = { until: base + p.days * DAY, code: 'iap_' + (txId || sku), plan: p.plan };
    S.vipFree = { d: '', used: false };
    persist();
    render();
    toast(`开通成功，${p.plan}会员已生效`, '🎉');
    setTimeout(vipSheet, 500);
  }
  function iapBuy(sku) {
    if (!window.KKIAP || !window.KKIAP.available()) return toast('请在 App Store 版本中购买', 'ℹ️');
    window.KKIAP.buy(sku);
  }
  function iapRestore() {
    if (!window.KKIAP || !window.KKIAP.available()) return toast('请在 App Store 版本中恢复购买', 'ℹ️');
    window.KKIAP.restore();
  }
  /* 原生层回调：{type:'bought'|'restored'|'cancel'|'empty'|'error', sku, tx} */
  window.__iapResult = function (r) {
    if (!r) return;
    if (r.type === 'bought' || r.type === 'restored') iapApply(r.sku, r.tx);
    else if (r.type === 'cancel') toast('已取消购买', 'ℹ️');
    else if (r.type === 'empty') toast('没有可恢复的购买记录', 'ℹ️');
    else if (r.type === 'error') toast('购买没成功，稍后再试', '⚠️');
  };

  /* ---------------- 会员 · 激活码 ---------------- */
  const VIP_ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const VIP_SALT = 'kuailepeqi-2026-peizhe';
  const VIP_PLAN_DAYS = [7, 30, 90, 180, 365, 36500];
  const VIP_PLAN_NAME = ['7 天', '30 天', '90 天', '180 天', '365 天', '长期'];

  function vipHash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  /* 校验位：由「套餐 + 随机序号」推出 4 位字符，客户端离线也能验真假 */
  function vipSign(payload) {
    let h = vipHash(VIP_SALT + '|' + payload), out = '';
    for (let i = 0; i < 4; i++) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      out += VIP_ALPHA[(h >>> 15) % 32];
    }
    return out;
  }
  function vipParse(raw) {
    const s = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    const body = s.indexOf('KP') === 0 ? s.slice(2) : s;
    if (body.length !== 10) return null;
    for (let i = 0; i < body.length; i++) if (VIP_ALPHA.indexOf(body[i]) < 0) return null;
    const payload = body.slice(0, 6), sign = body.slice(6);
    const pi = VIP_ALPHA.indexOf(payload[0]);
    if (pi < 0 || pi >= VIP_PLAN_DAYS.length) return null;
    if (vipSign(payload) !== sign) return null;
    return { days: VIP_PLAN_DAYS[pi], plan: VIP_PLAN_NAME[pi] };
  }
  function vipOn() { return !!(S.vip && S.vip.until > Date.now()); }
  function vipLeftDays() { return vipOn() ? Math.ceil((S.vip.until - Date.now()) / DAY) : 0; }
  /* 会员每天第一次抽纸条免费 */
  function vipFreeLeft() {
    if (!vipOn()) return 0;
    return (S.vipFree && S.vipFree.d === todayStr() && S.vipFree.used) ? 0 : 1;
  }

  function vipSheet() {
    if (vipOn()) {
      const d = new Date(S.vip.until);
      const leftTxt = S.vip.plan === '长期' ? '长期有效' : '还剩 ' + vipLeftDays() + ' 天';
      sheet(`<h3>🎫 陪伴会员</h3>
        <div class="vip-card">
          <span class="vip-badge">VIP</span>
          <div><b>${esc(S.vip.plan || '会员')} · 生效中</b>
          <small>有效期至 ${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${leftTxt}</small></div>
        </div>
        <p class="muted tiny" style="text-align:center;margin:10px 0 0">续费方案见下方 · 兑换码由活动发放</p>
        <div class="vip-perk">
          <div><span>📝</span><b>每天免费抽 1 张小纸条</b></div>
          <div><span>📅</span><b>可自行设置打卡开始时间</b></div>
          <div><span>🖊️</span><b>忘了打卡？随时补签</b></div>
          <div><span>🗣️</span><b>社区里尊贵红名，字体更亮眼</b></div>
        </div>
        <div class="sheet-actions col" style="margin-top:14px">
          <button class="btn btn-ghost btn-lg" id="vipStart">📅 设置打卡开始时间</button>
          <button class="btn btn-ghost btn-lg" id="vipMakeup">🖊️ 补签打卡</button>
          <button class="btn btn-ghost btn-lg" id="vipAdd">输入兑换码续期</button>
          <button class="btn btn-ghost btn-lg" id="vipRestore">恢复购买</button>
          <button class="btn btn-primary btn-lg" id="vipOk">知道啦</button>
        </div>`);
      $('#vipOk').onclick = closeSheet;
      $('#vipAdd').onclick = () => vipInputSheet(true);
      $('#vipRestore').onclick = iapRestore;
      $('#vipStart').onclick = vipStartSheet;
      $('#vipMakeup').onclick = vipMakeupSheet;
      return;
    }
    vipInputSheet(false);
  }

  function vipInputSheet(hasCode) {
    sheet(`<h3>🎫 陪伴会员</h3>
      <p class="sheet-sub">${hasCode ? '再输一个新兑换码可续期叠加（每个码只能用一次）' : '每个兑换码只能用一次，兑换后立即生效'}</p>
      <div class="vip-price" id="vipBuy">
        <button class="vip-buy" data-sku="vip_month"><b>¥8</b><small>/ 月</small></button>
        <button class="vip-buy" data-sku="vip_year"><b>¥88</b><small>/ 年</small></button>
        <button class="vip-buy" data-sku="vip_forever"><b>¥188</b><small>/ 永久</small></button>
      </div>
      <div class="vip-perk">
        <div><span>📝</span><b>每天免费抽 1 张小纸条</b></div>
        <div><span>📅</span><b>可自行设置打卡开始时间</b></div>
        <div><span>🖊️</span><b>忘了打卡？随时补签</b></div>
        <div><span>🗣️</span><b>社区里尊贵红名，字体更亮眼</b></div>
      </div>
      <input class="vip-input" id="vipCode" placeholder="KP-XXXXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">
      <div class="sheet-actions col" style="margin-top:12px">
        <button class="btn btn-primary btn-lg" id="vipAct">兑换会员</button>
        <button class="btn btn-ghost btn-lg" id="vipRestore2">恢复购买</button>
        <button class="btn btn-ghost btn-lg" id="vipCancel">${hasCode ? '先不续' : '先看看'}</button>
      </div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">兑换码由活动发放 · 也可以直接点上方方案购买</p>`);

    const act = async () => {
      const el = $('#vipCode');
      const r = vipParse(el.value);
      if (!r) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 600);
        return toast('激活码不对，检查一下有没有输错', '⚠️');
      }
      const norm = String(el.value).toUpperCase().replace(/[^0-9A-Z]/g, '');
      /* 本机已用过的码，直接拒绝，不再请求云端 */
      if (S.vip && S.vip.code === norm) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 600);
        return toast('这个激活码你已经用过了，每个码只能用一次', '🚫');
      }
      const btn = $('#vipAct');
      btn.disabled = true;
      try {
        /* 一码一用：先在云端核销（用过就失效），成功才开通 */
        await sbSync().catch(() => {});
        const c = cloudId();
        const res = await sbRpc('pk_code_redeem', { p_uid: c.uid, p_token: c.token, p_code: norm });
        if (res && res.ok) {
          const base = Math.max(Date.now(), (S.vip && S.vip.until) || 0);
          S.vip = { until: base + r.days * DAY, code: norm, plan: r.plan };
          S.vipFree = { d: '', used: false };
          persist();
          render();
          toast(`开通成功，${r.plan}会员已生效`, '🎉');
          setTimeout(vipSheet, 500);
        } else if (res && res.err === 'used') {
          el.classList.add('shake');
          setTimeout(() => el.classList.remove('shake'), 600);
          toast('这个激活码已经被用过了，每个码只能用一次', '🚫');
        } else {
          toast('激活失败，稍后再试', '⚠️');
        }
      } catch (err) {
        toast('连不上云端，激活失败，检查网络', '📡');
      }
      btn.disabled = false;
    };
    $('#vipAct').onclick = act;
    $('#vipCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') act(); });
    $$('#vipBuy .vip-buy').forEach((b) => { b.onclick = () => iapBuy(b.dataset.sku); });
    $('#vipRestore2').onclick = iapRestore;
    $('#vipCancel').onclick = closeSheet;
  }

  /* ---------------- 自绘日历 ---------------- */
  const CAL_W = ['日', '一', '二', '三', '四', '五', '六'];

  /* 会员：自行设置打卡开始时间（日历单选） */
  let startCal = null;
  function vipStartSheet() {
    if (!vipOn()) return toast('这是会员功能，先去开通会员吧', '🎫');
    const rows = [['smoke', '🚬 戒烟', S.smoke], ['alcohol', '🍺 戒酒', S.alcohol], ['fit', '🏃 运动', S.fit]]
      .filter(([, , m]) => m && m.cfg && m.cfg.started);
    if (!rows.length) return toast('还没有开始的项目，先打卡一次再改', '📅');
    startCal = { mod: rows[0][0], y: new Date().getFullYear(), mo: new Date().getMonth(), sel: new Set() };
    renderStartCal();
  }
  function renderStartCal() {
    const rows = [['smoke', '🚬 戒烟'], ['alcohol', '🍺 戒酒'], ['fit', '🏃 运动']].filter(([k]) => S[k] && S[k].cfg && S[k].cfg.started);
    const st = startCal;
    const m = S[st.mod];
    const d = new Date(m.cfg.started);
    const cur = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    sheet(`<h3>📅 打卡开始时间</h3>
      <p class="sheet-sub">选哪天，就从哪天开始算天数（网页、手机版式一致）</p>
      <div class="cal-tabs">${rows.map(([k, nm]) => `<button class="cal-tab ${k === st.mod ? 'on' : ''}" data-ct="${k}">${nm}</button>`).join('')}</div>
      ${calHtml(st.mod, st, false)}
      <p class="cal-hint">当前开始：${cur} · 今天之前的日期可选</p>
      <div class="sheet-actions col" style="margin-top:10px">
        <button class="btn btn-primary btn-lg" id="stSave">保存</button>
        <button class="btn btn-ghost btn-lg" id="stCancel">取消</button>
      </div>`);
    $$('.cal-tab').forEach((b) => { b.onclick = () => { startCal.mod = b.dataset.ct; startCal.sel.clear(); renderStartCal(); }; });
    bindCal(st, renderStartCal, false);
    $('#stCancel').onclick = closeSheet;
    $('#stSave').onclick = () => {
      if (!st.sel.size) return toast('先在日历上选一天', '📅');
      const ds = [...st.sel][0];
      const t = new Date(ds + 'T00:00:00').getTime();
      const m = S[st.mod];
      if (t > Date.now()) return toast('不能选以后的日子', '📅');
      m.cfg.started = t;
      /* 开始日期变了，之前补签里早于新开始日的记录退回去 */
      const mk = S.makeup[st.mod] || [];
      const back = mk.filter((x) => new Date(x + 'T00:00:00').getTime() < t);
      if (back.length) {
        S.makeup[st.mod] = mk.filter((x) => !back.includes(x));
        m.total = Math.max(0, (m.total || 0) - back.length);
      }
      persist(); closeSheet(); render();
      toast(`${st.mod === 'smoke' ? '戒烟' : st.mod === 'alcohol' ? '戒酒' : '运动'}开始时间已改为 ${ds.slice(5).replace('-', ' 月 ')} 日`, '📅');
    };
  }

  /* 会员：补签打卡（日历多选未打卡的日期） */
  let mkCal = null;
  function vipMakeupSheet() {
    if (!vipOn()) return toast('这是会员功能，先去开通会员吧', '🎫');
    if (!S.makeup || typeof S.makeup !== 'object') S.makeup = { smoke: [], alcohol: [], fit: [] };
    const rows = [['smoke', '🚬 戒烟', S.smoke], ['alcohol', '🍺 戒酒', S.alcohol], ['fit', '🏃 运动', S.fit]]
      .filter(([, , m]) => m && m.cfg && m.cfg.started);
    if (!rows.length) return toast('还没有开始的项目，先打卡一次再来补签', '🖊️');
    const now = new Date();
    mkCal = { mod: rows[0][0], y: now.getFullYear(), mo: now.getMonth(), sel: new Set() };
    renderMakeupCal();
  }
  function renderMakeupCal() {
    const rows = [['smoke', '🚬 戒烟'], ['alcohol', '🍺 戒酒'], ['fit', '🏃 运动']].filter(([k]) => S[k] && S[k].cfg && S[k].cfg.started);
    const st = mkCal;
    const made = (S.makeup[st.mod] || []).length;
    sheet(`<h3>🖊️ 补签打卡</h3>
      <p class="sheet-sub">白格 = 没打卡的日子，点它选中（可多选），保存后每天打卡次数 +1</p>
      <div class="cal-tabs">${rows.map(([k, nm]) => `<button class="cal-tab ${k === st.mod ? 'on' : ''}" data-ct="${k}">${nm}</button>`).join('')}</div>
      ${calHtml(st.mod, st, true)}
      <p class="cal-hint">✅ = 已打卡 · 已补 ${made} 天${st.sel.size ? ` · 本次已选 ${st.sel.size} 天` : ''}</p>
      <div class="sheet-actions col" style="margin-top:10px">
        <button class="btn btn-primary btn-lg" id="mkSave">${st.sel.size ? `补上这 ${st.sel.size} 天` : '保存'}</button>
        <button class="btn btn-ghost btn-lg" id="mkCancel">取消</button>
      </div>`);
    $$('.cal-tab').forEach((b) => { b.onclick = () => { mkCal.mod = b.dataset.ct; mkCal.sel.clear(); renderMakeupCal(); }; });
    bindCal(st, renderMakeupCal, true);
    $('#mkCancel').onclick = closeSheet;
    $('#mkSave').onclick = () => {
      if (!st.sel.size) return toast('先点选没打卡的日子', '🗓️');
      const m = S[st.mod];
      if (!S.makeup[st.mod]) S.makeup[st.mod] = [];
      let n = 0;
      const ds = [...st.sel].sort();
      for (const d of ds) {
        const t = new Date(d + 'T00:00:00').getTime();
        if (t < m.cfg.started || t > Date.now()) continue;
        if ((m.days || []).includes(d) || S.makeup[st.mod].includes(d) || m.lastDate === d) continue;
        S.makeup[st.mod].push(d);
        m.total = (m.total || 0) + 1;
        n++;
      }
      persist(); closeSheet(); render();
      toast(n ? `补签成功 ${n} 天，打卡次数 +${n}` : '选的日子都打过了', n ? '🖊️' : '✅');
    };
  }

  /* 日历渲染 + 交互绑定（startT/makeup/days 决定格子状态） */
  function calHtml(mod, st, multi) {
    const m = S[mod];
    const startT = m.cfg.started ? new Date(m.cfg.started).setHours(0, 0, 0, 0) : Infinity;
    const doneSet = new Set([...(m.days || []), ...(S.makeup[mod] || []), m.lastDate].filter(Boolean));
    const y = st.y, mo = st.mo;
    const firstW = new Date(y, mo, 1).getDay();
    const dim = new Date(y, mo + 1, 0).getDate();
    const nowD = new Date(); const todayS = todayStr();
    const minT = Math.min(startT, nowD.getTime());
    const minY = new Date(minT).getFullYear(), minMo = new Date(minT).getMonth();
    let cells = CAL_W.map((w) => `<i class="cal-cell cal-w">${w}</i>`).join('');
    for (let i = 0; i < firstW; i++) cells += '<i class="cal-cell empty"></i>';
    for (let d = 1; d <= dim; d++) {
      const ds = `${y}-${pad2(mo + 1)}-${pad2(d)}`;
      const t = new Date(y, mo, d).getTime();
      let cls = 'cal-cell';
      if (doneSet.has(ds)) cls += ' done';
      else if (t < startT || t > Date.now()) cls += ' dis';
      else cls += ' miss';
      if (st.sel.has(ds)) cls += ' sel';
      cells += `<i class="${cls}" data-d="${ds}">${d}</i>`;
    }
    const canPrev = y > minY || (y === minY && mo > minMo);
    const canNext = y < nowD.getFullYear() || (y === nowD.getFullYear() && mo < nowD.getMonth());
    return `<div class="cal-box" data-multi="${multi ? 1 : 0}">
      <div class="cal-head">
        <button class="cal-nav" data-cnav="-1" ${canPrev ? '' : 'disabled'}>‹</button>
        <b>${y} 年 ${mo + 1} 月</b>
        <button class="cal-nav" data-cnav="1" ${canNext ? '' : 'disabled'}>›</button>
      </div>
      <div class="cal-grid">${cells}</div>
    </div>`;
  }
  function bindCal(st, rerender, multi) {
    $$('.cal-nav').forEach((b) => {
      b.onclick = () => {
        st.mo += parseInt(b.dataset.cnav, 10);
        if (st.mo < 0) { st.mo = 11; st.y--; }
        if (st.mo > 11) { st.mo = 0; st.y++; }
        rerender();
      };
    });
    $$('.cal-cell[data-d]').forEach((el) => {
      el.onclick = () => {
        const ds = el.dataset.d;
        const done = el.classList.contains('done');
        const dis = el.classList.contains('dis');
        if (dis) return toast('这个日期选不了', '🗓️');
        if (done) return toast('这一天已经打过卡啦', '✅');
        if (multi) {
          if (st.sel.has(ds)) { st.sel.delete(ds); el.classList.remove('sel'); }
          else { st.sel.add(ds); el.classList.add('sel'); }
          const hint = st.sel.size ? `本次已选 ${st.sel.size} 天` : '';
          const btn = $('#mkSave');
          if (btn) btn.textContent = st.sel.size ? `补上这 ${st.sel.size} 天` : '保存';
          const hEl = $('.cal-hint');
          if (hEl) hEl.innerHTML = `✅ = 已打卡 · 已补 ${(S.makeup[st.mod] || []).length} 天${hint ? ` · ${hint}` : ''}`;
        } else {
          $$('.cal-cell.sel').forEach((x) => x.classList.remove('sel'));
          st.sel.clear();
          st.sel.add(ds);
          el.classList.add('sel');
        }
      };
    });
  }

  /* ---------------- 好友（Supabase 云端） ---------------- */
  const SB_URL = 'https://urvoelbmqdlkbdicthlc.supabase.co';
  const SB_KEY = 'sb_publishable_4FL01kCrZydQ3Zl0UbaLgg_vKJdvI3P';

  function cloudId() {
    if (!S.cloud || typeof S.cloud !== 'object' || !S.cloud.uid) {
      const r = () => Math.random().toString(36).slice(2, 10);
      S.cloud = { uid: 'u' + Date.now().toString(36) + r(), token: r() + r() + r() };
      persist();
    }
    return S.cloud;
  }
  async function sbRpc(fn, args) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {}),
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(timer); }
  }
  function myDays() {
    const dd = (m) => (m && m.cfg && m.cfg.started) ? Math.max(0, Math.floor((Date.now() - m.cfg.started) / DAY)) : 0;
    return { smoke: dd(S.smoke), alcohol: dd(S.alcohol), fit: dd(S.fit) };
  }
  async function sbSync() {
    const c = cloudId(), d = myDays();
    return sbRpc('pk_upsert', {
      p_uid: c.uid, p_token: c.token, p_nick: String(S.nickname || '匿名玩家').slice(0, 20),
      p_avatar: S.avatar || '🐣', p_smoke: d.smoke, p_alcohol: d.alcohol, p_fit: d.fit,
      p_gender: S.gender === 'girl' ? 'girl' : 'boy', p_vip: vipOn(),
    });
  }
  const genderMark = (g) => g === 'girl' ? '<i class="g-mark g-girl">♀</i>' : g === 'boy' ? '<i class="g-mark g-boy">♂</i>' : '';
  const nameHtml = (p, cls) => `<b class="${cls || ''}${p.vip ? ' vip-name' : ''}">${esc(p.nickname)}${p.vip ? ' <span class="vip-mini">VIP</span>' : ''}</b>`;

  /* 打开和某人的私信聊天（全屏层） */
  let dmTimer = null, dmPeer = null;
  async function openDm(peer) {
    const c = cloudId();
    dmPeer = peer;
    const ov = document.createElement('div');
    ov.className = 'chat-ov';
    ov.id = 'dmView';
    ov.innerHTML = `
      <div class="chat-top">
        <button class="chat-back" id="dmBack">←</button>
        <div class="chat-title">${esc(peer.avatar || '🐣')} ${esc(peer.nickname)}</div>
      </div>
      <div class="chat-body" id="dmBody"><p class="muted tiny" style="text-align:center">加载中…</p></div>
      <div class="chat-input">
        <input id="dmText" maxlength="200" placeholder="说点什么…" autocomplete="off">
        <button id="dmSend">发送</button>
      </div>`;
    document.body.appendChild(ov);
    const body = $('#dmBody');
    let lastId = 0;
    const load = async () => {
      try {
        const arr = await sbRpc('pk_dm_fetch', { p_uid: c.uid, p_token: c.token, p_with: peer.uid });
        const msgs = (arr || []).slice().reverse();
        if (!msgs.length && lastId === 0) { body.innerHTML = '<p class="muted tiny" style="text-align:center;margin-top:30px">还没有聊过，打个招呼吧～</p>'; return; }
        if (msgs.length && msgs[msgs.length - 1].mid === lastId) return;
        lastId = msgs.length ? msgs[msgs.length - 1].mid : 0;
        dmMarkRead(peer.uid, lastId);
        const myUid = c.uid;
        body.innerHTML = msgs.map((m) => `
          <div class="chat-msg ${m.sender === myUid ? 'mine' : ''}">
            ${m.sender === myUid ? '' : `<span class="chat-ava">${esc(peer.avatar || '🐣')}</span>`}
            <div class="chat-bub ${m.sender === myUid ? '' : 'them'}"><b class="${peer.vip ? 'vip-text' : ''}">${esc(m.body)}</b></div>
          </div>`).join('');
        body.scrollTop = body.scrollHeight;
      } catch (err) {
        body.innerHTML = '<p class="muted tiny" style="text-align:center;margin-top:30px">连不上云端，稍后再试</p>';
      }
    };
    await load();
    dmTimer = setInterval(load, 4000);
    $('#dmBack').onclick = () => { clearInterval(dmTimer); dmTimer = null; ov.remove(); };
    const send = async () => {
      const el = $('#dmText');
      const t = el.value.trim();
      if (!t) return;
      el.value = '';
      try {
        const r = await sbRpc('pk_dm_send', { p_uid: c.uid, p_token: c.token, p_to: peer.uid, p_body: t });
        if (r && r.ok) { load(); }
        else if (r && r.err === 'blocked') { toast('你已被对方拉黑，发不出去', '🚫'); }
        else if (r && r.err === 'self') { toast('这是你自己呀', '🙃'); }
        else { toast('没发出去，再试一次', '⚠️'); el.value = t; }
      } catch (err) { toast('网络不太顺，再试一次', '📡'); el.value = t; }
    };
    $('#dmSend').onclick = send;
    $('#dmText').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  /* 拉黑 / 取消拉黑 */
  async function toggleBlock(peer, block) {
    const c = cloudId();
    try {
      await sbRpc(block ? 'pk_block' : 'pk_unblock', { p_uid: c.uid, p_token: c.token, p_target: peer.uid });
      toast(block ? `已拉黑 ${peer.nickname}，不再收到TA的私信` : `已取消拉黑 ${peer.nickname}`, block ? '🚫' : '✅');
      return true;
    } catch (err) { toast('网络不太顺，再试一次', '📡'); return false; }
  }

  function frRow(p, act) {
    const t = [];
    if (p.smoke_days) t.push('🚬 ' + p.smoke_days + ' 天');
    if (p.alcohol_days) t.push('🍺 ' + p.alcohol_days + ' 天');
    if (p.fit_days) t.push('🏃 ' + p.fit_days + ' 天');
    const nm = `<b class="fn${p.vip ? ' vip-name' : ''}"><span class="fn-t">${esc(p.nickname)}</span>${p.vip ? '<span class="vip-mini">VIP</span>' : ''}</b>`;
    return `<div class="fr-row">
      <span class="fr-ava">${esc(p.avatar || '🐣')}</span>
      <div class="fr-main">
        <div class="fr-line1">${nm}${act || ''}</div>
        <div class="fr-days">${genderMark(p.gender)} ${t.length ? t.join('　') : '<span>还没开始打卡</span>'}</div>
      </div>
    </div>`;
  }

  async function friendsSheet() {
    const c = cloudId(), d = myDays();
    sheet(`<h3>👥 游戏好友</h3>
      <p class="sheet-sub">搜昵称加好友，看对方坚持了多少天</p>
      <div class="fr-me">
        <span class="fr-ava">${esc(S.avatar || '🐣')}</span>
        <div class="fr-info">${nameHtml({ nickname: S.nickname || '匿名玩家', vip: vipOn() })}<small>${genderMark(S.gender)} 🚬 ${d.smoke} 天 · 🍺 ${d.alcohol} 天 · 🏃 ${d.fit} 天</small></div>
      </div>
      <div class="fr-search">
        <input id="frQ" placeholder="输入好友昵称" autocomplete="off">
        <button id="frGo">搜索</button>
      </div>
      <div id="frResult"></div>
      <p class="fr-tip">好友列表</p>
      <div id="frList"><p class="muted tiny">正在连接云端…</p></div>`);

    const listEl = $('#frList'), resEl = $('#frResult');
    const drawList = (arr) => {
      if (!arr || !arr.length) { listEl.innerHTML = '<p class="muted tiny">还没有好友，上面搜昵称加一个吧</p>'; return; }
      listEl.innerHTML = arr.map((p) => frRow(p, `<span class="fr-acts"><button class="fr-btn" data-dm="${esc(p.uid)}">💬 私信</button><button class="fr-btn ghost" data-block="${esc(p.uid)}">🚫 拉黑</button><button class="fr-btn ghost" data-del="${esc(p.uid)}">移除</button></span>`)).join('');
      listEl.querySelectorAll('[data-dm]').forEach((b) => {
        b.onclick = () => {
          const p = (arr || []).find((x) => x.uid === b.dataset.dm);
          if (p) { closeSheet(); openDm(p); }
        };
      });
      listEl.querySelectorAll('[data-block]').forEach((b) => {
        b.onclick = async () => {
          const p = (arr || []).find((x) => x.uid === b.dataset.block);
          if (!p) return;
          if (b.dataset.on === '1') {
            if (await toggleBlock(p, false)) { b.textContent = '🚫 拉黑'; b.dataset.on = ''; }
          } else {
            if (await toggleBlock(p, true)) { b.textContent = '✅ 已拉黑'; b.dataset.on = '1'; }
          }
        };
      });
      listEl.querySelectorAll('[data-del]').forEach((b) => {
        b.onclick = async () => {
          try {
            await sbRpc('pk_del_friend', { p_uid: c.uid, p_token: c.token, p_friend: b.dataset.del });
            toast('已移除', '👋'); load();
          } catch (err) { toast('网络不太顺，再试一次', '📡'); }
        };
      });
    };
    const load = async () => {
      try {
        await sbSync();
        const arr = await sbRpc('pk_my_friends', { p_uid: c.uid, p_token: c.token });
        drawList(arr);
      } catch (err) {
        listEl.innerHTML = '<p class="muted tiny">连不上云端，检查一下网络再试</p>';
      }
    };
    const doSearch = async () => {
      const q = $('#frQ').value.trim();
      if (!q) return toast('先输个昵称', '⌨️');
      resEl.innerHTML = '<p class="muted tiny">搜索中…</p>';
      try {
        const arr = await sbRpc('pk_search', { p_q: q });
        if (!arr || !arr.length) {
          resEl.innerHTML = '<p class="muted tiny">没找到这个人，让对方先打开一次游戏吧</p>';
          return;
        }
        resEl.innerHTML = arr.map((p) => frRow(p, `<button class="fr-btn" data-add="${esc(p.uid)}">＋ 添加</button>`)).join('');
        resEl.querySelectorAll('[data-add]').forEach((b) => {
          b.onclick = async () => {
            try {
              const r = await sbRpc('pk_add_friend', { p_uid: c.uid, p_token: c.token, p_friend: b.dataset.add });
              if (r && r.ok) { toast('加好啦', '🤝'); b.textContent = '已添加'; b.disabled = true; load(); }
              else if (r && r.err === 'self') toast('这是你自己呀', '🙃');
              else toast('没加上，再试一次', '⚠️');
            } catch (err) { toast('网络不太顺，再试一次', '📡'); }
          };
        });
      } catch (err) {
        resEl.innerHTML = '<p class="muted tiny">连不上云端，检查一下网络再试</p>';
      }
    };
    $('#frGo').onclick = doSearch;
    $('#frQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    load();
    /* 好友数据每 20 秒自动刷新（对方一更新这边就能看到） */
    const auto = setInterval(() => { if (!$('#frList')) clearInterval(auto); else load(); }, 20000);
  }

  /* ---------------- 顶栏私信提醒（铃铛） ---------------- */
  let dmLatest = [];
  async function dmCheck() {
    const bell = $('#dmBell');
    if (!bell || !$('#app') || $('#app').classList.contains('hidden')) return;
    try {
      const c = cloudId();
      const arr = await sbRpc('pk_dm_latest', { p_uid: c.uid, p_token: c.token });
      dmLatest = arr || [];
      if (!S.dmRead || typeof S.dmRead !== 'object') S.dmRead = {};
      const unread = dmLatest.filter((m) => (S.dmRead[m.sender] || 0) < m.mid).length;
      /* 信封常驻显示，有新消息才闪烁 + 显示红点数字 */
      bell.classList.remove('hidden');
      bell.classList.toggle('dm-blink', unread > 0);
      bell.dataset.n = unread;
    } catch (err) { /* 静默 */ }
  }
  function dmMarkRead(uid, mid) {
    if (!S.dmRead || typeof S.dmRead !== 'object') S.dmRead = {};
    if ((S.dmRead[uid] || 0) < mid) { S.dmRead[uid] = mid; persist(); }
    dmCheck();
  }
  function dmBellSheet() {
    if (!dmLatest.length) return toast('还没有收到私信', '✉️');
    if (!S.dmRead || typeof S.dmRead !== 'object') S.dmRead = {};
    sheet(`<h3>✉️ 私信</h3>
      <div class="dm-latest">${dmLatest.map((m) => {
        const unread = (S.dmRead[m.sender] || 0) < m.mid;
        return `<div class="fr-row dm-row">
          <button class="dm-open" data-dml="${esc(m.sender)}">
            <span class="fr-ava">${esc(m.avatar || '🐣')}</span>
            <div class="fr-info"><b class="${m.vip ? 'vip-name' : ''}">${esc(m.nickname)}${m.vip ? ' <span class="vip-mini">VIP</span>' : ''}</b><small>${genderMark(m.gender)} ${esc(m.body).slice(0, 24)}</small></div>
            ${unread ? '<span class="dm-dot">新</span>' : ''}
          </button>
          <button class="dm-del" data-dmdel="${esc(m.sender)}" title="删除聊天记录">删</button>
        </div>`;
      }).join('')}</div>`);
    $$('[data-dml]').forEach((b) => {
      b.onclick = () => {
        const peer = dmLatest.find((m) => m.sender === b.dataset.dml);
        if (!peer) return;
        closeSheet();
        openDm({ uid: peer.sender, nickname: peer.nickname, avatar: peer.avatar, gender: peer.gender, vip: peer.vip });
      };
    });
    $$('[data-dmdel]').forEach((b) => {
      b.onclick = () => {
        const peer = dmLatest.find((m) => m.sender === b.dataset.dmdel);
        if (!peer) return;
        sheet(`<h3>删除聊天记录</h3>
          <p class="sheet-sub">只会删除你自己这边的记录，和「${esc(peer.nickname)}」的聊天会从私信列表消失。确定删除吗？</p>
          <div class="sheet-actions">
            <button class="btn btn-ghost" id="dmDelNo">再想想</button>
            <button class="btn btn-primary" id="dmDelYes">确认删除</button>
          </div>`);
        $('#dmDelNo').onclick = () => dmBellSheet();
        $('#dmDelYes').onclick = async () => {
          try {
            const c = cloudId();
            const r = await sbRpc('pk_dm_clear', { p_uid: c.uid, p_token: c.token, p_with: peer.sender });
            if (r && r.ok) {
              if (S.dmRead && S.dmRead[peer.sender] !== undefined) { delete S.dmRead[peer.sender]; persist(); }
              dmLatest = dmLatest.filter((x) => x.sender !== peer.sender);
              await dmCheck();
              if (dmLatest.length) dmBellSheet();
              else { closeSheet(); toast('聊天记录已删除', '✅'); }
            } else { dmBellSheet(); toast('没删掉，再试一次', '⚠️'); }
          } catch (err) { dmBellSheet(); toast('网络不太顺，再试一次', '📡'); }
        };
      };
    });
  }

  /* ---------------- 佩奇社区（三个独立群：戒烟 / 戒酒 / 运动） ---------------- */
  const COMM_META = {
    smoke: { ico: '🚭', name: '戒烟互助群', desc: '和一起戒烟的伙伴聊聊天，互相打打气' },
    alcohol: { ico: '🚫', name: '戒酒互助群', desc: '和一起戒酒的伙伴聊聊天，互相打打气' },
    fit: { ico: '🏃', name: '运动打卡群', desc: '和一起运动的伙伴聊聊天，互相打打气' },
  };
  function communityCard(mod) {
    const mt = COMM_META[mod] || COMM_META.smoke;
    return `<div class="card comm-card">
      <div class="comm-info"><b>${mt.name}</b><small>${mt.desc}</small></div>
      <button class="btn btn-primary sm" id="commEnter" data-mod="${mod}">进入</button>
    </div>`;
  }

  let commTimer = null;
  async function communityView(mod) {
    if ($('#communityOv')) return;
    const mt = COMM_META[mod] || COMM_META.smoke;
    const c = cloudId();
    const ov = document.createElement('div');
    ov.className = 'comm-ov';
    ov.id = 'communityOv';
    ov.innerHTML = `
      <div class="chat-top">
        <button class="chat-back" id="commBack">←</button>
        <div class="chat-title">${mt.name}</div>
        <button class="chat-menu" id="commMenu">☰</button>
      </div>
      <div class="chat-body" id="commBody"><p class="muted tiny" style="text-align:center;margin-top:30px">正在进入社区…</p></div>
      <div class="comm-menu-panel hidden" id="commPanel">
        <button id="cpMembers">👀 查看社区成员</button>
        <button id="cpLeave">🚪 退出社区</button>
      </div>
      <div class="comm-members hidden" id="commMembers"></div>
      <div class="chat-input">
        <input id="commText" maxlength="200" placeholder="和大家聊聊今天的坚持…" autocomplete="off">
        <button id="commSend">发送</button>
      </div>`;
    document.body.appendChild(ov);
    const body = $('#commBody'), panel = $('#commPanel'), mpanel = $('#commMembers');
    let lastId = 0;

    /* 加入（先上报资料确保云端有记录，再进群；失败自动重试） */
    body.innerHTML = '<p class="muted tiny" style="text-align:center;margin-top:30px">正在进入社区…</p>';
    let joined = false;
    for (let i = 0; i < 3 && !joined; i++) {
      try {
        await sbSync().catch(() => {});
        const r = await sbRpc('pk_join_community', { p_uid: c.uid, p_token: c.token, p_module: mod });
        if (r && r.ok) joined = true;
        else await new Promise((res) => setTimeout(res, 1000));
      } catch (err) { await new Promise((res) => setTimeout(res, 1200)); }
    }
    if (!joined) { body.innerHTML = '<p class="muted tiny" style="text-align:center;margin-top:30px">进不去社区，稍后再试</p>'; }

    const esc2 = esc;
    const drawMsgs = (arr) => {
      if (!arr || !arr.length) return;
      let html = '';
      for (const m of arr) {
        if (m.mid <= lastId) continue;
        lastId = m.mid;
        const mine = m.uid === c.uid;
        const who = mine ? { nickname: S.nickname || '我', avatar: S.avatar || '🐣', gender: S.gender, vip: vipOn() } : m;
        html += `<div class="chat-msg ${mine ? 'mine' : ''}">
          <span class="chat-ava">${esc2(who.avatar || '🐣')}</span>
          <div class="msg-col">
            <div class="chat-who ${mine ? 'r' : ''}">${nameHtml(who)}${genderMark(who.gender)}</div>
            <div class="chat-bub ${mine ? 'mine-bub' : 'them'} ${m.vip ? 'vip-text' : ''}">${esc2(m.body)}</div>
          </div>
        </div>`;
      }
      if (html) { body.insertAdjacentHTML('beforeend', html); body.scrollTop = body.scrollHeight; }
    };
    const load = async () => {
      try {
        const arr = await sbRpc('pk_chat_fetch', { p_module: mod, p_since: lastId });
        if (lastId === 0) body.innerHTML = '';
        drawMsgs((arr || []).slice().reverse());
        if (lastId === 0) body.innerHTML = '<p class="muted tiny" style="text-align:center;margin-top:30px">还没有人说话，来打个招呼吧～</p>';
      } catch (err) { /* 静默重试 */ }
    };
    await load();
    commTimer = setInterval(load, 4000);

    $('#commBack').onclick = () => {   /* 返回只是收起，不退出社区 */
      clearInterval(commTimer); commTimer = null;
      ov.remove();
    };
    $('#commMenu').onclick = () => panel.classList.toggle('hidden');
    panel.addEventListener('click', (e) => { if (e.target === panel) panel.classList.add('hidden'); });

    $('#cpLeave').onclick = async () => {
      try {
        await sbRpc('pk_leave_community', { p_uid: c.uid, p_token: c.token, p_module: mod });
        clearInterval(commTimer); commTimer = null;
        ov.remove();
        toast(`已退出${mt.name}，下次随时再进`, '👋');
      } catch (err) { toast('网络不太顺，再试一次', '📡'); }
    };

    $('#cpMembers').onclick = async () => {
      panel.classList.add('hidden');
      mpanel.classList.remove('hidden');
      mpanel.innerHTML = '<p class="muted tiny" style="text-align:center;padding:20px 0">加载中…</p>';
      try {
        const [members, blocks] = await Promise.all([
          sbRpc('pk_member_list', { p_module: mod }),
          sbRpc('pk_block_list', { p_uid: c.uid, p_token: c.token }).catch(() => []),
        ]);
        const blocked = new Set((blocks || []).map((b) => b.blocked_uid));
        if (!members || !members.length) { mpanel.innerHTML = '<p class="muted tiny" style="text-align:center;padding:20px 0">社区里还没有人</p>'; return; }
        mpanel.innerHTML = `<div class="cm-top"><b>社区成员（${members.length}）</b><button id="cmClose">收起</button></div>` +
          members.map((m) => {
            const me = m.uid === c.uid;
            const isBlocked = blocked.has(m.uid);
            return `<div class="fr-row">
              <span class="fr-ava">${esc(m.avatar || '🐣')}</span>
              <div class="fr-info">${nameHtml(m)}${me ? ' <small>(我)</small>' : ''}<small>${genderMark(m.gender)} ${m.vip ? '尊贵会员' : '小伙伴'}</small></div>
              ${me ? '' : `<span class="fr-acts">
                <button class="fr-btn" data-cm-dm="${esc(m.uid)}">💬 私信</button>
                <button class="fr-btn" data-cm-add="${esc(m.uid)}">＋ 好友</button>
                <button class="fr-btn ghost" data-cm-blk="${esc(m.uid)}">${isBlocked ? '✅ 已拉黑' : '🚫 拉黑'}</button>
              </span>`}
            </div>`;
          }).join('');
        $('#cmClose').onclick = () => mpanel.classList.add('hidden');
        const findM = (uid) => (members || []).find((x) => x.uid === uid);
        mpanel.querySelectorAll('[data-cm-dm]').forEach((b) => {
          b.onclick = () => { const p = findM(b.dataset.cmDm); if (p) { mpanel.classList.add('hidden'); openDm(p); } };
        });
        mpanel.querySelectorAll('[data-cm-add]').forEach((b) => {
          b.onclick = async () => {
            try {
              const r = await sbRpc('pk_add_friend', { p_uid: c.uid, p_token: c.token, p_friend: b.dataset.cmAdd });
              if (r && r.ok) { toast('加好啦', '🤝'); b.textContent = '已添加'; b.disabled = true; }
              else if (r && r.err === 'self') toast('这是你自己呀', '🙃');
              else toast('没加上，再试一次', '⚠️');
            } catch (err) { toast('网络不太顺，再试一次', '📡'); }
          };
        });
        mpanel.querySelectorAll('[data-cm-blk]').forEach((b) => {
          b.onclick = async () => {
            const p = findM(b.dataset.cmBlk);
            if (!p) return;
            if (b.dataset.on === '1') {
              if (await toggleBlock(p, false)) { b.textContent = '🚫 拉黑'; b.dataset.on = ''; }
            } else {
              if (await toggleBlock(p, true)) { b.textContent = '✅ 已拉黑'; b.dataset.on = '1'; }
            }
          };
        });
      } catch (err) {
        mpanel.innerHTML = '<p class="muted tiny" style="text-align:center;padding:20px 0">连不上云端，稍后再试</p>';
      }
    };

    const send = async () => {
      const el = $('#commText');
      const t = el.value.trim();
      if (!t) return;
      el.value = '';
      try {
        const r = await sbRpc('pk_chat_send', { p_uid: c.uid, p_token: c.token, p_module: mod, p_body: t });
        if (r && r.ok) load();
        else { toast('没发出去，再试一次', '⚠️'); el.value = t; }
      } catch (err) { toast('网络不太顺，再试一次', '📡'); el.value = t; }
    };
    $('#commSend').onclick = send;
    $('#commText').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }


  async function copyLink() {
    const ok = await copyText(gameUrl());
    closeSheet();
    toast(ok ? '链接已复制，粘贴给好友就能打开' : '复制失败，长按地址栏手动复制', ok ? '🔗' : '⚠️');
  }
  /* ---------------- 动画 ---------------- */
  function heartsBurst(host) {
    if (!host) return;
    const icons = ['💖', '💗', '💕', '❤️', '💞', '💓', '💝'];
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('span');
      s.className = 'heart-pop';
      s.textContent = icons[i % icons.length];
      s.style.left = (50 + (Math.random() * 34 - 17)).toFixed(1) + '%';
      s.style.fontSize = (14 + Math.random() * 12).toFixed(0) + 'px';
      s.style.setProperty('--dx', (Math.random() * 110 - 55).toFixed(0) + 'px');
      s.style.animationDelay = (i * 75) + 'ms';
      host.appendChild(s);
      setTimeout(() => s.remove(), 2100);
    }
  }
  function anim(el, cls) {
    if (!el) return;
    /* 躺在床上睡觉的小朋友：不做跳/扑等位移动作，只轻轻晃一晃回应 */
    if (el.classList.contains('bed-kid')) cls = 'shake';
    el.classList.remove('jump', 'shake', 'nod', 'eat');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 900);
  }

  /* ---------------- 主渲染 ---------------- */
  function render() {
    /* 顶部积分徽章已移除（挡住昵称和 VIP 标识） */
    const nb = $('#nickBtn');
    if (nb) {
      nb.innerHTML = `<span class="nk-t">${esc(S.nickname || '未命名')}</span>` + (vipOn() ? ' <span class="vip-mini">VIP</span>' : '');
      nb.classList.toggle('vip-name', vipOn());
      nb.title = '点击修改昵称';
    }
    if (tab === 'smoke') renderSmoke();
    else if (tab === 'alcohol') renderAlcohol();
    else if (tab === 'fit') renderFit();
    else renderPeki();
    $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  }

  function openNickEdit() {
    if (!S) return;
    sheet(`<h3>✏️ 修改昵称</h3>
      <p class="sheet-sub">昵称会显示在顶栏标题旁边，随时可以再改</p>
      <div class="form"><label>昵称</label>
        <input id="nickInput" maxlength="12" value="${esc(S.nickname || '')}" placeholder="给自己起个名字"></div>
      <button class="btn btn-primary btn-lg" id="nickSave" style="margin-top:14px">保存昵称</button>`);
    const inp = $('#nickInput');
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    $('#nickSave').onclick = () => {
      const v = inp.value.trim();
      if (!v) return toast('昵称不能为空', '✏️');
      S.nickname = v;
      persist();
      closeSheet();
      const nb2 = $('#nickBtn');
      if (nb2) {
        nb2.innerHTML = `<span class="nk-t">${esc(S.nickname || '未命名')}</span>` + (vipOn() ? ' <span class="vip-mini">VIP</span>' : '');
        nb2.classList.toggle('vip-name', vipOn());
      }
      toast('昵称已更新', '✏️');
    };
  }

  function boot() {
    loadDB();
    $('#pekiIco').innerHTML = QuitArt.pekiAvatar();
    $('#wxLogin').addEventListener('click', openWxAuth);
    const acl = $('#acctLogin');
    if (acl) acl.addEventListener('click', () => openAcctLogin());
    $$('.tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
    $('#nickBtn').addEventListener('click', openNickEdit);
    /* 佩奇社区进入按钮（三个群各自独立，事件委托） */
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('#commEnter');
      if (btn) { communityView(btn.dataset.mod || 'smoke'); }
    });
    $('#menuBtn').addEventListener('click', () => {
      const isAndroid = /Android/i.test(navigator.userAgent);
      sheet(`<h3>${esc(S.nickname || '我')} 的菜单</h3>
        <p class="sheet-sub">分享给朋友，或管理当前账号</p>
        <div class="menu-list">
          <button class="menu-row" id="mFriends"><span>👥</span><div><b>游戏好友</b><small>搜昵称加好友，看对方坚持了多久</small></div></button>
          <button class="menu-row" id="mShare"><span>🔗</span><div><b>分享链接</b><small>复制网页链接或安装包链接</small></div></button>
          <button class="menu-row" id="mVip"><span>🎫</span><div><b>会员中心</b><small>${vipOn() ? '已开通 · 还剩 ' + vipLeftDays() + ' 天' : '购买或兑换开通'}</small></div></button>
          <button class="menu-row" id="mAccount"><span>🔑</span><div><b>${S.acct ? '我的账号' : '账号密码登录'}</b><small>${S.acct ? esc(S.acct) + ' · 换手机可找回记录' : '登录后换手机也能找回打卡记录'}</small></div></button>
          <button class="menu-row danger" id="mLogout"><span>🚪</span><div><b>退出登录</b><small>记录会保留，可重新登录</small></div></button>
        </div>`);
      $('#mShare').onclick = shareSheet;
      $('#mVip').onclick = vipSheet;
      $('#mAccount').onclick = () => { if (S.acct) accountSheet(); else openAcctLogin(); };
      $('#mFriends').onclick = friendsSheet;
      $('#mLogout').onclick = logout;
    });
    $('#musicBtn').addEventListener('click', () => {
      if (!window.QuitMusic) return;
      const on = !QuitMusic.enabled();
      QuitMusic.setEnabled(on);
      if (on) QuitMusic.play(); else QuitMusic.stop();
      toast(on ? '音乐已开启' : '音乐已关闭', '🎵');
    });
    // 数据持续刷新（每分钟）
    setInterval(() => {
      if (!S) return;
      if (tab === 'peki') { updatePekiBtns(); return; }
      const ae = document.activeElement;
      if (ae && ae.tagName === 'INPUT') return;
      if ($('.sheet-mask')) return;
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
    }, 10000);
    // 佩奇按钮冷却倒计时
    setInterval(() => { if (S && tab === 'peki' && !$('.sheet-mask')) updatePekiBtns(); }, 1000);

    const cur = DB.current && DB.accounts[DB.current];
    if (cur) { S = fixSave(cur); enterApp(); } else showLogin();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
