/* 戒烟戒酒跟我走 · 背景音乐（钢琴版 卡农 Canon in D，公版曲，原生循环播放）
   不再用 Web Audio 实时合成 —— 直接播放本地 mp3，彻底没有电流/滋滋声。 */
(function (global) {
  const PREF_KEY = 'quitwalk_music';
  const el = document.getElementById('bgm');
  if (!el) return;
  el.loop = true;
  el.volume = 0;
  const TARGET = 0.42;
  let fadeTimer = null;
  let playing = false;

  function fadeTo(target, ms, done) {
    if (fadeTimer) clearInterval(fadeTimer);
    const start = el.volume, steps = Math.max(1, Math.round(ms / 40));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      el.volume = Math.max(0, Math.min(1, start + (target - start) * (i / steps)));
      if (i >= steps) {
        clearInterval(fadeTimer); fadeTimer = null;
        if (done) done();
      }
    }, 40);
  }

  function play() {
    if (playing) return;
    playing = true;
    el.volume = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => { /* 需要用户手势，稍后自动重试 */ });
    fadeTo(TARGET, 1200);
  }

  function stop() {
    playing = false;
    fadeTo(0, 400, () => { try { el.pause(); } catch (e) {} });
  }

  function enabled() { return localStorage.getItem(PREF_KEY) !== '0'; }
  function setEnabled(v) { localStorage.setItem(PREF_KEY, v ? '1' : '0'); }

  // 浏览器自动播放限制：首次交互后再尝试
  document.addEventListener('pointerdown', () => {
    if (enabled() && playing && el.paused) el.play().catch(() => {});
  }, { passive: true });

  global.QuitMusic = { play, stop, enabled, setEnabled };
})(window);
