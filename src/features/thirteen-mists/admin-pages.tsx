"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  ADMIN_ROLE_META,
  QUICK_ACTIONS,
  type AdminRole,
} from "@/lib/thirteen-mists/admin-data";
import {
  cloneState,
  formatCurrency,
  getCapability,
  isValidPhone,
} from "@/lib/thirteen-mists/helpers";
import {
  AdminRoleChip,
  AdminShell,
  BrandSeal,
  PermissionMatrix,
} from "@/components/thirteen-mists/ui";
import {
  clearStoredAdminSession,
  getStoredAdminSession,
  setStoredAdminSession,
} from "@/lib/supabase/auth";
import type {
  AdminBootstrapData,
  AdminSession,
} from "@/lib/supabase/app-types";
import {
  adminAdjustMember,
  adminConsumeMember,
  adminCreateMember,
  adminDeleteStaffAccount,
  adminRechargeMember,
  adminSaveRecommendations,
  adminSaveSettings,
  adminSetScriptStatus,
  adminUpsertMakeup,
  adminUpsertScript,
  adminUpsertStaffAccount,
  getAdminBootstrap,
  loginAdmin,
} from "@/lib/supabase/queries";

function useToast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [message]);

  return { message, show: setMessage };
}

function Toast({ message }: { message: string }) {
  return <div className={`tm-toast ${message ? "show" : ""}`}>{message}</div>;
}

function getLevelByRules(levelRules: Array<{ name: string; min: number; discount: string }>, totalRecharge: number) {
  const rules = [...levelRules].sort((a, b) => a.min - b.min);
  const fallback = rules[0] ?? { name: "普通会员", min: 0, discount: "9.8" };
  let matched = fallback;

  for (const rule of rules) {
    if (totalRecharge >= rule.min) {
      matched = rule;
    }
  }

  return {
    idx: rules.findIndex((rule) => rule.name === matched.name),
    name: matched.name,
    threshold: matched.min,
    discountText: `${matched.discount} 折`,
    discountNumber: Number(matched.discount) / 10,
  };
}

function getNextLevelByRules(
  levelRules: Array<{ name: string; min: number; discount: string }>,
  totalRecharge: number
) {
  return [...levelRules].sort((a, b) => a.min - b.min).find((rule) => rule.min > totalRecharge) ?? null;
}

function parsePlayerRange(label: string) {
  const matches = label.match(/\d+/g)?.map(Number) ?? [];

  if (matches.length >= 3) {
    return { min: matches[1] ?? matches[0] ?? 1, max: matches[2] ?? matches[1] ?? matches[0] ?? 1 };
  }

  if (matches.length >= 2) {
    return { min: matches[0] ?? 1, max: matches[1] ?? matches[0] ?? 1 };
  }

  const value = matches[0] ?? 1;
  return { min: value, max: value };
}

function parseDurationMinutes(label: string) {
  const value = Number.parseFloat(label);
  if (!Number.isFinite(value) || value <= 0) return 180;
  return label.includes("小时") ? Math.round(value * 60) : Math.round(value);
}

function mapDifficulty(value: string): "入门" | "进阶" | "硬核" {
  if (value === "硬核") return "硬核";
  if (value === "进阶") return "进阶";
  return "入门";
}

function useAdminApp() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [bootstrap, setBootstrap] = useState<AdminBootstrapData | null>(null);
  const [bootstrapVersion, setBootstrapVersion] = useState(0);
  const [ready, setReady] = useState(false);

  const refreshBootstrap = async (nextSession?: AdminSession) => {
    const currentSession = nextSession ?? session ?? getStoredAdminSession();
    if (!currentSession?.sessionToken) {
      throw new Error("管理员会话不存在");
    }

    const data = await getAdminBootstrap(currentSession.sessionToken);
    setBootstrap(data);
    setSession(currentSession);
    setBootstrapVersion((current) => current + 1);
    return data;
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAdmin() {
      const stored = getStoredAdminSession();
      if (!stored?.sessionToken) {
        router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        const data = await getAdminBootstrap(stored.sessionToken);
        if (cancelled) return;
        setSession(stored);
        setBootstrap(data);
        setBootstrapVersion((current) => current + 1);
        setReady(true);
      } catch {
        if (cancelled) return;
        clearStoredAdminSession();
        router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }

    bootstrapAdmin();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const role = session?.role ?? null;
  const can = (capability: string) => (role ? getCapability(role, capability) : "n");

  return { session, bootstrap, bootstrapVersion, role, ready, can, refreshBootstrap };
}

function AdminGate({
  children,
}: {
  children: (ctx: {
    role: AdminRole;
    can: (capability: string) => "y" | "p" | "n";
    session: AdminSession;
    bootstrap: AdminBootstrapData;
    bootstrapVersion: number;
    refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
  }) => ReactNode;
}) {
  const { role, ready, can, session, bootstrap, bootstrapVersion, refreshBootstrap } = useAdminApp();

  if (!ready || !role || !session || !bootstrap) {
    return <div className="tm-admin-loading">正在校验后台身份…</div>;
  }

  return <>{children({ role, can, session, bootstrap, bootstrapVersion, refreshBootstrap })}</>;
}

function Overlay({
  open,
  onClose,
  children,
  narrow = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  narrow?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="tm-admin-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`tm-admin-modal ${narrow ? "narrow" : ""}`}>{children}</div>
    </div>
  );
}

function ModalHeader({
  title,
  sub,
  onClose,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
}) {
  return (
    <div className="tm-admin-modal-head">
      <div>
        <h3>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      <button type="button" className="tm-admin-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className={`tm-admin-drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`tm-admin-drawer ${open ? "open" : ""}`}>{children}</aside>
    </>
  );
}

function AdminStatCard({
  title,
  value,
  trend,
  accent = false,
}: {
  title: string;
  value: string;
  trend: string;
  accent?: boolean;
}) {
  return (
    <div className={`tm-admin-stat ${accent ? "accent" : ""}`}>
      <div className="k">{title}</div>
      <div className="v tm-num">{value}</div>
      <div className="d">{trend}</div>
    </div>
  );
}

function AdminLoginCard({
  onSubmit,
  submitting = false,
}: {
  onSubmit: (role: AdminRole, account: string, password: string) => void;
  submitting?: boolean;
}) {
  const [role, setRole] = useState<AdminRole>("boss");
  const [account, setAccount] = useState("wuzhu");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="tm-admin-auth-card">
      <div className="tm-admin-auth-mobile-brand">
        <BrandSeal size={40} />
        <b>十三雾 · 商家后台</b>
      </div>
      <h2>管理员登录</h2>
      <p className="tm-admin-auth-sub">仅限店长 / 授权员工。所有操作均记入操作日志。</p>

      <div className="tm-admin-role-pick">
        {(["boss", "mgr", "dm"] as AdminRole[]).map((value) => (
          <label key={value} className={`tm-admin-role-option ${role === value ? "selected" : ""}`}>
            <input
              type="radio"
              name="admin-role"
              checked={role === value}
              onChange={() => {
                setRole(value);
                setAccount(value === "boss" ? "wuzhu" : value === "mgr" ? "lin_su" : "dm_xiaoye");
              }}
            />
            <div>
              <b>
                {ADMIN_ROLE_META[value].name} · {ADMIN_ROLE_META[value].title}
              </b>
              <span>{ADMIN_ROLE_META[value].description}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="tm-field">
        <label>管理员账号</label>
        <input className="tm-input" value={account} onChange={(event) => setAccount(event.target.value)} />
      </div>
      <div className="tm-field">
        <label>登录密码</label>
        <div className="tm-input-wrap">
          <input
            className="tm-input tm-input-with-toggle"
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入密码"
          />
          <button type="button" className="tm-input-toggle" onClick={() => setShowPwd((prev) => !prev)}>
            {showPwd ? "隐藏" : "显示"}
          </button>
        </div>
      </div>

      <button type="button" className="tm-btn tm-btn-primary tm-full-width" onClick={() => onSubmit(role, account, password)}>
        {submitting ? "登录中…" : "登录后台"}
      </button>
      <div className="tm-admin-demo-hint">已接入真实 Supabase 后台账号，请使用已创建的管理员账号登录。</div>
      <div className="tm-admin-auth-foot">
        非管理员？返回 <Link href="/login">顾客端登录</Link> · <Link href="/landing">门店首页</Link>
      </div>
    </div>
  );
}

export function AdminLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const redirect = searchParams.get("redirect");

  const handleLogin = async (role: AdminRole, account: string, password: string) => {
    if (!account.trim()) {
      toast.show("请输入管理员账号");
      return;
    }
    if (!password.trim()) {
      toast.show("请输入登录密码");
      return;
    }

    setSubmitting(true);
    try {
      const session = await loginAdmin({ role, account, password });
      setStoredAdminSession(session);
      toast.show(`已以「${ADMIN_ROLE_META[role].name}」身份登录，正在进入操作台…`);
      window.setTimeout(() => {
        router.push(redirect || ADMIN_ROLE_META[role].home);
      }, 700);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "后台登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tm-admin-auth-layout">
      <section className="tm-admin-auth-stage">
        <div className="tm-fog admin">
          <span className="f1" />
          <span className="f2" />
        </div>
        <div className="tm-admin-auth-brand">
          <BrandSeal size={46} />
          <div>
            <span className="bt">十三雾 · 商家后台</span>
            <span className="bs">Merchant Console</span>
          </div>
        </div>
        <div className="tm-admin-auth-stage-copy">
          <span className="tm-eyebrow">Authorized Access Only</span>
          <h1>雾起十三巷，运营在掌心。</h1>
          <p>会员储值、剧本上下架、妆造图墙、推荐位与门店规则，一处操作台，掌管整间体验馆。</p>
        </div>
        <div className="tm-admin-auth-stage-stats">
          <div>
            <span>在册会员</span>
            <b className="tm-num">328</b>
          </div>
          <div>
            <span>在库剧本</span>
            <b className="tm-num">24</b>
          </div>
          <div>
            <span>妆造造型</span>
            <b className="tm-num">36</b>
          </div>
        </div>
      </section>
      <main className="tm-admin-auth-main">
        <AdminLoginCard onSubmit={handleLogin} submitting={submitting} />
      </main>
      <Toast message={toast.message} />
    </div>
  );
}

export function AdminDashboardPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap }) => {
        const stats = bootstrap.dashboard.stats;
        const monthSummary = bootstrap.dashboard.monthSummary;
        const hotScripts = bootstrap.scripts.slice(0, 5).map((item, index) => ({
          rank: index + 1,
          name: item.name,
          meta: item.tags.join(" · "),
          cover: item.cover,
          plays: Math.max(8, 32 - index * 4),
          pct: Math.max(36, 100 - index * 16),
        }));
        const dashboardFeed = bootstrap.logs.slice(0, 5).map((item) => ({
          type: item.type,
          who: item.operator,
          description: item.action,
          amount: "",
          ago: item.time,
        }));

        return (
        <AdminShell
          role={role}
          active="dashboard"
          title="数据概览"
          description="今日开张、热门剧本、实时流水与待办一屏掌握。"
          actions={
            <>
              <Link href="/landing" target="_blank" className="tm-btn tm-btn-secondary tm-btn-sm">
                查看用户端
              </Link>
              <Link href="/admin/members" className="tm-btn tm-btn-primary tm-btn-sm">
                新增充值
              </Link>
            </>
          }
        >
          {can("data.dashboard") === "p" ? (
            <div className="tm-admin-notice">
              你当前以 DM 角色登录，仅可查看当班概览。店内财务总额与敏感经营数据对老板 / 店长开放。
            </div>
          ) : null}
          <section className="tm-admin-stat-grid">
            {stats.map((stat, index) => {
              const masked = can("data.dashboard") === "p" && index < 2;
              return (
                <AdminStatCard
                  key={stat.title}
                  title={stat.title}
                  value={masked ? "仅老板 / 店长可见" : stat.value}
                  trend={masked ? "DM 视图已隐藏门店总额" : stat.trend}
                  accent={"accent" in stat && Boolean(stat.accent)}
                />
              );
            })}
          </section>

          <div className="tm-admin-grid-2">
            <div className="tm-stack">
              <section className="tm-admin-card">
                <div className="tm-admin-card-head">
                  <h3>热门剧本 · 近 30 天开本数</h3>
                  <Link href="/admin/scripts" className="tm-btn tm-btn-ghost tm-btn-sm">
                    剧本管理
                  </Link>
                </div>
                <div className="tm-admin-card-pad">
                  {hotScripts.map((item) => (
                    <div key={item.name} className="tm-hot-row">
                      <span className={`tm-hot-rank ${item.rank === 1 ? "top" : ""}`}>{item.rank}</span>
                      <span className="tm-hot-cover" style={{ background: item.cover }}>
                        {item.name.slice(0, 1)}
                      </span>
                      <div className="tm-hot-meta">
                        <b>{item.name}</b>
                        <span className="tm-meta"> · {item.meta}</span>
                        <div className="tm-admin-bar">
                          <span style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                      <span className="tm-num tm-meta">{item.plays} 场</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="tm-admin-card">
                <div className="tm-admin-card-head">
                  <h3>最新流水 · 实时</h3>
                  <Link href="/admin/members" className="tm-btn tm-btn-ghost tm-btn-sm">
                    全部流水
                  </Link>
                </div>
                <div className="tm-admin-card-pad">
                  {dashboardFeed.map((item) => (
                    <div key={`${item.type}-${item.who}-${item.ago}`} className="tm-feed-item">
                      <div className={`tm-feed-icon tm-feed-${item.type}`}>{item.type.slice(0, 1).toUpperCase()}</div>
                      <div className="tm-feed-text">
                        <b>{item.who}</b> {item.description}
                        <time>{item.ago}</time>
                      </div>
                      {item.amount ? <span className="tm-num">{item.amount}</span> : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="tm-stack">
              <section className="tm-admin-card tm-admin-card-pad">
                <h3>快捷操作</h3>
                <div className="tm-quick-grid">
                  {QUICK_ACTIONS.filter((item) => can(item.capability) !== "n").map((item) => (
                    <Link key={item.title} href={item.href} className="tm-quick-action">
                      <b>{item.title}</b>
                      <span>{item.sub}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="tm-admin-card">
                <div className="tm-admin-card-head">
                  <h3>待办 · 需关注</h3>
                </div>
                <div className="tm-admin-card-pad">
                  {bootstrap.dashboard.todos.map((item, index) => (
                    <div key={`${item.text}-${index}`} className="tm-todo-row">
                      <span className="dot" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="tm-admin-card tm-admin-card-pad">
                <h3>本月经营</h3>
                <dl className="tm-admin-dl">
                  <dt>充值总额</dt>
                  <dd className="tm-num">{monthSummary.rechargeTotal}</dd>
                  <dt>消费总额</dt>
                  <dd className="tm-num">{monthSummary.spendTotal}</dd>
                  <dt>赠送支出</dt>
                  <dd className="tm-num">{monthSummary.giftTotal}</dd>
                  <dt>新增会员</dt>
                  <dd className="tm-num">{monthSummary.newMembers}</dd>
                  <dt>客单价</dt>
                  <dd className="tm-num">{monthSummary.avgSpend}</dd>
                </dl>
              </section>
            </div>
          </div>
        </AdminShell>
      );
      }}
    </AdminGate>
  );
}

export function AdminMembersPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap, bootstrapVersion, session, refreshBootstrap }) => (
        <MembersPageInner
          key={`members-${bootstrapVersion}`}
          role={role}
          can={can}
          bootstrap={bootstrap}
          session={session}
          refreshBootstrap={refreshBootstrap}
        />
      )}
    </AdminGate>
  );
}

function MembersPageInner({
  role,
  can,
  bootstrap,
  session,
  refreshBootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
  session: AdminSession;
  refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
}) {
  const toast = useToast();
  const [members, setMembers] = useState(() => cloneState(bootstrap.members));
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ledgerTab, setLedgerTab] = useState<"all" | "recharge" | "spend" | "adjust">("all");
  const [modal, setModal] = useState<null | "recharge" | "spend" | "adjust" | "new-member">(null);

  const filtered = useMemo(() => {
    return members.filter((member) => {
      if (levelFilter !== "all" && member.level !== Number(levelFilter)) return false;
      if (keyword && !`${member.name}${member.phone}`.toLowerCase().includes(keyword.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [keyword, levelFilter, members]);

  const selected = members.find((member) => member.id === selectedId) ?? null;
  const selectedLedger = selected
    ? selected.ledger.filter((item) => ledgerTab === "all" || item.type === ledgerTab)
    : [];

  const submitTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;

    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") || "").trim();

    if (modal === "recharge") {
      const amount = Number(form.get("amount") || 0);
      if (amount <= 0) {
        toast.show("请输入充值金额");
        return;
      }
      try {
        await adminRechargeMember({
          sessionToken: session.sessionToken,
          memberId: selected.id,
          amount,
          note,
        });
        const data = await refreshBootstrap();
        setMembers(cloneState(data.members));
        toast.show("充值成功");
        setModal(null);
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "充值失败，请稍后重试");
      }
      return;
    }

    if (modal === "spend") {
      const amount = Number(form.get("amount") || 0);
      const item = String(form.get("item") || "").trim() || "到店消费";
      if (amount <= 0) {
        toast.show("请输入消费金额");
        return;
      }
      try {
        await adminConsumeMember({
          sessionToken: session.sessionToken,
          memberId: selected.id,
          item,
          amount,
          note,
        });
        const data = await refreshBootstrap();
        setMembers(cloneState(data.members));
        toast.show("消费成功");
        setModal(null);
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "消费失败，请稍后重试");
      }
      return;
    }

    if (modal === "adjust") {
      if (can("member.adjust") === "n") {
        toast.show("当前角色无手动调整权限");
        return;
      }
      if (!note) {
        toast.show("手动调整必须填写备注");
        return;
      }
      const field = String(form.get("field") || "balance");
      const delta = Number(form.get("delta") || 0);
      const newLevel = Number(form.get("newLevel") || 0);
      if (field !== "level" && delta === 0) {
        toast.show("请输入调整数值");
        return;
      }
      if (field === "level" && can("member.level") === "n") {
        toast.show("当前角色不可调整会员等级");
        return;
      }
      if (can("member.adjust") === "p" && field === "balance" && Math.abs(delta) > 500) {
        toast.show("店长手动调整余额单笔上限 ¥500");
        return;
      }
      try {
        await adminAdjustMember({
          sessionToken: session.sessionToken,
          memberId: selected.id,
          field,
          delta,
          newLevelName: field === "level" ? bootstrap.levelRules[newLevel]?.name : undefined,
          note,
        });
        const data = await refreshBootstrap();
        setMembers(cloneState(data.members));
        toast.show("调整完成，已记录流水");
        setModal(null);
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "调整失败，请稍后重试");
      }
      return;
    }
  };

  const createMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (can("member.edit") === "n") {
      toast.show("当前角色不可新增会员");
      return;
    }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const init = Number(form.get("initialRecharge") || 0);
    const note = String(form.get("note") || "").trim();
    if (!name) {
      toast.show("请填写姓名");
      return;
    }
    if (!isValidPhone(phone)) {
      toast.show("请输入正确的 11 位手机号");
      return;
    }
    try {
      await adminCreateMember({
        sessionToken: session.sessionToken,
        name,
        phone,
        initialRecharge: init,
        note,
      });
      const data = await refreshBootstrap();
      setMembers(cloneState(data.members));
      toast.show(`已创建会员「${name}」，默认密码 88888888`);
      setModal(null);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "创建会员失败，请稍后重试");
    }
  };

  return (
    <>
      <AdminShell
        role={role}
        active="members"
        title="会员管理"
        description="所有余额、积分、等级变更均生成不可删除流水。手动调整须填写备注。"
        actions={
          <>
            <button type="button" className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => toast.show("已生成会员名单 CSV（演示）")}>
              导出名单
            </button>
            <button type="button" className="tm-btn tm-btn-primary tm-btn-sm" onClick={() => setModal("new-member")}>
              新增会员
            </button>
          </>
        }
      >
        <section className="tm-admin-mini-stats">
          <AdminStatCard title="会员总数" value={`${members.length}`} trend="当前门店沉淀会员" />
          <AdminStatCard title="储值余额池" value={formatCurrency(members.reduce((sum, member) => sum + member.balance, 0))} trend="门店累计余额" />
          <AdminStatCard title="本月新增" value={`${members.filter((member) => member.join.startsWith(new Date().getFullYear().toString())).length}`} trend="按当前会员数据统计" />
          <AdminStatCard title="余额预警" value={`${members.filter((m) => m.balance < 100).length}`} trend="建议提醒续充" accent />
        </section>

        <div className="tm-admin-filterbar">
          <label className="tm-admin-search">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名 / 手机号…" />
          </label>
          <div className="tm-admin-seg">
            {[
              ["all", "全部等级"],
              ["0", "普通"],
              ["1", "银雾"],
              ["2", "金雾"],
              ["3", "黑雾"],
            ].map(([value, label]) => (
              <button key={value} type="button" className={levelFilter === value ? "active" : ""} onClick={() => setLevelFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          <span className="tm-meta">共 {filtered.length} 位会员</span>
        </div>

        <section className="tm-admin-card">
          <div className="tm-admin-table-wrap">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>会员</th>
                  <th>会员等级</th>
                  <th>储值余额</th>
                  <th>累计充值</th>
                  <th>积分</th>
                  <th>最近消费</th>
                  <th className="right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="tm-table-person">
                        <span className="avatar">{member.name.slice(0, 1)}</span>
                        <div>
                          <b>{member.name}</b>
                          <span className="tm-meta tm-num">{member.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`tm-level-tag lv-${member.level}`}>
                        {bootstrap.levelRules[member.level]?.name ?? "普通会员"}
                      </span>
                    </td>
                    <td className="tm-num">{formatCurrency(member.balance)}</td>
                    <td className="tm-num">{formatCurrency(member.totalRecharge)}</td>
                    <td className="tm-num">{member.points}</td>
                    <td className="tm-meta">{member.last}</td>
                    <td className="right">
                      <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setSelectedId(member.id)}>
                        详情 & 操作
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length ? <div className="tm-empty">没有匹配的会员</div> : null}
        </section>
      </AdminShell>

      <Drawer open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected ? (
          <>
            <div className="tm-admin-drawer-head">
              <div className="tm-drawer-user">
                <span className="avatar large">{selected.name.slice(0, 1)}</span>
                <div>
                  <h3>{selected.name}</h3>
                  <p className="tm-meta">{selected.phone}</p>
                </div>
              </div>
              <button type="button" className="tm-admin-close" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>
            <div className="tm-admin-drawer-body">
              <div className="tm-balance-card">
                <div className="lbl">储值余额</div>
                <div className="big tm-num">{formatCurrency(selected.balance)}</div>
                <div className="tm-balance-sub">
                  <div>
                    <span>会员等级</span>
                    <b>{bootstrap.levelRules[selected.level]?.name ?? "普通会员"}</b>
                  </div>
                  <div>
                    <span>当前折扣</span>
                    <b>{getLevelByRules(bootstrap.levelRules, selected.totalRecharge).discountText}</b>
                  </div>
                  <div>
                    <span>积分</span>
                    <b className="tm-num">{selected.points}</b>
                  </div>
                </div>
              </div>

              <div className="tm-admin-action-row">
                <button type="button" className="tm-btn tm-btn-primary tm-btn-sm" onClick={() => setModal("recharge")}>
                  充值
                </button>
                <button type="button" className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => setModal("spend")}>
                  消费
                </button>
                <button
                  type="button"
                  className="tm-btn tm-btn-secondary tm-btn-sm"
                  onClick={() => {
                    if (can("member.adjust") === "n") {
                      toast.show("仅老板 / 店长可手动调整");
                      return;
                    }
                    setModal("adjust");
                  }}
                >
                  调整
                </button>
              </div>

              <dl className="tm-admin-dl">
                <dt>累计充值</dt>
                <dd className="tm-num">{formatCurrency(selected.totalRecharge)}</dd>
                <dt>累计消费</dt>
                <dd className="tm-num">{formatCurrency(selected.totalSpend)}</dd>
                <dt>注册时间</dt>
                <dd>{selected.join}</dd>
                <dt>最近消费</dt>
                <dd>{selected.last}</dd>
                <dt>升级进度</dt>
                <dd>
                  {getNextLevelByRules(bootstrap.levelRules, selected.totalRecharge)
                    ? `距下一等级还需 ${formatCurrency(
                        getNextLevelByRules(bootstrap.levelRules, selected.totalRecharge)!.min - selected.totalRecharge
                      )}`
                    : "已是最高等级"}
                </dd>
              </dl>

              <div className="tm-sub-tabs">
                {(["all", "recharge", "spend", "adjust"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={ledgerTab === value ? "active" : ""}
                    onClick={() => setLedgerTab(value)}
                  >
                    {value === "all" ? "全部流水" : value === "recharge" ? "充值" : value === "spend" ? "消费" : "调整"}
                  </button>
                ))}
              </div>
              <div className="tm-ledger-list">
                {selectedLedger.length ? (
                  selectedLedger.map((item, index) => (
                    <div key={`${item.time}-${index}`} className="tm-ledger-item">
                      <div style={{ flex: 1 }}>
                        {item.description}
                        <time>{item.time}</time>
                      </div>
                      {item.amount ? (
                        <span className="tm-num">{item.amount > 0 ? "+" : ""}{formatCurrency(item.amount)}</span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="tm-empty">暂无此类流水</div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </Drawer>

      <Overlay open={modal === "recharge" || modal === "spend" || modal === "adjust"} onClose={() => setModal(null)} narrow>
        {selected && (modal === "recharge" || modal === "spend" || modal === "adjust") ? (
          <form onSubmit={submitTransaction}>
            <ModalHeader
              title={`${modal === "recharge" ? "会员充值" : modal === "spend" ? "会员消费" : "手动调整"} · ${selected.name}`}
              sub={
                modal === "recharge"
                  ? "按充值赠送规则自动计算到账余额"
                  : modal === "spend"
                    ? "按会员等级折扣计算实付并校验余额"
                    : "调整余额 / 积分 / 等级必须填写备注"
              }
              onClose={() => setModal(null)}
            />
            <div className="tm-admin-modal-body">
              {modal === "recharge" ? (
                <>
                  <div className="tm-field">
                    <label>充值金额</label>
                    <input className="tm-input" name="amount" type="number" min="0" step="1" placeholder="如 1000" />
                  </div>
                  <div className="tm-inline-chips">
                    {bootstrap.rechargeRules.map((rule) => (
                      <span key={rule.min} className="tm-chip">
                        ¥{rule.min} +{rule.gift}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
              {modal === "spend" ? (
                <>
                  <div className="tm-field">
                    <label>消费项目</label>
                    <input className="tm-input" name="item" placeholder="如《雾港疑云》6 人局 + 妆造 2 套" />
                  </div>
                  <div className="tm-field">
                    <label>应付金额（原价）</label>
                    <input className="tm-input" name="amount" type="number" min="0" step="1" placeholder="如 432" />
                  </div>
                </>
              ) : null}
              {modal === "adjust" ? (
                <>
                  <div className="tm-field">
                    <label>调整对象</label>
                    <select className="tm-input" name="field" defaultValue="balance">
                      <option value="balance">余额</option>
                      <option value="points">积分</option>
                      <option value="level">等级</option>
                    </select>
                  </div>
                  <div className="tm-field">
                    <label>调整数值</label>
                    <input className="tm-input" name="delta" type="number" step="1" placeholder="正数为增加，负数为扣减" />
                  </div>
                  <div className="tm-field">
                    <label>目标等级（调整等级时使用）</label>
                    <select className="tm-input" name="newLevel" defaultValue={selected.level}>
                      {bootstrap.levelRules.map((rule, index) => (
                        <option key={rule.name} value={index}>
                          {rule.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              <div className="tm-field">
                <label>备注</label>
                <textarea className="tm-textarea" name="note" placeholder="手动调整余额 / 积分 / 等级时必须填写原因" />
              </div>
            </div>
            <div className="tm-admin-modal-foot">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setModal(null)}>
                取消
              </button>
              <button type="submit" className="tm-btn tm-btn-primary">
                确认
              </button>
            </div>
          </form>
        ) : null}
      </Overlay>

      <Overlay open={modal === "new-member"} onClose={() => setModal(null)} narrow>
        <form onSubmit={createMember}>
          <ModalHeader title="新增会员" sub="创建后默认密码为 88888888，可立即充值。" onClose={() => setModal(null)} />
          <div className="tm-admin-modal-body">
            <div className="tm-field">
              <label>姓名 / 昵称</label>
              <input className="tm-input" name="name" placeholder="如 林晚舟" />
            </div>
            <div className="tm-field">
              <label>手机号</label>
              <input className="tm-input" name="phone" placeholder="11 位手机号" />
            </div>
            <div className="tm-field">
              <label>初始充值（可选）</label>
              <input className="tm-input" name="initialRecharge" type="number" min="0" step="1" placeholder="0" />
            </div>
            <div className="tm-field">
              <label>备注</label>
              <textarea className="tm-textarea" name="note" placeholder="来源渠道、偏好剧本类型等" />
            </div>
          </div>
          <div className="tm-admin-modal-foot">
            <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setModal(null)}>
              取消
            </button>
            <button type="submit" className="tm-btn tm-btn-primary">
              创建会员
            </button>
          </div>
        </form>
      </Overlay>
      <Toast message={toast.message} />
    </>
  );
}

export function AdminScriptsPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap, bootstrapVersion, session, refreshBootstrap }) => (
        <ScriptsPageInner
          key={`scripts-${bootstrapVersion}`}
          role={role}
          can={can}
          bootstrap={bootstrap}
          session={session}
          refreshBootstrap={refreshBootstrap}
        />
      )}
    </AdminGate>
  );
}

function ScriptsPageInner({
  role,
  can,
  bootstrap,
  session,
  refreshBootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
  session: AdminSession;
  refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
}) {
  const toast = useToast();
  const [scripts, setScripts] = useState(() => cloneState(bootstrap.scripts));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<(typeof bootstrap.scripts)[number] | null>(null);
  const categories = useMemo(() => {
    return Array.from(new Set(scripts.flatMap((script) => script.tags))).sort();
  }, [scripts]);

  const filtered = useMemo(() => {
    return scripts.filter((script) => {
      if (status === "on" && !script.on) return false;
      if (status === "off" && script.on) return false;
      if (category !== "all" && !script.tags.includes(category)) return false;
      if (search && !script.name.includes(search)) return false;
      return true;
    });
  }, [category, scripts, search, status]);

  const submitScript = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (can("content.script") === "n") {
      toast.show("当前角色无剧本编辑权限");
      return;
    }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const intro = String(form.get("intro") || "").trim();
    if (!name || !intro) {
      toast.show("请填写剧本名称与简介");
      return;
    }
    const players = String(form.get("players") || "");
    const duration = String(form.get("duration") || "");
    const tags = String(form.get("tags") || "")
      .split(/[,，\s]+/)
      .filter(Boolean);
    const range = parsePlayerRange(players);

    try {
      await adminUpsertScript({
        sessionToken: session.sessionToken,
        scriptId: editing?.id || undefined,
        title: name,
        coverUrl: String(form.get("cover") || "#3a4a63"),
        playerMin: range.min,
        playerMax: range.max,
        durationMinutes: parseDurationMinutes(duration),
        difficulty: mapDifficulty(String(form.get("difficulty") || "新手")),
        needsMakeup: String(form.get("makeup") || "yes") === "yes",
        summary: intro,
        status: form.get("on") === "on" ? "published" : "draft",
        tags,
      });
      const data = await refreshBootstrap();
      setScripts(cloneState(data.scripts));
      toast.show(editing ? `已保存《${name}》` : `已新增《${name}》`);
      setEditing(null);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "保存剧本失败，请稍后重试");
    }
  };

  return (
    <>
      <AdminShell
        role={role}
        active="scripts"
        title="剧本管理"
        description="维护店内全部剧本，支持上架 / 下架、编辑信息与分类标签。"
        actions={
          <button type="button" className="tm-btn tm-btn-primary tm-btn-sm" onClick={() => setEditing({
            id: "",
            name: "",
            cover: "#3a4a63",
            players: "",
            duration: "",
            difficulty: "新手",
            makeup: "yes",
            tags: [],
            on: true,
            intro: "",
          })}>
            新增剧本
          </button>
        }
      >
        <div className="tm-admin-filterbar">
          <label className="tm-admin-search">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索剧本名…" />
          </label>
          <div className="tm-admin-seg">
            {[
              ["all", "全部"],
              ["on", "上架"],
              ["off", "下架"],
            ].map(([value, label]) => (
              <button key={value} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}>
                {label}
              </button>
            ))}
          </div>
          <select className="tm-input tm-input-select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">全部分类</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span className="tm-meta">共 {filtered.length} 个剧本</span>
        </div>

        <section className="tm-admin-card">
          <div className="tm-admin-table-wrap">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>剧本</th>
                  <th>分类标签</th>
                  <th>人数 / 时长</th>
                  <th>难度</th>
                  <th>妆造</th>
                  <th>状态</th>
                  <th className="right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((script) => (
                  <tr key={script.id}>
                    <td>
                      <div className="tm-table-person">
                        <span className="cover" style={{ background: script.cover }}>{script.name.slice(0, 1)}</span>
                        <div>
                          <b>{script.name}</b>
                          <span className="tm-meta">{script.intro}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="tm-chip-row">
                        {script.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tm-chip">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>{script.players}<br />{script.duration}</td>
                    <td>{script.difficulty}</td>
                    <td>{script.makeup === "yes" ? "需妆造" : "无需"}</td>
                    <td>
                      <span className={`tm-status ${script.on ? "on" : "off"}`}>{script.on ? "上架中" : "已下架"}</span>
                    </td>
                    <td className="right">
                      {can("content.script") !== "n" ? (
                        <>
                          <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setEditing(script)}>
                            编辑
                          </button>
                          <button
                            type="button"
                            className="tm-btn tm-btn-ghost tm-btn-sm"
                            onClick={async () => {
                              try {
                                await adminSetScriptStatus({
                                  sessionToken: session.sessionToken,
                                  scriptId: script.id,
                                  status: script.on ? "draft" : "published",
                                });
                                const data = await refreshBootstrap();
                                setScripts(cloneState(data.scripts));
                                toast.show(`《${script.name}》已${script.on ? "下架" : "上架"}`);
                              } catch (error) {
                                toast.show(error instanceof Error ? error.message : "状态更新失败，请稍后重试");
                              }
                            }}
                          >
                            {script.on ? "下架" : "上架"}
                          </button>
                        </>
                      ) : (
                        <span className="tm-meta">仅查看</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length ? <div className="tm-empty">没有匹配的剧本</div> : null}
        </section>
      </AdminShell>
      <Overlay open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing ? (
          <form onSubmit={submitScript}>
            <ModalHeader title={editing.id ? `编辑剧本 · ${editing.name}` : "新增剧本"} onClose={() => setEditing(null)} />
            <div className="tm-admin-modal-body">
              <div className="tm-field">
                <label>剧本名称</label>
                <input className="tm-input" name="name" defaultValue={editing.name} />
              </div>
              <div className="tm-field">
                <label>封面色</label>
                <input className="tm-input" name="cover" defaultValue={editing.cover} />
              </div>
              <div className="tm-grid-2">
                <div className="tm-field">
                  <label>玩家人数</label>
                  <input className="tm-input" name="players" defaultValue={editing.players} />
                </div>
                <div className="tm-field">
                  <label>时长</label>
                  <input className="tm-input" name="duration" defaultValue={editing.duration} />
                </div>
              </div>
              <div className="tm-grid-2">
                <div className="tm-field">
                  <label>难度</label>
                  <select className="tm-input" name="difficulty" defaultValue={editing.difficulty}>
                    <option>新手</option>
                    <option>进阶</option>
                    <option>硬核</option>
                  </select>
                </div>
                <div className="tm-field">
                  <label>妆造</label>
                  <select className="tm-input" name="makeup" defaultValue={editing.makeup}>
                    <option value="yes">需要妆造</option>
                    <option value="no">无需妆造</option>
                  </select>
                </div>
              </div>
              <div className="tm-field">
                <label>类型标签</label>
                <input className="tm-input" name="tags" defaultValue={editing.tags.join(", ")} />
              </div>
              <div className="tm-field">
                <label>简介</label>
                <textarea className="tm-textarea" name="intro" defaultValue={editing.intro} />
              </div>
              <label className="tm-checkbox">
                <input type="checkbox" name="on" defaultChecked={editing.on} />
                <span>保存后立即上架</span>
              </label>
            </div>
            <div className="tm-admin-modal-foot">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="submit" className="tm-btn tm-btn-primary">
                保存
              </button>
            </div>
          </form>
        ) : null}
      </Overlay>
      <Toast message={toast.message} />
    </>
  );
}

export function AdminRecommendationsPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap, bootstrapVersion, session, refreshBootstrap }) => (
        <RecommendationsPageInner
          key={`recommendations-${bootstrapVersion}`}
          role={role}
          can={can}
          bootstrap={bootstrap}
          session={session}
          refreshBootstrap={refreshBootstrap}
        />
      )}
    </AdminGate>
  );
}

function RecommendationsPageInner({
  role,
  can,
  bootstrap,
  session,
  refreshBootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
  session: AdminSession;
  refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
}) {
  type RecommendationItem = {
    id: string;
    copy: string;
  };

  const toast = useToast();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(() =>
    bootstrap.recommendations.map((item) => ({ ...item }))
  );
  const [poolKeyword, setPoolKeyword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const libraryPool = bootstrap.scripts.filter(
    (item) =>
      !recommendations.some((rec) => rec.id === item.id) &&
      (!poolKeyword || item.name.includes(poolKeyword))
  );
  const editingItem = editingId ? recommendations.find((item) => item.id === editingId) : null;

  const move = (index: number, direction: -1 | 1) => {
    setRecommendations((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      const sourceItem = next[index];
      const targetItem = next[target];
      if (!sourceItem || !targetItem) return next;
      next[index] = targetItem;
      next[target] = sourceItem;
      return next;
    });
  };

  return (
    <>
      <AdminShell
        role={role}
        active="recommendations"
        title="首页推荐管理"
        description="最多设置 3 个推荐位。推荐位只引用剧本库剧本，详情自动同步。"
        actions={
          <>
            <button
              type="button"
              className="tm-btn tm-btn-secondary tm-btn-sm"
              onClick={() => setRecommendations(bootstrap.recommendations.map((item) => ({ ...item })))}
            >
              还原
            </button>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-btn-sm"
              onClick={async () => {
                if (can("content.rec") === "n") {
                  toast.show("当前角色无推荐位管理权限");
                  return;
                }
                try {
                  await adminSaveRecommendations({
                    sessionToken: session.sessionToken,
                    items: recommendations,
                  });
                  await refreshBootstrap();
                  toast.show(`已发布 ${recommendations.length} 个推荐位到首页`);
                } catch (error) {
                  toast.show(error instanceof Error ? error.message : "推荐位保存失败，请稍后重试");
                }
              }}
            >
              保存并发布
            </button>
          </>
        }
      >
        <div className="tm-stack">
          <section className="tm-admin-card">
            <div className="tm-admin-card-head">
              <h3>当前推荐位 · {recommendations.length} / 3</h3>
              <span className="tm-meta">上下箭头调整排序</span>
            </div>
            <div className="tm-admin-card-pad">
              {recommendations.map((item, index) => {
                const script = bootstrap.scripts.find((current) => current.id === item.id);
                if (!script) return null;
                return (
                  <div key={item.id} className="tm-rec-slot">
                    <span className="tm-rec-rank">{index + 1}</span>
                    <span className="tm-rec-cover" style={{ background: script.cover }}>
                      {script.name.slice(0, 1)}
                    </span>
                    <div className="tm-rec-body">
                      <b>{script.name}</b>
                      <span className="tm-meta"> · {script.tags.join(" · ")}</span>
                      <span className="tm-rec-copy">“{item.copy || script.intro}”</span>
                    </div>
                    <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setEditingId(item.id)}>
                      文案
                    </button>
                    <div className="tm-rec-move">
                      <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>
                        ↑
                      </button>
                      <button type="button" disabled={index === recommendations.length - 1} onClick={() => move(index, 1)}>
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      className="tm-btn tm-btn-ghost tm-btn-sm"
                      onClick={() => setRecommendations((current) => current.filter((rec) => rec.id !== item.id))}
                    >
                      移除
                    </button>
                  </div>
                );
              })}
              {[...new Array(Math.max(0, 3 - recommendations.length))].map((_, index) => (
                <div key={index} className="tm-empty-slot">
                  推荐位 {recommendations.length + index + 1} 空缺 · 从下方剧本库添加
                </div>
              ))}
            </div>
          </section>

          <section className="tm-admin-card">
            <div className="tm-admin-card-head">
              <h3>从剧本库添加</h3>
              <label className="tm-admin-search">
                <input value={poolKeyword} onChange={(event) => setPoolKeyword(event.target.value)} placeholder="搜索剧本…" />
              </label>
            </div>
            <div className="tm-admin-card-pad">
              {libraryPool.length ? (
                libraryPool.map((item) => (
                  <div key={item.id} className="tm-pool-row">
                    <span className="tm-pool-cover" style={{ background: item.cover }}>
                      {item.name.slice(0, 1)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <b>{item.name}</b>
                      <span className="tm-meta">{item.tags.join(" · ")}</span>
                    </div>
                    <button
                      type="button"
                      className="tm-btn tm-btn-secondary tm-btn-sm"
                      onClick={() => {
                        if (recommendations.length >= 3) {
                          toast.show("最多 3 个推荐位，请先移除");
                          return;
                        }
                        setRecommendations((current) => [...current, { id: item.id, copy: "" }]);
                      }}
                    >
                      加入推荐
                    </button>
                  </div>
                ))
              ) : (
                <div className="tm-empty">没有可添加的剧本</div>
              )}
            </div>
          </section>
        </div>
      </AdminShell>

      <Overlay open={Boolean(editingItem)} onClose={() => setEditingId(null)} narrow>
        {editingItem ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const copy = String(form.get("copy") || "").trim();
              setRecommendations((current) =>
                current.map((item) => (item.id === editingItem.id ? { ...item, copy } : item))
              );
              setEditingId(null);
              toast.show("文案已更新");
            }}
          >
            <ModalHeader title={`推荐文案 · ${editingItem.id}`} sub="留空则使用剧本默认简介。" onClose={() => setEditingId(null)} />
            <div className="tm-admin-modal-body">
              <div className="tm-field">
                <label>主推文案</label>
                <textarea className="tm-textarea" name="copy" defaultValue={editingItem.copy} />
              </div>
            </div>
            <div className="tm-admin-modal-foot">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setEditingId(null)}>
                取消
              </button>
              <button type="submit" className="tm-btn tm-btn-primary">
                保存文案
              </button>
            </div>
          </form>
        ) : null}
      </Overlay>
      <Toast message={toast.message} />
    </>
  );
}

export function AdminMakeupPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap, bootstrapVersion, session, refreshBootstrap }) => (
        <MakeupPageInner
          key={`makeup-${bootstrapVersion}`}
          role={role}
          can={can}
          bootstrap={bootstrap}
          session={session}
          refreshBootstrap={refreshBootstrap}
        />
      )}
    </AdminGate>
  );
}

function MakeupPageInner({
  role,
  can,
  bootstrap,
  session,
  refreshBootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
  session: AdminSession;
  refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
}) {
  const toast = useToast();
  const [makeup, setMakeup] = useState(() => cloneState(bootstrap.makeup));
  const [style, setStyle] = useState("all");
  const [vis, setVis] = useState("all");
  const [editing, setEditing] = useState<(typeof bootstrap.makeup)[number] | null>(null);

  const filtered = useMemo(() => {
    return makeup.filter((item) => {
      if (style !== "all" && item.style !== style) return false;
      if (vis === "on" && !item.on) return false;
      if (vis === "off" && item.on) return false;
      return true;
    });
  }, [makeup, style, vis]);

  return (
    <>
      <AdminShell
        role={role}
        active="makeup"
        title="妆造管理"
        description="上传与维护妆造图片，设置标题、适用剧本、展示与排序。"
        actions={
          <button type="button" className="tm-btn tm-btn-primary tm-btn-sm" onClick={() => setEditing({
            id: 0,
            name: "",
            style: "民国",
            time: "",
            scripts: "",
            price: 0,
            on: true,
            cover: "#5a3550",
            description: "",
          })}>
            上传妆造
          </button>
        }
      >
        <div className="tm-admin-filterbar">
          <div className="tm-admin-seg">
            {["all", "民国", "古风", "欧式", "现代"].map((item) => (
              <button key={item} type="button" className={style === item ? "active" : ""} onClick={() => setStyle(item)}>
                {item === "all" ? "全部风格" : item}
              </button>
            ))}
          </div>
          <div className="tm-admin-seg">
            {[
              ["all", "全部"],
              ["on", "展示中"],
              ["off", "已隐藏"],
            ].map(([value, label]) => (
              <button key={value} type="button" className={vis === value ? "active" : ""} onClick={() => setVis(value)}>
                {label}
              </button>
            ))}
          </div>
          <span className="tm-meta">共 {filtered.length} 套妆造</span>
        </div>

        <div className="tm-admin-makeup-grid">
          {filtered.map((item, index) => (
            <article key={item.id} className={`tm-admin-makeup-card ${item.on ? "" : "is-hidden"}`}>
              <div className="tm-admin-makeup-cover" style={{ background: `linear-gradient(160deg, ${item.cover}, #16110d)` }}>
                <span className="order">#{index + 1}</span>
                <span className={`tm-status ${item.on ? "on" : "off"}`}>{item.on ? "展示中" : "已隐藏"}</span>
                {item.name.slice(0, 1)}
              </div>
              <div className="tm-admin-makeup-body">
                <h4>{item.name}</h4>
                <div className="tm-chip-row">
                  <span className="tm-chip">{item.style}</span>
                  <span className="tm-chip">{item.time}</span>
                  <span className="tm-chip">¥{item.price}</span>
                </div>
                <p className="tm-meta">{item.scripts}</p>
              </div>
              <div className="tm-admin-makeup-foot">
                {can("content.makeup") !== "n" ? (
                  <>
                    <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setEditing(item)}>
                      编辑
                    </button>
                    {can("content.makeup") === "y" ? (
                      <button
                        type="button"
                        className="tm-btn tm-btn-ghost tm-btn-sm"
                        onClick={() => {
                          setMakeup((current) => current.filter((currentItem) => currentItem.id !== item.id));
                          toast.show(`已从当前列表移除「${item.name}」`);
                        }}
                      >
                        删除
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="tm-btn tm-btn-secondary tm-btn-sm"
                      onClick={async () => {
                        try {
                          await adminUpsertMakeup({
                            sessionToken: session.sessionToken,
                            makeupId: item.id,
                            title: item.name,
                            style: item.style,
                            serviceDurationMinutes: parseDurationMinutes(item.time),
                            relatedScriptId:
                              bootstrap.scripts.find((script) => item.scripts.includes(script.name))?.id ?? null,
                            price: item.price,
                            visible: !item.on,
                            cover: item.cover,
                            description: item.description,
                          });
                          const data = await refreshBootstrap();
                          setMakeup(cloneState(data.makeup));
                        } catch (error) {
                          toast.show(error instanceof Error ? error.message : "状态更新失败，请稍后重试");
                        }
                      }}
                    >
                      {item.on ? "隐藏" : "展示"}
                    </button>
                  </>
                ) : (
                  <span className="tm-meta">仅查看</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </AdminShell>
      <Overlay open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (can("content.makeup") === "n") {
                toast.show("当前角色无妆造管理权限");
                return;
              }
              const form = new FormData(event.currentTarget);
              const nextItem = {
                id: editing.id || Date.now(),
                name: String(form.get("name") || "").trim(),
                style: String(form.get("style") || "民国"),
                time: String(form.get("time") || ""),
                scripts: String(form.get("scripts") || ""),
                price: Number(form.get("price") || 0),
                on: form.get("on") === "on",
                cover: String(form.get("cover") || "#5a3550"),
                description: String(form.get("description") || ""),
              };
              if (!nextItem.name) {
                toast.show("请填写妆造名称");
                return;
              }
              try {
                await adminUpsertMakeup({
                  sessionToken: session.sessionToken,
                  makeupId: typeof editing.id === "string" ? editing.id : undefined,
                  title: nextItem.name,
                  style: nextItem.style,
                  serviceDurationMinutes: parseDurationMinutes(nextItem.time),
                  relatedScriptId:
                    bootstrap.scripts.find((script) => nextItem.scripts.includes(script.name))?.id ?? null,
                  price: nextItem.price,
                  visible: nextItem.on,
                  cover: nextItem.cover,
                  description: nextItem.description,
                });
                const data = await refreshBootstrap();
                setMakeup(cloneState(data.makeup));
                setEditing(null);
                toast.show(`已保存「${nextItem.name}」`);
              } catch (error) {
                toast.show(error instanceof Error ? error.message : "保存妆造失败，请稍后重试");
              }
            }}
          >
            <ModalHeader title={editing.id ? `编辑妆造 · ${editing.name}` : "上传妆造"} onClose={() => setEditing(null)} />
            <div className="tm-admin-modal-body">
              <div className="tm-field">
                <label>妆造名称</label>
                <input className="tm-input" name="name" defaultValue={editing.name} />
              </div>
              <div className="tm-grid-2">
                <div className="tm-field">
                  <label>风格</label>
                  <select className="tm-input" name="style" defaultValue={editing.style}>
                    <option>民国</option>
                    <option>古风</option>
                    <option>欧式</option>
                    <option>现代</option>
                  </select>
                </div>
                <div className="tm-field">
                  <label>妆造时长</label>
                  <input className="tm-input" name="time" defaultValue={editing.time} />
                </div>
              </div>
              <div className="tm-field">
                <label>适用剧本</label>
                <input className="tm-input" name="scripts" defaultValue={editing.scripts} />
              </div>
              <div className="tm-grid-2">
                <div className="tm-field">
                  <label>参考价格</label>
                  <input className="tm-input" name="price" type="number" defaultValue={editing.price} />
                </div>
                <div className="tm-field">
                  <label>封面色</label>
                  <input className="tm-input" name="cover" defaultValue={editing.cover} />
                </div>
              </div>
              <div className="tm-field">
                <label>说明</label>
                <textarea className="tm-textarea" name="description" defaultValue={editing.description} />
              </div>
              <label className="tm-checkbox">
                <input type="checkbox" name="on" defaultChecked={editing.on} />
                <span>在用户端妆造库展示</span>
              </label>
            </div>
            <div className="tm-admin-modal-foot">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="submit" className="tm-btn tm-btn-primary">
                保存
              </button>
            </div>
          </form>
        ) : null}
      </Overlay>
      <Toast message={toast.message} />
    </>
  );
}

export function AdminSettingsPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap, bootstrapVersion, session, refreshBootstrap }) => (
        <AdminSettingsInner
          key={`settings-${bootstrapVersion}`}
          role={role}
          can={can}
          bootstrap={bootstrap}
          session={session}
          refreshBootstrap={refreshBootstrap}
        />
      )}
    </AdminGate>
  );
}

function AdminSettingsInner({
  role,
  can,
  bootstrap,
  session,
  refreshBootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
  session: AdminSession;
  refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
}) {
  type RechargeRule = {
    min: number;
    gift: number;
  };

  type LevelRule = {
    name: string;
    min: number;
    discount: string;
  };

  const toast = useToast();
  const [tab, setTab] = useState<"store" | "contact" | "rules">("store");
  const [rechargeRules, setRechargeRules] = useState<RechargeRule[]>(() =>
    bootstrap.rechargeRules.map((item) => ({ ...item }))
  );
  const [levelRules, setLevelRules] = useState<LevelRule[]>(() =>
    bootstrap.levelRules.map((item) => ({ ...item }))
  );
  const [store, setStore] = useState(bootstrap.storeSettings);

  const save = async () => {
    if (can("system.settings") === "n") {
      toast.show("仅老板可修改门店设置与会员规则");
      return;
    }
    try {
      await adminSaveSettings({
        sessionToken: session.sessionToken,
        store,
        rechargeRules,
        levelRules,
      });
      await refreshBootstrap();
      toast.show("门店设置已保存");
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "设置保存失败，请稍后重试");
    }
  };

  return (
    <>
      <AdminShell
        role={role}
        active="settings"
        title="门店设置"
        description="配置门店信息、微信客服、营业时间，以及会员充值赠送与等级规则。"
      >
        <div className="tm-settings-tabs">
          <button type="button" className={tab === "store" ? "active" : ""} onClick={() => setTab("store")}>
            门店信息
          </button>
          <button type="button" className={tab === "contact" ? "active" : ""} onClick={() => setTab("contact")}>
            联系与客服
          </button>
          <button type="button" className={tab === "rules" ? "active" : ""} onClick={() => setTab("rules")}>
            会员规则
          </button>
        </div>

        {tab === "store" ? (
          <section className="tm-admin-card tm-admin-card-pad">
            <div className="tm-field">
              <label>门店名称</label>
              <input className="tm-input" value={store.storeName} onChange={(event) => setStore((current) => ({ ...current, storeName: event.target.value }))} />
            </div>
            <div className="tm-field">
              <label>门店简介</label>
              <textarea className="tm-textarea" value={store.description} onChange={(event) => setStore((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="tm-grid-2">
              <div className="tm-field">
                <label>门店地址</label>
                <input className="tm-input" value={store.address} onChange={(event) => setStore((current) => ({ ...current, address: event.target.value }))} />
              </div>
              <div className="tm-field">
                <label>联系电话</label>
                <input className="tm-input" value={store.phone} onChange={(event) => setStore((current) => ({ ...current, phone: event.target.value }))} />
              </div>
            </div>
            <div className="tm-field">
              <label>营业时间</label>
              <input className="tm-input" value={store.businessHours} onChange={(event) => setStore((current) => ({ ...current, businessHours: event.target.value }))} />
            </div>
          </section>
        ) : null}

        {tab === "contact" ? (
          <div className="tm-admin-grid-2">
            <section className="tm-admin-card tm-admin-card-pad">
              <h3>微信客服</h3>
              <div className="tm-field">
                <label>微信客服号</label>
                <input className="tm-input" value={store.wechatAccount} onChange={(event) => setStore((current) => ({ ...current, wechatAccount: event.target.value }))} />
              </div>
              <div className="tm-field">
                <label>小红书链接</label>
                <input className="tm-input" value={store.socialLinks.xiaohongshu ?? ""} onChange={(event) => setStore((current) => ({ ...current, socialLinks: { ...current.socialLinks, xiaohongshu: event.target.value } }))} placeholder="https://xiaohongshu.com/user/..." />
              </div>
              <div className="tm-field">
                <label>抖音链接</label>
                <input className="tm-input" value={store.socialLinks.douyin ?? ""} onChange={(event) => setStore((current) => ({ ...current, socialLinks: { ...current.socialLinks, douyin: event.target.value } }))} placeholder="https://douyin.com/user/..." />
              </div>
            </section>
            <section className="tm-admin-card tm-admin-card-pad">
              <h3>客服二维码</h3>
              <div className="tm-qr-box">二维码占位</div>
              <button type="button" className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => toast.show("演示环境，正式版可上传二维码图片")}>
                上传二维码
              </button>
            </section>
          </div>
        ) : null}

        {tab === "rules" ? (
          <div className="tm-stack">
            <section className="tm-admin-card">
              <div className="tm-admin-card-head">
                <h3>充值赠送规则</h3>
                <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setRechargeRules((current) => [...current, { min: 0, gift: 0 }])}>
                  + 新增档位
                </button>
              </div>
              <div className="tm-admin-card-pad">
                {rechargeRules.map((rule, index) => (
                  <div key={`${rule.min}-${index}`} className="tm-rule-row">
                    <input
                      className="tm-input"
                      value={rule.min}
                      onChange={(event) =>
                        setRechargeRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, min: Number(event.target.value) } : item
                          )
                        )
                      }
                    />
                    <input
                      className="tm-input"
                      value={rule.gift}
                      onChange={(event) =>
                        setRechargeRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, gift: Number(event.target.value) } : item
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      className="tm-btn tm-btn-ghost tm-btn-sm"
                      onClick={() => setRechargeRules((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="tm-admin-card">
              <div className="tm-admin-card-head">
                <h3>会员等级规则</h3>
                <span className="tm-meta">按累计充值自动匹配</span>
              </div>
              <div className="tm-admin-card-pad">
                {levelRules.map((rule, index) => (
                  <div key={`${rule.name}-${index}`} className="tm-rule-row tm-rule-row-3">
                    <input
                      className="tm-input"
                      value={rule.name}
                      onChange={(event) =>
                        setLevelRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item
                          )
                        )
                      }
                    />
                    <input
                      className="tm-input"
                      value={rule.min}
                      onChange={(event) =>
                        setLevelRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, min: Number(event.target.value) } : item
                          )
                        )
                      }
                    />
                    <input
                      className="tm-input"
                      value={rule.discount}
                      onChange={(event) =>
                        setLevelRules((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, discount: event.target.value } : item
                          )
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        <div className="tm-admin-savebar">
          <button type="button" className="tm-btn tm-btn-secondary" onClick={() => toast.show("已恢复上次保存的设置")}>
            还原
          </button>
          <button type="button" className="tm-btn tm-btn-primary" onClick={save}>
            保存设置
          </button>
        </div>
      </AdminShell>
      <Toast message={toast.message} />
    </>
  );
}

export function AdminStaffPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap, bootstrapVersion, session, refreshBootstrap }) => (
        <AdminStaffInner
          key={`staff-${bootstrapVersion}`}
          role={role}
          can={can}
          bootstrap={bootstrap}
          session={session}
          refreshBootstrap={refreshBootstrap}
        />
      )}
    </AdminGate>
  );
}

function AdminStaffInner({
  role,
  can,
  bootstrap,
  session,
  refreshBootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
  session: AdminSession;
  refreshBootstrap: (nextSession?: AdminSession) => Promise<AdminBootstrapData>;
}) {
  type StaffAccount = {
    id: string;
    name: string;
    phone: string;
    account: string;
    role: AdminRole;
    active: boolean;
    last: string;
    locked?: boolean;
  };

  const toast = useToast();
  const [accounts, setAccounts] = useState<StaffAccount[]>(() =>
    bootstrap.staffAccounts.map((item) => ({ ...item }))
  );
  const [keyword, setKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [editing, setEditing] = useState<StaffAccount | null>(null);

  const filtered = accounts.filter((account) => {
    if (filterRole !== "all" && account.role !== filterRole) return false;
    if (keyword && !`${account.name}${account.phone}${account.account}`.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <>
      <AdminShell
        role={role}
        active="staff"
        title="权限分配"
        description="基于角色的权限控制（RBAC）。后台账号分为三种角色，写操作仍需服务端二次校验。"
        actions={
          <>
            <button type="button" className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => toast.show("已打开完整权限表")}>
              查看完整权限表
            </button>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-btn-sm"
              onClick={() => {
                if (can("system.staff") === "n") {
                  toast.show("仅老板可分配权限 / 管理员工账号");
                  return;
                }
                setEditing({
                  id: "",
                  name: "",
                  phone: "",
                  account: "",
                  role: "dm",
                  active: true,
                  last: "—",
                });
              }}
            >
              添加员工账号
            </button>
          </>
        }
      >
        <section className="tm-role-grid">
          {(["boss", "mgr", "dm"] as AdminRole[]).map((value) => (
            <article key={value} className={`tm-role-card ${value === "boss" ? "boss" : ""}`}>
              <div className={`tm-role-crest ${value}`}>{value === "boss" ? "老" : value === "mgr" ? "长" : "DM"}</div>
              <h3>{ADMIN_ROLE_META[value].name}</h3>
              <div className="en">{ADMIN_ROLE_META[value].title}</div>
              <p>{ADMIN_ROLE_META[value].description}</p>
            </article>
          ))}
        </section>

        <section className="tm-admin-card">
          <div className="tm-admin-card-head">
            <div>
              <h3>权限矩阵</h3>
              <p className="tm-meta">每个能力点对三种角色的开放程度</p>
            </div>
          </div>
          <div className="tm-admin-card-pad">
            <PermissionMatrix />
          </div>
        </section>

        <div className="tm-admin-filterbar">
          <label className="tm-admin-search">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名 / 手机号 / 账号…" />
          </label>
          <div className="tm-admin-seg">
            {[
              ["all", "全部角色"],
              ["boss", "老板"],
              ["mgr", "店长"],
              ["dm", "DM"],
            ].map(([value, label]) => (
              <button key={value} type="button" className={filterRole === value ? "active" : ""} onClick={() => setFilterRole(value)}>
                {label}
              </button>
            ))}
          </div>
          <span className="tm-meta">共 {filtered.length} 个账号</span>
        </div>

        <section className="tm-admin-card">
          <div className="tm-admin-table-wrap">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>角色</th>
                  <th>账号</th>
                  <th>状态</th>
                  <th>最近登录</th>
                  <th className="right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="tm-table-person">
                        <span className="avatar">{account.name.replace(/^.*· ?/, "").slice(0, 1)}</span>
                        <div>
                          <b>{account.name}</b>
                          <span className="tm-meta">{account.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <AdminRoleChip role={account.role} />
                    </td>
                    <td className="tm-num">{account.account}</td>
                    <td>
                      <span className={`tm-status ${account.active ? "on" : "off"}`}>{account.active ? "启用" : "停用"}</span>
                    </td>
                    <td>{account.last}</td>
                    <td className="right">
                      <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setEditing(account)}>
                        编辑
                      </button>
                      {!account.locked ? (
                        <button
                          type="button"
                          className="tm-btn tm-btn-ghost tm-btn-sm"
                          onClick={() => {
                            if (can("system.account") === "n") {
                              toast.show("仅老板可停用 / 删除账号");
                              return;
                            }
                            void (async () => {
                              try {
                                await adminDeleteStaffAccount({
                                  sessionToken: session.sessionToken,
                                  adminId: account.id,
                                });
                                const data = await refreshBootstrap();
                                setAccounts(data.staffAccounts.map((item) => ({ ...item })));
                                toast.show(`已删除账号「${account.name}」`);
                              } catch (error) {
                                toast.show(error instanceof Error ? error.message : "删除账号失败，请稍后重试");
                              }
                            })();
                          }}
                        >
                          删除
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AdminShell>

      <Overlay open={Boolean(editing)} onClose={() => setEditing(null)} narrow>
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (can("system.staff") === "n") {
                toast.show("仅老板可分配权限 / 管理员工账号");
                return;
              }
              const form = new FormData(event.currentTarget);
              const name = String(form.get("name") || "").trim();
              const phone = String(form.get("phone") || "").trim();
              const account = String(form.get("account") || "").trim();
              const nextRole = String(form.get("role") || "dm") as AdminRole;
              const active = form.get("active") === "on";
              const password = String(form.get("password") || "").trim();
              if (!name || !account || !isValidPhone(phone)) {
                toast.show("请填写完整且正确的账号信息");
                return;
              }
              if (!editing.id && password.length < 6) {
                toast.show("新员工账号必须设置至少 6 位密码");
                return;
              }
              void (async () => {
                try {
                  await adminUpsertStaffAccount({
                    sessionToken: session.sessionToken,
                    adminId: editing.id || undefined,
                    name,
                    phone,
                    account,
                    role: nextRole,
                    active,
                    password: password || undefined,
                  });
                  const data = await refreshBootstrap();
                  setAccounts(data.staffAccounts.map((item) => ({ ...item })));
                  setEditing(null);
                  toast.show(`已保存账号「${name}」`);
                } catch (error) {
                  toast.show(error instanceof Error ? error.message : "保存账号失败，请稍后重试");
                }
              })();
            }}
          >
            <ModalHeader title={editing.id ? "编辑员工账号" : "添加员工账号"} onClose={() => setEditing(null)} />
            <div className="tm-admin-modal-body">
              <div className="tm-field">
                <label>姓名</label>
                <input className="tm-input" name="name" defaultValue={editing.name} />
              </div>
              <div className="tm-field">
                <label>手机号</label>
                <input className="tm-input" name="phone" defaultValue={editing.phone.replace("****", "0000")} />
              </div>
              <div className="tm-field">
                <label>登录账号</label>
                <input className="tm-input" name="account" defaultValue={editing.account} />
              </div>
              <div className="tm-field">
                <label>分配角色</label>
                <select className="tm-input" name="role" defaultValue={editing.role}>
                  <option value="boss">老板</option>
                  <option value="mgr">店长</option>
                  <option value="dm">DM</option>
                </select>
              </div>
              <div className="tm-field">
                <label>{editing.id ? "重置密码（可选）" : "登录密码"}</label>
                <input className="tm-input" name="password" type="password" autoComplete="new-password" placeholder={editing.id ? "留空则不修改密码" : "至少 6 位"} />
              </div>
              <label className="tm-checkbox">
                <input type="checkbox" name="active" defaultChecked={editing.active} />
                <span>账号启用</span>
              </label>
            </div>
            <div className="tm-admin-modal-foot">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="submit" className="tm-btn tm-btn-primary">
                保存账号
              </button>
            </div>
          </form>
        ) : null}
      </Overlay>
      <Toast message={toast.message} />
    </>
  );
}

export function AdminLogsPageContent() {
  return (
    <AdminGate>
      {({ role, can, bootstrap }) => <AdminLogsInner role={role} can={can} bootstrap={bootstrap} />}
    </AdminGate>
  );
}

function AdminLogsInner({
  role,
  can,
  bootstrap,
}: {
  role: AdminRole;
  can: (capability: string) => "y" | "p" | "n";
  bootstrap: AdminBootstrapData;
}) {
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [operator, setOperator] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleLogs = bootstrap.logs.filter((log) => {
    if (can("system.logs") === "p" && log.sensitive) return false;
    if (type && log.type !== type) return false;
    if (operator && log.operator !== operator) return false;
    if (keyword && !`${log.operator}${log.action}${log.target}${log.description}`.includes(keyword)) {
      return false;
    }
    return true;
  });
  const selected = visibleLogs.find((item) => item.id === selectedId) ?? null;

  return (
    <>
      <AdminShell
        role={role}
        active="logs"
        title="操作日志"
        description="记录后台所有写操作与敏感读取。日志只增不改，用于审计与追责。"
        actions={
          <button type="button" className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => toast.show("演示环境：正式版按当前筛选导出 CSV")}>
            导出当前筛选
          </button>
        }
      >
        <section className="tm-admin-stat-grid">
          <AdminStatCard title="今日操作" value={`${visibleLogs.length}`} trend="按当前日志实时统计" />
          <AdminStatCard title="资金类操作" value={`${visibleLogs.filter((item) => item.type === "money").length}`} trend="充值 / 消费 / 调整" accent />
          <AdminStatCard title="活跃操作员" value={`${new Set(visibleLogs.map((item) => item.operator)).size}`} trend="当前日志中的活跃账号" />
          <AdminStatCard title="敏感调整" value={`${visibleLogs.filter((item) => item.sensitive).length}`} trend="需复核" />
        </section>

        <div className="tm-admin-toolbar">
          <label className="tm-admin-search">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索操作员、会员、剧本、内容…" />
          </label>
          <select className="tm-input tm-input-select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">全部类型</option>
            <option value="money">资金操作</option>
            <option value="member">会员管理</option>
            <option value="content">内容管理</option>
            <option value="config">规则配置</option>
            <option value="auth">登录鉴权</option>
          </select>
          <select className="tm-input tm-input-select" value={operator} onChange={(event) => setOperator(event.target.value)}>
            <option value="">全部操作员</option>
            {Array.from(new Set(bootstrap.logs.map((item) => item.operator))).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <section className="tm-admin-card">
          <div className="tm-admin-table-wrap">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作员</th>
                  <th>操作类型</th>
                  <th>操作内容</th>
                  <th>对象</th>
                  <th className="right">详情</th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="tm-num">{log.time.slice(5)}</td>
                    <td>
                      <b>{log.operator}</b>
                      <div className="tm-meta">{log.role}</div>
                    </td>
                    <td>{log.type}</td>
                    <td>
                      {log.action}
                      {log.sensitive ? <span className="tm-chip">敏感</span> : null}
                    </td>
                    <td>{log.target}</td>
                    <td className="right">
                      <button type="button" className="tm-btn tm-btn-ghost tm-btn-sm" onClick={() => setSelectedId(log.id)}>
                        查看 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visibleLogs.length ? <div className="tm-empty">没有匹配的操作记录</div> : null}
        </section>
      </AdminShell>

      <Drawer open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected ? (
          <>
            <div className="tm-admin-drawer-head">
              <div>
                <h3>{selected.action}</h3>
                <p className="tm-meta">{selected.id}</p>
              </div>
              <button type="button" className="tm-admin-close" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>
            <div className="tm-admin-drawer-body">
              <dl className="tm-admin-dl">
                <dt>操作员</dt>
                <dd>{selected.operator} · {selected.role}</dd>
                <dt>类型</dt>
                <dd>{selected.type}</dd>
                <dt>时间</dt>
                <dd className="tm-num">{selected.time}</dd>
                <dt>对象</dt>
                <dd>{selected.target}</dd>
                <dt>来源 IP</dt>
                <dd className="tm-num">{selected.ip}</dd>
              </dl>
              <div className="tm-log-block">
                <div className="tm-log-title">操作说明</div>
                <p>{selected.description}</p>
              </div>
              {selected.diff.length ? (
                <div className="tm-log-block">
                  <div className="tm-log-title">字段变更</div>
                  <div className="tm-log-diff">
                    {selected.diff.map((diff) => (
                      <div key={diff.key} className="tm-log-diff-row">
                        <div className="k">{diff.key}</div>
                        <div className="from">{diff.from}</div>
                        <div className="to">{diff.to}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {selected.note ? (
                <div className="tm-log-block">
                  <div className="tm-log-title">操作备注</div>
                  <p>{selected.note}</p>
                </div>
              ) : null}
              <div className="tm-meta">此记录不可修改 / 删除 · 已写入审计流水</div>
            </div>
          </>
        ) : null}
      </Drawer>
      <Toast message={toast.message} />
    </>
  );
}
