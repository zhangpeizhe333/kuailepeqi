import UIKit
import WebKit
import StoreKit
import PhotosUI
import AuthenticationServices

/*
 * 快乐佩奇 iOS 版 · 网页壳 + StoreKit 2 内购 + Google OAuth 登录
 *
 * App Store Connect 中创建 3 个内购商品（Product ID 必须完全一致）：
 *   订阅组（自动续订）：vip_month、vip_year
 *   非消耗型：vip_forever
 * Google 登录：Supabase OAuth（kuailepeqi://oauth 回调），无需 Google 原生 SDK
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
        GoogleAuth.shared.webView = vc.webView
        IAPManager.shared.start()
        return true
    }
}

final class ShellViewController: UIViewController, WKNavigationDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        // 与网页主体背景一致的深紫，安全区外露出的部分不突兀
        view.backgroundColor = UIColor(red: 0x10/255.0, green: 0x0c/255.0, blue: 0x1e/255.0, alpha: 1)

        let cfg = WKWebViewConfiguration()
        cfg.preferences.isElementFullscreenEnabled = true
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []

        let content = WKUserContentController()
        content.add(IAPScriptHandler.shared, name: "iap")
        content.add(GoogleScriptHandler.shared, name: "google")
        cfg.userContentController = content

        webView = WKWebView(frame: view.bounds, configuration: cfg)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.backgroundColor = view.backgroundColor
        webView.isOpaque = false
        view.addSubview(webView)

        // 页面完整落在安全区内：顶部避开状态栏/灵动岛，底部避开 Home 指示条
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        let url = URL(string: "https://zhangpeizhe333.github.io/kuailepeqi/ios/")!
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

extension ShellViewController: WKUIDelegate {
    /* 网页 <input type="file">（拍照 / 相册）：自建「拍照 / 从相册选择」，观感与安卓版一致 */
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping ([URL]?) -> Void) {
        PhotoPicker.present(from: self) { url in
            completionHandler(url != nil ? [url!] : nil)
        }
    }

    /* getUserMedia（相机/麦克风）直接放行；权限弹窗由系统按 Info.plist 描述展示 */
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler(true) })
        a.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
        a.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(nil) })
        present(a, animated: true)
    }
}

/* ---------------- 拍照 / 相册选择 ---------------- */
enum PhotoPicker {
    static func present(from vc: UIViewController, completion: @escaping (URL?) -> Void) {
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            alert.addAction(UIAlertAction(title: "📷 拍照", style: .default) { _ in
                let picker = UIImagePickerController()
                picker.sourceType = .camera
                presentWith(vc, picker, completion)
            })
        }
        alert.addAction(UIAlertAction(title: "🖼 从相册选择", style: .default) { _ in
            var cfg = PHPickerConfiguration()
            cfg.filter = .images
            cfg.selectionLimit = 1
            let libPicker = PHPickerViewController(configuration: cfg)
            presentWith(vc, libPicker, completion)
        })
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completion(nil) })
        vc.present(alert, animated: true)
    }

    private static func presentWith(_ vc: UIViewController, _ picker: UIViewController,
                                    _ completion: @escaping (URL?) -> Void) {
        let coordinator = PhotoPickerCoordinator(completion: completion)
        PhotoPickerCoordinator.active = coordinator // 保住引用，防止被释放
        picker.delegate = coordinator
        vc.present(picker, animated: true)
    }
}

final class PhotoPickerCoordinator: NSObject, UIImagePickerControllerDelegate,
                                    UINavigationControllerDelegate, PHPickerViewControllerDelegate {
    static var active: PhotoPickerCoordinator?
    let completion: (URL?) -> Void

    init(completion: @escaping (URL?) -> Void) { self.completion = completion }

    func imagePickerController(_ picker: UIImagePickerController,
                               didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        finish(info[.originalImage] as? UIImage)
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { finish(nil) }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        guard let item = results.first?.itemProvider, item.canLoadObject(ofClass: UIImage.self) else {
            finish(nil); return
        }
        item.loadObject(ofClass: UIImage.self) { [self] obj, _ in
            DispatchQueue.main.async { finish(obj as? UIImage) }
        }
    }

    private func finish(_ image: UIImage?) {
        let done = completion
        PhotoPickerCoordinator.active = nil
        guard let img = image else { done(nil); return }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("kk_\(Int(Date().timeIntervalSince1970 * 1000)).jpg")
        if let data = img.jpegData(compressionQuality: 0.92) {
            try? data.write(to: url)
            done(url)
        } else {
            done(nil)
        }
    }
}

/* ---------------- Google OAuth 登录（Supabase implicit flow） ---------------- */
final class GoogleScriptHandler: NSObject, WKScriptMessageHandler {
    static let shared = GoogleScriptHandler()

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String, action == "signIn" else { return }
        DispatchQueue.main.async { GoogleAuth.shared.signIn() }
    }
}

final class GoogleAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = GoogleAuth()
    weak var webView: WKWebView?
    private var session: ASWebAuthenticationSession?

    @MainActor
    func signIn() {
        guard let webView = webView else { return }
        let redirect = "kuailepeqi://oauth"
        let authorize = "https://urvoelbmqdlkbdicthlc.supabase.co/auth/v1/authorize?provider=google&redirect_to=" +
            redirect.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        let s = ASWebAuthenticationSession(url: URL(string: authorize)!, callbackURLScheme: "kuailepeqi") { [weak self] callback, error in
            DispatchQueue.main.async {
                self?.session = nil
                guard let url = callback else {
                    let canceled = (error as NSError?)?.code == ASWebAuthenticationSessionError.canceledLogin.rawValue
                    self?.sendJS("window.__googleResult({ok:false, err:'\(canceled ? "cancel" : "fail")'})")
                    return
                }
                self?.deliver(url: url)
            }
        }
        s.presentationContextProvider = self
        session = s
        if !s.start() {
            sendJS("window.__googleResult({ok:false, err:'fail'})")
        }
    }

    private func deliver(url: URL) {
        guard let fragment = URLComponents(url: url, resolvingAgainstBaseURL: false)?.fragment else {
            sendJS("window.__googleResult({ok:false, err:'fail'})"); return
        }
        let items = URLComponents(string: "?\(fragment)")?.queryItems ?? []
        let at = items.first(where: { $0.name == "access_token" })?.value ?? ""
        let rt = items.first(where: { $0.name == "refresh_token" })?.value ?? ""
        guard !at.isEmpty, !rt.isEmpty else {
            sendJS("window.__googleResult({ok:false, err:'fail'})"); return
        }
        sendJS("window.__googleResult({ok:true, session:{access_token:'\(at)',refresh_token:'\(rt)'}})")
    }

    private func sendJS(_ js: String) {
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        webView?.window ?? ASPresentationAnchor()
    }
}

/* ---------------- JS ↔ Swift 桥：内购 ---------------- */
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
    private let skus = ["vip_month", "vip_year", "vip_forever"]

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

    /// 页面启动时调用：回填 App Store 本地化价格（每个地区自动显示当地货币）
    @available(iOS 15.0, *)
    func prices() async {
        do {
            let products = try await Product.products(for: skus)
            guard !products.isEmpty else { return } // 商品未配置时不覆盖页面默认价
            var map: [String: String] = [:]
            for p in products { map[p.id] = p.displayPrice }
            guard let data = try? JSONSerialization.data(withJSONObject: map),
                  let json = String(data: data, encoding: .utf8) else { return }
            await MainActor.run {
                webView?.evaluateJavaScript("window.__iapPrices && window.__iapPrices(\(json))", completionHandler: nil)
            }
        } catch { /* 价格拿不到就维持页面默认，不干扰购买 */ }
    }

    @available(iOS 15.0, *)
    func buy(sku: String) async {
        do {
            let products = try await Product.products(for: [sku])
            guard let product = products.first else {
                notify(type: "error", msg: "会员商品还没就绪（App Store 正在处理），过几分钟再试")
                return
            }
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    await transaction.finish()
                    notify(type: "bought", sku: sku, tx: String(transaction.id))
                } else {
                    notify(type: "error", msg: "购买校验没通过，没有扣款，请再试一次")
                }
            case .userCancelled:
                notify(type: "cancel")
            case .pending:
                notify(type: "error", msg: "购买待家长/账号批准，批准后自动生效")
            default:
                notify(type: "error", msg: "购买没成功，请再试一次")
            }
        } catch {
            notify(type: "error", msg: "购买没成功，请检查网络后再试")
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
            notify(type: "error", msg: "恢复购买没成功，请检查网络后再试")
        }
    }

    /// 通知网页：window.KKIAP.callback({...}) → 页面 __iapResult → 开通/提示
    private func notify(type: String, sku: String = "", tx: String = "", msg: String = "") {
        guard let webView = webView else { return }
        let days = plans[sku]?.days ?? 0
        let js: String
        switch type {
        case "bought", "restored":
            js = String(format: "KKIAP.callback({type:'%@',sku:'%@',tx:'%@',days:%d})",
                        type, sku, tx, days)
        default:
            let m = msg.replacingOccurrences(of: "'", with: "\\'")
            js = String(format: "KKIAP.callback({type:'%@',msg:'%@'})", type, m)
        }
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
