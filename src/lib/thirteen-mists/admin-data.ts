export type AdminRole = "boss" | "mgr" | "dm";
export type PermissionState = "y" | "p" | "n";

export type AdminNavGroup = {
  title: string;
  items: {
    href: string;
    label: string;
    active: string;
    capability?: string;
  }[];
};

export type PermissionCap = {
  cap: string;
  sub: string;
  boss: PermissionState;
  mgr: PermissionState;
  dm: PermissionState;
  note?: Partial<Record<AdminRole, string>>;
};

export type PermissionGroup = {
  group: string;
  caps: PermissionCap[];
};

export const ADMIN_ROLE_META: Record<
  AdminRole,
  {
    name: string;
    title: string;
    description: string;
    home: string;
    badgeClass: string;
  }
> = {
  boss: {
    name: "老板",
    title: "Boss",
    description: "全部权限：权限分配、门店设置、财务规则、日志审计。",
    home: "/admin",
    badgeClass: "boss",
  },
  mgr: {
    name: "店长",
    title: "Manager",
    description: "运营与内容管理，可充值消费；不可分配权限与修改规则。",
    home: "/admin",
    badgeClass: "mgr",
  },
  dm: {
    name: "DM",
    title: "Dungeon Master",
    description: "查会员、录充值消费、看剧本妆造；不可调整等级积分。",
    home: "/admin/members",
    badgeClass: "dm",
  },
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "经营",
    items: [
      { href: "/admin", label: "数据概览", active: "dashboard", capability: "data.dashboard" },
      { href: "/admin/members", label: "会员管理", active: "members", capability: "member.view" },
      { href: "/admin/logs", label: "操作日志", active: "logs", capability: "system.logs" },
    ],
  },
  {
    title: "内容",
    items: [
      { href: "/admin/scripts", label: "剧本管理", active: "scripts", capability: "content.script" },
      {
        href: "/admin/recommendations",
        label: "推荐管理",
        active: "recommendations",
        capability: "content.rec",
      },
      { href: "/admin/makeup", label: "妆造管理", active: "makeup", capability: "content.makeup" },
    ],
  },
  {
    title: "系统",
    items: [
      { href: "/admin/settings", label: "门店设置", active: "settings", capability: "system.settings" },
      { href: "/admin/staff", label: "权限分配", active: "staff", capability: "system.staff" },
    ],
  },
];

export const ADMIN_PERMISSION_MATRIX: PermissionGroup[] = [
  {
    group: "会员系统",
    caps: [
      { cap: "查看会员列表与详情", sub: "会员、流水、积分", boss: "y", mgr: "y", dm: "y" },
      { cap: "录入充值 / 消费", sub: "按规则自动算赠送、折扣、积分", boss: "y", mgr: "y", dm: "y" },
      {
        cap: "手动调整余额 / 积分",
        sub: "必须填写备注并生成流水",
        boss: "y",
        mgr: "p",
        dm: "n",
        note: { mgr: "需备注，单笔上限 ¥500" },
      },
      {
        cap: "调整会员等级",
        sub: "越权变更等级",
        boss: "y",
        mgr: "p",
        dm: "n",
        note: { mgr: "仅可升级，降级须老板" },
      },
      { cap: "新增 / 编辑会员资料", sub: "建档与资料维护", boss: "y", mgr: "y", dm: "y" },
    ],
  },
  {
    group: "内容管理",
    caps: [
      { cap: "查看剧本库 / 妆造库", sub: "浏览与检索", boss: "y", mgr: "y", dm: "y" },
      { cap: "新增 / 编辑剧本", sub: "封面、字段、标签", boss: "y", mgr: "y", dm: "n" },
      { cap: "上架 / 下架剧本", sub: "控制对客展示", boss: "y", mgr: "y", dm: "n" },
      { cap: "设置首页推荐位", sub: "最多 3 个推荐", boss: "y", mgr: "y", dm: "n" },
      {
        cap: "上传 / 删除妆造图片",
        sub: "对象存储资源",
        boss: "y",
        mgr: "p",
        dm: "n",
        note: { mgr: "可上传 / 编辑，删除须老板" },
      },
    ],
  },
  {
    group: "系统与数据",
    caps: [
      {
        cap: "数据概览看板",
        sub: "充值、消费、热门剧本",
        boss: "y",
        mgr: "y",
        dm: "p",
        note: { dm: "仅看当班概览" },
      },
      { cap: "门店设置 / 客服信息", sub: "微信、地址、营业时间", boss: "y", mgr: "n", dm: "n" },
      { cap: "会员规则配置", sub: "充值赠送 / 等级 / 积分规则", boss: "y", mgr: "n", dm: "n" },
      {
        cap: "操作日志审计",
        sub: "查看全店操作流水",
        boss: "y",
        mgr: "p",
        dm: "n",
        note: { mgr: "仅看本人及下属" },
      },
      { cap: "员工账号与权限分配", sub: "创建账号、指派角色", boss: "y", mgr: "n", dm: "n" },
      { cap: "停用 / 删除账号", sub: "账号生命周期", boss: "y", mgr: "n", dm: "n" },
    ],
  },
];

export const ADMIN_CAPABILITIES: Record<
  string,
  Record<AdminRole, PermissionState>
> = {
  "member.view": { boss: "y", mgr: "y", dm: "y" },
  "member.edit": { boss: "y", mgr: "y", dm: "y" },
  "member.txn": { boss: "y", mgr: "y", dm: "y" },
  "member.adjust": { boss: "y", mgr: "p", dm: "n" },
  "member.level": { boss: "y", mgr: "p", dm: "n" },
  "content.script": { boss: "y", mgr: "y", dm: "n" },
  "content.rec": { boss: "y", mgr: "y", dm: "n" },
  "content.makeup": { boss: "y", mgr: "p", dm: "n" },
  "data.dashboard": { boss: "y", mgr: "y", dm: "p" },
  "system.settings": { boss: "y", mgr: "n", dm: "n" },
  "system.staff": { boss: "y", mgr: "n", dm: "n" },
  "system.account": { boss: "y", mgr: "n", dm: "n" },
  "system.logs": { boss: "y", mgr: "p", dm: "n" },
};

export const ADMIN_LEVEL_RULES = [
  { name: "普通会员", min: 0, discount: "9.8" },
  { name: "银雾会员", min: 500, discount: "9.5" },
  { name: "金雾会员", min: 1000, discount: "9" },
  { name: "黑雾会员", min: 3000, discount: "8.5" },
] as const;

export const ADMIN_RECHARGE_RULES = [
  { min: 300, gift: 30 },
  { min: 500, gift: 80 },
  { min: 1000, gift: 200 },
  { min: 2000, gift: 500 },
] as const;

export const DASHBOARD_STATS = [
  { title: "今日充值", value: "¥6,800.00", trend: "较昨日 +18.6%", accent: "seal" },
  { title: "今日消费", value: "¥4,236.00", trend: "较昨日 +7.2%" },
  { title: "会员总数", value: "328", trend: "本周新增 12" },
  { title: "在库剧本", value: "26 · 上架 23", trend: "主推位 3 / 3" },
] as const;

export const HOT_SCRIPTS = [
  { rank: 1, name: "雾港疑云", meta: "情感 · 微恐", cover: "#3a4a63", plays: 64, pct: 100 },
  { rank: 2, name: "长安十二时辰", meta: "古风 · 阵营", cover: "#7a3b2e", plays: 51, pct: 80 },
  { rank: 3, name: "雪夜来客", meta: "硬核 · 推理", cover: "#2f4034", plays: 43, pct: 67 },
  { rank: 4, name: "繁花旧梦", meta: "民国 · 情感", cover: "#5a3550", plays: 31, pct: 48 },
  { rank: 5, name: "量子谜踪", meta: "机制 · 烧脑", cover: "#33495a", plays: 22, pct: 34 },
] as const;

export const DASHBOARD_FEED = [
  {
    type: "recharge",
    who: "林晚舟",
    description: "充值 ¥1000，赠 ¥200",
    amount: "+¥1,200.00",
    ago: "3 分钟前",
  },
  {
    type: "spend",
    who: "周慕云",
    description: "《雾港疑云》6 人局 · 金雾 9 折",
    amount: "-¥388.80",
    ago: "21 分钟前",
  },
  {
    type: "new",
    who: "苏小满",
    description: "新会员注册 · 普通会员",
    amount: "",
    ago: "48 分钟前",
  },
  {
    type: "recharge",
    who: "陈书意",
    description: "充值 ¥500，赠 ¥80",
    amount: "+¥580.00",
    ago: "1 小时前",
  },
  {
    type: "adjust",
    who: "阿沉（店长）",
    description: "为「黎深」手动调整积分 +50 · 备注：投诉补偿",
    amount: "",
    ago: "2 小时前",
  },
] as const;

export const DASHBOARD_TODOS = [
  { color: "var(--tm-seal)", text: "3 名金雾会员余额不足 ¥100，建议提醒续充" },
  { color: "var(--tm-warn)", text: "《孤岛惊魂》库存道具待补，暂时下架中" },
  { color: "var(--tm-info)", text: "本周妆造图库新增 2 套待审核" },
  { color: "var(--tm-muted)", text: "门店营业时间未配置节假日特殊安排" },
] as const;

export const QUICK_ACTIONS = [
  { title: "新增充值", sub: "按规则赠送", href: "/admin/members", capability: "member.txn" },
  { title: "新增消费", sub: "校验余额扣款", href: "/admin/members", capability: "member.txn" },
  { title: "新增剧本", sub: "上架到剧本库", href: "/admin/scripts", capability: "content.script" },
  { title: "设置推荐", sub: "首页三个主推", href: "/admin/recommendations", capability: "content.rec" },
] as const;

export const MEMBERS = [
  {
    id: 1,
    name: "林晚舟",
    phone: "138****5021",
    level: 2,
    balance: 1286.5,
    totalRecharge: 2400,
    totalSpend: 1320,
    points: 214,
    last: "6-20",
    join: "2025-09-12",
    ledger: [
      { type: "recharge", description: "充值 ¥1000，赠 ¥200", amount: 1200, time: "今天 14:32" },
      { type: "spend", description: "《雾港疑云》6 人局 · 金雾 9 折", amount: -388.8, time: "6-20 21:15" },
      { type: "recharge", description: "充值 ¥500，赠 ¥80", amount: 580, time: "6-08 19:40" },
      { type: "adjust", description: "积分 +50 · 备注：生日礼", amount: 0, time: "5-28 12:00" },
    ],
  },
  {
    id: 2,
    name: "周慕云",
    phone: "159****8830",
    level: 3,
    balance: 4210,
    totalRecharge: 5200,
    totalSpend: 2890,
    points: 642,
    last: "6-21",
    join: "2025-06-03",
    ledger: [
      { type: "spend", description: "《长安十二时辰》8 人局 · 黑雾 8.5 折", amount: -510, time: "6-21 20:10" },
      { type: "recharge", description: "充值 ¥2000，赠 ¥500", amount: 2500, time: "6-01 18:22" },
    ],
  },
  {
    id: 3,
    name: "苏小满",
    phone: "186****1147",
    level: 0,
    balance: 92,
    totalRecharge: 300,
    totalSpend: 208,
    points: 36,
    last: "6-18",
    join: "2026-06-22",
    ledger: [
      { type: "recharge", description: "充值 ¥300，赠 ¥30", amount: 330, time: "6-10 16:00" },
      { type: "spend", description: "《雪夜来客》4 人局 · 普通 9.8 折", amount: -208, time: "6-18 22:05" },
    ],
  },
  {
    id: 4,
    name: "黎深",
    phone: "133****6692",
    level: 1,
    balance: 76.4,
    totalRecharge: 800,
    totalSpend: 690,
    points: 158,
    last: "6-19",
    join: "2025-11-20",
    ledger: [
      { type: "spend", description: "《繁花旧梦》· 银雾 9.5 折", amount: -342, time: "6-19 21:40" },
      { type: "adjust", description: "积分 +50 · 备注：投诉补偿", amount: 0, time: "6-15 11:20" },
    ],
  },
  {
    id: 5,
    name: "陈书意",
    phone: "177****2204",
    level: 1,
    balance: 612,
    totalRecharge: 580,
    totalSpend: 120,
    points: 80,
    last: "6-15",
    join: "2026-01-08",
    ledger: [{ type: "recharge", description: "充值 ¥500，赠 ¥80", amount: 580, time: "6-12 15:30" }],
  },
  {
    id: 6,
    name: "顾时宴",
    phone: "152****9981",
    level: 2,
    balance: 1530,
    totalRecharge: 1500,
    totalSpend: 410,
    points: 296,
    last: "6-17",
    join: "2025-08-19",
    ledger: [{ type: "recharge", description: "充值 ¥1000，赠 ¥200", amount: 1200, time: "6-05 17:10" }],
  },
  {
    id: 7,
    name: "温野",
    phone: "139****4456",
    level: 0,
    balance: 18,
    totalRecharge: 300,
    totalSpend: 290,
    points: 62,
    last: "6-14",
    join: "2026-03-02",
    ledger: [{ type: "spend", description: "《量子谜踪》· 普通 9.8 折", amount: -196, time: "6-14 20:00" }],
  },
  {
    id: 8,
    name: "夏栀",
    phone: "188****7723",
    level: 3,
    balance: 3380,
    totalRecharge: 3500,
    totalSpend: 1120,
    points: 880,
    last: "6-21",
    join: "2025-04-15",
    ledger: [{ type: "recharge", description: "充值 ¥2000，赠 ¥500", amount: 2500, time: "6-02 19:00" }],
  },
];

export const ADMIN_SCRIPTS = [
  {
    id: "wugang",
    name: "雾港疑云",
    cover: "#3a4a63",
    players: "6（限定）",
    duration: "4 小时",
    difficulty: "进阶",
    makeup: "yes",
    tags: ["情感", "推理", "民国"],
    on: true,
    intro: "海雾封港之夜，一桩沉船旧案浮出水面，每个人都在打捞自己的秘密。",
  },
  {
    id: "changan",
    name: "长安十二时辰",
    cover: "#7a3b2e",
    players: "8（7-8）",
    duration: "5 小时",
    difficulty: "硬核",
    makeup: "yes",
    tags: ["古风", "阵营", "推理"],
    on: true,
    intro: "上元灯会，十二时辰之内，找出潜伏长安的祸首，权谋与人心同台。",
  },
  {
    id: "xueye",
    name: "雪夜来客",
    cover: "#2f4034",
    players: "4（4-5）",
    duration: "3 小时",
    difficulty: "新手",
    makeup: "no",
    tags: ["推理", "新手友好", "现代"],
    on: true,
    intro: "暴雪山庄，断电之夜，一通报警电话之后，谁是不速之客？",
  },
  {
    id: "fanhua",
    name: "繁花旧梦",
    cover: "#5a3550",
    players: "6（5-7）",
    duration: "4 小时",
    difficulty: "进阶",
    makeup: "yes",
    tags: ["民国", "情感"],
    on: true,
    intro: "十里洋场，名伶与少帅，一封未寄出的信牵起整座城的命运。",
  },
  {
    id: "liangzi",
    name: "量子谜踪",
    cover: "#33495a",
    players: "5（限定）",
    duration: "4.5 小时",
    difficulty: "硬核",
    makeup: "no",
    tags: ["机制", "推理", "现代"],
    on: true,
    intro: "实验室爆炸后的平行时空，用逻辑拼回被篡改的因果链。",
  },
  {
    id: "huanle",
    name: "欢乐茶馆",
    cover: "#6b4a2e",
    players: "7（6-8）",
    duration: "3 小时",
    difficulty: "新手",
    makeup: "no",
    tags: ["欢乐", "新手友好"],
    on: true,
    intro: "老北京茶馆里的一地鸡毛，笑到飙泪的轻松开局本。",
  },
  {
    id: "gudao",
    name: "孤岛惊魂",
    cover: "#2e4a4a",
    players: "6（限定）",
    duration: "4 小时",
    difficulty: "硬核",
    makeup: "yes",
    tags: ["恐怖", "机制"],
    on: false,
    intro: "与世隔绝的灯塔孤岛，道具机关待补，暂时下架维护中。",
  },
];

export const ADMIN_RECOMMENDATIONS = [
  { id: "wugang", copy: "本月人气王 · 限定 6 人海雾沉浸局" },
  { id: "changan", copy: "硬核阵营 · 上元灯会权谋大局" },
  { id: "xueye", copy: "新手友好 · 3 小时暴雪推理" },
] as const;

export const ADMIN_MAKEUP = [
  {
    id: 1,
    name: "民国名伶 · 烟视媚行",
    style: "民国",
    time: "40 分钟",
    scripts: "繁花旧梦、雾港疑云",
    price: 88,
    on: true,
    cover: "#5a3550",
    description: "手推波纹卷发 + 旗袍盘扣，复古红唇与珍珠耳坠。",
  },
  {
    id: 2,
    name: "长安仕女 · 簪花照影",
    style: "古风",
    time: "55 分钟",
    scripts: "长安十二时辰",
    price: 128,
    on: true,
    cover: "#7a3b2e",
    description: "高髻簪花 + 齐胸襦裙，含眉心花钿与团扇。",
  },
  {
    id: 3,
    name: "暗夜侦探 · 风衣礼帽",
    style: "现代",
    time: "20 分钟",
    scripts: "雪夜来客、量子谜踪",
    price: 48,
    on: true,
    cover: "#33495a",
    description: "中性利落造型，风衣 + 礼帽 + 怀表配饰。",
  },
  {
    id: 4,
    name: "欧式贵族 · 蕾丝华服",
    style: "欧式",
    time: "60 分钟",
    scripts: "孤岛惊魂",
    price: 158,
    on: true,
    cover: "#4a3b63",
    description: "巴洛克卷发 + 蕾丝长裙，含手套与扇子。",
  },
  {
    id: 5,
    name: "茶馆掌柜 · 长衫马褂",
    style: "民国",
    time: "25 分钟",
    scripts: "欢乐茶馆",
    price: 38,
    on: true,
    cover: "#6b4a2e",
    description: "长衫马褂 + 圆框眼镜，市井烟火气。",
  },
  {
    id: 6,
    name: "将军戎装 · 银甲红缨",
    style: "古风",
    time: "50 分钟",
    scripts: "长安十二时辰",
    price: 138,
    on: true,
    cover: "#2f4034",
    description: "仿古银甲 + 红缨披风，含束发冠。",
  },
  {
    id: 7,
    name: "名媛舞会 · 缎面晚礼",
    style: "欧式",
    time: "45 分钟",
    scripts: "繁花旧梦",
    price: 118,
    on: false,
    cover: "#3a3a4a",
    description: "复古手推波 + 缎面晚礼服，待补配饰，暂未展示。",
  },
  {
    id: 8,
    name: "都市白领 · 通勤简装",
    style: "现代",
    time: "15 分钟",
    scripts: "量子谜踪",
    price: 28,
    on: true,
    cover: "#445a52",
    description: "基础通勤造型，适合现代本快速入戏。",
  },
];

export const STAFF_ACCOUNTS = [
  { id: 1, name: "雾主 · 阿沉", phone: "138****0001", account: "wuzhu", role: "boss" as const, active: true, last: "今天 09:12", locked: true },
  { id: 2, name: "林夙", phone: "159****2280", account: "lin_su", role: "mgr" as const, active: true, last: "今天 11:40" },
  { id: 3, name: "沈鹭", phone: "186****6612", account: "shen_lu", role: "mgr" as const, active: true, last: "昨天 22:05" },
  { id: 4, name: "小野", phone: "133****7741", account: "dm_xiaoye", role: "dm" as const, active: true, last: "今天 13:20" },
  { id: 5, name: "阿衡", phone: "177****3390", account: "dm_aheng", role: "dm" as const, active: true, last: "今天 12:55" },
  { id: 6, name: "江照", phone: "152****8804", account: "dm_jiang", role: "dm" as const, active: true, last: "6-20 23:10" },
  { id: 7, name: "宋迟", phone: "139****1156", account: "dm_songchi", role: "dm" as const, active: false, last: "5-30 20:00" },
];

export const LOGS = [
  {
    id: "LOG-20260622-0047",
    time: "2026-06-22 14:18:33",
    operator: "阿沉",
    role: "店长",
    type: "money",
    action: "会员充值",
    target: "林晚（138****2046）",
    ip: "192.168.1.12",
    description: "为会员充值 ¥1,000，按规则赠送 ¥200，到账余额 ¥1,200。",
    diff: [
      { key: "储值余额", from: "¥86.50", to: "¥1,286.50" },
      { key: "累计充值", from: "¥1,800", to: "¥2,800" },
      { key: "会员等级", from: "金雾会员", to: "金雾会员" },
    ],
  },
  {
    id: "LOG-20260622-0046",
    time: "2026-06-22 14:02:10",
    operator: "小满",
    role: "员工",
    type: "money",
    action: "会员消费",
    target: "周屿（150****7781）",
    ip: "192.168.1.27",
    description: "《雾港疑云》6 人局，原价 ¥588，金雾 9 折实付 ¥529.20，余额扣减，获积分 529。",
    diff: [
      { key: "储值余额", from: "¥742.00", to: "¥212.80" },
      { key: "可用积分", from: "1,204", to: "1,733" },
    ],
  },
  {
    id: "LOG-20260622-0044",
    time: "2026-06-22 13:40:55",
    operator: "阿沉",
    role: "店长",
    type: "member",
    action: "手动调整余额",
    target: "陈默（177****0192）",
    ip: "192.168.1.12",
    description: "客诉补偿：手动为会员增加余额 ¥50。备注：上周设备故障导致一局中断，协商补偿。",
    sensitive: true,
    note: "上周设备故障导致一局中断，协商补偿",
    diff: [{ key: "储值余额", from: "¥0.00", to: "¥50.00" }],
  },
  {
    id: "LOG-20260622-0041",
    time: "2026-06-22 11:55:02",
    operator: "阿七",
    role: "员工",
    type: "content",
    action: "剧本上架",
    target: "《长安十二时》",
    ip: "192.168.1.31",
    description: "将剧本《长安十二时》状态从「下架」切换为「上架」，前台剧本库即时可见。",
    diff: [{ key: "上架状态", from: "下架", to: "上架" }],
  },
  {
    id: "LOG-20260622-0039",
    time: "2026-06-22 11:20:47",
    operator: "阿沉",
    role: "店长",
    type: "content",
    action: "编辑推荐位",
    target: "首页推荐 · 位 2",
    ip: "192.168.1.12",
    description: "将首页第 2 个推荐剧本由《雪夜来客》替换为《长安十二时》，并更新推荐文案。",
    diff: [
      { key: "推荐剧本", from: "《雪夜来客》", to: "《长安十二时》" },
      { key: "推荐文案", from: "本周高分新本", to: "盛唐沉浸·烧脑推理" },
    ],
  },
  {
    id: "LOG-20260622-0035",
    time: "2026-06-22 10:48:19",
    operator: "小满",
    role: "员工",
    type: "content",
    action: "上传妆造",
    target: "妆造 · 民国名伶",
    ip: "192.168.1.27",
    description: "新增妆造造型「民国名伶」，风格标签：民国，适用《雾港疑云》，参考价 ¥128。",
    diff: [
      { key: "造型数量", from: "35", to: "36" },
      { key: "展示状态", from: "—", to: "展示中" },
    ],
  },
  {
    id: "LOG-20260622-0030",
    time: "2026-06-22 10:05:33",
    operator: "阿沉",
    role: "店长",
    type: "member",
    action: "手动调整等级",
    target: "苏挽（131****6650）",
    ip: "192.168.1.12",
    description: "VIP 协议升级：手动将会员等级由「银雾会员」调整为「金雾会员」。备注：年度合作客户协议升级。",
    sensitive: true,
    note: "年度合作客户协议升级",
    diff: [
      { key: "会员等级", from: "银雾会员", to: "金雾会员" },
      { key: "消费折扣", from: "9.5 折", to: "9 折" },
    ],
  },
  {
    id: "LOG-20260622-0022",
    time: "2026-06-22 09:32:08",
    operator: "阿沉",
    role: "店长",
    type: "config",
    action: "修改充值规则",
    target: "充值赠送档位",
    ip: "192.168.1.12",
    description: "调整充值赠送活动：新增「满 2000 赠 500」档位，原档位保持不变。",
    diff: [{ key: "满 2000", from: "赠 400", to: "赠 500" }],
  },
  {
    id: "LOG-20260622-0018",
    time: "2026-06-22 09:10:44",
    operator: "小满",
    role: "员工",
    type: "content",
    action: "编辑剧本",
    target: "《雾港疑云》",
    ip: "192.168.1.27",
    description: "更新剧本《雾港疑云》信息：时长由 180 分钟调整为 210 分钟，难度由「进阶」改为「烧脑」。",
    diff: [
      { key: "游戏时长", from: "180 分钟", to: "210 分钟" },
      { key: "难度", from: "进阶", to: "烧脑" },
    ],
  },
  {
    id: "LOG-20260622-0009",
    time: "2026-06-22 08:46:02",
    operator: "阿沉",
    role: "店长",
    type: "auth",
    action: "管理员登录",
    target: "雾主 · 阿沉",
    ip: "192.168.1.12",
    description: "管理员账号 admin 登录后台操作台。登录方式：账号密码。",
    diff: [],
  },
];
