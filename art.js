/* 戒烟戒酒跟我走 · 角色与场景（Q版可爱风 · 油画感场景） */
(function (global) {

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /* ---------------- 小朋友（正面站姿 · 连体衣 · 短腿） ----------------
     stage: 0 疲惫+黑眼圈 1 显老 2 年轻 3 精神焕发（帅/漂亮）
     body: normal | fat | thin      iv: 输液吊瓶 */
  function kid(cfg) {
    const o = Object.assign({ gender: 'boy', stage: 2, body: 'normal', iv: false, scale: 1, shirt: '#8fd6b8', hairC: '#3d3244' }, cfg);
    const st = o.stage;
    const skin = ['#f0dcb8', '#f6e4c6', '#ffe8cc', '#ffeed8'][st];
    const skinDk = shade(skin, -26);
    const hair = o.hairC, hairDk = shade(hair, -34);
    const cloth = o.shirt, clothDk = shade(cloth, -42);
    const clothLt = shade(cloth, 22);

    /* ---- 身体（一件式 · 短腿收成两个黑色圆球脚） ---- */
    const shoe = (x, r) => `<circle cx="${x}" cy="${-r}" r="${r}" fill="#2b2432" stroke="#191420" stroke-width="2.4"/>
      <ellipse cx="${x - r * 0.32}" cy="${-r - r * 0.32}" rx="${r * 0.3}" ry="${r * 0.2}" fill="#ffffff" opacity=".24"/>`;
    let body = '';
    if (o.body === 'fat') {
      body = `<ellipse cx="0" cy="-46" rx="40" ry="34" fill="${cloth}" stroke="${clothDk}" stroke-width="3"/>
        <path d="M-16 -60 q16 9 32 0" stroke="${clothLt}" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>
        ${shoe(-16, 11)}${shoe(16, 11)}`;
    } else if (o.body === 'thin') {
      body = `<path d="M-12 -86 q12 -5 24 0 L-8 -18 L8 -18 Z" fill="${cloth}" stroke="${clothDk}" stroke-width="3" stroke-linejoin="round"/>
        ${shoe(-7, 7.4)}${shoe(7, 7.4)}`;
    } else {
      body = `<rect x="-19" y="-84" width="38" height="62" rx="18" fill="${cloth}" stroke="${clothDk}" stroke-width="3"/>
        <path d="M-14 -74 q14 6 28 0" stroke="${clothLt}" stroke-width="3.4" fill="none" opacity=".9" stroke-linecap="round"/>
        <circle cx="0" cy="-58" r="2" fill="${clothDk}" opacity=".45"/>
        <circle cx="0" cy="-48" r="2" fill="${clothDk}" opacity=".45"/>
        ${shoe(-11.5, 10)}${shoe(11.5, 10)}`;
    }
    const arms = `<path d="M-20 -72 q-13 5 -14 20" stroke="${cloth}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M20 -72 q13 5 14 20" stroke="${cloth}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="-35" cy="-51" r="6" fill="${skin}" stroke="${skinDk}" stroke-width="2.4"/>
      <circle cx="35" cy="-51" r="6" fill="${skin}" stroke="${skinDk}" stroke-width="2.4"/>`;

    /* ---- 脸 ---- */
    const ey = -98;
    let face = '';
    if (st === 0) {
      face += `<path d="M-19 -98 q5 4 10 0" stroke="#4a3a42" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M9 -98 q5 4 10 0" stroke="#4a3a42" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse cx="-14" cy="-91" rx="6.5" ry="2.6" fill="#9c7a8a" opacity=".45"/>
        <ellipse cx="14" cy="-91" rx="6.5" ry="2.6" fill="#9c7a8a" opacity=".45"/>`;
    } else if (st === 3) {
      face += `<ellipse cx="-14" cy="${ey}" rx="6.2" ry="7" fill="#3a2c36"/>
        <circle cx="-16" cy="${ey - 2.4}" r="2.4" fill="#fff"/><circle cx="-11.6" cy="${ey + 2.6}" r="1.2" fill="#fff"/>
        <ellipse cx="14" cy="${ey}" rx="6.2" ry="7" fill="#3a2c36"/>
        <circle cx="12" cy="${ey - 2.4}" r="2.4" fill="#fff"/><circle cx="16.4" cy="${ey + 2.6}" r="1.2" fill="#fff"/>`;
    } else {
      face += `<circle cx="-14" cy="${ey}" r="5" fill="#3a2c36"/><circle cx="-15.6" cy="${ey - 1.8}" r="1.8" fill="#fff"/>
        <circle cx="14" cy="${ey}" r="5" fill="#3a2c36"/><circle cx="12.4" cy="${ey - 1.8}" r="1.8" fill="#fff"/>`;
    }
    const blush = st >= 2 ? .55 : .3;
    face += `<ellipse cx="-24" cy="-86" rx="6.2" ry="3.4" fill="#ffa3b4" opacity="${blush}"/>
      <ellipse cx="24" cy="-86" rx="6.2" ry="3.4" fill="#ffa3b4" opacity="${blush}"/>
      <ellipse cx="0" cy="-88" rx="2" ry="1.4" fill="${shade(skin, -40)}" opacity=".55"/>`;
    const mouth = st === 0 ? `M-5 -80 q5 2 10 0` : st === 3 ? `M-7 -81 q7 8 14 0` : `M-6 -81 q6 5 12 0`;
    face += `<path d="${mouth}" stroke="#8a4a52" stroke-width="2.6" fill="${st === 3 ? '#e8808f' : 'none'}" stroke-linecap="round"/>`;
    if (st <= 1) face += `<path d="M-30 -100 q3 -3 6 0 M24 -100 q3 -3 6 0" stroke="${skinDk}" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>`;

    /* ---- 头发（贴合头型，不露头皮） ---- */
    const CAP = 'M-36.5 -101 A36.5 36.5 0 0 1 36.5 -101';
    let hairEls = '';
    if (o.gender === 'boy') {
      hairEls = `<path d="${CAP} L36.5 -95 Q28 -111 14 -110 Q0 -109.5 -14 -110 Q-28 -111 -36.5 -95 Z" fill="${hair}" stroke="${hairDk}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-4 -135 Q4 -147 14 -141 Q4 -138 2 -130 Z" fill="${hair}" stroke="${hairDk}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M-35 -103 q-2 8 1 12 M35 -103 q2 8 -1 12" stroke="${hair}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      if (st === 3) hairEls += `<path d="M-22 -119 Q-2 -129 20 -118" stroke="#fff" stroke-width="5" opacity=".3" fill="none" stroke-linecap="round"/>`;
    } else {
      hairEls = `<path d="M32 -114 C54 -118 60 -96 57 -78 C54 -62 45 -54 34 -58 C46 -66 48 -80 46 -90 C44 -102 40 -108 28 -108 Z" fill="${hair}" stroke="${hairDk}" stroke-width="3" stroke-linejoin="round"/>
        <path d="${CAP} L36.5 -99 Q32 -114 18 -115 Q0 -116 -18 -115 Q-32 -114 -36.5 -99 Z" fill="${hair}" stroke="${hairDk}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-35 -103 q-2 8 1 11 M35 -101 q2 7 -1 10" stroke="${hair}" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="34" cy="-110" r="5.4" fill="#ff9eb0" stroke="#e07f92" stroke-width="1.8"/>`;
      if (st >= 2) hairEls += `<path d="M-16 -127 q4 -6 10 -2" stroke="#ffd479" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`;
    }

    const ears = `<circle cx="-35" cy="-94" r="5.5" fill="${skin}" stroke="${skinDk}" stroke-width="2.4"/>
      <circle cx="35" cy="-94" r="5.5" fill="${skin}" stroke="${skinDk}" stroke-width="2.4"/>`;

    let iv = '';
    if (o.iv) {
      iv = `<g transform="translate(48 -150)">
        <rect x="-4" y="0" width="3" height="140" fill="#9aa7b8"/>
        <rect x="-14" y="10" width="24" height="30" rx="5" fill="#dff3ff" stroke="#9fc4e0" stroke-width="2.4"/>
        <path d="M-14 18 h24" stroke="#9fc4e0" stroke-width="2"/>
        <rect x="-9" y="26" width="14" height="9" rx="2" fill="#ffe3c2"/>
        <path d="M10 42 q6 20 -12 34 q-16 12 -22 6" stroke="#bfe0f0" stroke-width="2.4" fill="none"/>
      </g>`;
    }

    let fx = '';
    if (st === 3) {
      fx = `<g class="kid-fx"><circle cx="-46" cy="-112" r="2.6" fill="#fff" opacity=".9"/><circle cx="44" cy="-100" r="2.2" fill="#fff" opacity=".85"/><circle cx="40" cy="-132" r="1.8" fill="#fff" opacity=".7"/></g>`;
    }

    return `<g transform="scale(${o.scale})">
      <ellipse cx="0" cy="0" rx="${o.body === 'fat' ? 36 : 21}" ry="5" fill="#000" opacity=".13"/>
      ${arms}
      ${body}
      ${ears}
      <circle cx="0" cy="-100" r="36" fill="${skin}" stroke="${skinDk}" stroke-width="3"/>
      ${face}${hairEls}${iv}${fx}
    </g>`;
  }

  function kidSVG(cfg) {
    return `<svg class="kid-svg" viewBox="-92 -160 184 168" xmlns="http://www.w3.org/2000/svg">${kid(cfg)}</svg>`;
  }

  function stageOf(years, days) {
    if (years < 5) return days >= 5 ? 3 : 2;
    if (years <= 10) return days >= 10 ? 3 : days >= 5 ? 2 : 1;
    return days >= 15 ? 3 : days >= 10 ? 2 : days >= 5 ? 1 : 0;
  }

  /* ---------------- 佩奇（只剩一颗脑袋 · 原点在头中心） ---------------- */
  function pekiHead(s, sleep, hairColor) {
    const sc = s || 1.75;
    const hair = hairColor || '#332c44', hairDk = shade(hair, hairColor ? -40 : -30);
    const skin = '#ffe6c8', skinDk = shade(skin, -24);
    const eyes = sleep
      ? `<path d="M-20.5 -101 q6.5 6.5 13 0" stroke="#3a2c36" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M7.5 -101 q6.5 6.5 13 0" stroke="#3a2c36" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="-14" cy="-102" rx="6" ry="6.8" fill="#3a2c36"/><circle cx="-16" cy="-104.4" r="2.3" fill="#fff"/>
      <ellipse cx="14" cy="-102" rx="6" ry="6.8" fill="#3a2c36"/><circle cx="12" cy="-104.4" r="2.3" fill="#fff"/>`;
    return `<g transform="scale(${sc})"><g transform="translate(0 102)">
      <circle cx="-38" cy="-96" r="5.5" fill="${skin}" stroke="${skinDk}" stroke-width="2.4"/>
      <circle cx="38" cy="-96" r="5.5" fill="${skin}" stroke="${skinDk}" stroke-width="2.4"/>
      <circle cx="0" cy="-102" r="36" fill="${skin}" stroke="${skinDk}" stroke-width="3"/>
      ${eyes}
      <path d="M-20 -112 Q-14 -116.5 -8 -112" stroke="#3a2c36" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M8 -112 Q14 -116.5 20 -112" stroke="#3a2c36" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="-24" cy="-90" rx="6" ry="3.2" fill="#ffa3b4" opacity=".5"/>
      <ellipse cx="24" cy="-90" rx="6" ry="3.2" fill="#ffa3b4" opacity=".5"/>
      <path d="M-7 -84 q7 8 14 0" stroke="#8a4a52" stroke-width="2.6" fill="#e8808f" stroke-linecap="round"/>
      <path d="M-36.5 -103 A36.5 36.5 0 0 1 36.5 -103 L36.5 -100 Q30 -126 16 -125 Q2 -124 -8 -127 Q-24 -128 -36.5 -100 Z" fill="${hair}" stroke="${hairDk}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-2 -137 q13 -2 15 11 q-8 -8 -17 -4 Z" fill="${hair}" stroke="${hairDk}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-35 -105 q-2 8 1 11 M35 -105 q2 8 -1 11" stroke="${hair}" stroke-width="7" fill="none" stroke-linecap="round"/>
      ${sleep ? `<g class="kid-fx"><circle cx="-46" cy="-118" r="2" fill="#ffe9a8" opacity=".55"/></g>` : `<g class="kid-fx"><circle cx="-48" cy="-120" r="2.4" fill="#ffe9a8" opacity=".9"/><circle cx="46" cy="-112" r="2" fill="#ffe9a8" opacity=".8"/></g>`}
    </g></g>`;
  }
  function peki() { return pekiHead(1.75); }

  /* 幽灵身体（原点 = 头中心） */
  function ghostBody(s, tint) {
    const sc = s || 1;
    const c = tint || '#e6f2ff';
    const D = 'M-33 2 C-38 26 -39 52 -34 76 Q-31 92 -19 86 Q-10 102 0 90 Q10 102 19 86 Q31 92 34 76 C39 52 38 26 33 2 Z';
    return `<g transform="scale(${sc})">
      <path d="${D}" fill="${c}" opacity=".62"/>
      <path d="${D}" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".55"/>
      <path d="M-35 46 q-10 8 -3 19 M35 46 q10 8 3 19" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M-35 46 q-10 8 -3 19 M35 46 q10 8 3 19" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".45" stroke-linecap="round"/>
      <path d="M-21 34 Q-13 48 -5 34 M3 44 Q11 58 19 44" stroke="#ffffff" stroke-width="2" fill="none" opacity=".3" stroke-linecap="round"/>
    </g>`;
  }

  /* 洗澡池：back 画在脑袋之前，front（缸沿）画在脑袋之后，让脑袋像泡在池子里 */
  function bath(cx, halfW) {
    const L = cx - halfW, R = cx + halfW;
    const topY = 336, botY = 502;
    const foam = [];
    for (let x = L + 34; x <= R - 34; x += 46) {
      foam.push(`<circle cx="${x}" cy="${topY + 14 + ((x / 7) % 7)}" r="${12 + ((x / 11) % 5)}" fill="#ffffff" opacity=".78"/>`);
    }
    const bubbles = [[L + 40, topY - 34, 9], [L + 96, topY - 62, 6], [R - 90, topY - 44, 11], [R - 46, topY - 74, 7], [cx, topY - 52, 5]]
      .map(([x, y, r], i) => `<circle class="bath-bubble" style="animation-delay:-${(i * 1.3).toFixed(1)}s" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#cfe8ff" stroke-width="2" opacity=".7"/>`).join('');
    const back = `<g>
      <defs><linearGradient id="bathWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bde4fb"/><stop offset="1" stop-color="#6cb2dd"/></linearGradient></defs>
      <path d="M${L} ${topY} L${R} ${topY} L${R - 12} ${botY - 40} Q${R - 18} ${botY} ${R - 62} ${botY} L${L + 62} ${botY} Q${L + 18} ${botY} ${L + 12} ${botY - 40} Z" fill="#eef4ff" stroke="#c3cfe9" stroke-width="4" stroke-linejoin="round"/>
      <path d="M${L + 13} ${topY + 14} L${R - 13} ${topY + 14} L${R - 23} ${botY - 46} Q${R - 28} ${botY - 22} ${R - 60} ${botY - 22} L${L + 60} ${botY - 22} Q${L + 28} ${botY - 22} ${L + 23} ${botY - 46} Z" fill="url(#bathWater)" opacity=".92"/>
      <path d="M${cx - halfW * .55} ${topY + 56} Q${cx - halfW * .2} ${topY + 44} ${cx + halfW * .1} ${topY + 56} T${cx + halfW * .55} ${topY + 50}" stroke="#ffffff" stroke-width="3" fill="none" opacity=".42" stroke-linecap="round"/>
      <path d="M${cx - halfW * .4} ${topY + 84} Q${cx} ${topY + 72} ${cx + halfW * .42} ${topY + 84}" stroke="#ffffff" stroke-width="2.4" fill="none" opacity=".3" stroke-linecap="round"/>
      ${foam.join('')}
      <path d="M${L + 40} ${botY} l-8 16 q-1 6 6 6 l14 0 q6 0 5 -6 l-4 -16 Z" fill="#d9e2f5" stroke="#bcc8e2" stroke-width="2.4"/>
      <path d="M${R - 56} ${botY} l-8 16 q-1 6 6 6 l14 0 q6 0 5 -6 l-4 -16 Z" fill="#d9e2f5" stroke="#bcc8e2" stroke-width="2.4"/>
    </g>`;
    const front = `<g>
      <rect x="${L - 12}" y="${topY - 17}" width="${halfW * 2 + 24}" height="30" rx="15" fill="#f8fbff" fill-opacity=".42" stroke="#c3cfe9" stroke-opacity=".55" stroke-width="4"/>
      <rect x="${L - 4}" y="${topY - 13}" width="${halfW * 2 + 8}" height="7" rx="3.5" fill="#ffffff" opacity=".35"/>
      <g transform="translate(${R - 52} ${topY - 22})">
        <ellipse cx="0" cy="0" rx="17" ry="11" fill="#ffd45e" stroke="#e6b53f" stroke-width="2"/>
        <circle cx="13" cy="-11" r="9" fill="#ffd45e" stroke="#e6b53f" stroke-width="2"/>
        <path d="M20 -12 l8 2 l-8 4 Z" fill="#f2994a"/>
        <circle cx="15.5" cy="-13" r="1.7" fill="#3a2c36"/>
        <path d="M-14 -3 q7 -5 14 0" stroke="#e6b53f" stroke-width="2" fill="none" opacity=".7"/>
      </g>
    </g>`;
    return { back, front };
  }

  /* 马尾辫女孩（原点 = 头中心） */
  function girlHead(s, sleep) {
    const sc = s || 1.5;
    const hair = '#4a2f3a', hairDk = shade(hair, -26);
    const skin = '#ffe3c8', skinDk = shade(skin, -24);
    const eyes = sleep
      ? `<path d="M-19.5 -97 q6.5 6 13 0" stroke="#3a2c36" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M7 -97 q6.5 6 13 0" stroke="#3a2c36" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="-13" cy="-98" rx="5.6" ry="6.4" fill="#3a2c36"/><circle cx="-14.8" cy="-100.4" r="2.1" fill="#fff"/>
      <ellipse cx="13" cy="-98" rx="5.6" ry="6.4" fill="#3a2c36"/><circle cx="11.2" cy="-100.4" r="2.1" fill="#fff"/>`;
    return `<g transform="scale(${sc})"><g transform="translate(0 100)">
      <path d="M28 -108 C58 -116 70 -88 63 -60 C58 -38 46 -22 36 -30 C52 -44 54 -74 48 -90 C44 -102 38 -102 26 -98 Z" fill="${hair}" stroke="${hairDk}" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="33" cy="-103" r="5.6" fill="#ff9eb0" stroke="#e07f92" stroke-width="1.8"/>
      <path d="M-28 -108 C-58 -116 -70 -88 -63 -60 C-58 -38 -46 -22 -36 -30 C-52 -44 -54 -74 -48 -90 C-44 -102 -38 -102 -26 -98 Z" fill="${hair}" stroke="${hairDk}" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="-33" cy="-103" r="5.6" fill="#ff9eb0" stroke="#e07f92" stroke-width="1.8"/>
      <circle cx="-34" cy="-96" r="5" fill="${skin}" stroke="${skinDk}" stroke-width="2.2"/>
      <circle cx="34" cy="-96" r="5" fill="${skin}" stroke="${skinDk}" stroke-width="2.2"/>
      <circle cx="0" cy="-100" r="34" fill="${skin}" stroke="${skinDk}" stroke-width="3"/>
      ${eyes}
      <path d="M-19 -110 Q-13 -114.5 -7 -110" stroke="#3a2c36" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M7 -110 Q13 -114.5 19 -110" stroke="#3a2c36" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <ellipse cx="-22" cy="-86" rx="6" ry="3.2" fill="#ffa3b4" opacity=".55"/>
      <ellipse cx="22" cy="-86" rx="6" ry="3.2" fill="#ffa3b4" opacity=".55"/>
      <path d="M-6 -80 q6 7 12 0" stroke="#b05a66" stroke-width="2.4" fill="#ef9aa8" stroke-linecap="round"/>
      <path d="M-34.5 -101 A34.5 34.5 0 0 1 34.5 -101 L34.5 -98 Q27 -122 12 -120 Q0 -118 -12 -121 Q-26 -123 -34.5 -98 Z" fill="${hair}" stroke="${hairDk}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-33 -103 q-2 8 1 11 M33 -103 q2 8 -1 11" stroke="${hair}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      ${sleep ? '' : `<g class="kid-fx"><circle cx="-46" cy="-118" r="2.2" fill="#ffd0e0" opacity=".9"/><circle cx="44" cy="-110" r="1.9" fill="#ffd0e0" opacity=".8"/></g>`}
    </g></g>`;
  }

  /* 小狗（坐姿 · 原点 = 脚底中心）· 可传毛色，默认小黄狗 */
  function dog(fur0, furDk0) {
    const fur = fur0 || '#c98d5a', furDk = furDk0 || '#a9703f';
    return `<g>
      <ellipse cx="0" cy="4" rx="30" ry="5" fill="#000" opacity=".16"/>
      <path d="M-16 0 Q-22 -18 -10 -24 L8 -24 Q20 -18 18 -2 Q16 4 6 4 L-8 4 Q-16 4 -16 0 Z" fill="${fur}" stroke="${furDk}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M6 4 L6 -12 M13 4 L13 -12" stroke="${furDk}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
      <path class="dog-tail" d="M-13 -6 Q-28 -10 -25 -22 Q-23 -28 -17 -25" stroke="${fur}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="15" cy="-34" r="14.5" fill="${fur}" stroke="${furDk}" stroke-width="2.4"/>
      <path d="M4 -42 Q0 -54 10 -51 Q14 -48 12 -42 Z" fill="${furDk}"/>
      <path d="M27 -42 Q31 -54 21 -51 Q17 -48 19 -42 Z" fill="${furDk}"/>
      <ellipse cx="10" cy="-36" rx="2.2" ry="2.6" fill="#3a2c36"/><circle cx="9.2" cy="-37" r=".9" fill="#fff"/>
      <ellipse cx="20" cy="-36" rx="2.2" ry="2.6" fill="#3a2c36"/><circle cx="19.2" cy="-37" r=".9" fill="#fff"/>
      <ellipse cx="15" cy="-30" rx="3.2" ry="2.4" fill="#3a2c36"/>
      <path d="M15 -27.6 q0 3.4 -3.6 3.4 M15 -27.6 q0 3.4 3.6 3.4" stroke="#3a2c36" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="16.5" cy="-23.5" rx="2.4" ry="1.7" fill="#e8808f"/>
    </g>`;
  }

  /* 小猫（坐姿舔毛 · 原点 = 脚底中心） */
  function catSit() {
    const fur = '#e8a25c', furDk = '#c9833f';
    return `<g>
      <ellipse cx="0" cy="4" rx="26" ry="5" fill="#000" opacity=".16"/>
      <path d="M-13 0 Q-20 -16 -9 -22 L9 -22 Q20 -16 17 0 Q16 4 8 4 L-6 4 Q-13 4 -13 0 Z" fill="${fur}" stroke="${furDk}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M-7 -14 Q-2 -18 3 -14 M-5 -8 Q0 -12 5 -8" stroke="${furDk}" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>
      <path d="M-12 -4 Q-26 -8 -22 -20" stroke="${fur}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M-12 -4 Q-26 -8 -22 -20" stroke="${furDk}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".5"/>
      <circle cx="10" cy="-32" r="13" fill="${fur}" stroke="${furDk}" stroke-width="2.3"/>
      <path d="M1 -42 L-1 -53 L9 -46 Z" fill="${fur}" stroke="${furDk}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M19 -42 L21 -53 L12 -46 Z" fill="${fur}" stroke="${furDk}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M4 -34 q3 -3 6 0 M12 -34 q3 -3 6 0" stroke="#3a2c36" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M9 -27.5 q3 3 6 0" stroke="#3a2c36" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="11.5" cy="-24.5" rx="2.3" ry="2.8" fill="#ef9aa8"/>
      <ellipse cx="2" cy="-7" rx="4.6" ry="3.4" fill="${fur}" stroke="${furDk}" stroke-width="1.8"/>
    </g>`;
  }

  /* 十字架坟墓 */
  function grave() {
    return `<g transform="translate(400 0)">
      <ellipse cx="0" cy="486" rx="112" ry="30" fill="#2c2542"/>
      <path d="M-92 486 Q0 424 92 486 Z" fill="#403855"/>
      <path d="M-70 486 Q0 440 70 486 Z" fill="#4b4263" opacity=".9"/>
      <rect x="-11" y="322" width="22" height="152" rx="7" fill="#6d6288" stroke="#524868" stroke-width="2.6"/>
      <rect x="-46" y="366" width="92" height="19" rx="6" fill="#6d6288" stroke="#524868" stroke-width="2.6"/>
      <path d="M-46 375 L46 375" stroke="#8779a4" stroke-width="2" opacity=".7"/>
      <path d="M0 330 L0 466" stroke="#8779a4" stroke-width="2" opacity=".45"/>
      <g opacity=".9">
        <circle cx="-64" cy="474" r="6" fill="#8f7fa8"/><circle cx="-64" cy="474" r="2.4" fill="#ffe9a8"/>
        <circle cx="66" cy="478" r="5.4" fill="#8f7fa8"/><circle cx="66" cy="478" r="2.2" fill="#ffe9a8"/>
        <circle cx="-92" cy="500" r="4.6" fill="#7d6e94"/><circle cx="-92" cy="500" r="1.8" fill="#ffd0e0"/>
      </g>
    </g>`;
  }

  /* ---------------- 葡萄牙队背景（鼓励满 10 次解锁） ---------------- */
  function pekiBg() {
    const stars = [[92, 118], [164, 58], [246, 176], [600, 84], [688, 158], [560, 40], [720, 240], [130, 258]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#ffe9a8" class="spk" style="animation-delay:${i * .4}s"/>`).join('');
    return `<svg class="scene-svg" viewBox="0 0 800 588" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ptG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0c4629"/><stop offset=".355" stop-color="#12603b"/>
          <stop offset=".375" stop-color="#711222"/><stop offset="1" stop-color="#a3142a"/>
        </linearGradient>
        <radialGradient id="ptGlow" cx=".5" cy=".44" r=".62">
          <stop offset="0" stop-color="#ffd479" stop-opacity=".26"/><stop offset="1" stop-color="#ffd479" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="ptFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".42" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity=".5"/>
        </linearGradient>
      </defs>
      <rect width="800" height="588" fill="url(#ptG)"/>
      <g opacity=".09" fill="#ffffff">
        <rect x="52" y="0" width="24" height="588"/><rect x="118" y="0" width="24" height="588"/>
        <rect x="184" y="0" width="24" height="588"/><rect x="252" y="0" width="24" height="588"/>
        <rect x="466" y="0" width="24" height="588"/><rect x="532" y="0" width="24" height="588"/>
        <rect x="598" y="0" width="24" height="588"/><rect x="664" y="0" width="24" height="588"/>
      </g>
      <circle cx="400" cy="292" r="300" fill="url(#ptGlow)"/>
      <g transform="translate(400 292)" opacity=".32">
        <circle r="198" fill="none" stroke="#ffd479" stroke-width="9"/>
        <circle r="178" fill="none" stroke="#ffd479" stroke-width="2"/>
        <path d="M0 -122 L88 -90 Q88 32 0 104 Q-88 32 -88 -90 Z" fill="none" stroke="#ffd479" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="0" cy="-16" r="36" fill="#fff8e6" opacity=".55"/>
        <path d="M0 -44 L17 -32 L11 -12 L-11 -12 L-17 -32 Z" fill="#0c4629"/>
        <path d="M-30 -2 L-22 -8 L-10 4 M30 -2 L22 -8 L10 4 M-6 20 L0 12 L6 20" stroke="#0c4629" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
      <text x="400" y="118" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="11" fill="#ffd479" opacity=".85">PORTUGAL</text>
      <text x="400" y="556" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="6" fill="#ffe9b0" opacity=".62">FORÇA PORTUGAL</text>
      <rect width="800" height="588" fill="url(#ptFade)"/>
      ${stars}
    </svg>`;
  }

  function pekiAvatar() {
    return `<svg viewBox="-30 -30 60 60" class="ava-svg" xmlns="http://www.w3.org/2000/svg">
      <circle cx="0" cy="0" r="29" fill="#2f2548" stroke="#4a3d6e" stroke-width="2"/>
      <circle cx="0" cy="4" r="19" fill="#ffe6c8" stroke="#e8cbaa" stroke-width="2"/>
      <ellipse cx="-7" cy="2" rx="3" ry="3.6" fill="#3a2c36"/><circle cx="-8.2" cy="0.8" r="1.2" fill="#fff"/>
      <ellipse cx="7" cy="2" rx="3" ry="3.6" fill="#3a2c36"/><circle cx="5.8" cy="0.8" r="1.2" fill="#fff"/>
      <path d="M-4 10 q4 4 8 0" stroke="#8a4a52" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="-12" cy="8" rx="3" ry="1.8" fill="#ffa3b4" opacity=".6"/>
      <ellipse cx="12" cy="8" rx="3" ry="1.8" fill="#ffa3b4" opacity=".6"/>
      <path d="M-19.4 3 A19.4 19.4 0 0 1 19.4 3 L19.4 4 Q15 -8 7 -7 Q0 -6 -7 -8 Q-15 -9 -19.4 4 Z" fill="#332c44" stroke="#241f33" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }

  /* ---------------- 肺部（真实肺叶轮廓，黑点裁剪在肺内） ---------------- */
  const LUNG_L = 'M-3 -20 C-12 -24 -38 -26 -46 -12 C-53 0 -50 22 -40 32 C-30 42 -14 40 -8 28 C-2 16 -1 0 -3 -20 Z';
  const LUNG_R = 'M3 -20 C12 -24 38 -26 46 -12 C53 0 50 22 40 32 C30 42 14 40 8 28 C2 16 1 0 3 -20 Z';
  function lungs(gone) {
    const left = Math.max(0, 100 - gone);
    const lShown = Math.ceil(left / 2), rShown = Math.floor(left / 2);
    let dotL = '', dotR = '';
    for (let i = 0; i < 50; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const y = -14 + row * 8;
      if (i < lShown) dotL += `<circle cx="${-42 + col * 4}" cy="${y}" r="1.9" fill="#141020" opacity=".88"/>`;
      if (i < rShown) dotR += `<circle cx="${6 + col * 4}" cy="${y}" r="1.9" fill="#141020" opacity=".88"/>`;
    }
    const base = left <= 0 ? '#f4b0bc' : left > 60 ? '#8f8496' : left > 30 ? '#b593a3' : '#dda7b3';
    const dk = shade(base, -34);
    return `<svg viewBox="-62 -54 124 122" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="lpL"><path d="${LUNG_L}"/></clipPath>
        <clipPath id="lpR"><path d="${LUNG_R}"/></clipPath>
        <radialGradient id="lgL" cx=".35" cy=".3" r=".95"><stop offset="0" stop-color="${shade(base, 24)}"/><stop offset="1" stop-color="${base}"/></radialGradient>
        <radialGradient id="lgR" cx=".65" cy=".3" r=".95"><stop offset="0" stop-color="${shade(base, 24)}"/><stop offset="1" stop-color="${base}"/></radialGradient>
      </defs>
      <rect x="-60" y="-52" width="120" height="118" rx="12" fill="#100c18" stroke="#332b48" stroke-width="2"/>
      <path d="M0 -46 L0 -18 M0 -18 Q-8 -14 -17 -9 M0 -18 Q8 -14 17 -9" stroke="#8f8fa8" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M0 -46 L0 -18 M0 -18 Q-8 -14 -17 -9 M0 -18 Q8 -14 17 -9" stroke="#c8c4dc" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".65"/>
      <path d="${LUNG_L}" fill="url(#lgL)" stroke="${dk}" stroke-width="2.6"/>
      <path d="M-14 -18 Q-24 2 -22 26" stroke="${dk}" stroke-width="2" fill="none" opacity=".3"/>
      <g clip-path="url(#lpL)">${dotL}</g>
      <path d="${LUNG_R}" fill="url(#lgR)" stroke="${dk}" stroke-width="2.6"/>
      <path d="M14 -18 Q24 2 22 26" stroke="${dk}" stroke-width="2" fill="none" opacity=".3"/>
      <g clip-path="url(#lpR)">${dotR}</g>
    </svg>`;
  }

  /* ---------------- 肝脏（真实轮廓，气泡裁在肝内） ---------------- */
  const LIVER_P = 'M-44 -34 C-56 -30 -56 -12 -46 2 C-36 16 -18 30 2 30 C22 30 44 18 48 2 C52 -12 44 -30 26 -35 C10 -39 -6 -40 -20 -38 C-30 -37 -38 -36 -44 -34 Z';
  function liver(gone) {
    const left = Math.max(0, 100 - gone);
    const healthy = left <= 0;
    const base = healthy ? '#8f2f38' : left > 60 ? '#b07d55' : left > 30 ? '#a35a44' : '#94404a';
    const dk = shade(base, -34);
    const lt = shade(base, 28);
    let bub = '';
    for (let i = 0; i < 100; i++) {
      if (i < left) {
        const col = i % 10, row = Math.floor(i / 10);
        const x = -30 + col * 6.2 + (row % 2) * 2.6, y = -18 + row * 5.2;
        const r = 1.8 + ((i * 7) % 3) * 0.55;
        bub += `<circle cx="${x}" cy="${y}" r="${r}" fill="${lt}" stroke="${dk}" stroke-width="1"/>`;
      }
    }
    const lump = healthy ? '' : left <= 30 ? `<ellipse cx="22" cy="-10" rx="9" ry="8" fill="#efd8b8" stroke="${dk}" stroke-width="2"/>` : '';
    return `<svg viewBox="-64 -50 128 108" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="lvClip"><path d="${LIVER_P}"/></clipPath>
        <radialGradient id="lvG" cx=".35" cy=".28" r=".95"><stop offset="0" stop-color="${lt}"/><stop offset="1" stop-color="${base}"/></radialGradient>
      </defs>
      <rect x="-62" y="-48" width="124" height="104" rx="12" fill="#100c18" stroke="#332b48" stroke-width="2"/>
      <path d="${LIVER_P}" fill="url(#lvG)" stroke="${dk}" stroke-width="2.8"/>
      <path d="M-2 -39 Q0 -20 6 29" stroke="${dk}" stroke-width="3" fill="none" opacity=".7"/>
      <path d="M-40 -27 C-34 -34 -20 -36 -12 -32" stroke="#ffffff" stroke-width="3" fill="none" opacity="${healthy ? .38 : .14}" stroke-linecap="round"/>
      ${lump}
      <g clip-path="url(#lvClip)">${bub}</g>
    </svg>`;
  }

  /* 体脂检查：大肚子上 100 片黄油，每打卡消掉一片 */
  function belly(gone) {
    const left = Math.max(0, 100 - gone);
    let pads = '';
    for (let i = 0; i < 100; i++) {
      if (i < left) {
        const col = i % 10, row = Math.floor(i / 10);
        const x = -40 + col * 8.4 + (row % 2) * 1.7;
        const y = -32 + row * 7.4;
        pads += `<g transform="translate(${x} ${y}) rotate(${((i * 13) % 11) - 5})">
          <rect x="-3.6" y="-2.6" width="7.2" height="5.2" rx="1.2" fill="#ffd166" stroke="#dda336" stroke-width=".9"/>
          <rect x="-2.5" y="-1.8" width="4" height="1.5" rx=".7" fill="#fff6d0" opacity=".9"/>
        </g>`;
      }
    }
    return `<svg viewBox="-64 -50 128 108" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="blG" cx=".38" cy=".28" r=".92"><stop offset="0" stop-color="#ffe0bd"/><stop offset="1" stop-color="#dda87c"/></radialGradient>
        <clipPath id="blClip"><ellipse cx="0" cy="6" rx="41" ry="39"/></clipPath>
      </defs>
      <rect x="-62" y="-48" width="124" height="104" rx="12" fill="#100c18" stroke="#332b48" stroke-width="2"/>
      <path d="M-46 -48 q12 16 10 28 l0 14 q-2 32 6 58 l60 0 q8 -26 6 -58 l0 -14 q-2 -12 10 -28 Z" fill="#3b3054" opacity=".85"/>
      <ellipse cx="0" cy="6" rx="45" ry="41" fill="url(#blG)" stroke="#c98f63" stroke-width="3"/>
      <ellipse cx="-16" cy="-10" rx="15" ry="9" fill="#ffffff" opacity=".17"/>
      <ellipse cx="0" cy="6" rx="45" ry="41" fill="none" stroke="#b47c52" stroke-width="1.2" opacity=".5"/>
      <g clip-path="url(#blClip)">${pads}</g>
      <path d="M0 27 q-3 5 0 7" stroke="#b47c52" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>
    </svg>`;
  }

  /* ---------------- 禁止标志（红圈 + 斜杠） ---------------- */
  function forbidden(size) {
    const s = size || 100;
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="41" fill="none" stroke="#e35d6a" stroke-width="11"/>
      <line x1="22" y1="22" x2="78" y2="78" stroke="#e35d6a" stroke-width="11" stroke-linecap="round"/>
    </svg>`;
  }

  /* ---------------- 场景（油画感） ---------------- */
  function scene(period, idx, kcfg) {
    const k = Object.assign({}, kcfg);
    let artsvg = '';
    let pos = { kidX: 400, kidY: 470, kidScale: 1.12 };

    if (period === 'day' && idx === 0) {
      let wheat = '';
      for (let i = 0; i < 40; i++) {
        const x = 8 + i * 20, y = 524 + ((i * 11) % 26);
        wheat += `<path d="M${x} ${y} Q${x + (i % 2 ? 3 : -3)} ${y - 20} ${x + (i % 3 - 1) * 2} ${y - 32}" stroke="#e2b45f" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".95"/>
          <ellipse cx="${x + (i % 3 - 1) * 2}" cy="${y - 34}" rx="3.4" ry="7.6" fill="#f2cf7d"/>`;
      }
      const glints = Array.from({ length: 26 }, (_, i) => {
        const x = 24 + ((i * 137) % 752), y = 500 + ((i * 53) % 70);
        return `<circle cx="${x}" cy="${y}" r="${1.6 + (i % 3) * .5}" fill="#fff4c8" class="spk" style="animation-delay:${(i % 9) * .35}s"/>`;
      }).join('');
      artsvg = `<svg class="scene-svg" viewBox="0 0 800 588" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sSky0" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#f2a878"/><stop offset=".38" stop-color="#f8c58e"/>
            <stop offset=".68" stop-color="#ffe0b0"/><stop offset="1" stop-color="#fff2d8"/></linearGradient>
          <radialGradient id="sunGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6a45" stop-opacity=".85"/><stop offset=".4" stop-color="#ff8a52" stop-opacity=".42"/><stop offset="1" stop-color="#ffb277" stop-opacity="0"/></radialGradient>
          <radialGradient id="sunCore" cx=".42" cy=".36" r=".66"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".42" stop-color="#ff8d4a"/><stop offset=".82" stop-color="#ec4130"/><stop offset="1" stop-color="#d82f28"/></radialGradient>
          <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b58fa0"/><stop offset="1" stop-color="#8f7089"/></linearGradient>
          <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f7d6b"/><stop offset="1" stop-color="#6f6055"/></linearGradient>
          <linearGradient id="fieldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8bd67"/><stop offset="1" stop-color="#c9963f"/></linearGradient>
          <linearGradient id="riverG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8c8d8"/><stop offset=".5" stop-color="#d8e8f0"/><stop offset="1" stop-color="#8fb0c8"/></linearGradient>
        </defs>
        <rect width="800" height="588" fill="url(#sSky0)"/>
        <circle cx="600" cy="292" r="132" fill="url(#sunGlow)"/>
        <circle cx="600" cy="292" r="54" fill="url(#sunCore)"/>
        <ellipse cx="600" cy="292" rx="76" ry="9" fill="#ff8258" opacity=".28"/>
        <ellipse cx="600" cy="308" rx="58" ry="6" fill="#e8492f" opacity=".22"/>
        <circle cx="600" cy="292" r="54" fill="none" stroke="#ffd07a" stroke-width="2" opacity=".35"/>
        <g opacity=".75"><ellipse cx="180" cy="120" rx="86" ry="20" fill="#ffe6c8"/><ellipse cx="230" cy="108" rx="52" ry="15" fill="#fff1dc"/><ellipse cx="130" cy="112" rx="40" ry="12" fill="#ffdcc0"/></g>
        <g opacity=".6"><ellipse cx="660" cy="96" rx="66" ry="15" fill="#ffe9d0"/><ellipse cx="700" cy="88" rx="40" ry="11" fill="#fff4e4"/></g>
        <g opacity=".5"><ellipse cx="430" cy="160" rx="90" ry="14" fill="#ffddc0"/></g>
        <path d="M0 372 Q90 300 190 336 Q280 366 356 330 Q440 292 520 336 Q610 380 700 340 Q760 314 800 336 L800 430 L0 430 Z" fill="url(#hillFar)" opacity=".85"/>
        <path d="M0 400 Q120 344 240 380 Q340 408 440 372 Q560 330 680 384 Q750 410 800 386 L800 470 L0 470 Z" fill="url(#hillMid)" opacity=".95"/>
        <g transform="translate(296 280) scale(.8)" opacity=".96">
          <path d="M-58 150 C-47 100 -30 48 -15 4 L-5 4 C-17 48 -29 100 -35 150 Z" fill="#5a4a52"/>
          <path d="M58 150 C47 100 30 48 15 4 L5 4 C17 48 29 100 35 150 Z" fill="#5a4a52"/>
          <path d="M-50 126 L44 104 M-48 104 L46 126 M-38 82 L32 64 M-36 64 L34 82" stroke="#4a3c48" stroke-width="2.6" fill="none" opacity=".95"/>
          <path d="M-24 6 L-28 -6 L28 -6 L24 6 Z" fill="#6a5a62"/>
          <path d="M-16 -6 L-10 -48 L10 -48 L16 -6 Z" fill="#5a4a52"/>
          <path d="M-14 -16 L14 -16 M-12 -28 L12 -28 M-11 -38 L11 -38" stroke="#4a3c48" stroke-width="2" fill="none" opacity=".95"/>
          <rect x="-2" y="-68" width="4" height="22" fill="#4a3c48"/>
          <circle cx="0" cy="-70" r="3" fill="#ffd479"/>
        </g>
        <g>
          <g transform="translate(120 402) scale(.9)">
            <rect x="-28" y="-24" width="56" height="32" fill="#f4e4c6" stroke="#c8a882" stroke-width="2"/>
            <path d="M-32 -24 L0 -44 L32 -24 Z" fill="#c96a52" stroke="#a85240" stroke-width="2"/>
            <rect x="-8" y="-8" width="16" height="16" fill="#8a5a3c"/>
            <rect x="-22" y="-18" width="10" height="9" fill="#ffe9a8"/>
          </g>
          <g transform="translate(196 418) scale(.72)">
            <rect x="-26" y="-22" width="52" height="30" fill="#f2ddc0" stroke="#c8a882" stroke-width="2"/>
            <path d="M-30 -22 L0 -40 L30 -22 Z" fill="#b8644e" stroke="#a85240" stroke-width="2"/>
            <rect x="-7" y="-6" width="14" height="14" fill="#8a5a3c"/>
            <rect x="-20" y="-16" width="9" height="8" fill="#ffe9a8"/>
          </g>
          <g transform="translate(628 408) scale(.8)">
            <rect x="-26" y="-22" width="52" height="30" fill="#f6e8d0" stroke="#c8a882" stroke-width="2"/>
            <path d="M-30 -22 L0 -40 L30 -22 Z" fill="#d0785c" stroke="#a85240" stroke-width="2"/>
            <rect x="-7" y="-6" width="14" height="14" fill="#8a5a3c"/>
            <rect x="-20" y="-16" width="9" height="8" fill="#ffe9a8"/>
          </g>
        </g>
        <path d="M0 442 Q160 426 330 438 Q500 450 660 436 Q745 426 800 436 L800 500 Q700 490 600 498 Q450 512 300 500 Q150 488 0 502 Z" fill="url(#riverG)" opacity=".95"/>
        <path d="M50 456 Q180 446 320 456 M420 462 Q540 454 660 460" stroke="#ffffff" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>
        <path d="M0 486 Q160 472 330 482 Q500 494 660 476 Q745 468 800 480 L800 588 L0 588 Z" fill="url(#fieldG)"/>
        ${wheat}
        ${glints}
      </svg>`;
      pos = { kidX: 400, kidY: 540, kidScale: 1.12 };
    }

    if (period === 'day' && idx === 1) {
      let shimmer = '';
      [[120, 372, 70], [300, 390, 52], [470, 380, 76], [620, 398, 58], [210, 412, 44], [540, 418, 62]]
        .forEach(([x, y, w], i) => { shimmer += `<rect class="shimmer" style="animation-delay:${i * .5}s" x="${x}" y="${y}" width="${w}" height="4.5" rx="2.2" fill="#ffffff" opacity=".5"/>`; });
      const shells = [[210, 520], [268, 548], [600, 534], [654, 512], [150, 552], [700, 548]]
        .map(([x, y], i) => `<g transform="translate(${x} ${y}) rotate(${i * 17})">
          <path d="M0 0 Q7 -11 14 0 Q7 5 0 0 Z" fill="#ffe6d8" stroke="#e0bfae" stroke-width="1.4"/>
          <path d="M2 -2 L12 -2 M4 -5 L10 -5" stroke="#e8c8b6" stroke-width="1"/></g>`).join('');
      artsvg = `<svg class="scene-svg" viewBox="0 0 800 588" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dSky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ea"/><stop offset=".55" stop-color="#b8e2f6"/><stop offset="1" stop-color="#e8f6ff"/></linearGradient>
          <linearGradient id="dSea1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fb4d8"/><stop offset=".5" stop-color="#5cc8e4"/><stop offset="1" stop-color="#2f9fc8"/></linearGradient>
          <linearGradient id="dSand1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8e8c0"/><stop offset="1" stop-color="#edd8a8"/></linearGradient>
        </defs>
        <rect width="800" height="370" fill="url(#dSky1)"/>
        <circle cx="150" cy="96" r="60" fill="#fff3c4" opacity=".35"/><circle cx="150" cy="96" r="34" fill="#fff6d0"/>
        <g opacity=".85"><ellipse cx="330" cy="90" rx="70" ry="17" fill="#ffffff"/><ellipse cx="372" cy="78" rx="40" ry="13" fill="#fff"/></g>
        <g opacity=".7"><ellipse cx="640" cy="70" rx="54" ry="14" fill="#fff"/><ellipse cx="676" cy="60" rx="32" ry="10" fill="#fff"/></g>
        <rect y="356" width="800" height="132" fill="url(#dSea1)"/>
        <path class="wave" d="M-20 374 Q60 366 140 374 T300 374 T460 374 T620 374 T780 374 T940 374" stroke="#fff" stroke-width="3" fill="none" opacity=".42"/>
        <path class="wave" style="animation-delay:-2s" d="M-20 400 Q60 392 140 400 T300 400 T460 400 T620 400 T780 400 T940 400" stroke="#fff" stroke-width="2.4" fill="none" opacity=".3"/>
        ${shimmer}
        <path d="M0 470 Q200 456 400 466 Q600 478 800 462 L800 588 L0 588 Z" fill="url(#dSand1)"/>
        <path d="M0 470 Q200 456 400 466 Q600 478 800 462" stroke="#ffffff" stroke-width="4" fill="none" opacity=".6"/>
        <g>
          <g transform="translate(104 542) scale(1.05)">
            <path d="M0 0 C-5 -50 -3 -104 10 -152" stroke="#a8763f" stroke-width="14" fill="none" stroke-linecap="round"/>
            <path d="M0 -6 C-3 -50 -1 -100 9 -148" stroke="#c2914f" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
            <g class="palm">
            <path d="M10 -152 C-22 -176 -58 -168 -76 -148 C-46 -154 -18 -148 8 -144 Z" fill="#4ca05e"/>
            <path d="M10 -152 C-16 -190 -50 -192 -68 -178 C-38 -176 -12 -166 6 -148 Z" fill="#57ab69"/>
            <path d="M10 -152 C42 -176 78 -168 96 -148 C66 -154 38 -148 12 -144 Z" fill="#4ca05e"/>
            <path d="M10 -152 C36 -190 70 -192 88 -178 C58 -176 32 -166 14 -148 Z" fill="#57ab69"/>
            <path d="M8 -150 C4 -180 -8 -192 -22 -196 C-6 -180 2 -164 8 -150 Z" fill="#6cbd7a"/>
            <circle cx="4" cy="-146" r="7" fill="#96622f"/><circle cx="17" cy="-142" r="6" fill="#96622f"/>
            </g></g>
          <g transform="translate(186 570) scale(.76)">
            <path d="M0 0 C-5 -50 -3 -104 10 -152" stroke="#a06f3c" stroke-width="15" fill="none" stroke-linecap="round"/>
            <g class="palm" style="animation-delay:-2s">
            <path d="M10 -152 C-22 -176 -58 -168 -76 -148 C-46 -154 -18 -148 8 -144 Z" fill="#57ab69"/>
            <path d="M10 -152 C-16 -190 -50 -192 -68 -178 C-38 -176 -12 -166 6 -148 Z" fill="#63b573"/>
            <path d="M10 -152 C42 -176 78 -168 96 -148 C66 -154 38 -148 12 -144 Z" fill="#57ab69"/>
            <path d="M10 -152 C36 -190 70 -192 88 -178 C58 -176 32 -166 14 -148 Z" fill="#4ca05e"/>
            <path d="M8 -150 C4 -180 -8 -192 -22 -196 C-6 -180 2 -164 8 -150 Z" fill="#6cbd7a"/>
            </g></g>
          <g transform="translate(762 514) scale(.92)">
            <path d="M0 0 C-5 -50 -3 -104 10 -152" stroke="#a8763f" stroke-width="14" fill="none" stroke-linecap="round"/>
            <path d="M0 -6 C-3 -50 -1 -100 9 -148" stroke="#c2914f" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
            <g class="palm" style="animation-delay:-4s">
            <path d="M10 -152 C-22 -176 -58 -168 -76 -148 C-46 -154 -18 -148 8 -144 Z" fill="#4ca05e"/>
            <path d="M10 -152 C-16 -190 -50 -192 -68 -178 C-38 -176 -12 -166 6 -148 Z" fill="#57ab69"/>
            <path d="M10 -152 C42 -176 78 -168 96 -148 C66 -154 38 -148 12 -144 Z" fill="#4ca05e"/>
            <path d="M10 -152 C36 -190 70 -192 88 -178 C58 -176 32 -166 14 -148 Z" fill="#57ab69"/>
            <path d="M8 -150 C4 -180 -8 -192 -22 -196 C-6 -180 2 -164 8 -150 Z" fill="#6cbd7a"/>
            <circle cx="4" cy="-146" r="7" fill="#96622f"/><circle cx="17" cy="-142" r="6" fill="#96622f"/>
            </g></g>
        </g>
        <g transform="translate(636 476)">
          <path d="M0 0 L0 -86" stroke="#b08a5a" stroke-width="5" stroke-linecap="round"/>
          <path d="M-52 -86 Q0 -122 52 -86 Z" fill="#ff9eb0" stroke="#e07f92" stroke-width="2.4"/>
          <path d="M-26 -90 Q0 -110 26 -90 Z" fill="#fff6e8"/>
          <path d="M-52 -86 Q0 -122 52 -86" stroke="#e07f92" stroke-width="3" fill="none"/>
          <g transform="translate(-36 10) rotate(-8)">
            <rect x="-26" y="-8" width="66" height="14" rx="7" fill="#ffffff" stroke="#e0cdb0" stroke-width="2"/>
            <path d="M-26 -2 L-40 -2 L-40 6 L-26 6" fill="#ffffff" stroke="#e0cdb0" stroke-width="2"/>
            <path d="M22 6 L26 22 M-8 6 L-6 22" stroke="#c8b492" stroke-width="3" stroke-linecap="round"/>
          </g>
        </g>
        ${shells}
        <g transform="translate(250 500)"><g class="crab">
          <ellipse cx="0" cy="0" rx="15" ry="9.5" fill="#ef6b5e" stroke="#c44f44" stroke-width="2"/>
          <circle cx="-14" cy="-8" r="4.6" fill="#ef6b5e" stroke="#c44f44" stroke-width="1.8"/>
          <circle cx="14" cy="-8" r="4.6" fill="#ef6b5e" stroke="#c44f44" stroke-width="1.8"/>
          <circle cx="-16" cy="-10" r="1.5" fill="#3a2a2a"/><circle cx="16" cy="-10" r="1.5" fill="#3a2a2a"/>
          <path d="M-9 8 L-13 15 M-3 9 L-4 16 M3 9 L4 16 M9 8 L13 15" stroke="#c44f44" stroke-width="2.2" stroke-linecap="round"/>
        </g></g>
        <g transform="translate(566 540)"><g class="crab" style="animation-delay:-4.5s">
          <ellipse cx="0" cy="0" rx="12" ry="8" fill="#f2806f" stroke="#cc584b" stroke-width="2"/>
          <circle cx="-11" cy="-7" r="3.8" fill="#f2806f" stroke="#cc584b" stroke-width="1.6"/>
          <circle cx="11" cy="-7" r="3.8" fill="#f2806f" stroke="#cc584b" stroke-width="1.6"/>
          <circle cx="-13" cy="-8.6" r="1.3" fill="#3a2a2a"/><circle cx="13" cy="-8.6" r="1.3" fill="#3a2a2a"/>
          <path d="M-7 7 L-10 13 M-2 8 L-3 14 M2 8 L3 14 M7 7 L10 13" stroke="#cc584b" stroke-width="2" stroke-linecap="round"/>
        </g></g>
      </svg>`;
      pos = { kidX: 400, kidY: 516, kidScale: 1.12 };
    }

    if (period === 'night' && idx === 0) {
      const isGirl = k.gender === 'girl';
      const hairC = isGirl ? '#4e3440' : '#3d3244';
      const hairDk = shade(hairC, -30);
      const skin = '#e8cbaa', skinDk = shade(skin, -28);
      const ponytail = isGirl ? `<path d="M26 -10 C56 -18 66 6 58 30 C52 48 40 56 32 50 C44 40 46 18 42 4 C39 -8 34 -10 24 -6 Z" fill="${hairC}" stroke="${hairDk}" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="34" cy="-8" r="5" fill="#ff9eb0" stroke="#e07f92" stroke-width="1.6"/>` : '';
      const sleepy = `<g transform="translate(277 386)"><g class="scene-kid bed-kid">
        ${ponytail}
        <circle cx="0" cy="0" r="34" fill="${skin}" stroke="${skinDk}" stroke-width="3"/>
        <path d="M-17 2 q7 5 13 0" stroke="#5a4550" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M5 2 q7 5 13 0" stroke="#5a4550" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <ellipse cx="-23" cy="17" rx="6.5" ry="3.6" fill="#e89aa8" opacity=".42"/>
        <ellipse cx="23" cy="17" rx="6.5" ry="3.6" fill="#e89aa8" opacity=".42"/>
        <path d="M-6 18 q6 5 12 0" stroke="#a06a72" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M-34.5 -2 A34.5 34.5 0 0 1 34.5 -2 L34.5 1 Q28 -21 14 -20 Q0 -19 -14 -21 Q-28 -23 -34.5 1 Z" fill="${hairC}" stroke="${hairDk}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-32 -4 q-2 7 1 10 M32 -4 q2 7 -1 10" stroke="${hairC}" stroke-width="6" fill="none" stroke-linecap="round"/>
      </g></g>`;
      const windowStars = [[566, 116], [600, 124], [640, 152], [586, 248], [624, 258], [658, 268], [570, 286], [602, 304], [646, 300], [664, 200], [556, 182]]
        .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#fff8e0" class="spk" style="animation-delay:${i * .4}s"/>`).join('');
      // 墙上装饰：两张音乐海报 + 一个小相框
      const deco = `
        <g class="poster">
          <rect x="112" y="92" width="104" height="150" rx="4" fill="#171226" stroke="#3b3350" stroke-width="3"/>
          <rect x="112" y="92" width="104" height="150" rx="4" fill="url(#pstG1)" opacity=".8"/>
          <circle cx="164" cy="150" r="33" fill="#221c33" stroke="#7d6fb0" stroke-width="2"/>
          <circle cx="164" cy="150" r="20" fill="none" stroke="#c9a24a" stroke-width="1.4" opacity=".75"/>
          <circle cx="164" cy="150" r="4.6" fill="#ffd479"/>
          <path d="M191 122 q10 4 10 14" stroke="#ffd479" stroke-width="2.4" fill="none" opacity=".7"/>
          <text x="164" y="214" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="800" letter-spacing="3" fill="#e6dcff">MUSIC</text>
          <text x="164" y="230" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="7" letter-spacing="1.6" fill="#a99cd0">EVERY NIGHT</text>
        </g>
        <g class="poster" transform="rotate(-3.5 288 178)">
          <rect x="238" y="110" width="100" height="140" rx="4" fill="#151a2e" stroke="#3a4560" stroke-width="3"/>
          <rect x="238" y="110" width="100" height="140" rx="4" fill="url(#pstG2)" opacity=".85"/>
          <path d="M268 148 q0 -18 18 -18 q18 0 18 18 v26 q0 6 -6 6 q-6 0 -6 -6 v-24 q0 -8 -6 -8 q-6 0 -6 8 v30 q0 10 -10 10 q-9 0 -9 -9 q0 -9 9 -9 q4 0 8 2 Z" fill="#8fe6d6" opacity=".92"/>
          <circle cx="264" cy="196" r="9" fill="#8fe6d6" opacity=".92"/>
          <text x="288" y="226" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="800" letter-spacing="2" fill="#d7e8ff">LOVE SONG</text>
          <text x="288" y="240" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="7" letter-spacing="1.4" fill="#8fa3c8">SIDE A</text>
        </g>
        <g>
          <rect x="352" y="150" width="74" height="66" rx="3" fill="#8a6a52" stroke="#6d5140" stroke-width="3"/>
          <rect x="360" y="158" width="58" height="50" fill="#2a2440"/>
          <circle cx="389" cy="182" r="9" fill="#ffe0a8" opacity=".9"/>
          <path d="M362 202 q10 -12 20 -2 q10 -10 20 0 q6 6 16 2 l0 8 l-56 0 Z" fill="#4a7d6a" opacity=".9"/>
          <rect x="352" y="150" width="74" height="66" rx="3" fill="none" stroke="#9b7a5e" stroke-width="1.2"/>
        </g>`;
      // 床边趴着的小狗
      const dog = `
        <g class="dog-doze" transform="translate(496 534)">
          <ellipse cx="0" cy="24" rx="54" ry="10" fill="#000" opacity=".22"/>
          <path d="M-46 14 q-16 -4 -20 6 q12 8 22 4" fill="#b68455" stroke="#96693f" stroke-width="2.2" stroke-linejoin="round"/>
          <ellipse cx="0" cy="8" rx="44" ry="21" fill="#cf9b68" stroke="#a97b4e" stroke-width="2.6"/>
          <ellipse cx="2" cy="12" rx="30" ry="10" fill="#e8bd8e" opacity=".55"/>
          <circle cx="34" cy="-4" r="20" fill="#d9ab7a" stroke="#a97b4e" stroke-width="2.6"/>
          <path d="M22 -18 q-8 -14 -19 -9 q1 12 8 15 Z" fill="#a97b4e" stroke="#8a6039" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M46 -18 q9 -13 19 -6 q-2 11 -9 14 Z" fill="#a97b4e" stroke="#8a6039" stroke-width="1.8" stroke-linejoin="round"/>
          <ellipse cx="41" cy="0" rx="4.4" ry="3.2" fill="#3a2b26"/>
          <path d="M41 4 q-3 4 1 5" stroke="#8a6039" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M28 -10 q4 3 8 0 M45 -10 q4 3 8 0" stroke="#6b4c33" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M-14 2 q10 5 20 0" stroke="#a97b4e" stroke-width="2.4" fill="none" opacity=".5" stroke-linecap="round"/>
        </g>`;
      // 两只棉拖鞋
      const slippers = `
        <g transform="translate(318 548)">
          <ellipse cx="0" cy="16" rx="36" ry="8" fill="#000" opacity=".2"/>
          <g transform="rotate(-6)">
            <path d="M-30 8 q-3 -13 6 -20 q10 -8 22 -4 q12 4 12 15 q0 12 -14 14 q-18 2 -26 -5 Z" fill="#c98fa0" stroke="#a86f80" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M-26 -8 q8 -10 20 -8 q12 2 14 9 q-6 4 -16 3 q-11 -1 -18 -4 Z" fill="#f5dbe3" opacity=".85"/>
            <path d="M-24 -9 q10 -5 22 -4" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>
          </g>
          <g transform="translate(38 4) rotate(8)">
            <path d="M-28 8 q-3 -13 6 -20 q10 -8 22 -4 q12 4 12 15 q0 12 -14 14 q-18 2 -26 -5 Z" fill="#c98fa0" stroke="#a86f80" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M-24 -8 q8 -10 20 -8 q12 2 14 9 q-6 4 -16 3 q-11 -1 -18 -4 Z" fill="#f5dbe3" opacity=".85"/>
            <path d="M-22 -9 q10 -5 22 -4" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>
          </g>
        </g>`;
      artsvg = `<svg class="scene-svg" viewBox="0 0 800 588" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bdWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#221b38"/><stop offset="1" stop-color="#2f2549"/></linearGradient>
          <linearGradient id="bdFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#332b49"/><stop offset="1" stop-color="#201a31"/></linearGradient>
          <linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1634"/><stop offset="1" stop-color="#2b3f78"/></linearGradient>
          <linearGradient id="bdBlanket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a97c9c"/><stop offset="1" stop-color="#7a5677"/></linearGradient>
          <linearGradient id="pstG1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2040"/><stop offset="1" stop-color="#171226"/></linearGradient>
          <linearGradient id="pstG2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e2a4a"/><stop offset="1" stop-color="#111828"/></linearGradient>
          <radialGradient id="bdMoonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="588" fill="url(#bdWall)"/>
        <g opacity=".055" fill="#ffffff">
          ${[40, 120, 200, 280, 360, 440, 520, 600, 680, 760].map((x) => `<rect x="${x}" y="0" width="4" height="470"/>`).join('')}
        </g>
        ${deco}
        <rect y="470" width="800" height="118" fill="url(#bdFloor)"/>
        <path d="M0 470 L800 470" stroke="#463a5e" stroke-width="3"/>
        <ellipse cx="400" cy="540" rx="240" ry="32" fill="#2a2340" opacity=".8"/>
        <!-- 窗户（开着，夜风进来） -->
        <g>
          <rect x="494" y="84" width="230" height="254" rx="12" fill="#0d1430" stroke="#5d4f7c" stroke-width="9"/>
          <rect x="504" y="94" width="210" height="234" rx="6" fill="url(#bdSky)"/>
          ${windowStars}
          <circle cx="610" cy="168" r="54" fill="url(#bdMoonGlow)"/>
          <path d="M622 134 a29 29 0 1 0 18 52 a23 23 0 1 1 -18 -52 Z" fill="#ffeeb8"/>
          <path d="M504 94 L548 120 L548 298 L504 328 Z" fill="#1a2650" stroke="#6a5c8c" stroke-width="6" stroke-linejoin="round"/>
          <path d="M513 108 L540 124 L540 292 L513 310 Z" fill="#33477d" opacity=".5"/>
          <path d="M714 94 L670 120 L670 298 L714 328 Z" fill="#1a2650" stroke="#6a5c8c" stroke-width="6" stroke-linejoin="round"/>
          <path d="M705 108 L678 124 L678 292 L705 310 Z" fill="#33477d" opacity=".5"/>
          <rect x="484" y="330" width="250" height="16" rx="7" fill="#4d4168"/>
          <rect x="484" y="330" width="250" height="5" rx="2.5" fill="#655787" opacity=".8"/>
        </g>
        <!-- 窗帘 -->
        <path class="curtain" d="M446 62 L512 62 Q500 150 506 246 Q510 318 498 380 L440 380 Q450 300 444 214 Q440 136 446 62 Z" fill="#5b3a70" stroke="#4a2f5c" stroke-width="2.5" stroke-linejoin="round"/>
        <path class="curtain" style="animation-delay:-2.2s" d="M712 62 L778 62 Q768 136 764 214 Q758 300 768 380 L710 380 Q698 318 702 246 Q708 150 696 62 Z" fill="#5b3a70" stroke="#4a2f5c" stroke-width="2.5" stroke-linejoin="round"/>
        <g opacity=".22" stroke="#8b6aa6" stroke-width="2.4" fill="none">
          <path d="M464 74 Q452 200 466 366"/>
          <path d="M488 74 Q478 200 490 366"/>
          <path d="M722 74 Q714 200 726 366"/>
          <path d="M748 74 Q740 200 750 366"/>
        </g>
        <!-- 床（缩小） -->
        <g>
          <g transform="translate(72 86) scale(0.8)">
            <rect x="114" y="306" width="48" height="198" rx="12" fill="#443858" stroke="#362c47" stroke-width="3"/>
            <rect x="148" y="424" width="534" height="76" rx="12" fill="#3b3152" stroke="#2d2640" stroke-width="3"/>
            <rect x="156" y="494" width="18" height="26" rx="5" fill="#282136"/>
            <rect x="656" y="494" width="18" height="26" rx="5" fill="#282136"/>
            <rect x="160" y="392" width="520" height="44" rx="14" fill="#8a7caa"/>
            <rect x="160" y="392" width="520" height="15" rx="7.5" fill="#9d90bd" opacity=".75"/>
            <rect x="186" y="356" width="132" height="60" rx="28" fill="#ded6ee" stroke="#c1b7d6" stroke-width="2.5"/>
            <path d="M196 384 Q228 374 258 384" stroke="#c9bfdd" stroke-width="2.4" fill="none" opacity=".9"/>
            <!-- 被子：鼓起来的波浪轮廓 -->
            <path d="M286 400 Q300 372 330 380 Q352 386 372 368 Q392 350 418 366 Q440 380 464 372 Q492 362 516 378 Q534 388 556 382 L662 382 Q678 382 678 400 L678 468 Q678 484 660 484 L300 484 Q286 484 286 470 Z" fill="url(#bdBlanket)" stroke="#6c4b69" stroke-width="3" stroke-linejoin="round"/>
            <path d="M290 398 Q304 372 332 380 Q354 386 374 368 Q394 350 420 366 Q442 380 466 372 Q494 362 518 378 Q536 388 558 382 L660 382" stroke="#c9a3bd" stroke-width="7" fill="none" opacity=".45" stroke-linecap="round"/>
            <ellipse cx="352" cy="392" rx="26" ry="12" fill="#c69cb6" opacity=".4"/>
            <ellipse cx="444" cy="386" rx="30" ry="13" fill="#c69cb6" opacity=".35"/>
            <ellipse cx="536" cy="394" rx="24" ry="11" fill="#c69cb6" opacity=".3"/>
            <path d="M330 424 Q380 440 436 428" stroke="#8f6684" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>
            <path d="M470 442 Q530 452 596 436" stroke="#8f6684" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
            <path d="M556 402 Q600 408 650 400" stroke="#b18ca8" stroke-width="2.6" fill="none" opacity=".3" stroke-linecap="round"/>
          </g>
          ${sleepy}
        </g>
        ${dog}
        ${slippers}
        <text class="zzz" x="300" y="344" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#cfc6f0">Z</text>
        <text class="zzz" style="animation-delay:1.1s" x="326" y="322" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#cfc6f0">z</text>
        <text class="zzz" style="animation-delay:2.2s" x="344" y="306" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="#cfc6f0">z</text>
      </svg>`;
      pos = { kid: false };
    }

    if (period === 'night' && idx === 1) {
      let shimmer = '';
      [[130, 384, 62], [310, 400, 48], [490, 390, 70], [630, 406, 52], [230, 420, 40]]
        .forEach(([x, y, w], i) => { shimmer += `<rect class="shimmer" style="animation-delay:${i * .5}s" x="${x}" y="${y}" width="${w}" height="4.5" rx="2.2" fill="#a8c8ff"/>`; });
      artsvg = `<svg class="scene-svg" viewBox="0 0 800 588" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="nSky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121838"/><stop offset=".7" stop-color="#243064"/><stop offset="1" stop-color="#3a4a80"/></linearGradient>
          <linearGradient id="nSea1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a70"/><stop offset="1" stop-color="#141f42"/></linearGradient>
          <linearGradient id="nSand1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#322a44"/><stop offset="1" stop-color="#241e36"/></linearGradient>
        </defs>
        <rect width="800" height="370" fill="url(#nSky1)"/>
        ${[[80, 86], [190, 58], [320, 108], [430, 68], [540, 128], [700, 88], [640, 178], [130, 168], [370, 178], [250, 138], [470, 150]]
          .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff" class="spk" style="animation-delay:${i * .3}s"/>`).join('')}
        <circle cx="180" cy="106" r="48" fill="#ffe9a8" opacity=".16"/><circle cx="180" cy="106" r="30" fill="#ffeeb8"/>
        <rect y="356" width="800" height="132" fill="url(#nSea1)"/>
        <path class="wave" d="M-20 378 Q60 370 140 378 T300 378 T460 378 T620 378 T780 378 T940 378" stroke="#9fc4ff" stroke-width="2.6" fill="none" opacity=".32"/>
        <!-- 帆船（浮在海面） -->
        <g transform="translate(608 338) scale(1.15)">
          <g class="boat">
            <path d="M-2 -76 L-2 12" stroke="#5a4436" stroke-width="4" stroke-linecap="round"/>
            <path d="M3 -72 L3 12 L48 12 Z" fill="#f2ede0" stroke="#d6cfc0" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M-3 -62 L-3 12 L-33 12 Z" fill="#d8d2c0" stroke="#c0b9a8" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M-40 12 L40 12 L27 38 L-27 38 Z" fill="#5a4436" stroke="#463327" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M-40 12 L40 12" stroke="#7d6552" stroke-width="3.4"/>
            <path d="M2 -74 L34 -22 L2 -22 Z" fill="#ffffff" opacity=".25"/>
          </g>
        </g>
        <path d="M520 380 Q570 372 620 380 Q670 388 718 380" stroke="#8fb4ff" stroke-width="2.6" fill="none" opacity=".35"/>
        ${shimmer}
        <path d="M0 476 Q220 462 440 472 Q650 482 800 468 L800 588 L0 588 Z" fill="url(#nSand1)"/>
        <path d="M0 476 Q220 462 440 472 Q650 482 800 468" stroke="#4a4268" stroke-width="3" fill="none" opacity=".7"/>
        <!-- 沙滩上的小螃蟹和贝壳 -->
        <g transform="translate(238 546)"><g class="crab">
          <ellipse cx="0" cy="0" rx="14" ry="9" fill="#a85450" stroke="#7d3a38" stroke-width="2"/>
          <circle cx="-13" cy="-7" r="4.3" fill="#a85450" stroke="#7d3a38" stroke-width="1.6"/>
          <circle cx="13" cy="-7" r="4.3" fill="#a85450" stroke="#7d3a38" stroke-width="1.6"/>
          <circle cx="-15" cy="-8.6" r="1.4" fill="#2a1e22"/><circle cx="15" cy="-8.6" r="1.4" fill="#2a1e22"/>
          <path d="M-8 7 L-12 14 M-3 8 L-4 15 M3 8 L4 15 M8 7 L12 14" stroke="#7d3a38" stroke-width="2.1" stroke-linecap="round"/>
        </g></g>
        <g transform="translate(614 534)"><g class="crab" style="animation-delay:-3.5s">
          <ellipse cx="0" cy="0" rx="11" ry="7.4" fill="#b25c55" stroke="#823f3b" stroke-width="2"/>
          <circle cx="-10" cy="-6" r="3.6" fill="#b25c55" stroke="#823f3b" stroke-width="1.5"/>
          <circle cx="10" cy="-6" r="3.6" fill="#b25c55" stroke="#823f3b" stroke-width="1.5"/>
          <circle cx="-12" cy="-7.4" r="1.2" fill="#2a1e22"/><circle cx="12" cy="-7.4" r="1.2" fill="#2a1e22"/>
          <path d="M-7 6 L-10 12 M-2 7 L-3 13 M2 7 L3 13 M7 6 L10 12" stroke="#823f3b" stroke-width="1.9" stroke-linecap="round"/>
        </g></g>
        <g transform="translate(330 570)">
          <path d="M0 0 C-19 -7 -18 -25 0 -25 C18 -25 19 -7 0 0 Z" fill="#cfc3e0" stroke="#a898c2" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M0 -3 L0 -22 M-7 -5 L-7 -21 M7 -5 L7 -21 M-13 -8 L-12 -18 M13 -8 L12 -18" stroke="#b2a3cc" stroke-width="1.3" stroke-linecap="round"/>
        </g>
      </svg>`;
      pos = { kidX: 400, kidY: 520, kidScale: 1.1 };
    }

    const kidSvg = `<g transform="translate(${pos.kidX} ${pos.kidY})">
      <g class="kid-anim scene-kid">
        ${kid(Object.assign({}, k, { scale: pos.kidScale }))}
      </g>
    </g>`;
    /* VIP：小朋友身边两只萤火虫（床景里小朋友躺在床上，位置单独取） */
    let ffSvg = '';
    if (k.vip) {
      const fx = pos.kid === false ? 292 : pos.kidX;
      const fy = pos.kid === false ? 404 : pos.kidY - 150;
      const fly = (x, y, delay, dur) => `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><g class="ff-fly" style="animation-delay:${delay}s;animation-duration:${dur}s">
        <circle r="11" fill="#ffe98a" opacity=".10"/><circle r="6" fill="#ffe98a" opacity=".2"/>
        <circle r="2.5" fill="#fff3b0"/><circle r="1.2" fill="#fffbe0"/>
      </g></g>`;
      ffSvg = `<g class="vip-ff">${fly(fx - 96, fy + 26, -0.4, 6)}${fly(fx + 92, fy - 14, -3.1, 7.4)}</g>`;
    }
    global.QuitArt.lastPos = pos;
    if (pos.kid === false) return artsvg.replace('</svg>', ffSvg + '</svg>');
    return artsvg.replace('</svg>', kidSvg + ffSvg + '</svg>');
  }

  global.QuitArt = { kid, kidSVG, stageOf, peki, pekiHead, pekiBg, pekiAvatar, ghostBody, bath, girlHead, dog, catSit, grave, lungs, liver, belly, scene, shade, forbidden };
})(window);
