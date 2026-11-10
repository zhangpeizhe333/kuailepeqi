# 快乐佩奇 · iOS 上架指南

本目录（`ios/`）是 **iOS 专版网页**，与安卓/网页主版本（仓库根目录）完全独立，主版本内容保持不变。

iOS 版差异（相对主版本）：
- ❌ 无「联系客服」菜单、无客服微信号、无任何微信/外部支付字样
- ❌ 无「下载安卓 App / APK 链接」
- ✅ 会员购买走 **App Store 内购（IAP，StoreKit 2）**，价格按钮 ¥8/月、¥88/年、¥188/永久
- ✅ 保留**兑换码**功能（文案为「兑换码」，说明改为「兑换码由活动发放」）
- ✅ 有**恢复购买**按钮（Apple 必需）
- ✅ 一次购买对应固定时长，**不自动续费**（避免订阅合规负担，推荐）
- ✅ 附带隐私政策页 `privacy.html` 与用户协议页 `terms.html`

---

## 一、网页版在线预览

`https://zhangpeizhe333.github.io/kuailepeqi/ios/`

浏览器里点「购买」会提示「请在 App Store 版本中购买」——这是正常的，只有装进 iOS App（有原生桥）才会真正走内购。

## 二、需要的账号与设备

| 项目 | 费用 | 说明 |
|---|---|---|
| Apple 开发者账号 | $99/年 | developer.apple.com 注册（个人或公司账号；公司账号需要 DUNS） |
| Mac 电脑 | — | 需要 Xcode 15+（从 Mac App Store 安装） |

## 三、创建 Xcode 工程（10 分钟）

1. Xcode → File → New → Project → **iOS App**，Language 选 **Swift**，Interface 任意
2. Product Name 建议 `KuailePeqi`，Bundle ID 建议 `com.zhangpeizhe.kuailepeqi`
3. 删除模板的 `ContentView.swift` / `SceneDelegate.swift` 冲突文件
4. 把 `ios/native/AppShell.swift` 拖进工程（勾选 Copy items）
5. `ios/native/PrivacyInfo.xcprivacy` 也拖进工程
6. TARGETS → General：
   - App Icons：把 `AppIcon-1024.png` 加进 AppIcon（单尺寸 1024）
   - Deployment Target 建议 iOS 16.0
7. TARGETS → Signing & Capabilities：选你的开发者账号，自动签名

## 四、App Shell 的加载地址

`AppShell.swift` 里默认加载线上地址：

```swift
let url = URL(string: "https://zhangpeizhe333.github.io/kuailepeqi/ios/")!
```

这样 App 内容随时可更新、审核改动不用重新提审。也可以把 `ios/` 目录打进 Bundle 离线加载（改成本地 URL），两种方式二选一。

⚠️ 若用线上地址，App 里不要再有下载按钮、外部链接引导绕过 App Store 的内容（iOS 版已处理干净）。

## 五、App Store Connect 配置内购（关键）

1. 登录 [App Store Connect](https://appstoreconnect.apple.com) → 我的 App → 新建 App（填名称、语言、Bundle ID、SKU）
2. 左侧「功能」→ **App 内购买项目** → 新建 3 个**非消耗型（Non-Consumable）**商品：

| Product ID | 显示名 | 价格（中国区价格点） | 用途 |
|---|---|---|---|
| `vip_month` | 陪伴会员 · 30 天 | ¥8 | 30 天会员 |
| `vip_year` | 陪伴会员 · 1 年 | ¥88 | 365 天会员 |
| `vip_forever` | 陪伴会员 · 永久 | ¥188 | 永久会员 |

   每个 商品都要填：本地化描述 + 审核截图（把会员面板截图上传即可）
3. Apple 收款分成 30%（年营收 100 万美元以下可申请「小型企业计划」降到 15%）
4. 不自动续费 = 不用处理订阅条款，审核风险最低；以后想做订阅再说

## 六、App Store Connect 信息填报

- **隐私政策 URL**：`https://zhangpeizhe333.github.io/kuailepeqi/ios/privacy.html`
- **用户协议（服务条款）URL**：`https://zhangpeizhe333.github.io/kuailepeqi/ios/terms.html`
- **技术支持 URL**：可以填你的 GitHub Pages 主页，或在 README 里放一个邮箱
- **App 隐私**：收集「其他用户内容」「购买记录」，用于 App 功能，不用于追踪（与 PrivacyInfo.xcprivacy 一致）
- **分类**：健康健美（或生活方式）
- **年龄分级**：4+（社区有用户聊天，如审核要求可答问卷后定级）

## 七、提审与常见被拒点（已提前处理/需注意）

| 审核条款 | 处理情况 |
|---|---|
| 3.1.1 付费必须走 IAP | ✅ 全部购买按钮走 StoreKit，站外无任何购买引导，无客服微信 |
| 3.1.2 必须有恢复购买 | ✅ 会员面板有「恢复购买」按钮 |
| 2.3 元数据准确 | 副标题不要写"免费"，因为有内购 |
| 1.2 UGC（社区聊天） | 已有：拉黑、删除、敏感词可自行补充。**建议**：加一个「举报」入口更稳 |
| 5.1.1 隐私 | ✅ 隐私政策 URL 已准备 |

**建议补充（提高过审率）**：提审时在「App 审核信息」备注里写清：会员可通过 App Store 内购或官方活动兑换码开通，无任何外部支付渠道。

## 八、打包与上传

1. Xcode 顶部设备选 **Any iOS Device (arm64)**
2. Product → Archive
3. Archives 窗口 → **Distribute App** → App Store Connect → 上传
4. 回 App Store Connect → 提交审核（内购商品要和 App 一起提交）

## 九、真实内购测试

- 沙盒测试账号：App Store Connect → 用户和访问 → 沙盒测试员，建一个测试 Apple ID
- 真机登录沙盒账号（设置 → App Store → 沙盒账户），装 App 后购买不扣真钱
- 验证点：购买后会员面板显示生效时长；删除 App 重装后「恢复购买」能找回；兑换码正常

## 十、以后更新

- 网页内容更新：改主版本后跑 `node tools/build-ios.js`，提交仓库即可（App 是网页壳，自动生效）
- 购买时长调整：同步改 `game.js` 的 `IAP_SKUS` 和 `AppShell.swift` 的 `plans`
