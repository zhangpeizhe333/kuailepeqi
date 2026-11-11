import UIKit
import WebKit
import StoreKit

/*
 * 快乐佩奇 iOS 版 · 网页壳 + StoreKit 2 内购
 *
 * 使用方式（Xcode）：
 *   1. 新建 iOS App（Storyboard 不需要，见下方说明），Language = Swift，Interface = Storyboard（或留空）
 *   2. 把本文件替换 AppDelegate.swift（或作为 SceneDelegate 入口）
 *   3. Info.plist 需要的配置见 README-上架指南.md
 *   4. App Store Connect 中创建 3 个非消耗型内购商品（Product ID 必须完全一致）：
 *        vip_month    ¥8      30 天会员
 *        vip_year     ¥88     365 天会员
 *        vip_forever  ¥188    永久会员
 */

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        let vc = ShellViewController()
        window.rootViewController = vc
        window.makeKeyAndVisible()
        self.window = window
        IAPManager.shared.webView = vc.webView
        IAPManager.shared.start()
        return true
    }
}

final class ShellViewController: UIViewController, WKNavigationDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        let cfg = WKWebViewConfiguration()
        cfg.preferences.isElementFullscreenEnabled = true
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []

        let content = WKUserContentController()
        content.add(IAPScriptHandler.shared, name: "iap")
        cfg.userContentController = content

        webView = WKWebView(frame: view.bounds, configuration: cfg)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        view.addSubview(webView)

        // App 审核期间可以指向线上 iOS 版；也可以打包本地 HTML（改成 Bundle 资源 URL）
        let url = URL(string: "https://zhangpeizhe333.github.io/kuailepeqi/ios/")!
        // 网页壳每次冷启动都强制取最新 HTML/CSS：GitHub Pages 的 CDN 有 10 分钟缓存，
        // 用默认缓存策略时线上刚改完样式、App 里刷新仍会显示旧的（发暗的）按钮配色。
        let req = URLRequest(url: url,
                             cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
                             timeoutInterval: 20)
        webView.load(req)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // 站外链接（隐私政策、条款）交给系统浏览器打开，审核时更友好
        if let host = navigationAction.request.url?.host,
           !host.contains("zhangpeizhe333.github.io"),
           navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(navigationAction.request.url!)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}

/// JS ↔ Swift 桥：页面通过 window.webkit.messageHandlers.iap.postMessage({action:'buy'|'restore', sku}) 发消息
final class IAPScriptHandler: NSObject, WKScriptMessageHandler {
    static let shared = IAPScriptHandler()

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }
        Task { @MainActor in
            switch action {
            case "buy":
                let sku = body["sku"] as? String ?? ""
                await IAPManager.shared.buy(sku: sku)
            case "restore":
                await IAPManager.shared.restore()
            default:
                break
            }
        }
    }
}

@available(iOS 15.0, *)
final class IAPManager {
    static let shared = IAPManager()
    weak var webView: WKWebView?
    private var updatesTask: Task<Void, Never>?

    /// 商品 ID → 页面会员方案（与 JS 侧 IAP_SKUS 保持一致）
    private let plans: [String: (days: Int, plan: String)] = [
        "vip_month": (30, "30 天"),
        "vip_year": (365, "1 年"),
        "vip_forever": (36500, "永久"),
    ]

    func start() {
        guard #available(iOS 15.0, *) else { return }
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let t) = result {
                    await t.finish()
                    await MainActor.run {
                        self?.notify(type: "restored", sku: t.productID, tx: String(t.id))
                    }
                }
            }
        }
    }

    @available(iOS 15.0, *)
    func buy(sku: String) async {
        do {
            let products = try await Product.products(for: [sku])
            guard let product = products.first else { notify(type: "error"); return }
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    await transaction.finish()
                    notify(type: "bought", sku: sku, tx: String(transaction.id))
                } else {
                    notify(type: "error")
                }
            case .userCancelled:
                notify(type: "cancel")
            default:
                notify(type: "error")
            }
        } catch {
            notify(type: "error")
        }
    }

    @available(iOS 15.0, *)
    func restore() async {
        do {
            try await AppStore.sync()
            var found = 0
            for await result in Transaction.currentEntitlements {
                if case .verified(let t) = result {
                    found += 1
                    await MainActor.run { notify(type: "restored", sku: t.productID, tx: String(t.id)) }
                }
            }
            if found == 0 { notify(type: "empty") }
        } catch {
            notify(type: "error")
        }
    }

    /// 通知网页：window.KKIAP.callback({...}) → 页面 __iapResult → 开通/提示
    private func notify(type: String, sku: String = "", tx: String = "") {
        guard let webView = webView else { return }
        let days = plans[sku]?.days ?? 0
        let js: String
        switch type {
        case "bought", "restored":
            js = String(format: "KKIAP.callback({type:'%@',sku:'%@',tx:'%@',days:%d})",
                        type, sku, tx, days)
        default:
            js = String(format: "KKIAP.callback({type:'%@'})", type)
        }
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
