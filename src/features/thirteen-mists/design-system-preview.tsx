"use client";

import { AdminRoleChip, BrandSeal, PermissionMatrix, PublicButton, PublicFooter, PublicPill } from "@/components/thirteen-mists/ui";

export function DesignSystemPreviewPage() {
  return (
    <div className="tm-app">
      <section className="tm-hero tm-hero-overview">
        <div className="tm-fog">
          <span className="f1" />
          <span className="f2" />
        </div>
        <div className="tm-container tm-hero-grid">
          <div className="tm-hero-copy">
            <span className="tm-logo tm-logo-light">
              <BrandSeal size={40} />
              十三雾设计系统
            </span>
            <p className="tm-eyebrow">Development Only</p>
            <h1>
              组件、变量与布局
              <em>统一预览</em>
            </h1>
            <p className="tm-lead tm-lead-ink">
              该页面仅用于开发态校对颜色、字体、间距、组件复用与前后台主题一致性，不参与正式用户流程。
            </p>
            <div className="tm-badges">
              <span className="tm-badge">暖纸前台主题</span>
              <span className="tm-badge">墨夜后台主题</span>
              <span className="tm-badge">复用组件验证</span>
            </div>
          </div>
          <div className="tm-hero-mascot">
            <BrandSeal size={280} className="tm-seal-mark" />
          </div>
        </div>
      </section>

      <main>
        <section className="tm-section">
          <div className="tm-container">
            <div className="tm-sect-head">
              <div>
                <div className="tm-kicker-row">
                  <p className="tm-eyebrow">Color Tokens</p>
                </div>
                <h2>品牌色板</h2>
              </div>
            </div>
            <div className="tm-swatch-grid">
              {[
                ["暖纸背景", "var(--bg)"],
                ["表层卡片", "var(--surface)"],
                ["品牌棕金", "var(--accent)"],
                ["印章红", "var(--seal)"],
                ["墨夜背景", "var(--ink)"],
                ["墨夜前景", "var(--ink-fg)"],
              ].map(([label, value]) => (
                <article key={label} className="tm-swatch-card">
                  <div className="tm-swatch" style={{ background: value }} />
                  <div className="tm-swatch-meta">
                    <strong>{label}</strong>
                    <span className="tm-num">{value}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tm-section tm-section-bordered">
          <div className="tm-container">
            <div className="tm-sect-head">
              <div>
                <div className="tm-kicker-row">
                  <p className="tm-eyebrow">Typography</p>
                </div>
                <h2>字体层级</h2>
              </div>
            </div>
            <div className="tm-preview-stack">
              <div className="tm-preview-type tm-font-display">
                雾起十三巷，每一夜都是另一个人生。
              </div>
              <div className="tm-preview-type">
                这是正文字体，用于页面主文案、说明和卡片内容，强调舒适阅读与沉浸氛围。
              </div>
              <div className="tm-preview-type tm-num">
                2026-06-22 14:32 / ¥1,286.50 / LEVEL GOLD
              </div>
            </div>
          </div>
        </section>

        <section className="tm-section">
          <div className="tm-container">
            <div className="tm-sect-head">
              <div>
                <div className="tm-kicker-row">
                  <p className="tm-eyebrow">Core Components</p>
                </div>
                <h2>按钮、Pill、输入框与卡片</h2>
              </div>
            </div>
            <div className="tm-preview-grid">
              <article className="tm-card tm-admin-card-pad">
                <h3>Buttons</h3>
                <div className="tm-preview-row">
                  <PublicButton href="/landing">主按钮</PublicButton>
                  <PublicButton href="/landing" variant="secondary">
                    次按钮
                  </PublicButton>
                  <PublicButton href="/landing" variant="ghost" arrow>
                    Ghost
                  </PublicButton>
                </div>
              </article>
              <article className="tm-card tm-admin-card-pad">
                <h3>Pills</h3>
                <div className="tm-preview-row">
                  <PublicPill>情感</PublicPill>
                  <PublicPill>民国</PublicPill>
                  <PublicPill>推理</PublicPill>
                </div>
              </article>
              <article className="tm-card tm-admin-card-pad">
                <h3>Inputs</h3>
                <div className="tm-field">
                  <label>手机号</label>
                  <input className="tm-input" placeholder="请输入手机号" />
                </div>
                <div className="tm-field">
                  <label>备注</label>
                  <textarea className="tm-textarea" placeholder="这里验证输入框和文本域风格" />
                </div>
              </article>
              <article className="tm-card tm-admin-card-pad">
                <h3>Card</h3>
                <p>通用卡片用于前台说明块、会员卡片、后台信息面板与预览区域。</p>
                <div className="tm-chip-row">
                  <span className="tm-chip active">高亮状态</span>
                  <span className="tm-chip">默认状态</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="tm-section tm-section-bordered">
          <div className="tm-container">
            <div className="tm-admin-band">
              <div className="tm-overview-head tm-overview-head-ink">
                <h2>后台主题组件</h2>
                <span className="tm-meta tm-meta-ink">Admin Theme</span>
              </div>
              <div className="tm-preview-grid tm-preview-grid-admin">
                <article className="tm-admin-card tm-admin-card-pad">
                  <h3>Role Chips</h3>
                  <div className="tm-preview-row">
                    <AdminRoleChip role="boss" />
                    <AdminRoleChip role="mgr" />
                    <AdminRoleChip role="dm" />
                  </div>
                </article>
                <article className="tm-admin-card tm-admin-card-pad">
                  <h3>Stat Card</h3>
                  <div className="tm-admin-stat accent">
                    <div className="k">今日充值</div>
                    <div className="v tm-num">¥12,860.00</div>
                    <div className="d">较昨日 +18%</div>
                  </div>
                </article>
              </div>
              <div className="tm-admin-card tm-admin-card-pad">
                <h3>权限矩阵</h3>
                <PermissionMatrix />
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter
        action={
          <div className="tm-preview-row">
            <PublicButton href="/" variant="secondary">
              返回总览
            </PublicButton>
            <PublicButton href="/landing">查看前台</PublicButton>
          </div>
        }
      />
    </div>
  );
}
