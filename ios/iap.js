/* iOS 内购桥接层
 * 优先使用 WKWebView 原生桥（window.webkit.messageHandlers.iap）
 * 其次尝试 Capacitor 原生插件
 * 纯浏览器环境下 available() = false，页面只提示"请在 App Store 版本中购买"，不会崩
 */
(function () {
  const nativeBridge = () =>
    (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iap) || null;
  const capPlugin = () =>
    (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeIAP) || null;

  function post(payload) {
    const n = nativeBridge();
    if (!n) return false;
    try { n.postMessage(payload); return true; } catch (e) { return false; }
  }
  function emit(r) { if (typeof window.__iapResult === 'function') window.__iapResult(r); }

  window.KKIAP = {
    available() { return !!(nativeBridge() || capPlugin()); },

    buy(sku) {
      if (!sku) return;
      if (post({ action: 'buy', sku })) return;
      const cap = capPlugin();
      if (cap && cap.buy) {
        cap.buy({ productId: sku }).then((r) => {
          emit({ type: 'bought', sku, tx: (r && (r.transactionId || r.id)) || sku });
        }).catch(() => emit({ type: 'error' }));
        return;
      }
      emit({ type: 'error' });
    },

    restore() {
      if (post({ action: 'restore' })) return;
      const cap = capPlugin();
      if (cap && cap.restore) {
        cap.restore().then((r) => {
          const list = (r && r.transactions) || [];
          if (!list.length) return emit({ type: 'empty' });
          list.forEach((t) => emit({ type: 'restored', sku: t.productId, tx: t.transactionId }));
        }).catch(() => emit({ type: 'error' }));
        return;
      }
      emit({ type: 'empty' });
    },

    /* 原生层通过 evaluateJavaScript 调用：KKIAP.callback({...}) */
    callback(r) { emit(r); },
  };
})();
