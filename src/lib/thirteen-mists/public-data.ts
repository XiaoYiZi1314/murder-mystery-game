export type PublicNavItem = {
  href: string;
  label: string;
};

export type ScriptDifficulty = "入门" | "进阶" | "硬核";

export type ScriptDetail = {
  title: string;
  description: string;
};

export type ScriptItem = {
  id: string;
  name: string;
  glyph: string;
  cover: string;
  categories: string[];
  difficulty: ScriptDifficulty;
  minPlayers: number;
  maxPlayers: number;
  playersLabel: string;
  duration: string;
  price: number;
  recommended: boolean;
  intro: string;
  kicker: string;
  makeup: string;
  rankLabel: string;
  landingCopy: string;
  highlights: ScriptDetail[];
  audience: ScriptDetail[];
  notes: string[];
};

export type MakeupItem = {
  id: number;
  name: string;
  glyph: string;
  art: string;
  tag: string;
  ratio: number;
  description: string;
  forScript: string;
  time: string;
  priceLabel: string;
  includes: string;
};

export type MemberLogItem = {
  time: string;
  title: string;
  amount?: string;
  points?: string;
};

export const PUBLIC_NAV: PublicNavItem[] = [
  { href: "/landing", label: "首页" },
  { href: "/scripts", label: "剧本库" },
  { href: "/makeup", label: "妆造推荐" },
  { href: "/member", label: "会员中心" },
];

export const BRAND_STATS = [
  { value: "120+", label: "在库剧本" },
  { value: "8", label: "主题包房" },
  { value: "4", label: "会员等级" },
] as const;

export const BRAND_CONTACT = {
  wechat: "shisanwu_kf",
  address: "城市中心区 · 雾巷 13 号 2F",
  hours: "14:00 - 次日 02:00",
  phone: "021-1313-1313",
};

export const LIBRARY_CATEGORIES = [
  "全部",
  "情感",
  "欢乐",
  "推理",
  "硬核",
  "恐怖",
  "机制",
  "阵营",
  "古风",
  "民国",
  "现代",
  "新手友好",
] as const;

export const LIBRARY_DIFFICULTIES = ["全部", "入门", "进阶", "硬核"] as const;

export const MAKEUP_TAGS = ["全部", "民国", "古风", "欧式", "现代"] as const;

export const SCRIPT_LIBRARY: ScriptItem[] = [
  {
    id: "wugang",
    name: "雾港疑云",
    glyph: "雾",
    cover: "c1",
    categories: ["情感", "推理", "民国"],
    difficulty: "进阶",
    minPlayers: 6,
    maxPlayers: 7,
    playersLabel: "6-7 人",
    duration: "约 4 小时",
    price: 198,
    recommended: true,
    intro:
      "民国上海，一桩沉入海雾的旧案被重新翻开。情感与诡计在浓雾里交织。",
    kicker: "情感推理 · 民国本",
    makeup: "推荐",
    rankLabel: "本店主推 · 01",
    landingCopy: "民国上海，一桩沉入海雾的旧案。情感与诡计交织，适合喜欢沉浸演绎的玩家。",
    highlights: [
      {
        title: "双线叙事",
        description: "明线查案、暗线情感，两条线在终幕交汇，复盘时信息量惊人。",
      },
      {
        title: "沉浸演绎",
        description: "大量独白与对手戏，给情感型玩家充分的表演空间。",
      },
      {
        title: "实景还原",
        description: "民国码头、旧报馆实景布置，配合灯光与雾效入戏更快。",
      },
    ],
    audience: [
      {
        title: "情感演绎党",
        description: "喜欢哭戏、对手戏、人物弧光的玩家。",
      },
      {
        title: "推理爱好者",
        description: "想动脑但不想承受硬核机制压力的玩家。",
      },
      {
        title: "进阶老玩家",
        description: "玩过 5 本以上、想要更细腻体验的玩家。",
      },
    ],
    notes: [
      "本场含一定情感冲突情节，介意者请提前告知。",
      "建议提前 30 分钟到店换装与试妆。",
      "剧本含关键反转，请勿向未玩玩家剧透。",
    ],
  },
  {
    id: "changan",
    name: "长安十二时",
    glyph: "唐",
    cover: "c2",
    categories: ["古风", "阵营", "硬核", "机制"],
    difficulty: "硬核",
    minPlayers: 7,
    maxPlayers: 8,
    playersLabel: "7-8 人",
    duration: "约 5 小时",
    price: 238,
    recommended: true,
    intro:
      "盛唐一日，权谋与江湖在长安城内并行推进，十二时辰倒计时下各方暗自角力。",
    kicker: "古风阵营 · 硬核机制本",
    makeup: "强烈推荐",
    rankLabel: "本店主推 · 02",
    landingCopy: "盛唐一日，权谋与江湖在长安城内并行。需妆造加持，沉浸感拉满。",
    highlights: [
      {
        title: "阵营博弈",
        description: "多方势力、隐藏目标，每一轮决策都牵动全局走向。",
      },
      {
        title: "时辰机制",
        description: "十二时辰倒计时驱动剧情，节奏紧凑、临场感强。",
      },
      {
        title: "盛唐妆造",
        description: "配套唐风妆造与服饰，照片出片率极高。",
      },
    ],
    audience: [
      {
        title: "策略硬核党",
        description: "喜欢机制、博弈、推演的资深玩家。",
      },
      {
        title: "古风爱好者",
        description: "想体验唐风妆造与场景沉浸的玩家。",
      },
      {
        title: "熟人车",
        description: "建议组队前来，配合度越高体验越好。",
      },
    ],
    notes: [
      "硬核机制本，建议有 3 本以上经验再开。",
      "需配套妆造，请预留换装时间约 40 分钟。",
      "满 7 人方可开场，凑车请联系门店。",
    ],
  },
  {
    id: "xueye",
    name: "雪夜来客",
    glyph: "雪",
    cover: "c3",
    categories: ["欢乐", "推理", "新手友好", "现代"],
    difficulty: "入门",
    minPlayers: 5,
    maxPlayers: 6,
    playersLabel: "5-6 人",
    duration: "约 3 小时",
    price: 158,
    recommended: true,
    intro:
      "错过末班车的七位陌生人，被迫共度风雪夜。轻松搞笑里藏着温柔反转。",
    kicker: "欢乐推理 · 新手友好本",
    makeup: "可选",
    rankLabel: "本店主推 · 03",
    landingCopy: "一间山间小屋，七位错过末班车的陌生人。轻松搞笑，适合第一次玩本。",
    highlights: [
      {
        title: "零门槛",
        description: "规则简单、节奏轻快，第一次玩也能很快上手。",
      },
      {
        title: "欢乐为主",
        description: "大量搞笑桥段，社交破冰、朋友聚会都合适。",
      },
      {
        title: "温柔反转",
        description: "结尾有一个不刻意但很暖的小反转，体验完整。",
      },
    ],
    audience: [
      {
        title: "剧本杀新人",
        description: "第一次玩、想轻松体验的朋友。",
      },
      {
        title: "朋友聚会",
        description: "想热闹一晚、不想太烧脑的小团体。",
      },
      {
        title: "亲子 / 同事局",
        description: "氛围友好，适合多种社交场合。",
      },
    ],
    notes: [
      "新手友好，无需任何前置经验。",
      "妆造为可选项，轻松到店即可。",
      "人数 5 人起开，欢迎散客拼车。",
    ],
  },
  {
    id: "jingzhongwuren",
    name: "镜中无人",
    glyph: "镜",
    cover: "c4",
    categories: ["恐怖", "推理", "机制"],
    difficulty: "进阶",
    minPlayers: 6,
    maxPlayers: 6,
    playersLabel: "6 人",
    duration: "约 4 小时",
    price: 218,
    recommended: false,
    intro:
      "一栋废弃公寓，七面无法照出人影的镜子。氛围恐怖本，胆小者慎入。",
    kicker: "恐怖推理 · 密闭空间",
    makeup: "可选",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "chunrixu",
    name: "春日序",
    glyph: "春",
    cover: "c5",
    categories: ["情感", "现代", "新手友好"],
    difficulty: "入门",
    minPlayers: 4,
    maxPlayers: 6,
    playersLabel: "4-6 人",
    duration: "约 3 小时",
    price: 168,
    recommended: false,
    intro:
      "一封毕业季的旧信，把五个人重新带回那个夏天。治愈系情感本，眼泪预警。",
    kicker: "都市群像 · 治愈情感",
    makeup: "无需",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "guimilieche",
    name: "诡秘列车",
    glyph: "车",
    cover: "c1",
    categories: ["推理", "硬核", "机制"],
    difficulty: "硬核",
    minPlayers: 6,
    maxPlayers: 8,
    playersLabel: "6-8 人",
    duration: "约 5 小时",
    price: 228,
    recommended: false,
    intro:
      "一列永不到站的夜行列车，每节车厢都是一道谜题。重推理、强机制。",
    kicker: "烧脑机制 · 封闭空间",
    makeup: "无需",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "shengshichangge",
    name: "盛世长歌",
    glyph: "歌",
    cover: "c2",
    categories: ["古风", "阵营", "情感"],
    difficulty: "进阶",
    minPlayers: 6,
    maxPlayers: 7,
    playersLabel: "6-7 人",
    duration: "约 4.5 小时",
    price: 208,
    recommended: false,
    intro:
      "王朝更替之际，一群人在家国与情义之间作出选择。古风情感阵营本。",
    kicker: "古风阵营 · 群像情感",
    makeup: "推荐",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "huanlejiuguan",
    name: "欢乐酒馆",
    glyph: "酒",
    cover: "c5",
    categories: ["欢乐", "新手友好", "现代"],
    difficulty: "入门",
    minPlayers: 5,
    maxPlayers: 8,
    playersLabel: "5-8 人",
    duration: "约 2.5 小时",
    price: 138,
    recommended: false,
    intro:
      "一间总在打烊前出事的小酒馆。节奏轻快、笑点密集，破冰首选。",
    kicker: "欢乐破冰 · 轻社交",
    makeup: "无需",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "shenyuanhuixiang",
    name: "深渊回响",
    glyph: "渊",
    cover: "c7",
    categories: ["恐怖", "硬核", "机制"],
    difficulty: "硬核",
    minPlayers: 6,
    maxPlayers: 7,
    playersLabel: "6-7 人",
    duration: "约 5 小时",
    price: 248,
    recommended: false,
    intro:
      "深海科研站失联，最后的信号来自一个不该存在的声音。硬核恐怖机制本。",
    kicker: "深海恐怖 · 硬核机制",
    makeup: "可选",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "renjianzhide",
    name: "人间值得",
    glyph: "人",
    cover: "c5",
    categories: ["情感", "现代"],
    difficulty: "进阶",
    minPlayers: 5,
    maxPlayers: 6,
    playersLabel: "5-6 人",
    duration: "约 4 小时",
    price: 188,
    recommended: false,
    intro:
      "六个陌生人在同一家深夜便利店相遇。都市群像情感本，后劲很大。",
    kicker: "都市群像 · 后劲拉满",
    makeup: "无需",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "jianghuyeyu",
    name: "江湖夜雨",
    glyph: "侠",
    cover: "c3",
    categories: ["古风", "阵营", "欢乐"],
    difficulty: "入门",
    minPlayers: 6,
    maxPlayers: 8,
    playersLabel: "6-8 人",
    duration: "约 3.5 小时",
    price: 178,
    recommended: false,
    intro:
      "客栈一夜，群侠云集。轻松武侠阵营本，新手也能玩得尽兴。",
    kicker: "武侠阵营 · 欢乐破冰",
    makeup: "推荐",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
  {
    id: "hongwuzhuangyuan",
    name: "红雾庄园",
    glyph: "庄",
    cover: "c6",
    categories: ["恐怖", "推理", "阵营"],
    difficulty: "进阶",
    minPlayers: 7,
    maxPlayers: 8,
    playersLabel: "7-8 人",
    duration: "约 4.5 小时",
    price: 228,
    recommended: false,
    intro:
      "一场暴雨困住的庄园晚宴，宾客接连失踪。经典封闭空间推理本。",
    kicker: "庄园悬疑 · 暴雨夜",
    makeup: "可选",
    rankLabel: "馆藏精选",
    landingCopy: "",
    highlights: [],
    audience: [],
    notes: [],
  },
];

export const MAKEUP_LIBRARY: MakeupItem[] = [
  {
    id: 1,
    name: "名媛旗袍",
    glyph: "媛",
    art: "a1",
    tag: "民国",
    ratio: 1.34,
    description:
      "复古卷发、红唇与珍珠点缀，搭配真丝旗袍，还原民国名媛的清冷与风情。",
    forScript: "都市情感本 · 民国本",
    time: "约 40 分钟",
    priceLabel: "¥128 起",
    includes: "含发型 + 旗袍租赁",
  },
  {
    id: 2,
    name: "盛唐贵女",
    glyph: "唐",
    art: "a4",
    tag: "古风",
    ratio: 1.5,
    description:
      "花钿额黄、高髻步摇，配齐胸襦裙，一秒梦回盛唐长安。",
    forScript: "古风阵营机制本",
    time: "约 60 分钟",
    priceLabel: "¥168 起",
    includes: "含发型 + 唐风服饰",
  },
  {
    id: 3,
    name: "宫廷舞会",
    glyph: "欧",
    art: "a3",
    tag: "欧式",
    ratio: 1.2,
    description:
      "欧式立体妆容与卷发造型，搭配蕾丝礼服，适合宫廷推理与舞会本。",
    forScript: "欧式推理本",
    time: "约 45 分钟",
    priceLabel: "¥148 起",
    includes: "含发型 + 礼服租赁",
  },
  {
    id: 4,
    name: "都市夜行",
    glyph: "夜",
    art: "a2",
    tag: "现代",
    ratio: 1.42,
    description:
      "冷调通勤妆、利落直发，干练又带一点神秘，适合现代都市情感本。",
    forScript: "现代情感本",
    time: "约 25 分钟",
    priceLabel: "¥88 起",
    includes: "仅含妆容造型",
  },
  {
    id: 5,
    name: "武侠侠女",
    glyph: "侠",
    art: "a5",
    tag: "古风",
    ratio: 1.28,
    description:
      "英气剑眉、半披发束，配练功衫与发带，江湖儿女快意恩仇。",
    forScript: "武侠阵营本",
    time: "约 40 分钟",
    priceLabel: "¥118 起",
    includes: "含发型 + 武侠服饰",
  },
  {
    id: 6,
    name: "暗夜哥特",
    glyph: "魅",
    art: "a6",
    tag: "欧式",
    ratio: 1.46,
    description:
      "深色烟熏、苍白底妆与暗红唇，氛围拉满，专为恐怖与悬疑本设计。",
    forScript: "恐怖 / 悬疑本",
    time: "约 35 分钟",
    priceLabel: "¥108 起",
    includes: "仅含妆容造型",
  },
  {
    id: 7,
    name: "校园青春",
    glyph: "青",
    art: "a7",
    tag: "现代",
    ratio: 1.18,
    description:
      "清透裸妆、低马尾，搭配校服，唤回最青涩的校园记忆。",
    forScript: "青春情感本",
    time: "约 20 分钟",
    priceLabel: "¥68 起",
    includes: "含发型 + 校服租赁",
  },
  {
    id: 8,
    name: "将军戎装",
    glyph: "将",
    art: "a8",
    tag: "古风",
    ratio: 1.36,
    description:
      "硬朗轮廓妆、束发金冠，配甲胄披风，气场全开的沙场名将。",
    forScript: "古风权谋本",
    time: "约 55 分钟",
    priceLabel: "¥158 起",
    includes: "含发型 + 甲胄服饰",
  },
];

export const MEMBER_PROFILE = {
  name: "雾岚",
  maskedPhone: "138****6688",
  avatarText: "雾",
  balance: 1286.5,
  totalRecharge: 1500,
  totalSpend: 213.5,
  points: 214,
  levelLabel: "金雾会员",
  discountLabel: "9 折",
  birthday: "1998-03-13",
  greetingName: "你好，雾岚",
};

export const MEMBER_RIGHTS = [
  {
    title: "十三雾定制伴手礼",
    description: "线下到店领取",
    action: "200 积分兑换",
  },
  {
    title: "9 折优惠券 × 1",
    description: "下次开本可用",
    action: "120 积分兑换",
  },
  {
    title: "生日双倍积分日",
    description: "会员专属 · 自动发放",
    action: "已开启",
  },
] as const;

export const MEMBER_RECHARGE_RULES = [
  { amount: 300, gift: 30 },
  { amount: 500, gift: 80 },
  { amount: 1000, gift: 200 },
  { amount: 2000, gift: 500 },
] as const;

export const MEMBER_CONSUME_LOGS: MemberLogItem[] = [
  {
    time: "06-18 21:30",
    title: "《雾港疑云》6人局",
    amount: "-¥178.20",
    points: "+178",
  },
  {
    time: "05-30 20:00",
    title: "《雪夜来客》5人局",
    amount: "-¥142.20",
    points: "+142",
  },
  {
    time: "05-12 19:30",
    title: "妆造服务 · 民国旗袍",
    amount: "-¥79.20",
    points: "+79",
  },
];

export const MEMBER_RECHARGE_LOGS = [
  {
    time: "05-01 18:20",
    amount: "¥1,000",
    gift: "+¥200",
    balance: "¥1,200.00",
  },
  {
    time: "03-15 19:40",
    amount: "¥300",
    gift: "+¥30",
    balance: "¥330.00",
  },
] as const;

export const MEMBER_POINT_LOGS = [
  {
    time: "06-18 21:30",
    source: "《雾港疑云》消费",
    type: "获得",
    amount: "+178",
  },
  {
    time: "06-10 14:00",
    source: "兑换 9 折优惠券",
    type: "使用",
    amount: "-120",
  },
  {
    time: "05-30 20:00",
    source: "《雪夜来客》消费",
    type: "获得",
    amount: "+142",
  },
] as const;
