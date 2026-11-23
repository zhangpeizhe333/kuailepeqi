import UIKit
import WebKit
import StoreKit
import AuthenticationServices

/*
 * 快乐佩奇 iOS 版 · 网页壳 + StoreKit 2 内购 + Sign in with Apple + Google 登录
 *
 * 使用方式（Xcode）：
 *   1. 新建 iOS App，Language = Swift，把本文件替换 AppDelegate.swift
 *   2. Info.plist 需要的配置见 README-上架指南.md
 *   3. 必须在 Apple Developer 后台给 App ID 打开 “Sign in with Apple” Capability，
 *      并在 Xcode Target → Signing & Capabilities 添加该 Capability（会生成 entitlements）。
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
        AuthManager.shared.webView = vc.webView
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
        content.add(AuthScriptHandler.shared, name: "apple")
        content.add(AuthScriptHandler.shared, name: "google")
        cfg.userContentController = content

        webView = WKWebView(frame: view.bounds, configuration: cfg)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        view.addSubview(webView)

        // App 审核期间可以指向线上 iOS 版；也可以打包本地 HTML（改成 Bundle 资源 URL）
        let url = URL(string: "https://zhangpeizhe333.github.io/kuailepeqi/ios/")!
        // 每次冷启动都强制取最新 HTML/CSS，避免 CDN 缓存导致旧样式
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

/* ============================================================
   JS ↔ Swift 桥
   - iap    : window.webkit.messageHandlers.iap.postMessage({action:'buy'|'restore'|'prices', sku})
   - apple  : ...messageHandlers.apple.postMessage({action:'signIn'})
   - google : ...messageHandlers.google.postMessage({action:'signIn'})
   回调统一写回 window.__iapResult / window.__appleResult / window.__googleResult
   ============================================================ */
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
            case "prices":
                await IAPManager.shared.prices()
            default:
                break
            }
        }
    }
}

final class AuthScriptHandler: NSObject, WKScriptMessageHandler {
    static let shared = AuthScriptHandler()

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String, action == "signIn" else { return }
        Task { @MainActor in
            if message.name == "apple" {
                AuthManager.shared.appleSignIn()
            } else if message.name == "google" {
                AuthManager.shared.googleSignIn()
            }
        }
    }
}

/* ============================================================
   登录管理：Sign in with Apple + Google（Supabase OAuth）
   ============================================================ */
final class AuthManager: NSObject,
                         ASAuthorizationControllerDelegate,
                         ASAuthorizationControllerPresentationContextProviding,
                         ASWebAuthenticationPresentationContextProviding {
    static let shared = AuthManager()
    weak var webView: WKWebView?
    private var authSession: ASWebAuthenticationSession?

    // MARK: - Sign in with Apple
    func appleSignIn() {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequest()
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            notifyApple(["ok": false, "err": "unknown"])
            return
        }
        let user = credential.user
        let identityToken = String(data: credential.identityToken ?? Data(), encoding: .utf8) ?? ""

        // Apple 只在「首次授权」返回 email / fullName，之后同一用户再次登录不会返回。
        // 缓存到 UserDefaults，后续登录沿用，保证 H5 端拿得到邮箱做账号标识。
        let email: String
        if let e = credential.email, !e.isEmpty {
            email = e
            UserDefaults.standard.set(e, forKey: "kp_apple_email_" + user)
        } else {
            email = UserDefaults.standard.string(forKey: "kp_apple_email_" + user) ?? "Apple"
        }

        var name = ""
        if let fullName = credential.fullName {
            name = [fullName.givenName, fullName.familyName]
                .compactMap { $0 }.joined(separator: " ")
        }
        if name.isEmpty {
            name = UserDefaults.standard.string(forKey: "kp_apple_name_" + user) ?? ""
        } else {
            UserDefaults.standard.set(name, forKey: "kp_apple_name_" + user)
        }

        notifyApple([
            "ok": true,
            "user": user,
            "idToken": identityToken,
            "email": email,
            "name": name,
        ])
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithError error: Error) {
        let nsError = error as NSError
        if nsError.code == ASAuthorizationError.canceled.rawValue {
            notifyApple(["ok": false, "err": "cancel"])
        } else {
            notifyApple(["ok": false, "err": "failed"])
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return webView?.window ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow }) ?? UIWindow()
    }

    // MARK: - Google（Supabase OAuth + ASWebAuthenticationSession）
    func googleSignIn() {
        let supabase = "https://urvoelbmqdlkbdicthlc.supabase.co"
        let redirect = "kuailepeqi://auth-callback"
        let encoded = redirect.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? redirect
        let urlString = supabase + "/auth/v1/authorize?provider=google&redirect_to=" + encoded
        guard let url = URL(string: urlString) else {
            notifyGoogle(["ok": false, "err": "badurl"])
            return
        }
        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: "kuailepeqi"
        ) { [weak self] callbackURL, error in
            guard let self = self else { return }
            if let error = error {
                let ns = error as NSError
                if ns.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                    self.notifyGoogle(["ok": false, "err": "cancel"])
                } else {
                    self.notifyGoogle(["ok": false, "err": "failed"])
                }
                return
            }
            guard let cb = callbackURL,
                  let fragment = cb.fragment else {
                self.notifyGoogle(["ok": false, "err": "nofragment"])
                return
            }
            let params = self.parseQuery(fragment)
            guard let token = params["access_token"] else {
                self.notifyGoogle(["ok": false, "err": "notoken"])
                return
            }
            // H5 的 __googleResult 走 session.access_token 分支
            self.notifyGoogle(["ok": true, "session": ["access_token": token]])
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        self.authSession = session
        session.start()
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return webView?.window ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow }) ?? UIWindow()
    }

    // MARK: - 工具
    private func parseQuery(_ query: String) -> [String: String] {
        var result: [String: String] = [:]
        for pair in query.split(separator: "&") {
            let kv = pair.split(separator: "=", maxSplits: 1)
            if kv.count == 2 {
                let key = String(kv[0])
                let value = String(kv[1]).removingPercentEncoding ?? String(kv[1])
                result[key] = value
            }
        }
        return result
    }

    private func js(_ function: String, _ dict: [String: Any]) {
        guard let webView = webView else { return }
        let data = try? JSONSerialization.data(withJSONObject: dict, options: [])
        let json = String(data: data ?? Data(), encoding: .utf8) ?? "{}"
        webView.evaluateJavaScript("\(function)(\(json))", completionHandler: nil)
    }

    private func notifyApple(_ dict: [String: Any]) { js("window.__appleResult", dict) }
    private func notifyGoogle(_ dict: [String: Any]) { js("window.__googleResult", dict) }
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

    @available(iOS 15.0, *)
    func prices() async {
        do {
            let products = try await Product.products(for: Array(plans.keys))
            var map: [String: String] = [:]
            for p in products {
                map[p.id] = p.displayPrice
            }
            guard let webView = webView else { return }
            let data = try? JSONSerialization.data(withJSONObject: map, options: [])
            let json = String(data: data ?? Data(), encoding: .utf8) ?? "{}"
            webView.evaluateJavaScript("window.__iapPrices(\(json))", completionHandler: nil)
        } catch {
            // 价格拉取失败不影响购买
        }
    }

    /// 通知网页：window.KKIAP.callback({...}) → 页面 __iapResult → 开通/提示
    private func notify(type: String, sku: String = "", tx: String = "") {
        guard let webView = webView else { return }
        let js: String
        switch type {
        case "bought", "restored":
            js = String(format: "KKIAP.callback({type:'%@',sku:'%@',tx:'%@'})", type, sku, tx)
        default:
            js = String(format: "KKIAP.callback({type:'%@'})", type)
        }
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
