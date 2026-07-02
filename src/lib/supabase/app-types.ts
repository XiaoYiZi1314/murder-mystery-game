import type { Json } from "@/lib/supabase/database.types";

export type MemberSession = {
  userId: string;
  memberProfileId: string;
  phone: string;
  displayName: string;
  levelName: string;
  sessionToken: string;
  sessionExpiresAt: string;
  remember: boolean;
  loggedInAt: number;
};

export type AdminRole = "boss" | "mgr" | "dm";

export type AdminSession = {
  adminId: string;
  account: string;
  displayName: string;
  role: AdminRole;
  sessionToken: string;
  sessionExpiresAt: string;
  loggedInAt: number;
};

export type MemberProfileData = {
  id: string;
  name: string;
  phone: string;
  maskedPhone: string;
  avatarText: string;
  balance: number;
  totalRecharge: number;
  totalSpend: number;
  points: number;
  levelLabel: string;
  discountLabel: string;
  birthday: string;
  greetingName: string;
  title: string;
  remark: string;
};

export type MemberConsumeLog = {
  time: string;
  title: string;
  amount: string;
  points: string;
};

export type MemberRechargeLog = {
  time: string;
  amount: string;
  gift: string;
  balance: string;
};

export type MemberPointLog = {
  time: string;
  source: string;
  type: string;
  amount: string;
};

export type RechargeRule = {
  amount: number;
  gift: number;
};

export type MemberDashboardData = {
  profile: MemberProfileData;
  consumeLogs: MemberConsumeLog[];
  rechargeLogs: MemberRechargeLog[];
  pointLogs: MemberPointLog[];
  rechargeRules: RechargeRule[];
  levelRules: Array<{ name: string; min: number; discount: string }>;
};

export type AdminDashboardStat = {
  title: string;
  value: string;
  trend: string;
  accent?: string;
};

export type AdminDashboardTodo = {
  color: string;
  text: string;
};

export type AdminDashboardData = {
  stats: AdminDashboardStat[];
  monthSummary: {
    rechargeTotal: string;
    spendTotal: string;
    giftTotal: string;
    newMembers: number;
    avgSpend: string;
  };
  todos: AdminDashboardTodo[];
};

export type AdminMemberLedgerItem = {
  type: "recharge" | "spend" | "adjust";
  description: string;
  amount: number;
  time: string;
};

export type AdminMemberData = {
  id: string;
  name: string;
  phone: string;
  level: number;
  balance: number;
  totalRecharge: number;
  totalSpend: number;
  points: number;
  last: string;
  join: string;
  ledger: AdminMemberLedgerItem[];
};

export type AdminScriptData = {
  id: string;
  name: string;
  cover: string;
  players: string;
  duration: string;
  difficulty: string;
  makeup: "yes" | "no";
  tags: string[];
  on: boolean;
  intro: string;
};

export type AdminRecommendationData = {
  id: string;
  copy: string;
};

export type AdminMakeupData = {
  id: string;
  name: string;
  style: string;
  time: string;
  scripts: string;
  price: number;
  on: boolean;
  cover: string;
  description: string;
};

export type AdminStaffAccount = {
  id: string;
  name: string;
  phone: string;
  account: string;
  role: AdminRole;
  active: boolean;
  last: string;
  locked?: boolean;
};

export type AdminLog = {
  id: string;
  time: string;
  operator: string;
  role: string;
  type: string;
  action: string;
  target: string;
  ip: string;
  description: string;
  diff: Json[];
  sensitive?: boolean;
};

export type StoreSettingsData = {
  storeName: string;
  wechatAccount: string;
  wechatQrUrl: string;
  phone: string;
  address: string;
  businessHours: string;
  description: string;
  socialLinks: Record<string, string>;
};

export type AdminBootstrapData = {
  session: {
    adminId: string;
    role: AdminRole;
    displayName: string;
    account: string;
  };
  dashboard: AdminDashboardData;
  members: AdminMemberData[];
  scripts: AdminScriptData[];
  recommendations: AdminRecommendationData[];
  makeup: AdminMakeupData[];
  rechargeRules: Array<{ min: number; gift: number }>;
  levelRules: Array<{ name: string; min: number; discount: string }>;
  staffAccounts: AdminStaffAccount[];
  logs: AdminLog[];
  storeSettings: StoreSettingsData;
};
