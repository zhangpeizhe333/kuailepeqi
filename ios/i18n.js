/* 快乐佩奇 · 运行时双语层
   中文为源语言，英文通过词典 + 正则在渲染层实时翻译（不改源码，iOS 构建规则不受影响）。
   - 默认跟随系统语言（zh → 中文，其他 → English）
   - 菜单「🌐 Language / 语言」可手动切换，选择存在 localStorage（kk_lang）
   - 用户生成内容（聊天 .chat-body 内）不翻译 */
(function () {
  'use strict';

  /* ---------------- 精确词典：整节点文本 → 英文 ---------------- */
  var EXACT = {
    /* 顶栏 / 登录页 */
    '快乐佩奇': 'Quit Smoke & Drink',
    '戒烟戒酒跟我走': 'Quit Smoke & Drink With Me',
    '游戏制作：张佩喆': 'Made by Zhang Peizhe',
    '断崖式戒烟 · 清醒戒酒 · 运动打卡': 'Cold-turkey quit · Sober living · Daily workouts',
    '让小朋友陪你一起变健康': 'A little buddy gets healthy with you',
    '首页': 'Home', '戒烟': 'Smoke-free', '戒酒': 'Sober', '运动': 'Workout',
    '健身': 'Workout',
    '账号密码登录': 'Account login',
    '🔑 账号登录': '🔑 Account login',
    '一键登录': 'One-Tap Login',
    '一键登录数据存本机 · 账号登录可跨手机找回': 'One-tap saves stay local · account login syncs everywhere',
    '「快乐佩奇：戒烟戒酒跟我走」申请获取你的昵称和头像': '"Quit Smoke & Drink With Me" wants your nickname & avatar',
    '还没有登录记录，新建一个吧': 'No saves yet — create one',
    '新建一个存档': 'New save',
    '每个存档相互独立，换一个就是换一份坚持': 'Each save is independent — a new one is a new journey',
    '每个存档独立记录，换存档就是换一份坚持': 'Each save is independent — a new one is a new journey',
    '登录后换手机、换浏览器也能找回打卡记录': 'Log in to recover your streak on any device',
    '登录后换手机也能找回打卡记录': 'Log in to recover your streak on any device',
    '忘记密码找客服重置 · 账号只用来同步记录': 'Forgot password? Contact support · account syncs your data',
    '忘记密码无法找回，请记牢 · 账号只用来同步记录': "Passwords can't be recovered — remember it · account syncs data",
    '注册并登录': 'Sign up & log in',
    '注册新账号': 'Create account',
    '登录': 'Log in',
    '创建角色': 'Create your buddy',
    '账号': 'Account', '密码': 'Password', '昵称': 'Nickname', '年龄': 'Age', '性别': 'Gender',
    '给自己起个昵称': 'Pick a nickname',
    '给自己起个名字': 'Pick a name',
    '几岁了？': 'Your age?',
    '例如 170': 'e.g. 170', '例如 65': 'e.g. 65',
    '至少 6 位': '6+ characters',
    '6-16 位字母或数字': '6-16 letters or digits',
    '显示在好友列表里的名字': 'Name shown to friends',
    '👦 男孩': '👦 Boy', '👧 女孩': '👧 Girl',
    '进入小镇': 'Enter town',

    /* 佩奇页 */
    '⏰ 小闹钟 · 点我设倒计时': '⏰ Timer · tap to set a countdown',
    '❤️ 生命': '❤️ Life', '😄 快乐': '😄 Joy',
    '🍽️ 喂食': '🍽️ Feed',
    '🍽️ 喂佩奇吃点东西': '🍽️ Feed Perry',
    '💃 逗一逗': '💃 Tease',
    '🎈 叫醒佩奇': '🎈 Wake Perry',
    '🎈 玩耍': '🎈 Play',
    '💖 鼓励佩奇': '💖 Encourage',
    '🤫 跟佩奇说悄悄话': '🤫 Whisper to Perry',
    '悄悄话最多记 5 句，先删掉一句才能再记': 'Whispers hold 5 at most — delete one before adding another',
    '悄悄告诉佩奇': 'Whisper to Perry',
    '只说给佩奇一个人听…': 'Just between you and Perry…',
    '还没有悄悄话': 'No whispers yet',
    '⭐ 我的积分 · 抽小纸条': '⭐ My points · draw notes',
    '当前积分': 'Points', '今日已得': 'Earned today',
    '抽一张小纸条（⭐20）': 'Draw a note (⭐20)',
    '🎫 会员免费抽一张': '🎫 Free VIP draw',
    '📖 佩奇规则说明': '📖 How it works',
    '🍽️ 冷却': '🍽️ Cooldown',
    '每 300 秒可以喂一次，效果持续 24 小时': 'Feed every 300s; effects last 24 hours',
    '每 300 秒可以喂一次，每次选苹果、蛋糕或蘑菇其中的一样。': 'Feed every 300s, choosing an apple, cake or mushroom.',
    '每 1 分钟可以逗一次，佩奇会跳舞 5 秒。': 'Tease once a minute; Perry dances for 5 seconds.',
    '佩奇脑袋变大 30%，持续 24 小时。': "Perry's head grows 30% bigger for 24 hours.",
    '状态已经在生效时，再喂同一样东西，魅力值 +1。': 'Feed the same effect again while active: +1 charm.',
    '现实时间 3 天没有喂佩奇，佩奇就会离开，魅力值清零。之后可以重新养一只。': 'Unfed for 3 real days, Perry leaves and charm resets. You can raise a new one.',
    '魅力 10 / 50 / 200 会出现 1 / 2 / 3 个小佩奇，发色依次是黄、白、红，最多 3 个。': 'Charm 10/50/200 spawns 1/2/3 mini Perrys (yellow, white, red), up to 3.',
    '点顶部的「小闹钟」可以定一个目标时间，之后会一直显示距离目标还剩多少天多少小时多少分。': 'Tap the timer on top to set a goal — the countdown stays at the top of the page.',
    '：戒烟、戒酒、运动每打卡一次 +1 积分，一天最多 3 积分；逗一逗佩奇每次 +1 积分，一天最多 2 积分。20 积分抽一张小纸条，随机抽，佩奇写给你的话都在这儿。': ': each check-in (smoking/drinking/workout) earns +1 point, up to 3 a day; teasing Perry earns +1, up to 2 a day. 20 points draws a random note from Perry.',
    '🍎 苹果': '🍎 Apple', '🍰 蛋糕': '🍰 Cake', '🍄 蘑菇': '🍄 Mushroom',

    /* 佩奇反应 */
    '好舒服呀': 'Sooo comfy', '再摸摸～': 'More pats~', '爱你哦～': 'Love ya~',
    '头头被摸聪明了': 'Pats make me smarter', '肩膀都松快了': 'Shoulders feel looser',
    '谢谢你的手': 'Thanks for your hand~', '嘿嘿，被你戳到啦': 'Hehe, you got me!',
    '别戳啦，痒痒的': "Stop it, I'm ticklish!", '疼疼疼，知道错了': 'Ow ow, lesson learned!',
    '呜呜下次不敢了': "Waaah, won't do it again", '哎哟！我错了': 'Ouch! My bad!',
    '别打脸！': 'Not the face!', '嘿嘿，被你抱住啦': 'Hehe, caught in your hug',
    '抱抱最温暖啦': 'Hugs are the warmest', '收到爱心，满分回血！': 'Got love — fully healed!',
    '嘿嘿，被鼓励到了～': 'Hehe, feeling encouraged~',
    '谢谢你呀，我今天超有干劲！': 'Thanks! I feel super motivated today!',
    '嘿嘿，最喜欢和你玩啦': 'Hehe, playing with you is the best',
    '扭起来了！': 'Look at me dance!', '佩奇跳起了小舞～': 'Perry does a little dance~',
    '佩奇：快看我表演': 'Perry: watch my show!',
    '咔嚓咔嚓真香': 'Crunch crunch — tasty!', '嗷呜——好吃！': 'Awooo — yummy!',
    '再喂真要成球啦！': "Feed me more and I'll be a ball!",
    '佩奇的脑袋大了一圈！': "Perry's head got way bigger!",
    '旁边出现了一个双马尾女孩！': 'A twin-tail girl appeared beside you!',
    '女孩已经在啦，魅力 +1': 'The girl is already here — charm +1',
    '脑袋已经很大了，魅力 +1': 'Head already huge — charm +1',
    '佩奇已经在泡澡啦，魅力 +1': 'Perry is already bathing — charm +1',
    '小小的我在这里': 'Little me is right here',
    '我是小佩奇': "I'm Little Perry",
    '我叫小美，你好呀': "I'm Mei, hi there!",
    '佩奇的朋友就是我': "Perry's friend is me",
    '诶？是在叫我吗': 'Eh? You calling me?',
    '戳我干嘛呀': 'Hey, why poke me?',
    '我在呢我在呢': "I'm here, I'm here!",
    '我很快乐！！': "I'm SO happy!!",
    '唔…睡醒了！': 'Mmh… awake now!',
    '佩奇揉揉眼睛爬起来啦': 'Perry rubs her eyes and gets up',
    '佩奇等你等到睡着了…': 'Perry waited and fell asleep…',
    '😴 佩奇睡着啦，先陪它玩一下～': '😴 Perry is asleep — play with her first~',
    '🤗 抱一抱': '🤗 Hug', '🤚 摸摸头': '🤚 Pat', '🖐️ 拍拍肩': '🖐️ Shoulder tap',
    '🦵 踹一脚': '🦵 Kick', '👊 打一拳': '👊 Punch', '🍗 疯狂喂食': '🍗 Feast',
    '🐶 汪！汪！': '🐶 Woof! Woof!', '汪！': 'Woof!', '汪汪！': 'Woof woof!', '汪汪汪！': 'Woof woof woof!',
    '🐱 喵呜…': '🐱 Meow…',
    '摸摸头～': 'Head pats~', '嘿咻～': 'Hup hup~',

    /* 小闹钟 */
    '⏰ 小闹钟': '⏰ Timer',
    '定一个目标时间，页面顶部会一直显示倒计时': 'Set a goal time — the countdown stays at the top',
    '选日期': 'Pick a date', '选时间': 'Pick a time',
    '取消': 'Cancel', '保存': 'Save', '收起': 'Close', '发送': 'Send', '搜索': 'Search',
    '进入': 'Enter', '收好了': 'Got it', '看完了': 'Done reading', '知道啦': 'Okay!',
    '再想想': 'Let me think', '确认删除': 'Confirm delete', '返回列表': 'Back to list',
    '要定一个将来的时间哦': 'Pick a future time',
    '小闹钟设好啦': 'Timer is set!',
    '⏰ 时间到啦！🎉': "⏰ Time's up! 🎉",
    '时': 'h', '分': 'min',
    '小时减': 'hour minus', '小时加': 'hour plus', '分钟减': 'minute minus', '分钟加': 'minute plus',

    /* 私信 */
    '✉️ 私信': '✉️ DMs',
    '💬 私信': '💬 DM',
    '删除聊天记录': 'Delete chat',
    '聊天记录已删除': 'Chat deleted',
    '还没有收到私信': 'No DMs yet',
    '新': 'New', '删': 'Del',

    /* 打卡 tab */
    '🚬 戒烟': '🚬 Smoke-free', '🍺 戒酒': '🍺 Sober', '🏃 运动': '🏃 Workout',
    '戒烟打卡': 'Smoke-Free Check-in', '戒酒打卡': 'Sober Check-in', '运动打卡': 'Workout Check-in',
    '✅ 今日已打卡': '✅ Checked in today', '打卡': 'Check in',
    '🚬 开始戒烟': '🚬 Start quitting', '🍺 开始戒酒': '🍺 Start quitting',
    '🏃 开始健身打卡': '🏃 Start workout check-ins',
    '断崖式戒烟，开始！': 'Cold turkey — begin!',
    '保持清醒，开始！': 'Stay clear-headed — begin!',
    '生命在于运动，开始！': 'Motion is life — begin!',
    '断崖式戒烟，目标100天！': 'Cold turkey, 100-day goal!',
    '保持清醒，目标 100 天！': 'Stay sober, 100-day goal!',
    '生命在于运动，目标360天！': 'Motion is life, 360-day goal!',
    '🔄 重新开始': '🔄 Start over', '重新开始': 'Start over', '删除记录': 'Delete record',
    '🔄 重新开始戒烟': '🔄 Restart quitting', '🔄 重新开始戒酒': '🔄 Restart sober run',
    '🔄 重新开始健身': '🔄 Restart workouts',
    '⚙️ 基本信息': '⚙️ Basics', '点击展开': 'Tap to expand',
    '保存修改': 'Save changes', '已保存': 'Saved',
    '烟龄（年）': 'Years smoking', '每天（支）': 'Per day (cigs)', '元/包': '¥ per pack',
    '酒龄（年）': 'Years drinking', '白酒（斤/天）': 'Baijiu (jin/day)', '白酒 元/斤': 'Baijiu ¥/jin',
    '啤酒（瓶/天）': 'Beer (bottles/day)', '啤酒 元/瓶': 'Beer ¥/bottle',
    '香烟价格（元/包 20支）': 'Cigarette price (¥/pack of 20)',
    '每天抽烟数量（支）': 'Cigarettes per day',
    '白酒价格（元/斤）': 'Baijiu price (¥/jin)',
    '啤酒价格（元/瓶 500ML）': 'Beer price (¥/500ml bottle)',
    '平均每天白酒（斤）': 'Baijiu per day (jin)',
    '平均每天啤酒（瓶 500ML）': 'Beer per day (500ml)',
    '身高（cm）': 'Height (cm)', '体重（kg）': 'Weight (kg)',
    '个性签名': 'Status quote', '个性签名（选填）': 'Status quote (optional)',
    '默认：无语中..': 'Default: Speechless..',
    '“无语中..”': '"Speechless.."', '无语中..': 'Speechless..',
    '累计少吸': 'Cigarettes avoided', '节省金额': 'Money saved', '寿命': 'Life gained',
    '少喝白酒': 'Baijiu avoided', '少喝啤酒': 'Beer avoided',
    '🌿 身体变化参考': '🌿 Body timeline',
    '上面的进度是常见科普里提到的大致时间，用来给自己打气的参考，不是体检结果，也不能代替医生的建议。': 'These milestones are general science-based estimates for motivation — not a diagnosis, and no substitute for medical advice.',
    '气色': 'Complexion', '抽烟习惯': 'Smoking habit', '味觉与嗅觉': 'Taste & smell',
    '烟瘾': 'Cravings', '抵抗力': 'Immunity', '循环代谢': 'Circulation',
    '身体代谢': 'Metabolism', '精力状态': 'Energy', '酒瘾': 'Drink cravings',
    '睡眠与专注': 'Sleep & focus', '脑力状态': 'Mental sharpness',
    '身材': 'Body', '完美': 'Perfect', '偏瘦': 'Slim', '偏胖': 'Chubby',
    '已戒烟': 'Smoke-free', '已戒酒': 'Drink-free',
    '已坚持': 'Streak', '开始日期': 'Start date',
    '🩻 肺部小窗': '🩻 Lungs', '🫀 肝脏小窗': '🫀 Liver', '🫃 体脂小窗': '🫃 Body fat',
    '趣味示意，不是医学影像，也不能用来判断身体情况。': 'Fun illustration only — not a medical image.',
    '趣味示意，不是医学测量，也不能用来判断身体情况。': 'Fun illustration only — not a medical measurement.',
    '填一下基本信息，看看小朋友现在被酒泡成什么样了': 'Fill the basics — see what booze has done to your buddy',
    '先填几项基本信息，开始时间从你第一次打卡开始算': 'Fill the basics; your streak starts from your first check-in',
    '填好啦，点打卡就算正式开始！': 'All set — tap check-in to officially start!',
    '填一下年龄呀': 'Fill in your age',
    '身高体重都要填哦': 'Fill in both height & weight',
    '填一下身高体重，小朋友会变成你的抽象身材镜子': 'Enter height & weight — your buddy mirrors your shape',
    '还没有开始打卡，清醒之旅从明天开始。': 'No check-ins yet — the sober journey starts tomorrow.',
    '还没有开始打卡，先定个小目标：明天见！': 'No check-ins yet — small goal: see you tomorrow!',
    '还没打卡，运动会等你第一天。': 'No check-in yet — day one awaits.',
    '能量满满，练起来！': 'Full of energy — let\'s train!',

    /* 社区 */
    '戒烟互助群': 'Quit-Smoking Buddies',
    '戒酒互助群': 'Quit-Drinking Buddies',
    '运动打卡群': 'Workout Buddies',
    '和一起戒烟的伙伴聊聊天，互相打打气': 'Chat with fellow quitters and cheer each other on',
    '和一起戒酒的伙伴聊聊天，互相打打气': 'Chat with fellow sober runners and cheer each other on',
    '和一起运动的伙伴聊聊天，互相打打气': 'Chat with fellow movers and cheer each other on',
    '正在进入社区…': 'Entering community…',
    '进不去社区，稍后再试': "Can't enter the community — try later",
    '社区里还没有人': 'Nobody here yet',
    '社区成员（': 'Members (',
    '👀 查看社区成员': '👀 View members',
    '🚪 退出社区': '🚪 Leave group',
    '还没有人说话，来打个招呼吧～': "Nobody's posted — say hi~",
    '还没有聊过，打个招呼吧～': 'No messages yet — say hi~',
    '说点什么…': 'Say something…',
    '和大家聊聊今天的坚持…': 'Share today\'s progress…',
    '正在连接云端…': 'Connecting…',
    '加载中…': 'Loading…',
    '连不上云端，稍后再试': "Can't reach the cloud — try later",
    '连不上云端，检查一下网络': "Can't reach the cloud — check your network",
    '连不上云端，检查一下网络再试': "Can't reach the cloud — check your network and retry",
    '连不上云端，激活失败，检查网络': "Can't reach the cloud — redeem failed, check network",

    /* 菜单 */
    '游戏好友': 'Game Friends',
    '搜昵称加好友，看对方坚持了多久': 'Search a nickname to add friends & see streaks',
    '搜昵称加好友，看对方坚持了多少天': 'Search a nickname to add friends & see streaks',
    '分享链接': 'Share link',
    '复制网页链接或安装包链接': 'Copy the web link or APK link',
    '分享给朋友，或管理当前账号': 'Share with friends or manage your account',
    '会员中心': 'Membership',
    '输入激活码开通': 'Redeem a code to join',
    '购买或兑换开通': 'Buy or redeem to join',
    '我的账号': 'My account',
    '联系客服': 'Contact Support',
    '💬 联系客服': '💬 Support',
    '加微信，问题随时找我': 'Add my WeChat anytime',
    '遇到问题、想提建议，加微信随时找我': 'Questions or feedback — add my WeChat anytime',
    '客服微信号': 'Support WeChat',
    '📋 复制微信号': '📋 Copy WeChat ID',
    '微信号已复制，去微信搜索添加吧': 'WeChat ID copied — search & add me',
    '退出登录': 'Log out',
    '记录会保留，可重新登录': 'Your data stays; log back in anytime',
    '退出当前账号？': 'Log out of this account?',
    '退出后这份坚持记录会保留，重新登录即可继续。': 'Your streak stays saved; log back in to continue.',
    '📥 下载安卓 App': '📥 Android App',
    '下载安卓 App': 'Android App',
    '微信里不能直接下载安装包，需要先换到浏览器': "APKs can't download inside WeChat — switch to a browser",
    '点右上角「···」': 'Tap "···" in the top right',
    '选择「在浏览器中打开」': 'Choose "Open in browser"',
    '在浏览器菜单里再点「下载安卓 App」就能下载安装啦': 'In the browser menu tap "Android App" to download & install',
    '安装包开始下载，下完点开安装': 'APK downloading — open it when done to install',
    '网页链接：点开就能玩 · 安装包链接：安卓用浏览器打开后下载安装': 'Web link: play instantly · APK link: open in an Android browser to install',
    '🔗 分享链接': '🔗 Share',
    '选一个复制，粘贴给朋友就行': 'Pick one to copy & paste to friends',
    '📋 复制网页链接': '📋 Copy web link',
    '📋 复制安装包（APK）链接': '📋 Copy APK link',
    '网页链接已复制': 'Web link copied',
    '安装包链接已复制': 'APK link copied',
    '链接已复制，粘贴给好友就能打开': 'Link copied — paste it to friends',
    '复制失败，请手动复制': 'Copy failed — please copy manually',
    '复制失败，请手动记下 ': 'Copy failed — note it down: ',
    '复制失败，长按地址栏手动复制': 'Copy failed — long-press the address bar',
    '音乐已开启': 'Music on', '音乐已关闭': 'Music off',
    '菜单': 'Menu', '换个场景': 'Change scene', '私信消息': 'Direct messages',
    '音乐：卡农（可关闭）': 'Music: Canon (tap to toggle)',
    '点击修改昵称': 'Tap to change nickname',
    '删除这条登录记录': 'Delete this login record',
    '删除这条登录记录？': 'Delete this login record?',
    '已删除该登录记录': 'Login record deleted',
    '已删除该登录记录和云端资料': 'Login record and cloud profile deleted',
    '正在清除…': 'Deleting…',
    '云端资料和群成员身份一起清除，好友和群里都搜不到；和别人发过的私聊内容会保留。': 'Cloud profile and group membership are removed — gone from search and groups. Your private chats stay with the other person.',
    '3 天不进群会自动移出，再进一次就能回来': 'No visit for 3 days and you are removed — just enter again to rejoin.',

    /* 好友 */
    '👥 游戏好友': '👥 Friends',
    '好友列表': 'Friends',
    '输入好友昵称': "Friend's nickname",
    '搜索中…': 'Searching…',
    '还没有好友，上面搜昵称加一个吧': 'No friends yet — search a nickname above',
    '没找到这个人，让对方先打开一次游戏吧': 'Not found — ask them to open the game once',
    '已添加': 'Added!', '加好啦': 'Friend added!',
    '没加上，再试一次': "Couldn't add — try again",
    '已移除': 'Removed',
    '已拉黑': 'Blocked', '✅ 已拉黑': '✅ Blocked', '🚫 拉黑': '🚫 Block',
    '已取消拉黑': 'Unblocked',
    '你已被对方拉黑，发不出去': "They blocked you — can't send",
    '移除': 'Remove',
    '(我)': '(me)',
    '这是你自己呀': "That's you!",
    '已在坚持': 'On a streak', '还没开始': 'Not started',

    /* 账号 */
    '🔑 我的账号': '🔑 My account',
    '🔒 修改密码': '🔒 Change password',
    '修改密码': 'Change password',
    '当前密码': 'Current password', '新密码': 'New password',
    '保存新密码': 'Save new password',
    '当前密码不对': 'Current password is wrong',
    '密码已更新，记牢它': 'Password updated — remember it!',
    '新密码至少 6 位': 'New password needs 6+ characters',
    '密码至少 6 位': 'Password needs 6+ characters',
    '密码不对，再想想': 'Wrong password — try again',
    '密码错太多次了，10 分钟后再试': 'Too many fails — try again in 10 minutes',
    '没有这个账号，切到「注册新账号」吧': 'No such account — switch to "Create account"',
    '这个账号已经被注册了，换一个吧': 'That name is taken — try another',
    '账号要 6-16 位字母或数字': 'Account needs 6-16 letters or digits',
    '昵称不能为空': "Nickname can't be empty",
    '昵称已更新': 'Nickname updated',
    '昵称和头像已更新': 'Nickname & avatar updated',
    '聊天头像': 'Chat avatar',
    '会员可自定义': 'VIP: customizable',
    '这是会员专属头像，开通会员才能用': 'VIP-only avatar — become a member to use it',
    '会员专属': 'VIP only',
    '开通会员后，可在这里自己挑聊天头像': 'VIP members can pick their own chat avatar here',
    '去开通': 'Go VIP',
    '先给自己起个昵称吧': 'Pick a nickname first',
    '先输个昵称': 'Enter a nickname first',
    '✏️ 修改昵称': '✏️ Change nickname',
    '保存昵称': 'Save nickname',
    '昵称会显示在顶栏标题旁边，随时可以再改': 'The nickname shows by the title — change it anytime',
    '想改昵称就点这里': 'Tap here to change your nickname',

    /* 会员 */
    '🎫 陪伴会员': '🎫 Buddy VIP',
    '尊贵会员': 'VIP Member', '长期有效': 'Never expires',
    '每个激活码只能用一次，输入后立即生效': 'Each code works once, effective immediately',
    '每个兑换码只能用一次，兑换后立即生效': 'Each code works once, effective immediately',
    '再输一个新码可续期叠加（每个码只能用一次）': 'Enter another code to extend (one use per code)',
    '再输一个新兑换码可续期叠加（每个码只能用一次）': 'Enter another code to extend (one use per code)',
    '再输一个码，续期': 'Enter another code to extend',
    '输入兑换码续期': 'Enter code to extend',
    '激活会员': 'Redeem code', '兑换会员': 'Redeem code',
    '恢复购买': 'Restore purchases',
    '激活失败，稍后再试': 'Redeem failed — try later',
    '激活码不对，检查一下有没有输错': 'Invalid code — check for typos',
    '这个激活码你已经用过了，每个码只能用一次': "You've already used this code — one use per code",
    '这个激活码已经被用过了，每个码只能用一次': 'This code is already used — one use per code',
    '积分不够，先去打卡攒 20 分': 'Not enough points — earn 20 by checking in',
    '这是会员功能，先去开通会员吧': 'VIP feature — become a member first',
    '会员已生效': 'VIP is now active!',
    '续费：¥8/月 · ¥88/年 · ¥188/永久，找客服拿激活码': 'Renew: ¥8/mo · ¥88/yr · ¥188 lifetime — get codes via support',
    '续费方案见下方 · 兑换码由活动发放': 'Plans below · codes come from events',
    '兑换码由活动发放 · 也可以直接点上方方案购买': 'Codes come from events · or tap a plan above',
    '还没有激活码？去菜单里点「联系客服」找我买': 'No code yet? Tap "Contact Support" in the menu',
    '每天免费抽 1 张小纸条': 'Free note draw every day',
    '可自行设置打卡开始时间': 'Set your own start date',
    '忘了打卡？随时补签': 'Missed a day? Make it up anytime',
    '社区里尊贵红名，字体更亮眼': 'Stand out with a red VIP name in the community',
    '📅 设置打卡开始时间': '📅 Set check-in start date',
    '🖊️ 补签打卡': '🖊️ Make-up check-ins',
    '请在 App Store 版本中购买': 'Purchase inside the App Store version',

    /* 打卡时间/补签日历 */
    '📅 打卡开始时间': '📅 Check-in start date',
    '当前开始：': 'Current start: ',
    '· 可以往前改': '· you can move it earlier',
    '还没开始计时 · 选一天就从那天开始算': 'Not started yet — pick a day to start counting',
    '还没有开始的项目，先填一下资料再来设开始时间': 'Nothing set up yet — fill in a program first',
    '先在日历上选一天': 'Pick a day on the calendar first',
    '不能选以后的日子': "Can't pick future dates",
    '这个日期选不了': "Can't pick that date",
    '选的日子都打过了': 'Those days are already checked in',
    '这一天已经打过卡啦': 'This day is already checked in',
    '今天已经打卡过啦，明天再来～': 'Already checked in today — see you tomorrow~',
    '补签成功': 'Make-up done!',
    '先点选没打卡的日子': 'Pick unchecked days first',
    '还没有开始的项目，先打卡一次再来补签': 'Nothing started — check in once before making up days',
    '还没有开始的项目，先打卡一次再改': 'Nothing started — check in once before changing',
    '白格 = 没打卡的日子，点它选中（可多选），保存后每天打卡次数 +1': 'White cells = missed days; tap to select (multi-select), each adds +1 check-in count',
    '✅ = 已打卡 · 已补': '✅ = checked in · made-up',
    '选哪天，就从哪天开始算天数（网页、手机版式一致）': 'Your streak counts from the day you pick',

    /* 小纸条 */
    '📝 已抽到的小纸条': '📝 Notes collected',
    '📝 佩奇写给你的': '📝 A note from Perry',
    '还没有抽过小纸条，攒够 20 积分来抽一张吧': 'No notes yet — earn 20 points to draw one',
    '这张你之前抽到过啦，只记一次': 'Already have this one — counted once',
    '会员今日免费次数已用': 'free VIP draw used today',

    '在浏览器菜单里再点「下载安卓 App」就能下载安装啦': 'In the browser menu tap "Android App" to download & install',

    '玩家': 'Player',
    '7 天': '7 days', '30 天': '30 days', '90 天': '90 days', '180 天': '180 days',
    '365 天': '365 days', '长期': 'Lifetime',
    '苹果': 'Apple', '蛋糕': 'Cake', '蘑菇': 'Mushroom',
    '📊 戒烟数据': '📊 Quit-Smoking Stats', '📊 戒酒数据': '📊 Sober Stats', '📊 运动数据': '📊 Workout Stats',
    '开始戒烟': 'Smoke-free start', '开始戒酒': 'Sober start', '未打卡': 'Not checked in',
    '先看看': 'Just looking',
    '/ 月': '/ mo', '/ 年': '/ yr', '/ 永久': ' one-time',

    /* 称号（戒烟） */
    '游客': 'Visitor', '小趴菜': 'Wobbly Rookie', '热血少年': 'Hot-Blooded Youth',
    '人间清醒': 'Wide Awake', '清醒大佐': 'Colonel Clearhead', '世外高人': 'Zen Master',
    '无情哈拉少': 'Deadly Determined', '法外狂徒': 'Rebel with a Cause',
    '打不死的小强': 'Unkillable Spirit', '空气净化器': 'Air Purifier',
    /* 称号（戒酒） */
    '酒蒙子觉醒': 'Awakened Drinker', '欢乐戒酒人': 'Happy Quitter',
    '反酒同盟会': 'Anti-Booze Alliance', '酒局终结者': "Party's Over",
    '酒精过敏综合症': 'Allergic-to-Booze Syndrome',
    /* 称号（运动） */
    '推门就跑': 'Out the Door Running', '挥汗机器': 'Sweat Machine',
    '撸铁大师': 'Iron-Pumping Pro', '施瓦辛格': 'Schwarzenegger',
    '人形高达': 'Human Gundam', '吨位怪兽': 'Tonnage Beast',
    '铁汁附体': 'Iron Bro Mode', '铁血硬汉': 'Iron-Willed Tough Guy',
    '办卡会员': 'Gym Card Member', '纯爱战神': 'Pure-Love Warrior',
    '等级说明': 'Levels', '🏅 等级说明': '🏅 Levels',
    '按累计打卡天数升级，断了也不掉级': 'Levels follow total check-in days; never downgrade',
    '打卡第 1 天，腿软手抖但方向对了。': 'Day 1 — shaky legs, right direction.',
    '第一天就冲了，气势拉满。': 'Day one and full steam ahead.',
    '第一天没喝，快乐是清醒的快乐。': 'Day one sober — happiness with clarity.',
    '连续两天顶住了，生命力和小强一样顽强。': 'Two days strong — resilient as a roach.',
    '两天了，酒蒙子的眼睛开始睁开。': 'Two days — the haze starts lifting.',
    '一周整！肺已经开始感谢你了。': 'One week — your lungs are grateful.',
    '一周了，健身房都记住你的脸了。': 'One week — the gym knows your face.',
    '一周滴酒未沾，头脑清晰指挥若定。': 'One week, zero drinks — clear and in command.',
    '半个月，整个世界都清楚了。': 'Half a month — the whole world is clearer.',
    '半个月不动摇，意志力钢铁一般。': 'Half a month unshaken — will of steel.',
    '半个月，肌肉开始跟你称兄道弟。': 'Half a month — your muscles are your bros now.',
    '一个月，汗水都快汇成小河了。': 'One month — sweat is becoming a river.',
    '一个月不吸烟，走到哪都是清新空气。': 'One month smoke-free — fresh air everywhere.',
    '一个月不碰酒，又猛又清醒，哈拉少！': 'One month, no booze — fierce and clear. Khorosho!',
    '两个月，铁见了你都服气。': 'Two months — even iron salutes you.',
    '五十天看破烟云，境界已经不一样了。': '50 days — you see through the smoke.',
    '五十天，你已经是我们同盟的中坚力量。': "50 days — you're the backbone of the alliance.",
    '七十五天了，烟见了你都得绕道走。': '75 days — cigarettes avoid you now.',
    '七十五天，看酒就想绕着走。': '75 days — you detour around booze now.',
    '三个月，深蹲架都是你的主场。': 'Three months — the squat rack is your home turf.',
    '半年，体型已经开始有大佬的影子。': 'Half a year — a champion silhouette is forming.',
    '一百天！对自己的身体爱得彻彻底底。': '100 days! Loving your body completely.',
    '一百天！酒局来了你都能笑着挡回去。': '100 days! You smile off every drinking invite.',
    '一年！你已经不是普通人，是人形高达。': "One year! You're not ordinary anymore — you're a Gundam.",

    /* 问候（按时间） */
    '早上好，今天也要加油！': "Good morning — let's go!",
    '中午好，饭后走一走～': 'Good afternoon — take a stroll~',
    '下午好，来抽张纸条吗？': 'Good afternoon — fancy a note?',
    '晚上好，今天打卡了吗？': 'Good evening — checked in yet?',
    '这么晚还不睡？': 'Still up this late?',
    '今天也要好好加油鸭': "Let's crush it today!",

    /* 小纸条引言（47 条） */
    '顺其自然，随遇而安。——《庄子》': 'Go with the flow; be at ease wherever you are. — Zhuangzi',
    '本来无一物，何处惹尘埃。—— 惠能': 'Fundamentally there is nothing — where would dust settle? — Huineng',
    '人生如逆旅，我亦是行人。—— 苏轼': 'Life is an inn for travelers; I too am just passing through. — Su Shi',
    '乱花渐欲迷人眼，浅草才能没马蹄。—— 白居易': 'Dazzling flowers beguile the eyes; shallow grass barely reaches the hooves. — Bai Juyi',
    '知足者常乐，终身不辱。—— 老子': 'The content are always glad, and never brought to shame. — Laozi',
    '盛年不重来，一日难再晨。—— 陶渊明': 'The prime of life never returns; a morning never comes twice. — Tao Yuanming',
    '浆声灯影里的日子，过一天，少一天。—— 朱自清': 'Days of oars and lantern light — each one lived is one less. — Zhu Ziqing',
    '水满则溢，月盈则亏。——《淮南子》': 'Water overflows when full; the moon wanes at its roundest. — Huainanzi',
    '天下事有难易乎？为之，则难者亦易矣。—— 彭端淑': 'Is anything hard or easy? Do it, and the hard becomes easy. — Peng Duanshu',
    '临渊羡鱼，不如退而结网。——《汉书》': "Better to weave a net than to envy the fish at the water's edge. — Book of Han",
    '志士惜日短，愁人知夜长。—— 傅玄': 'The ambitious find days short; the sorrowful find nights long. — Fu Xuan',
    '海纳百川，有容乃大。—— 林则徐': 'The sea takes in a hundred rivers — capacity makes greatness. — Lin Zexu',
    '绳锯木断，水滴石穿。—— 罗大经': 'A rope saws through wood; dripping water pierces stone. — Luo Dajing',
    '锲而不舍，金石可镂。——《荀子·劝学》': 'Carve without pause, and even metal and stone can be engraved. — Xunzi',
    '千里之行，始于足下。——《老子》': 'A journey of a thousand miles begins with a single step. — Laozi',
    '业精于勤，荒于嬉。—— 韩愈': 'Mastery comes from diligence; ruin, from play. — Han Yu',
    '己所不欲，勿施于人。—— 孔子': 'Never impose on others what you would not choose for yourself. — Confucius',
    '世事一场大梦，人生几度秋凉。—— 苏轼': 'Life is a grand dream — how many autumns do we get? — Su Shi',
    '莫道桑榆晚，为霞尚满天。—— 刘禹锡': "Don't say the sunset is late — its glow still fills the sky. — Liu Yuxi",
    '回首向来萧瑟处，归去，也无风雨也无晴。—— 苏轼': 'Looking back on the bleak road: no storm, no shine. — Su Shi',
    '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。—— 苏轼': 'A bamboo staff and straw sandals beat any horse — who\'s afraid? In a straw cloak through the mist, all my life. — Su Shi',
    '长风破浪会有时，直挂云帆济沧海。—— 李白': 'A wind will come to break the waves — hoist your sail and cross the sea. — Li Bai',
    '天行健，君子以自强不息。——《周易》': 'As heaven moves ceaselessly, the noble strive without rest. — I Ching',
    '胜人者有力，自胜者强。—— 老子': 'Conquering others takes force; conquering yourself is true strength. — Laozi',
    '路漫漫其修远兮，吾将上下而求索。—— 屈原': 'The road ahead is long; I will search high and low. — Qu Yuan',
    '博观而约取，厚积而薄发。—— 苏轼': 'Read widely, take sparingly; store deeply, spend wisely. — Su Shi',
    '一个人只拥有此生此世是不够的。——《爱你就像爱生命》': 'This one life alone is not enough. — Love You Like Life Itself',
    '岁月极美，在于它必然的流逝。——《温柔的夜》': 'Time is beautiful precisely because it must flow away. — A Gentle Night',
    '我们听过无数的道理，却仍旧过不好这一生。——《后会无期》': 'We\'ve heard countless truths, yet still fumble through life. — The Continent',
    '世事离局，局内人迷里糊涂。——《围城》': 'Outside the game all is clear; inside it, everyone is lost. — Fortress Besieged',
    '你如果认识从前的我，就会原谅我。——《倾城之恋》': "If you'd known the old me, you would forgive me. — Love in a Fallen City",
    '孤独从一开始就注定要跟随你一生。——《百年孤独》': 'Loneliness is fated to follow you from the very start. — One Hundred Years of Solitude',
    '人是为了活着本身而活着的。——《活着》': 'People live for the sake of living itself. — To Live',
    '现在无法挽留，未来无法预期。——《解忧杂货店》': "The present can't be held; the future can't be foretold. — The Miracles of the Namiya General Store",
    '越是深沉的痛苦，越是无声。——《平凡的世界》': 'The deepest pain is the quietest. — Ordinary World',
    '我爱这土地，眼里常含泪水。——《艾青诗选》': 'I love this land, my eyes always brimming with tears. — Ai Qing, Selected Poems',
    '习惯了黑暗，就不要恐惧光明。——《黑暗的左手》': "Used to the dark, don't fear the light. — The Left Hand of Darkness",
    '一个人可以被毁灭，但不能被打败。——《老人与海》': 'A man can be destroyed but not defeated. — The Old Man and the Sea',
    '逃避现实的人，才会沉溺于幻想。——《呼啸山庄》': 'Only those fleeing reality drown in fantasy. — Wuthering Heights',
    '生存还是毁灭，这是一个问题。——《哈姆雷特》': 'To be, or not to be — that is the question. — Hamlet',
    '人是生而自由的，却无往不在枷锁中。——《社会契约论》': 'Man is born free, and everywhere he is in chains. — The Social Contract',
    '知者不惑，仁者不忧，勇者不惧。——《论语》': 'The wise are not confused; the kind are not anxious; the brave are not afraid. — The Analects',
    '路遥知马力，日久见人心。——《元曲选》': 'Distance tests a horse; time reveals a heart. — Yuan Dynasty Anthology',
    '过去都是假的，回忆是一条没有归途的路。——《百年孤独》': 'The past was a lie; memory, a road with no return. — One Hundred Years of Solitude',
    '天生我材必有用，千金散尽还复来。—— 李白': 'Heaven made me — my talent must serve; gold scattered will come back again. — Li Bai',
    '宝剑锋从磨砺出，梅花香自苦寒来。——《警世贤文》': "A blade's edge comes from grinding; plum blossom's scent from bitter cold. — Maxims to Awaken the World",
    '行路难，行路难，多歧路，今安在？—— 李白': 'Hard is the road, hard the road — forks everywhere; where is my way? — Li Bai',

    /* 互动回应补充 */
    '我错了': 'My bad!', '再也不喝了': 'Never again!', '一下子清醒了': 'Wide awake now',
    '有你在，我什么都不怕': "With you here I'm not scared of anything",
    '已经快乐到满格啦～': 'Joy fully charged~', '嘿嘿，我超快乐！': "Hehe, I'm SO happy!",
    '佩奇开心地转圈圈': 'Perry spins in circles', '再来一次！': 'Again! Again!',
    '佩奇笑得眼睛都没了': 'Perry is all smiles!', '呀，你回来啦～': "Yay, you're back~",
    '佩奇跳进洗澡池里啦！': 'Perry jumped into the bath!',
    '想说点什么呀': 'Type something first', '佩奇记在心里了': "Perry keeps it in her heart",
    "🌷 佩奇的神秘花园": "🌷 Perry's Secret Garden",
    '发一条动态，7 天后自动消失，所有人进花园都看得到': 'Post here — everyone in the garden sees it, and posts vanish after 7 days',
    '正在走进花园…': 'Walking into the garden…',
    '还没有动态，第一条由你来发～': 'No posts yet — be the first!',
    '和大家分享你的坚持…': 'Share your streak with everyone…',
    '写点什么，或加张图片': 'Write something or add a photo',
    '动态已发到花园': 'Posted to the garden',
    '已从花园删除': 'Deleted from the garden',
    '花园加载失败，稍后再试': "Couldn't load the garden — try later",
    '图片已选好，点发布': 'Photo ready — tap Post',
    '图片太大，换一张小点的': 'Photo too large — pick a smaller one',
    '只能发图片哦': 'Images only',
    '发得太快啦，休息一下再发': 'Too fast — take a short break first',
    '移除图片': 'Remove photo',
    '发一张图片': 'Add a photo',
    '一次最多发两张图片': 'Up to 2 photos per post',
    '📸 拍照': '📸 Take a photo',
    '🖼️ 从手机相册选择': '🖼️ Choose from album',
    '🌷 神秘花园': "🌷 Perry's Garden",
    '存档找回码': 'Save recovery code',
    '重装 / 换手机后凭码找回这份记录': 'Reinstall or switch phones — use the code to get your save back',
    '🛟 存档找回码': '🛟 Save recovery code',
    '重装 App、清除数据或换手机后，在登录页点「用找回码找回存档」输入这个码，打卡记录、会员都会回来': 'After reinstalling, clearing data or switching phones, tap "Recover with code" on the login page and enter this code — your streaks and VIP come back',
    '复制找回码': 'Copy code',
    '找回码已复制': 'Code copied',
    '知道了': 'Got it',
    '记得截图保存 · 码给别人，别人就能拿走这份记录': 'Screenshot and keep it safe — anyone with this code can claim this save',
    '正在生成…': 'Generating…',
    '生成失败，稍后再试': "Couldn't generate — try again later",
    '🛟 用找回码找回存档': '🛟 Recover save with code',
    '输入之前保存的找回码，这份记录就会回到这台手机': 'Enter the recovery code you saved — this save comes back to this device',
    '例如 KP1A2B3C4D': 'e.g. KP1A2B3C4D',
    '找回并登录': 'Recover & log in',
    '把找回码粘进来': 'Paste your recovery code first',
    '没有找到对应的存档，检查一下码': 'No save found — double-check the code',
    '存档找回来啦！': 'Save recovered!',
    '一键登录存本机，重装前先在菜单里保存找回码': 'One-tap saves stay on this device — save the recovery code from the menu before reinstalling',
    '从相册选择': 'From photo album',
    '评论已发出': 'Comment sent',
    '评论已删除': 'Comment deleted',
    '评论不能为空': 'Comment cannot be empty',
    '说点什么…': 'Say something…',
    '显示全文': 'Show more',
    '佩奇已经不在了…': 'Perry is gone…', '加油，宝贝': 'Keep going, buddy',
    '胖成球的小盆友来陪你练！': 'A chubby buddy joins your workout!',
    '瘦成棍的小盆友来陪你吃！': 'A skinny buddy shows up to eat!',
    '完美身材的小伙伴来啦！': 'Your perfect-shape buddy is here!',
    '粘贴给好友，点开就能玩': 'Paste to a friend — it opens right up',
    '生效中 +1': 'Active +1', '未开始': 'Not started',
    '还没开始打卡': 'No check-ins yet', '未命名': 'Unnamed', '匿名玩家': 'Anonymous Player',
    '小伙伴': 'Buddy', '＋ 好友': '＋ Add', '＋ 添加': '＋ Add',
    '操作失败，稍后再试': 'Something went wrong — try later',
    '没发出去，再试一次': "Couldn't send — try again",
    '网络不太顺，再试一次': 'Poor network — try again',
    '你 3 天没进群被移出了，已自动重新进群': 'You were away 3+ days and got removed — rejoined automatically',
    '送一颗专属红心': 'Send a VIP heart',
    '专属红心已送出': 'Your VIP heart is sent',
    '专属红心已送出，群里都看得到': 'Your VIP heart is sent — everyone in the group sees it',
    '收到一颗专属红心': 'You received a VIP heart',
    '你已被对方拉黑，送不出去': 'You are blocked — cannot send',
    '没删掉，再试一次': "Couldn't delete — try again",
    '没改成，稍后再试': "Couldn't change — try later",
    '安装包下载到手机，装好就是原生应用': 'Downloads the APK — install it as a native app',

    /* 规则说明加粗标签 */
    '🍽️ 喂食': '🍽️ Feed', '💃 逗一逗': '💃 Tease', '📝 小纸条': '📝 Notes',
    '＋1 魅力': '＋1 Charm', '✨ 小佩奇': '✨ Mini Perrys', '🪦 会离开': '🪦 Leaving',
    '佩奇跳进一个大洗澡池里泡澡（有泡泡和小黄鸭），持续 24 小时。': 'Perry hops into a big bubble bath (with foam and a rubber duck) for 24 hours.',
    '佩奇旁边出现一个漂亮的双马尾女孩，持续 24 小时。': 'A pretty twin-tail girl appears beside Perry for 24 hours.'
  };

  /* ---------------- 正则词典：动态文案 ---------------- */
  var WD_MAP = { '日': 'Sun', '一': 'Mon', '二': 'Tue', '三': 'Wed', '四': 'Thu', '五': 'Fri', '六': 'Sat' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function mo3(n) { var m = MONTHS[n - 1] || ''; return m.slice(0, 3); }

  var RES = [
    [/^第 (\d+) 天$/, 'Day $1'],
    [/^当前账号：(.+) · 换手机登录这个账号就能找回记录$/, 'Current account: $1 · log in on any phone to recover'],
    [/^当前账号：(.+)$/, 'Current account: $1'],
    [/^账号：(.+)$/, 'Account: $1'],
    [/^开通成功，(\d+) 天会员已生效$/, 'Success! $1-day VIP is now active'],
    [/^开通成功，长期会员已生效$/, 'Success! Lifetime VIP is now active'],
    [/^开通成功，(.+)$/, 'Success! $1'],
    [/^· 第 (\d+) 天$/, '· Day $1'],
    [/^🍽️ 冷却 (\d+)s$/, '🍽️ Cooldown $1s'],
    [/^⏰ 距离目标还剩 (\d+)天(\d+)小时(\d+)分$/, '⏰ $1d $2h $3m to go'],
    [/^(\d+)天(\d+)小时(\d+)分钟$/, '$1d $2h $3m'],
    [/^(\d+)年(\d+)月(\d+)日$/, function (m, y, mo, d) { return mo3(+mo) + ' ' + d + ', ' + y; }],
    [/^(\d+)月(\d+)日$/, function (m, mo, d) { return mo3(+mo) + ' ' + d; }],
    [/^(\d+)月(\d+)日 · 佩奇：(.+)$/, function (m, mo, d, t) { var g = tr(t); return mo3(+mo) + ' ' + d + ' · Perry: ' + (g || t); }],
    [/^(\d+) 年 (\d+) 月$/, function (m, y, mo) { return (MONTHS[+mo - 1] || mo) + ' ' + y; }],
    [/^(\d+) 年 (\d+) 月 (\d+) 日 周(.) · (\d{1,2}):(\d{2})$/, function (m, y, mo, d, w, hh, mm) { return WD_MAP[w] + ', ' + mo3(+mo) + ' ' + d + ', ' + y + ' · ' + ('0' + hh).slice(-2) + ':' + mm; }],
    [/欢迎回来，(.+)！/, 'Welcome back, $1!'],
    [/^欢迎你，(.+)$/, 'Welcome, $1!'],
    [/^(.+) 的菜单$/, "$1's Menu"],
    [/^(.+) · 换手机可找回记录$/, '$1 · log in anywhere to recover'],
    [/^已拉黑 (.+)，不再收到TA的私信$/, "Blocked $1 — their DMs won't reach you"],
    [/^已取消拉黑 (.+)$/, 'Unblocked $1'],
    [/^(.+) 送了一颗专属红心$/, function (m, p1) { var tp = tr(p1); return (tp || p1) + ' sent a VIP heart'; }],
    [/^🤫 跟佩奇说悄悄话（(\d+)\/5）$/, '🤫 Whisper to Perry ($1/5)'],
    [/^(\d+) 天后消失$/, '$1d left'],
    [/^查看更多评论（(\d+)）$/, 'View more comments ($1)'],
    [/^已退出(.+)，下次随时再进$/, function (m, p1) { var g = tr(p1); return 'Left ' + (g || p1) + ' — come back anytime'; }],
    [/^重新开始(戒烟|戒酒|运动)？$/, function (m, x) { return 'Restart ' + ({ '戒烟': 'quitting', '戒酒': 'sober run', '运动': 'workouts' }[x]) + '?'; }],
    [/^已重新开始(戒烟|戒酒|运动)$/, function (m, x) { return 'Restarted ' + ({ '戒烟': 'quitting', '戒酒': 'sober run', '运动': 'workouts' }[x]); }],
    [/^会清空(戒烟|戒酒|运动)的全部打卡记录和开始时间，不能撤销。$/, function (m, x) { return "This erases all of your " + ({ '戒烟': 'smoke-free', '戒酒': 'sober', '运动': 'workout' }[x]) + " check-ins and start date. It can't be undone."; }],
    [/^打卡断了也不影响称号，随时可以接着打。当前累计打卡 (\d+) 天。$/, "Streak breaks don't affect titles — pick up anytime. Total: $1 days."],
    [/^只会删除你自己这边的记录，和「(.+)」的聊天会从私信列表消失。确定删除吗？$/, 'Only your copy is deleted — the chat with "$1" stays on their side. Delete?'],
    [/^会清空 (.+) 的全部打卡记录和开始时间，不能撤销。$/, "This erases all of $1's check-ins and start date. It can't be undone."],
    [/^「(.+)」的打卡记录、积分、小纸条都会被删除，无法恢复。$/, '"$1"\'s check-ins, points and notes will be deleted for good.'],
    [/^已抽 (\d+) 张 · 会员今日免费次数已用$/, 'Drawn: $1 · free VIP draw used'],
    [/^已抽 (\d+) 张 · 剩余积分 ⭐(\d+)$/, 'Drawn: $1 · points left ⭐$2'],
    [/^📝 已抽到的小纸条（(\d+) 张）$/, '📝 Notes collected ($1)'],
    [/^共 (\d+) 张 · 点一条看全文$/, '$1 notes · tap one to read'],
    [/^📝 第 (\d+) 张纸条$/, '📝 Note #$1'],
    [/^有效期至 (\d+) 年 (\d+) 月 (\d+) 日 · 还剩 (\d+) 天$/, 'Valid until $2/$3/$1 · $4 days left'],
    [/^已开通 · 还剩 (\d+) 天$/, 'VIP active · $1 days left'],
    [/^(\d+) · 生效中$/, 'Plan $1 · active'],
    [/^· 魅力 (\d+)$/, '· Charm $1'],
    [/^🚬 (\d+) 天 · 🍺 (\d+) 天 · 🏃 (\d+) 天$/, '🚬 $1d · 🍺 $2d · 🏃 $3d'],
    [/^((?:🚬|🍺|🏃) \d+ 天)(　(?:🚬|🍺|🏃) \d+ 天)*$/, function (m) {
      var parts = m.split('　'), out = [];
      for (var i = 0; i < parts.length; i++) {
        var mm = parts[i].match(/^((?:🚬|🍺|🏃)) (\d+) 天$/);
        if (!mm) return m; /* 结构不符则原样返回，避免 replace 输出 "null" */
        out.push(mm[1] + ' ' + mm[2] + 'd');
      }
      return out.join('　');
    }],
    [/^🚬 (\d+) 天　🍺 (\d+) 天　🏃 (\d+) 天$/, '🚬 $1d · 🍺 $2d · 🏃 $3d'],
    [/^🚬 (\d+) 天　🏃 (\d+) 天$/, '🚬 $1d · 🏃 $2d'],
    [/^(\d+) 天后$/, 'in $1 days'],
    [/^(\d+) 天$/, '$1 days'],
    [/^([\d.]+) 天$/, '$1 days'],
    [/^([\d.]+) 支$/, '$1 cigs'],
    [/^([\d.]+) 斤$/, '$1 jin'],
    [/^([\d.]+) 瓶$/, '$1 bottles'],
    [/^([\d.]+) 元$/, '¥$1'],
    [/^([\d.]+)\/10 分$/, '$1/10'],
    [/^(\d+)分钟$/, '$1 min'],
    [/^佩奇喘口气，(\d+) 秒后再逗$/, 'Perry needs a breather — $1s'],
    [/^刚喂过啦，(\d+) 秒后才能再喂$/, 'Just fed — next feed in $1s'],
    [/^佩奇刚吃过，(\d+) 秒后再喂$/, 'Perry just ate — next feed in $1s'],
    [/^佩奇刚吃过，(.+)$/, 'Perry just ate — $1'],
    [/^开始时间已改为 ?(.+)$/, 'Start date changed to $1'],
    [/^(?:戒烟|戒酒|运动)开始时间已改为 (.+)$/, 'Start date changed to $1'],
    [/^当前开始：(\S+) · 可以往前改$/, 'Current start: $1 · you can move it earlier'],
    [/^补上这 (\d+) 天$/, 'Add these $1 days'],
    [/^补签成功 (\d+) 天，打卡次数 \+(\d+)$/, 'Made up $1 days · +$2 check-ins'],
    [/^✅ = 已打卡 · 已补 (\d+) 天$/, '✅ = checked in · $1 made up'],
    [/^✅ = 已打卡 · 已补 (\d+) 天 · 本次已选 (\d+) 天$/, '✅ checked in · $1 made up · $2 selected'],
    [/^(.+) · 生效中$/, function (m, p1) { var tp = tr(p1); return (tp || p1) + ' · active'; }],
    [/^共 (\d+) 张$/, '$1 notes collected'],
    [/^(\d+)小时(\d+)分钟$/, '$1h $2m'],
    [/^0分钟$/, '0 min'],
    [/^💃 冷却 (\d+)s$/, '💃 Cooldown $1s'],
    [/^本次已选 (\d+)/, 'Selected: $1'],
    [/^社区成员（(\d+)）$/, 'Members ($1)'],
    [/^新佩奇来啦，(\d+) 分钟内记得喂它$/, 'New Perry! Feed her within $1 min'],
    [/^佩奇已经在泡澡啦，魅力 \+1 · 魅力 (\d+)$/, 'Perry is already bathing — charm +1 · total $1'],
    [/^脑袋已经很大了，魅力 \+1 · 魅力 (\d+)$/, 'Head already huge — charm +1 · total $1'],
    [/^女孩已经在啦，魅力 \+1 · 魅力 (\d+)$/, 'The girl is already here — charm +1 · total $1'],
    [/^这张你之前抽到过啦，只记一次.*$/, 'Already have this one — counted once'],
    [/^当前累计打卡 (\d+) 天，打卡次数 \+ ?(\d+)。?$/, "Skipped days don't affect titles. Total: $1 days · +$2 per check-in"],
    [/^🚭 加油，宝贝\s*⭐\+1$/, '🚭 Keep going, buddy! ⭐+1'],
    [/^🍺 加油，宝贝\s*⭐\+1$/, '🍺 Stay strong, buddy! ⭐+1'],
    [/^🏃 加油，宝贝\s*⭐\+1$/, '🏃 Keep moving, buddy! ⭐+1']
  ];

  var ZH = /[\u4e00-\u9fff]/;

  /* iOS 构建脚本会注入：CUR = '$'（英文界面货币符号）与 PRICE 价格表；
     网页 / 安卓保持空值，仍用 ¥，价格不变 */
  var CUR = '$';
  var PRICE = { '¥8': '$1.99', '¥88': '$19.99', '¥188': '$39.99' };

  function detect() {
    try {
      var s = localStorage.getItem('kk_lang');
      if (s === 'en' || s === 'zh') return s;
    } catch (e) {}
    /* iOS 版默认英文 */
    return 'en';
  }
  var LANG = detect();

  function tr(s) {
    if (LANG !== 'en') return null;
    if (Object.prototype.hasOwnProperty.call(PRICE, s)) return PRICE[s];
    if (!ZH.test(s)) return null;
    var out = null;
    if (Object.prototype.hasOwnProperty.call(EXACT, s)) out = EXACT[s];
    else {
      for (var i = 0; i < RES.length; i++) {
        RES[i][0].lastIndex = 0;
        if (RES[i][0].test(s)) { out = s.replace(RES[i][0], RES[i][1]); break; }
      }
    }
    if (out === null) return null;
    /* iOS 英文界面：¥ → $（在最终译文上替换，避免动到正则里的捕获符） */
    if (CUR) out = out.split('¥').join(CUR);
    return out;
  }

  /* 只跳过聊天气泡（用户输入内容）；社区的提示语（进入中/退出等）照常翻译 */
  var SKIP_SEL = '.chat-bub,.msg-sign,.gd-text';  /* 花园动态是玩家内容，不翻译 */

  function walkText(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.nodeValue) continue;
      var core = n.nodeValue.trim();
      /* 纯价格节点（如 ¥8）没有中文，但 iOS 版需要换成 $1.99 */
      if (!ZH.test(n.nodeValue) && !Object.prototype.hasOwnProperty.call(PRICE, core)) continue;
      var p = n.parentElement;
      if (!p || p.closest('script,style')) continue;
      if (p.closest(SKIP_SEL)) continue;
      if (p.classList && p.classList.contains('cal-w') && WD_MAP[core]) { n.nodeValue = WD_MAP[core]; continue; }
      var t = tr(core);
      if (!t) {
        /* toast 等场景文本是「emoji + 内容 (+ ⭐+1)」合在一个节点里（如 🌞 呀，你回来啦～、💃 佩奇跳起了小舞～ ⭐+1），
           先剥尾部加分后缀，再剥首段纯符号/emoji 前缀，分别查词典后按原样拼回 */
        var tail = '', base = core;
        var ms = base.match(/\s*⭐\+1$/);
        if (ms) { tail = ms[0]; base = base.slice(0, base.length - tail.length); }
        var m2 = base.match(/^([^A-Za-z0-9\u4e00-\u9fff]+)\s+(.+)$/);
        var t2 = m2 ? tr(m2[2]) : tr(base);
        if (t2) {
          n.nodeValue = n.nodeValue.replace(core, (m2 ? m2[1] + ' ' : '') + t2 + tail);
          continue;
        }
      }
      if (t && t !== core) n.nodeValue = n.nodeValue.replace(core, t);
    }
  }

  function walkAttrs(root) {
    var els = root.querySelectorAll ? root.querySelectorAll('input,textarea,button,[title],[aria-label]') : [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      /* 基本信息编辑框里的默认个性签名（input 的 value 属性不走文本遍历） */
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value === '无语中..') el.value = 'Speechless..';
      var as = ['placeholder', 'title', 'aria-label'];
      for (var j = 0; j < as.length; j++) {
        var v = el.getAttribute && el.getAttribute(as[j]);
        if (!v || !ZH.test(v)) continue;
        var t = tr(v.trim());
        if (t && t !== v.trim()) el.setAttribute(as[j], t);
      }
    }
  }

  function apply(root) {
    if (LANG !== 'en') return;
    root = root || document;
    if (root.nodeType === 3) { /* 文本节点直接处理 */ }
    try { walkText(root); walkAttrs(root); } catch (e) {}
  }

  /* 页面标题与 html lang；英文模式下品牌名只显示一遍 */
  function applyChrome() {
    if (LANG === 'en') {
      document.title = 'Quit Smoke & Drink With Me';
      document.documentElement.lang = 'en';
    } else {
      document.title = '快乐佩奇：戒烟戒酒跟我走';
      document.documentElement.lang = 'zh-CN';
    }
  }
  /* 英文品牌名只出现一次：登录页大标题用全名、副标题隐藏；顶栏同理 */
  function applyBrand() {
    if (LANG !== 'en') return;
    var NAME = 'Quit Smoke & Drink With Me';
    var h1 = document.querySelector('#login .logo h1');
    var sub = document.querySelector('#login .sub-title');
    var logo = document.querySelector('#login .logo');
    if (h1) h1.textContent = NAME;
    if (sub) sub.style.display = 'none';
    if (logo) logo.classList.add('logo-en');
    var tb = document.querySelector('.tb-wrap');
    if (tb) {
      tb.classList.add('tb-en');
      /* 英文顶栏分三行：Quit / Smoke & Drink / With Me，窄屏也放得下 */
      tb.innerHTML = 'Quit<br>Smoke &amp; Drink<br>With Me';
    }
    var credit = document.querySelector('.brand-credit');
    if (credit) credit.style.display = 'none';
  }
  /* 登录页语言快捷切换（国旗按钮） */
  function bindLangPick() {
    var zh = document.getElementById('langZh'), en = document.getElementById('langEn');
    if (!zh || !en) return;
    zh.classList.toggle('on', LANG === 'zh');
    en.classList.toggle('on', LANG === 'en');
    zh.onclick = function () { if (LANG !== 'zh') setLang('zh'); };
    en.onclick = function () { if (LANG !== 'en') setLang('en'); };
  }

  /* 菜单语言切换面板（由 game.js 调用） */
  function langSheet(sheetFn, closeFn) {
    var cur = LANG === 'en' ? 'English' : '中文';
    sheetFn('<h3>🌐 Language / 语言</h3><p class="sheet-sub">Current: ' + cur + '</p>' +
      '<div class="sheet-actions col">' +
      '<button class="btn btn-primary btn-lg' + (LANG === 'en' ? ' lang-on' : '') + '" id="lgEn">English</button>' +
      '<button class="btn btn-primary btn-lg' + (LANG === 'zh' ? ' lang-on' : '') + '" id="lgZh">中文</button>' +
      '</div>');
    document.getElementById('lgEn').onclick = function () { setLang('en'); };
    document.getElementById('lgZh').onclick = function () { setLang('zh'); };
  }
  function setLang(l) {
    try { localStorage.setItem('kk_lang', l); } catch (e) {}
    location.reload();
  }

  /* MutationObserver：新插入/变更的节点同步翻译（同帧完成，避免中文闪现） */
  var busy = false;
  function schedule() {
    if (busy || LANG !== 'en') return;
    busy = true;
    try { apply(document.body || document); } catch (e) {}
    busy = false;
  }

  window.KKI18N = {
    apply: apply,
    lang: function () { return LANG; },
    set: setLang,
    sheet: langSheet
  };

  applyChrome();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(document.body); applyBrand(); bindLangPick(); });
  } else {
    apply(document.body);
    applyBrand();
    bindLangPick();
  }
  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
})();
