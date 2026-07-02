import { createClient } from "@/lib/supabase/client";
import type {
  AdminBootstrapData,
  AdminRole,
  AdminSession,
  MemberDashboardData,
  MemberSession,
} from "@/lib/supabase/app-types";
import type { Json } from "@/lib/supabase/database.types";

function assertRpcError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function asObject<T>(value: Json, fallback: T): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }

  return fallback;
}

export async function registerMember(params: {
  phone: string;
  password: string;
  confirmPassword: string;
  remember: boolean;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("register_member", {
    p_phone: params.phone,
    p_password: params.password,
    p_confirm_password: params.confirmPassword,
    p_remember: params.remember,
  });

  assertRpcError(error);

  const result = asObject<{
    user_id: string;
    member_profile_id: string;
    phone: string;
    display_name: string;
    level_name: string;
    session_token: string;
    session_expires_at: string;
    remember: boolean;
  }>(data as Json, {
    user_id: "",
    member_profile_id: "",
    phone: "",
    display_name: "",
    level_name: "",
    session_token: "",
    session_expires_at: "",
    remember: params.remember,
  });

  return {
    userId: result.user_id,
    memberProfileId: result.member_profile_id,
    phone: result.phone,
    displayName: result.display_name,
    levelName: result.level_name,
    sessionToken: result.session_token,
    sessionExpiresAt: result.session_expires_at,
    remember: result.remember,
    loggedInAt: Date.now(),
  } satisfies MemberSession;
}

export async function loginMember(params: {
  phone: string;
  password: string;
  remember: boolean;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("login_member", {
    p_phone: params.phone,
    p_password: params.password,
    p_remember: params.remember,
  });

  assertRpcError(error);

  const result = asObject<{
    user_id: string;
    member_profile_id: string;
    phone: string;
    display_name: string;
    level_name: string;
    session_token: string;
    session_expires_at: string;
    remember: boolean;
  }>(data as Json, {
    user_id: "",
    member_profile_id: "",
    phone: "",
    display_name: "",
    level_name: "",
    session_token: "",
    session_expires_at: "",
    remember: params.remember,
  });

  return {
    userId: result.user_id,
    memberProfileId: result.member_profile_id,
    phone: result.phone,
    displayName: result.display_name,
    levelName: result.level_name,
    sessionToken: result.session_token,
    sessionExpiresAt: result.session_expires_at,
    remember: result.remember,
    loggedInAt: Date.now(),
  } satisfies MemberSession;
}

export async function logoutMember(sessionToken: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("logout_member", {
    p_session_token: sessionToken,
  });

  assertRpcError(error);
}

export async function getMemberDashboard(sessionToken: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_member_dashboard", {
    p_session_token: sessionToken,
  });

  assertRpcError(error);
  return asObject<MemberDashboardData>(data as Json, {
    profile: {
      id: "",
      name: "",
      phone: "",
      maskedPhone: "",
      avatarText: "",
      balance: 0,
      totalRecharge: 0,
      totalSpend: 0,
      points: 0,
      levelLabel: "",
      discountLabel: "",
      birthday: "",
      greetingName: "",
      title: "",
      remark: "",
    },
    consumeLogs: [],
    rechargeLogs: [],
    pointLogs: [],
    rechargeRules: [],
    levelRules: [],
  });
}

export async function updateMemberProfileSettings(params: {
  sessionToken: string;
  displayName: string;
  birthday: string;
  title: string;
  remark: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_member_profile_settings", {
    p_session_token: params.sessionToken,
    p_display_name: params.displayName,
    p_birthday: params.birthday || null,
    p_title: params.title,
    p_remark: params.remark,
  });

  assertRpcError(error);
  return asObject<MemberDashboardData>(data as Json, {
    profile: {
      id: "",
      name: "",
      phone: "",
      maskedPhone: "",
      avatarText: "",
      balance: 0,
      totalRecharge: 0,
      totalSpend: 0,
      points: 0,
      levelLabel: "",
      discountLabel: "",
      birthday: "",
      greetingName: "",
      title: "",
      remark: "",
    },
    consumeLogs: [],
    rechargeLogs: [],
    pointLogs: [],
    rechargeRules: [],
    levelRules: [],
  });
}

export async function loginAdmin(params: {
  account: string;
  password: string;
  role: AdminRole;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("login_admin", {
    p_account: params.account,
    p_password: params.password,
    p_role: params.role,
  });

  assertRpcError(error);

  const result = asObject<{
    admin_id: string;
    account: string;
    display_name: string;
    role: AdminRole;
    session_token: string;
    session_expires_at: string;
  }>(data as Json, {
    admin_id: "",
    account: "",
    display_name: "",
    role: params.role,
    session_token: "",
    session_expires_at: "",
  });

  return {
    adminId: result.admin_id,
    account: result.account,
    displayName: result.display_name,
    role: result.role,
    sessionToken: result.session_token,
    sessionExpiresAt: result.session_expires_at,
    loggedInAt: Date.now(),
  } satisfies AdminSession;
}

export async function logoutAdmin(sessionToken: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("logout_admin", {
    p_session_token: sessionToken,
  });

  assertRpcError(error);
}

export async function getAdminBootstrap(sessionToken: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_admin_bootstrap", {
    p_session_token: sessionToken,
  });

  assertRpcError(error);
  return asObject<AdminBootstrapData>(data as Json, {
    session: {
      adminId: "",
      role: "dm",
      displayName: "",
      account: "",
    },
    dashboard: {
      stats: [],
      monthSummary: {
        rechargeTotal: "¥0.00",
        spendTotal: "¥0.00",
        giftTotal: "¥0.00",
        newMembers: 0,
        avgSpend: "¥0.00",
      },
      todos: [],
    },
    members: [],
    scripts: [],
    recommendations: [],
    makeup: [],
    rechargeRules: [],
    levelRules: [],
    staffAccounts: [],
    logs: [],
    storeSettings: {
      storeName: "",
      wechatAccount: "",
      wechatQrUrl: "",
      phone: "",
      address: "",
      businessHours: "",
      description: "",
      socialLinks: {},
    },
  });
}

async function rpcAdmin<T = AdminBootstrapData>(name: string, args: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(name, args);

  assertRpcError(error);
  return data as T;
}

export async function adminCreateMember(params: {
  sessionToken: string;
  name: string;
  phone: string;
  initialRecharge: number;
  note: string;
}) {
  return rpcAdmin("admin_create_member", {
    p_session_token: params.sessionToken,
    p_name: params.name,
    p_phone: params.phone,
    p_initial_recharge: params.initialRecharge,
    p_note: params.note,
  });
}

export async function adminRechargeMember(params: {
  sessionToken: string;
  memberId: string;
  amount: number;
  note: string;
}) {
  return rpcAdmin("admin_recharge_member", {
    p_session_token: params.sessionToken,
    p_member_id: params.memberId,
    p_amount: params.amount,
    p_note: params.note,
  });
}

export async function adminConsumeMember(params: {
  sessionToken: string;
  memberId: string;
  item: string;
  amount: number;
  note: string;
}) {
  return rpcAdmin("admin_consume_member", {
    p_session_token: params.sessionToken,
    p_member_id: params.memberId,
    p_item: params.item,
    p_amount: params.amount,
    p_note: params.note,
  });
}

export async function adminAdjustMember(params: {
  sessionToken: string;
  memberId: string;
  field: string;
  delta: number;
  newLevelName?: string;
  note: string;
}) {
  return rpcAdmin("admin_adjust_member", {
    p_session_token: params.sessionToken,
    p_member_id: params.memberId,
    p_field: params.field,
    p_delta: params.delta,
    p_new_level_name: params.newLevelName ?? null,
    p_note: params.note,
  });
}

export async function adminUpsertScript(params: {
  sessionToken: string;
  scriptId?: string;
  title: string;
  coverUrl: string;
  playerMin: number;
  playerMax: number;
  durationMinutes: number;
  difficulty: "入门" | "进阶" | "硬核";
  needsMakeup: boolean;
  summary: string;
  status: "draft" | "published" | "archived";
  tags: string[];
}) {
  return rpcAdmin("admin_upsert_script", {
    p_session_token: params.sessionToken,
    p_script_id: params.scriptId ?? null,
    p_title: params.title,
    p_cover_url: params.coverUrl,
    p_player_min: params.playerMin,
    p_player_max: params.playerMax,
    p_duration_minutes: params.durationMinutes,
    p_difficulty: params.difficulty,
    p_needs_makeup: params.needsMakeup,
    p_summary: params.summary,
    p_status: params.status,
    p_tags: params.tags,
  });
}

export async function adminSetScriptStatus(params: {
  sessionToken: string;
  scriptId: string;
  status: "draft" | "published" | "archived";
}) {
  return rpcAdmin("admin_set_script_status", {
    p_session_token: params.sessionToken,
    p_script_id: params.scriptId,
    p_status: params.status,
  });
}

export async function adminSaveRecommendations(params: {
  sessionToken: string;
  items: Array<{ id: string; copy: string }>;
}) {
  return rpcAdmin("admin_save_recommendations", {
    p_session_token: params.sessionToken,
    p_items: params.items,
  });
}

export async function adminUpsertMakeup(params: {
  sessionToken: string;
  makeupId?: string;
  title: string;
  style: string;
  serviceDurationMinutes: number | null;
  relatedScriptId: string | null;
  price: number;
  visible: boolean;
  cover: string;
  description: string;
}) {
  return rpcAdmin("admin_upsert_makeup", {
    p_session_token: params.sessionToken,
    p_makeup_id: params.makeupId ?? null,
    p_title: params.title,
    p_style: params.style,
    p_service_duration_minutes: params.serviceDurationMinutes,
    p_related_script_id: params.relatedScriptId,
    p_price: params.price,
    p_visible: params.visible,
    p_cover: params.cover,
    p_description: params.description,
  });
}

export async function adminSaveSettings(params: {
  sessionToken: string;
  store: AdminBootstrapData["storeSettings"];
  rechargeRules: AdminBootstrapData["rechargeRules"];
  levelRules: AdminBootstrapData["levelRules"];
}) {
  return rpcAdmin("admin_save_settings", {
    p_session_token: params.sessionToken,
    p_store: params.store,
    p_recharge_rules: params.rechargeRules,
    p_level_rules: params.levelRules,
  });
}

export async function adminUpsertStaffAccount(params: {
  sessionToken: string;
  adminId?: string;
  name: string;
  phone: string;
  account: string;
  role: AdminRole;
  active: boolean;
  password?: string;
}) {
  return rpcAdmin("admin_upsert_staff_account", {
    p_session_token: params.sessionToken,
    p_admin_id: params.adminId ?? null,
    p_name: params.name,
    p_phone: params.phone,
    p_account: params.account,
    p_role: params.role,
    p_active: params.active,
    p_password: params.password ?? null,
  });
}

export async function adminDeleteStaffAccount(params: {
  sessionToken: string;
  adminId: string;
}) {
  return rpcAdmin("admin_delete_staff_account", {
    p_session_token: params.sessionToken,
    p_admin_id: params.adminId,
  });
}
