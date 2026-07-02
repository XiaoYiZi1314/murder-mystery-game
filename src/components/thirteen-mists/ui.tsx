"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  ADMIN_NAV_GROUPS,
  ADMIN_PERMISSION_MATRIX,
  ADMIN_ROLE_META,
  type AdminRole,
} from "@/lib/thirteen-mists/admin-data";
import { PUBLIC_NAV } from "@/lib/thirteen-mists/public-data";
import { getCapability } from "@/lib/thirteen-mists/helpers";
import { clearStoredMemberSession, getStoredMemberSession } from "@/lib/supabase/auth";
import type { MemberSession } from "@/lib/supabase/app-types";
import { logoutMember } from "@/lib/supabase/queries";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function BrandSeal({
  alt = "十三雾",
  className,
  priority = false,
  size = 40,
}: {
  alt?: string;
  className?: string;
  priority?: boolean;
  size?: number;
}) {
  return (
    <Image
      src="/brand/shisanwu-seal.jpg"
      alt={alt}
      width={size}
      height={size}
      className={cn("tm-brand-seal", className)}
      priority={priority}
    />
  );
}

export function PublicPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("tm-pill", className)}>{children}</span>;
}

export function PublicButton({
  href,
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg" | "sm";
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tm-btn",
        `tm-btn-${variant}`,
        size !== "md" && `tm-btn-${size}`,
        arrow && "tm-btn-arrow",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function PublicSectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="tm-sect-head">
      <div>
        {eyebrow ? <div className="tm-kicker-row">{eyebrow}</div> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PublicTopNav({
  activeHref,
  heroAware = false,
}: {
  activeHref?: string;
  heroAware?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null);
  const [scrolled, setScrolled] = useState(!heroAware);

  useEffect(() => {
    const syncMemberSession = () => setMemberSession(getStoredMemberSession());

    syncMemberSession();
    window.addEventListener("storage", syncMemberSession);
    return () => window.removeEventListener("storage", syncMemberSession);
  }, [pathname]);

  useEffect(() => {
    if (!heroAware) return;

    const onScroll = () => {
      setScrolled(window.scrollY > 280);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroAware]);

  const handleLogout = async () => {
    try {
      if (memberSession?.sessionToken) {
        await logoutMember(memberSession.sessionToken);
      }
    } finally {
      clearStoredMemberSession();
      setMemberSession(null);
      setMenuOpen(false);
      router.push("/landing");
      router.refresh();
    }
  };

  return (
    <header
      className={cn(
        "tm-topnav",
        heroAware && !scrolled && "tm-topnav-on-dark",
        (scrolled || !heroAware) && "tm-topnav-scrolled"
      )}
    >
      <div className="tm-container tm-topnav-inner">
        <Link className="tm-logo" href="/landing">
          <BrandSeal size={38} />
          <span>十三雾</span>
        </Link>
        <nav className={cn("tm-topnav-nav", menuOpen && "tm-topnav-nav-open")}>
          {PUBLIC_NAV.map((item) => {
            const isActive = activeHref === item.href || pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(isActive && "is-active")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="tm-topnav-actions">
          {memberSession?.sessionToken ? (
            <button
              type="button"
              className="tm-btn tm-btn-secondary"
              onClick={() => void handleLogout()}
            >
              退出登录
            </button>
          ) : (
            <PublicButton href="/login" variant={heroAware && !scrolled ? "secondary" : "secondary"}>
              登录
            </PublicButton>
          )}
          <PublicButton href="/member">我的会员卡</PublicButton>
          <button
            type="button"
            className="tm-menu-toggle"
            aria-label="切换导航菜单"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({
  action,
}: {
  action?: ReactNode;
}) {
  return (
    <footer className="tm-pagefoot">
      <div className="tm-container">
        <div className="tm-foot-row">
          <Link className="tm-logo" href="/landing">
            <BrandSeal size={38} />
            <span>十三雾</span>
          </Link>
          {action}
        </div>
        <div className="tm-foot-row">
          <span className="tm-meta">© 十三雾沉浸式剧本体验馆 · 2026</span>
          <span className="tm-meta">营业时间 14:00-次日 02:00 · 微信客服 shisanwu_kf</span>
        </div>
      </div>
    </footer>
  );
}

export function AdminRoleChip({ role }: { role: AdminRole }) {
  const meta = ADMIN_ROLE_META[role];
  return <span className={cn("tm-role-chip", `tm-role-chip-${meta.badgeClass}`)}>{meta.name}</span>;
}

export function PermissionMatrix() {
  return (
    <div className="tm-admin-matrix-wrap">
      <table className="tm-admin-matrix">
        <thead>
          <tr>
            <th className="cap">能力</th>
            <th>老板</th>
            <th>店长</th>
            <th>DM</th>
          </tr>
        </thead>
        <tbody>
          {ADMIN_PERMISSION_MATRIX.map((group) => (
            <FragmentMatrixGroup key={group.group} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentMatrixGroup({
  group,
}: {
  group: (typeof ADMIN_PERMISSION_MATRIX)[number];
}) {
  return (
    <>
      <tr className="tm-admin-matrix-group">
        <td colSpan={4}>{group.group}</td>
      </tr>
      {group.caps.map((cap) => {
        const notes = [
          cap.mgr === "p" && cap.note?.mgr ? `店长：${cap.note.mgr}` : "",
          cap.dm === "p" && cap.note?.dm ? `DM：${cap.note.dm}` : "",
        ].filter(Boolean);

        return (
          <FragmentMatrixRow
            key={cap.cap}
            cap={cap}
            notes={notes}
          />
        );
      })}
    </>
  );
}

function FragmentMatrixRow({
  cap,
  notes,
}: {
  cap: (typeof ADMIN_PERMISSION_MATRIX)[number]["caps"][number];
  notes: string[];
}) {
  return (
    <>
      <tr>
        <td className="cap">
          <b>{cap.cap}</b>
          <span>{cap.sub}</span>
        </td>
        <td>{renderPermission(cap.boss)}</td>
        <td>{renderPermission(cap.mgr)}</td>
        <td>{renderPermission(cap.dm)}</td>
      </tr>
      {notes.length ? (
        <tr>
          <td colSpan={4} className="tm-admin-matrix-note">
            {notes.join(" · ")}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function renderPermission(value: "y" | "p" | "n") {
  if (value === "y") {
    return <span className="tm-admin-perm tm-admin-perm-yes">√</span>;
  }

  if (value === "p") {
    return <span className="tm-admin-perm tm-admin-perm-partial">限</span>;
  }

  return <span className="tm-admin-perm tm-admin-perm-none">·</span>;
}

export function AdminShell({
  role,
  active,
  title,
  description,
  actions,
  children,
}: {
  role: AdminRole;
  active: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navGroups = useMemo(() => {
    return ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.capability) return true;
        return getCapability(role, item.capability) !== "n";
      }),
    })).filter((group) => group.items.length > 0);
  }, [role]);

  return (
    <div className="tm-admin-shell">
      <aside className="tm-admin-sidebar">
        <Link href={ADMIN_ROLE_META[role].home} className="tm-admin-brand">
          <BrandSeal size={42} />
          <div>
            <strong>十三雾 · 商家后台</strong>
            <span>{ADMIN_ROLE_META[role].title}</span>
          </div>
        </Link>

        <div className="tm-admin-role-card">
          <AdminRoleChip role={role} />
          <h3>{ADMIN_ROLE_META[role].name} 视角</h3>
          <p>{ADMIN_ROLE_META[role].description}</p>
        </div>

        <div className="tm-admin-nav">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="tm-admin-nav-title">{group.title}</div>
              {group.items.map((item) => {
                const isActive = item.active === active || pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("tm-admin-nav-link", isActive && "is-active")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="tm-admin-sidebar-foot">
          <Link href="/admin/login" className="tm-btn tm-btn-secondary tm-btn-sm">
            切换账号
          </Link>
        </div>
      </aside>

      <main className="tm-admin-main">
        <div className="tm-admin-head">
          <div>
            <p className="tm-eyebrow">Merchant Console</p>
            <h1>{title}</h1>
            {description ? <p className="tm-admin-head-sub">{description}</p> : null}
          </div>
          {actions ? <div className="tm-admin-head-actions">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
