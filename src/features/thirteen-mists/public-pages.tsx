"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  BRAND_CONTACT,
  BRAND_STATS,
  LIBRARY_CATEGORIES,
  LIBRARY_DIFFICULTIES,
  MAKEUP_LIBRARY,
  MAKEUP_TAGS,
  MEMBER_RIGHTS,
  SCRIPT_LIBRARY,
  type ScriptItem,
} from "@/lib/thirteen-mists/public-data";
import {
  formatCurrency,
  formatInteger,
  isValidPassword,
  isValidPhone,
} from "@/lib/thirteen-mists/helpers";
import {
  BrandSeal,
  PublicButton,
  PublicFooter,
  PublicPill,
  PublicSectionHeader,
  PublicTopNav,
} from "@/components/thirteen-mists/ui";
import {
  clearStoredMemberSession,
  getStoredMemberSession,
  setStoredMemberSession,
} from "@/lib/supabase/auth";
import type {
  MemberDashboardData,
  MemberSession,
} from "@/lib/supabase/app-types";
import {
  getMemberDashboard,
  loginMember,
  logoutMember,
  registerMember,
  updateMemberProfileSettings,
} from "@/lib/supabase/queries";

function useToast() {
  const [message, setMessage] = useState("");
  const show = useCallback((nextMessage: string) => setMessage(nextMessage), []);

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => setMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return {
    message,
    show,
  };
}

function Toast({ message }: { message: string }) {
  return <div className={`tm-toast ${message ? "show" : ""}`}>{message}</div>;
}

function ContactModal({
  open,
  onClose,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  onCopy: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`tm-modal-scrim ${open ? "open" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="tm-modal">
        <div className="tm-modal-head">
          <h3>联系十三雾</h3>
          <button type="button" className="tm-modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="tm-modal-body">
          <div className="tm-qr-box">[ 微信二维码 ]</div>
          <div className="tm-copy-wechat">
            <div>
              <div className="tm-meta">微信客服号</div>
              <div className="tm-num">{BRAND_CONTACT.wechat}</div>
            </div>
            <button type="button" className="tm-btn tm-btn-primary tm-btn-sm" onClick={onCopy}>
              复制
            </button>
          </div>
          <div className="tm-contact-list">
            <div className="tm-contact-row">
              <span className="label">门店地址</span>
              <span className="value">{BRAND_CONTACT.address}</span>
            </div>
            <div className="tm-contact-row">
              <span className="label">营业时间</span>
              <span className="value">{BRAND_CONTACT.hours}</span>
            </div>
            <div className="tm-contact-row">
              <span className="label">联系电话</span>
              <span className="value tm-num">{BRAND_CONTACT.phone}</span>
            </div>
          </div>
          <div className="tm-social-row">
            <a href="https://www.xiaohongshu.com" target="_blank" rel="noreferrer">
              小红书
            </a>
            <a href="https://www.douyin.com" target="_blank" rel="noreferrer">
              抖音
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptCard({ script, compact = false }: { script: ScriptItem; compact?: boolean }) {
  return (
    <Link href={`/scripts/${script.id}`} className="tm-script-card">
      <div className={`tm-script-cover tm-${script.cover}`}>
        <span className="glyph">{script.glyph}</span>
        {script.recommended ? <span className="tm-script-badge">本店主推</span> : null}
        {!compact ? <span className="tm-script-diff">{script.difficulty}</span> : null}
      </div>
      <div className="tm-script-body">
        <div className="tm-tag-row">
          {script.categories.slice(0, compact ? 1 : 2).map((tag) => (
            <PublicPill key={tag}>{tag}</PublicPill>
          ))}
        </div>
        <h3>{script.name}</h3>
        <p>{compact ? script.landingCopy || script.intro : script.intro}</p>
        <div className="tm-script-specs">
          <span>{script.playersLabel}</span>
          <span>{script.duration}</span>
          {!compact ? <span>{script.difficulty}</span> : null}
        </div>
        <div className="tm-script-foot">
          <span className="tm-script-price">
            {formatCurrency(script.price)} <small>/ 人</small>
          </span>
          <span className="tm-btn tm-btn-secondary tm-btn-arrow">查看详情</span>
        </div>
      </div>
    </Link>
  );
}

export function LandingPageContent() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(BRAND_CONTACT.wechat);
    } catch {
      // ignore clipboard failure in demo mode
    }
    toast.show("微信号已复制");
  };

  return (
    <div className="tm-app">
      <PublicTopNav heroAware activeHref="/landing" />
      <main>
        <section className="tm-hero">
          <div className="tm-fog">
            <span className="f1" />
            <span className="f2" />
            <span className="f3" />
          </div>
          <div className="tm-container tm-hero-grid">
            <div className="tm-hero-copy">
              <p className="tm-eyebrow">沉浸式剧本体验馆 · 城市秘境</p>
              <h1>
                雾起十三巷，
                <br />
                赴一场<em>另一个人生</em>。
              </h1>
              <p className="tm-lead tm-lead-ink">
                推开门，雾散，灯起。情感、推理、古风、硬核机制本，配专业妆造与会员储值
                ，挑一个故事，今夜你是谁，由这里决定。
              </p>
              <div className="tm-hero-cta">
                <PublicButton href="/scripts" size="lg" arrow>
                  浏览本店剧本
                </PublicButton>
                <PublicButton href="/makeup" variant="secondary" size="lg">
                  看妆造
                </PublicButton>
              </div>
              <div className="tm-hero-meta">
                {BRAND_STATS.map((stat) => (
                  <div key={stat.label} className="item">
                    <strong className="tm-num">{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tm-hero-mascot">
              <div className="tm-halo" />
              <BrandSeal size={420} className="tm-seal-mark" />
            </div>
          </div>
          <svg className="tm-hero-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path fill="currentColor" d="M0 80V36c180 28 360 32 540 14 220-22 460-46 720-20 80 8 140 18 180 26v24z" />
          </svg>
        </section>

        <section className="tm-section">
          <div className="tm-container">
            <PublicSectionHeader
              eyebrow={
                <>
                  <BrandSeal size={30} />
                  <p className="tm-eyebrow">本店主推 · 三档好戏</p>
                </>
              }
              title="店长私藏，今夜最值得开的三本。"
              action={
                <PublicButton href="/scripts" variant="ghost" arrow>
                  查看全部剧本
                </PublicButton>
              }
            />
            <div className="tm-grid-3">
              {SCRIPT_LIBRARY.filter((script) => script.recommended).map((script) => (
                <ScriptCard key={script.id} script={script} compact />
              ))}
            </div>
          </div>
        </section>

        <section className="tm-section">
          <div className="tm-container">
            <PublicSectionHeader
              eyebrow={
                <>
                  <BrandSeal size={30} />
                  <p className="tm-eyebrow">妆造推荐 · 入戏第一步</p>
                </>
              }
              title="专业妆造团队，为每一个角色而生。"
              action={
                <PublicButton href="/makeup" variant="ghost" arrow>
                  浏览妆造图库
                </PublicButton>
              }
            />
            <div className="tm-makeup-grid">
              {MAKEUP_LIBRARY.slice(0, 4).map((look) => (
                <figure key={look.id}>
                  <div className={`tm-makeup-art tm-${look.art}`} />
                  <figcaption>
                    <div className="t">{look.name}</div>
                    <div className="s">{look.forScript}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="tm-section">
          <div className="tm-container">
            <PublicSectionHeader
              eyebrow={
                <>
                  <BrandSeal size={30} />
                  <p className="tm-eyebrow">剧本分类 · 按口味挑</p>
                </>
              }
              title="想玩哪一种？点一下进入剧本库筛选。"
            />
            <div className="tm-cat-grid">
              {LIBRARY_CATEGORIES.slice(1).map((category) => (
                <Link key={category} href={`/scripts?cat=${encodeURIComponent(category)}`} className="tm-cat-chip">
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="tm-section">
          <div className="tm-container">
            <div className="tm-cta-band">
              <BrandSeal size={56} className="tm-cta-seal" />
              <h2>成为十三雾会员，享专属折扣与积分。</h2>
              <p>
                储值即升级，最高享 8.5 折；消费即得积分，可兑伴手礼与优惠券。会员资料、
                余额、积分随时可查。
              </p>
              <PublicButton href="/login" size="lg" arrow>
                立即登录 / 注册
              </PublicButton>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter
        action={
          <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setOpen(true)}>
            联系我们
          </button>
        }
      />
      <ContactModal open={open} onClose={() => setOpen(false)} onCopy={onCopy} />
      <Toast message={toast.message} />
    </div>
  );
}

export function ScriptsLibraryPageContent({
  initialCategory,
}: {
  initialCategory?: string;
}) {
  const normalizedCategory =
    initialCategory && LIBRARY_CATEGORIES.includes(initialCategory as (typeof LIBRARY_CATEGORIES)[number])
      ? initialCategory
      : "全部";
  const [category, setCategory] = useState<string>(
    normalizedCategory
  );
  const [difficulty, setDifficulty] = useState<string>("全部");
  const [players, setPlayers] = useState<string>("全部");

  const filtered = useMemo(() => {
    return SCRIPT_LIBRARY.filter((script) => {
      if (category !== "全部" && !script.categories.includes(category)) return false;
      if (difficulty !== "全部" && script.difficulty !== difficulty) return false;
      if (players === "4-5 人" && script.minPlayers > 5) return false;
      if (players === "6 人" && !(script.minPlayers <= 6 && script.maxPlayers >= 6)) return false;
      if (players === "7-8 人" && script.maxPlayers < 7) return false;
      return true;
    });
  }, [category, difficulty, players]);

  return (
    <div className="tm-app">
      <PublicTopNav activeHref="/scripts" />
      <main>
        <section className="tm-page-head">
          <div className="tm-fog">
            <span className="f1" />
            <span className="f2" />
          </div>
          <div className="tm-container tm-page-head-inner">
            <div>
              <p className="tm-eyebrow">剧本库 · 全部在库好戏</p>
              <h1>
                挑一个故事，
                <br />
                今夜你是谁。
              </h1>
              <p className="tm-lead tm-lead-ink">
                情感、推理、古风、硬核机制，按口味、人数、难度筛一筛，找到最适合今晚这桌人的本。
              </p>
            </div>
            <div className="tm-page-head-stat">
              <strong className="tm-num">{SCRIPT_LIBRARY.length}</strong>
              <span>本店在库剧本</span>
            </div>
          </div>
        </section>

        <section className="tm-filters">
          <div className="tm-container tm-filters-inner">
            <FilterRow
              label="题材"
              items={[...LIBRARY_CATEGORIES]}
              active={category}
              onPick={setCategory}
            />
            <FilterRow
              label="难度"
              items={[...LIBRARY_DIFFICULTIES]}
              active={difficulty}
              onPick={setDifficulty}
            />
            <FilterRow
              label="人数"
              items={["全部", "4-5 人", "6 人", "7-8 人"]}
              active={players}
              onPick={setPlayers}
            />
            <div className="tm-filter-meta">
              <span className="tm-result-count">
                共 <b>{filtered.length}</b> 个剧本
              </span>
              {category !== "全部" || difficulty !== "全部" || players !== "全部" ? (
                <button
                  type="button"
                  className="tm-clear-btn"
                  onClick={() => {
                    setCategory("全部");
                    setDifficulty("全部");
                    setPlayers("全部");
                  }}
                >
                  清除筛选
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="tm-library">
          <div className="tm-container">
            {filtered.length ? (
              <div className="tm-grid-3">
                {filtered.map((script) => (
                  <ScriptCard key={script.id} script={script} />
                ))}
              </div>
            ) : (
              <div className="tm-empty">
                <div className="glyph">雾</div>
                <p>没有符合条件的剧本，换个组合试试？</p>
                <button
                  type="button"
                  className="tm-btn tm-btn-secondary"
                  onClick={() => {
                    setCategory("全部");
                    setDifficulty("全部");
                    setPlayers("全部");
                  }}
                >
                  重置筛选条件
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter action={<PublicButton href="/makeup" variant="secondary">浏览妆造库</PublicButton>} />
    </div>
  );
}

function FilterRow({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: string[];
  active: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="tm-filter-row">
      <span className="tm-filter-label">{label}</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={`tm-chip ${active === item ? "active" : ""}`}
          onClick={() => onPick(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function ScriptDetailPageContent({ id }: { id: string }) {
  const script = SCRIPT_LIBRARY.find((item) => item.id === id);
  const related = SCRIPT_LIBRARY.filter((item) => item.recommended && item.id !== id);

  if (!script) {
    return null;
  }

  return (
    <div className="tm-app">
      <PublicTopNav activeHref="/scripts" />
      <main>
        <div className="tm-container">
          <nav className="tm-crumb" aria-label="面包屑">
            <Link href="/landing">首页</Link>
            <span className="sep">/</span>
            <Link href="/scripts">剧本库</Link>
            <span className="sep">/</span>
            <span className="cur">{script.name}</span>
          </nav>
        </div>

        <section className="tm-detail-hero">
          <div className="tm-container">
            <div className="tm-detail-grid">
              <div className="tm-detail-cover">
                <div className={`tm-script-cover tm-detail-cover-art tm-${script.cover}`}>
                  <span className="glyph">{script.glyph}</span>
                </div>
                <span className="tm-detail-rank">{script.rankLabel}</span>
              </div>
              <div className="tm-detail-main">
                <p className="tm-eyebrow">{script.kicker}</p>
                <h1>{script.name}</h1>
                <p className="tm-lead">{script.intro}</p>
                <div className="tm-tag-row">
                  {script.categories.map((tag) => (
                    <PublicPill key={tag}>{tag}</PublicPill>
                  ))}
                </div>
                <div className="tm-detail-spec-grid">
                  <DetailSpec label="人数" value={script.playersLabel} />
                  <DetailSpec label="时长" value={script.duration} />
                  <DetailSpec label="难度" value={script.difficulty} />
                  <DetailSpec label="妆造" value={script.makeup} />
                </div>
                <div className="tm-detail-cta">
                  <PublicButton href="/login" size="lg" arrow>
                    登录后预约本场
                  </PublicButton>
                  <PublicButton href="/scripts" variant="secondary" size="lg">
                    返回剧本库
                  </PublicButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tm-section tm-section-bordered">
          <div className="tm-container">
            <div className="tm-info-grid">
              <div>
                <div className="tm-block">
                  <div className="tm-block-kicker">
                    <span className="bar" />
                    <h2>剧本亮点</h2>
                  </div>
                  <ul className="tm-feature-list">
                    {(script.highlights.length ? script.highlights : [
                      { title: "沉浸氛围", description: "围绕题材定制场景与灯光，确保代入感。" },
                      { title: "完整流程", description: "角色分发、剧情推进、复盘环节完整覆盖。" },
                      { title: "适配玩家", description: "可根据人数与经验灵活安排带本节奏。" },
                    ]).map((highlight, index) => (
                      <li key={highlight.title}>
                        <span className="idx tm-num">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <div className="ft">{highlight.title}</div>
                          <div className="fd">{highlight.description}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="tm-block">
                  <div className="tm-block-kicker">
                    <span className="bar" />
                    <h2>适合人群</h2>
                  </div>
                  <div className="tm-audience-grid">
                    {(script.audience.length ? script.audience : [
                      { title: "熟人车", description: "更容易打出阵营与演绎张力。" },
                      { title: "情侣 / 闺蜜局", description: "适合重情绪体验的玩家组合。" },
                      { title: "推理玩家", description: "喜欢复盘和线索拼接的玩家。" },
                    ]).map((item) => (
                      <div key={item.title} className="tm-audience">
                        <div className="t">{item.title}</div>
                        <div className="d">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tm-block">
                  <div className="tm-notice">
                    <strong>到店须知</strong>
                    <ul>
                      {(script.notes.length ? script.notes : [
                        "请至少提前 15 分钟到店，方便完成签到与角色分发。",
                        "如需妆造或换装，请预留额外准备时间。",
                        "为保证体验，请勿向未玩玩家剧透关键剧情。",
                      ]).map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <aside>
                <div className="tm-aside-card">
                  <h3>开场信息</h3>
                  <div className="tm-aside-row">
                    <span className="label">建议人数</span>
                    <span className="value tm-num">{script.playersLabel}</span>
                  </div>
                  <div className="tm-aside-row">
                    <span className="label">游戏时长</span>
                    <span className="value">{script.duration}</span>
                  </div>
                  <div className="tm-aside-row">
                    <span className="label">难度</span>
                    <span className="value">{script.difficulty}</span>
                  </div>
                  <div className="tm-aside-row">
                    <span className="label">是否需要妆造</span>
                    <span className="value">{script.makeup}</span>
                  </div>
                  <div className="tm-aside-row">
                    <span className="label">参考人均</span>
                    <span className="value tm-num">{formatCurrency(script.price)}</span>
                  </div>
                  <PublicButton href="/login" arrow className="tm-full-width">
                    登录预约
                  </PublicButton>
                  <button type="button" className="tm-btn tm-btn-secondary tm-full-width">
                    联系门店咨询
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="tm-section tm-section-bordered">
          <div className="tm-container">
            <h2 className="tm-sec-title">你可能也想开的本</h2>
            <div className="tm-grid-3">
              {related.map((item) => (
                <ScriptCard key={item.id} script={item} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter action={<PublicButton href="/scripts" variant="secondary">查看全部剧本</PublicButton>} />
    </div>
  );
}

function DetailSpec({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tm-detail-spec">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

export function MakeupLibraryPageContent() {
  const [tag, setTag] = useState("全部");
  const [activeId, setActiveId] = useState<number | null>(null);

  const looks = useMemo(() => {
    return MAKEUP_LIBRARY.filter((look) => tag === "全部" || look.tag === tag);
  }, [tag]);

  const activeLook = MAKEUP_LIBRARY.find((look) => look.id === activeId) ?? null;

  return (
    <div className="tm-app">
      <PublicTopNav activeHref="/makeup" />
      <main>
        <section className="tm-page-head tm-page-head-left">
          <div className="tm-fog">
            <span className="f1" />
            <span className="f2" />
          </div>
          <div className="tm-container tm-page-head-inner">
            <div>
              <p className="tm-eyebrow">妆造库 · 入戏第一步</p>
              <h1>
                一笔一画，
                <br />
                把你画进角色里。
              </h1>
              <p className="tm-lead tm-lead-ink">
                专业妆造团队按剧本类型设计的造型档案。点击任意一张查看适用剧本、所需时长与价格。
              </p>
            </div>
            <div className="tm-page-head-stat">
              <strong className="tm-num">{MAKEUP_LIBRARY.length}</strong>
              <span>套妆造造型</span>
            </div>
          </div>
        </section>

        <section className="tm-filters">
          <div className="tm-container tm-filters-inline">
            <div className="tm-chip-row">
              {MAKEUP_TAGS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`tm-chip ${tag === item ? "active" : ""}`}
                  onClick={() => setTag(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <span className="tm-result-count">
              共 <b>{looks.length}</b> 套妆造
            </span>
          </div>
        </section>

        <section className="tm-gallery">
          <div className="tm-container">
            {looks.length ? (
              <div className="tm-masonry">
                {looks.map((look) => (
                  <figure
                    key={look.id}
                    className="tm-shot"
                    onClick={() => setActiveId(look.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveId(look.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <div className={`tm-shot-art tm-${look.art}`} style={{ paddingBottom: `${Math.round(look.ratio * 100)}%` }}>
                      <span className="glyph">{look.glyph}</span>
                    </div>
                    <span className="tm-shot-corner">{look.tag}</span>
                    <figcaption className="tm-shot-cap">
                      <div className="t">{look.name}</div>
                      <div className="s">{look.forScript}</div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="tm-empty">
                <div className="glyph">雾</div>
                <p>该分类暂未上新妆造，敬请期待。</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter action={<PublicButton href="/scripts" variant="secondary">浏览剧本库</PublicButton>} />

      <div
        className={`tm-lightbox ${activeLook ? "open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setActiveId(null);
          }
        }}
      >
        {activeLook ? (
          <div className="tm-lightbox-card">
            <div className={`tm-lightbox-art tm-${activeLook.art}`}>
              <span className="glyph">{activeLook.glyph}</span>
            </div>
            <div className="tm-lightbox-info">
              <button
                type="button"
                className="tm-lightbox-close"
                onClick={() => setActiveId(null)}
                aria-label="关闭"
              >
                ×
              </button>
              <p className="tm-eyebrow">{activeLook.tag} · 妆造造型</p>
              <h2>{activeLook.name}</h2>
              <p className="desc">{activeLook.description}</p>
              <div className="tm-lightbox-spec">
                <div className="r">
                  <span className="k">适用剧本</span>
                  <span className="v">{activeLook.forScript}</span>
                </div>
                <div className="r">
                  <span className="k">妆造时长</span>
                  <span className="v">{activeLook.time}</span>
                </div>
                <div className="r">
                  <span className="k">参考价格</span>
                  <span className="v">{activeLook.priceLabel}</span>
                </div>
                <div className="r">
                  <span className="k">含发型 / 服饰</span>
                  <span className="v">{activeLook.includes}</span>
                </div>
              </div>
              <PublicButton href="/login" arrow>
                登录后预约妆造
              </PublicButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">(searchParams.get("mode") === "register" ? "register" : "login");
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const redirectTarget = searchParams.get("redirect") || "/member";

  useEffect(() => {
    const session = getStoredMemberSession();
    if (session?.sessionToken) {
      router.replace(redirectTarget);
      return;
    }

    if (session?.phone) {
      clearStoredMemberSession();
    }
  }, [redirectTarget, router]);

  const togglePassword = (key: string) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "").trim();
    const remember = form.get("remember") === "on";

    if (!isValidPhone(phone)) {
      toast.show("请输入正确的 11 位手机号");
      return;
    }

    if (!isValidPassword(password)) {
      toast.show("密码至少 6 位");
      return;
    }

    setSubmitting(true);
    try {
      const session = await loginMember({ phone, password, remember });
      setStoredMemberSession(session);
      toast.show("登录成功，正在进入会员中心…");
      window.setTimeout(() => router.push(redirectTarget), 700);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "").trim();
    const confirm = String(form.get("confirmPassword") || "").trim();
    const agree = form.get("agree") === "on";

    if (!isValidPhone(phone)) {
      toast.show("请输入正确的 11 位手机号");
      return;
    }

    if (!isValidPassword(password)) {
      toast.show("密码至少 6 位");
      return;
    }

    if (password !== confirm) {
      toast.show("两次输入的密码不一致");
      return;
    }

    if (!agree) {
      toast.show("请先阅读并同意用户协议");
      return;
    }

    setSubmitting(true);
    try {
      const session = await registerMember({
        phone,
        password,
        confirmPassword: confirm,
        remember: true,
      });
      setStoredMemberSession(session);
      toast.show("注册成功，欢迎加入十三雾会员");
      window.setTimeout(() => router.push(redirectTarget), 700);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "注册失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tm-auth-split">
      <aside className="tm-auth-brand">
        <div className="tm-fog">
          <span className="f1" />
          <span className="f2" />
        </div>
        <Link className="tm-logo tm-logo-light" href="/landing">
          <BrandSeal size={40} />
          <span>十三雾</span>
        </Link>
        <div className="tm-auth-brand-center">
          <BrandSeal size={260} className="tm-seal-mark" priority />
          <h2>
            先逛雾中，<em>再入会员</em>。
          </h2>
          <p>
            未登录可自由浏览剧本与妆造；登录后进入会员中心，查看余额、等级与流水。
          </p>
        </div>
        <div className="tm-auth-brand-foot">
          <div className="item">
            <strong className="tm-num">9 折</strong>
            <span>金雾折扣</span>
          </div>
          <div className="item">
            <strong className="tm-num">120+</strong>
            <span>在库剧本</span>
          </div>
          <div className="item">
            <strong className="tm-num">14:00-02:00</strong>
            <span>营业时间</span>
          </div>
        </div>
      </aside>

      <main className="tm-auth-form-panel">
        <div className="tm-auth-card">
          <Link href="/landing" className="tm-auth-back">
            ← 返回首页继续浏览
          </Link>
          <h1>会员登录</h1>
          <p className="tm-auth-sub">使用手机号 + 密码登录，或注册成为新会员。</p>

          <div className="tm-guest-note">
            <strong>游客模式：</strong>首页、剧本库、妆造库无需登录即可浏览。登录仅用于进入
            <strong>会员中心</strong>查看个人账户，不能自助充值或修改余额。
          </div>

          <div className="tm-auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              登录
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              注册
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin}>
              <FormField label="手机号">
                <input className="tm-input" name="phone" type="tel" autoComplete="tel" maxLength={11} placeholder="请输入 11 位手机号" />
              </FormField>
              <FormField label="密码">
                <div className="tm-input-wrap">
                  <input
                    className="tm-input tm-input-with-toggle"
                    name="password"
                    type={showPassword.login ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                  />
                  <button type="button" className="tm-input-toggle" onClick={() => togglePassword("login")}>
                    {showPassword.login ? "隐藏" : "显示"}
                  </button>
                </div>
              </FormField>
              <div className="tm-auth-row">
                <label className="tm-checkbox">
                  <input name="remember" type="checkbox" defaultChecked />
                  <span>记住登录状态</span>
                </label>
                <button type="button" className="tm-link-btn" onClick={() => toast.show("请联系门店前台重置密码（演示）")}>
                  忘记密码？
                </button>
              </div>
              <button type="submit" className="tm-btn tm-btn-primary tm-full-width">
                {submitting ? "登录中…" : "登录并进入会员中心"}
              </button>
              <p className="tm-auth-agreement">
                登录即代表同意 <a href="#">用户协议</a> 与 <a href="#">隐私政策</a>。
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <FormField label="手机号">
                <input className="tm-input" name="phone" type="tel" autoComplete="tel" maxLength={11} placeholder="将作为会员登录账号" />
              </FormField>
              <FormField label="设置密码">
                <div className="tm-input-wrap">
                  <input
                    className="tm-input tm-input-with-toggle"
                    name="password"
                    type={showPassword.register ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="至少 6 位，建议含字母与数字"
                  />
                  <button type="button" className="tm-input-toggle" onClick={() => togglePassword("register")}>
                    {showPassword.register ? "隐藏" : "显示"}
                  </button>
                </div>
                <p className="tm-field-hint">正式版将在服务端加密存储密码，此处为演示原型。</p>
              </FormField>
              <FormField label="确认密码">
                <div className="tm-input-wrap">
                  <input
                    className="tm-input tm-input-with-toggle"
                    name="confirmPassword"
                    type={showPassword.confirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="再次输入密码"
                  />
                  <button type="button" className="tm-input-toggle" onClick={() => togglePassword("confirm")}>
                    {showPassword.confirm ? "隐藏" : "显示"}
                  </button>
                </div>
              </FormField>
              <label className="tm-checkbox tm-checkbox-stack">
                <input name="agree" type="checkbox" />
                <span>
                  我已阅读并同意 <a href="#">用户协议</a> 与 <a href="#">隐私政策</a>，知晓会员资金由门店统一管理。
                </span>
              </label>
              <button type="submit" className="tm-btn tm-btn-primary tm-full-width">
                {submitting ? "注册中…" : "注册并登录"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Toast message={toast.message} />
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="tm-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function getLevelByRules(
  levelRules: Array<{ name: string; min: number; discount: string }>,
  totalRecharge: number
) {
  const rules = [...levelRules].sort((a, b) => a.min - b.min);
  const fallback = rules[0] ?? { name: "普通会员", min: 0, discount: "9.8" };
  let matched = fallback;

  for (const rule of rules) {
    if (totalRecharge >= rule.min) {
      matched = rule;
    }
  }

  return {
    name: matched.name,
    min: matched.min,
    discount: matched.discount,
  };
}

function getNextLevelByRules(
  levelRules: Array<{ name: string; min: number; discount: string }>,
  totalRecharge: number
) {
  return [...levelRules].sort((a, b) => a.min - b.min).find((rule) => rule.min > totalRecharge) ?? null;
}

export function MemberPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { message: toastMessage, show: showToast } = useToast();
  const [tab, setTab] = useState<"overview" | "records" | "settings">("overview");
  const [recordTab, setRecordTab] = useState<"consume" | "recharge" | "points">("consume");
  const [session, setSession] = useState<MemberSession | null>(null);
  const [dashboard, setDashboard] = useState<MemberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [title, setTitle] = useState("不便透露");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedSession = getStoredMemberSession();
      if (!storedSession?.sessionToken) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      setSession(storedSession);

      try {
        const data = await getMemberDashboard(storedSession.sessionToken);
        if (cancelled) return;
        setDashboard(data);
        setNickname(data.profile.name);
        setBirthday(data.profile.birthday);
        setTitle(data.profile.title || "不便透露");
        setRemark(data.profile.remark || "");
      } catch (error) {
        if (cancelled) return;
        clearStoredMemberSession();
        showToast(error instanceof Error ? error.message : "会员数据加载失败");
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, showToast]);

  if (loading || !dashboard) {
    return <div className="tm-admin-loading">正在加载会员数据…</div>;
  }

  const profile = dashboard.profile;
  const currentLevel = getLevelByRules(dashboard.levelRules, profile.totalRecharge);
  const nextLevel = getNextLevelByRules(dashboard.levelRules, profile.totalRecharge);
  const progress = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((profile.totalRecharge - currentLevel.min) /
            (nextLevel.min - currentLevel.min || 1)) *
            100
        )
      )
    : 100;

  return (
    <div className="tm-app">
      <PublicTopNav activeHref="/member" />
      <main>
        <div className="tm-container">
          <div className="tm-member-head">
            <p className="tm-eyebrow">会员中心 / 设置</p>
            <h1>{profile.greetingName}</h1>
          </div>

          <div className="tm-tabs">
            <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
              会员概览
            </button>
            <button type="button" className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}>
              交易记录
            </button>
            <button type="button" className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
              个人设置
            </button>
          </div>

          {tab === "overview" ? (
            <>
              <section className="tm-member-card">
                <span className="tm-member-fog" />
                <BrandSeal size={240} className="tm-member-watermark" />
                <div className="tm-member-top">
                  <div className="tm-member-user">
                    <div className="tm-member-avatar">{profile.avatarText}</div>
                    <div>
                      <div className="name">{nickname}</div>
                      <div className="phone tm-num">{profile.maskedPhone}</div>
                    </div>
                  </div>
                  <span className="tm-member-level-badge">
                    {profile.levelLabel} · {profile.discountLabel}
                  </span>
                </div>
                <div className="tm-member-balance">
                  <div className="label">当前储值余额</div>
                  <div className="amount tm-num">{formatCurrency(profile.balance)}</div>
                </div>
                <div className="tm-member-stats">
                  <div className="item">
                    <div className="v tm-num">{formatCurrency(profile.totalRecharge)}</div>
                    <div className="k">累计充值</div>
                  </div>
                  <div className="item">
                    <div className="v tm-num">{formatCurrency(profile.totalSpend)}</div>
                    <div className="k">累计消费</div>
                  </div>
                  <div className="item">
                    <div className="v tm-num">{formatInteger(profile.points)}</div>
                    <div className="k">当前积分</div>
                  </div>
                  <div className="item">
                    <div className="v tm-num">{profile.discountLabel}</div>
                    <div className="k">当前折扣</div>
                  </div>
                </div>
              </section>

              <div className="tm-member-grid">
                <div className="tm-stack">
                  <section className="tm-card">
                    <div className="tm-card-head">
                      <h3>会员等级</h3>
                      <PublicPill>{profile.levelLabel}</PublicPill>
                    </div>
                    <div className="tm-level-track">
                      <div className="tm-level-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="tm-level-scale">
                      {dashboard.levelRules.map((rule) => (
                        <span key={rule.name}>
                          {rule.name.replace("会员", "")} ¥{rule.min}
                        </span>
                      ))}
                    </div>
                    <p className="tm-level-hint">
                      {nextLevel
                        ? `距离 ${nextLevel.name}（享 ${nextLevel.discount} 折）还需累计充值 ${formatCurrency(
                            nextLevel.min - profile.totalRecharge
                          )}。`
                        : "你已达到最高等级，继续储值可保持高等级权益。"}
                    </p>
                  </section>

                  <section className="tm-card">
                    <div className="tm-card-head">
                      <h3>积分可兑权益</h3>
                      <span className="tm-meta">可用积分 {profile.points}</span>
                    </div>
                    <div className="tm-rights">
                      {MEMBER_RIGHTS.map((right) => (
                        <div key={right.title} className="tm-right-item">
                          <div>
                            <div className="r-name">{right.title}</div>
                            <div className="r-cost">{right.description}</div>
                          </div>
                          {right.action.includes("兑换") ? (
                            <button
                              type="button"
                              className="tm-btn tm-btn-secondary tm-btn-sm"
                              onClick={() => showToast("兑换请求已提交，到店核销")}
                            >
                              {right.action}
                            </button>
                          ) : (
                            <span className="tm-meta">{right.action}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="tm-card">
                  <div className="tm-card-head">
                    <h3>充值赠送规则</h3>
                  </div>
                  <p className="tm-card-copy">到店或联系客服充值，系统自动赠送余额并更新等级。</p>
                  <table className="tm-table">
                    <tbody>
                      {dashboard.rechargeRules.map((rule) => (
                        <tr key={rule.amount}>
                          <td>充值 {formatCurrency(rule.amount)}</td>
                          <td className="tm-num tm-amount-plus">赠 {formatCurrency(rule.gift)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" className="tm-btn tm-btn-primary tm-full-width" onClick={() => showToast("微信客服：shisanwu_kf")}>
                    联系客服充值
                  </button>
                  <p className="tm-meta tm-align-center">余额与积分仅可由门店操作，确保安全</p>
                </section>
              </div>
            </>
          ) : null}

          {tab === "records" ? (
            <section className="tm-card">
              <div className="tm-card-head">
                <h3>交易记录</h3>
                <div className="tm-sub-tabs">
                  <button type="button" className={recordTab === "consume" ? "active" : ""} onClick={() => setRecordTab("consume")}>
                    消费
                  </button>
                  <button type="button" className={recordTab === "recharge" ? "active" : ""} onClick={() => setRecordTab("recharge")}>
                    充值
                  </button>
                  <button type="button" className={recordTab === "points" ? "active" : ""} onClick={() => setRecordTab("points")}>
                    积分
                  </button>
                </div>
              </div>
              {recordTab === "consume" ? (
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>项目</th>
                      <th>折后实付</th>
                      <th>得分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.consumeLogs.map((log) => (
                      <tr key={`${log.time}-${log.title}`}>
                        <td className="tm-num">{log.time}</td>
                        <td>{log.title}</td>
                        <td className="tm-num">{log.amount}</td>
                        <td className="tm-num">{log.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {recordTab === "recharge" ? (
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>充值</th>
                      <th>赠送</th>
                      <th>充值后余额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.rechargeLogs.map((log) => (
                      <tr key={`${log.time}-${log.amount}`}>
                        <td className="tm-num">{log.time}</td>
                        <td className="tm-num">{log.amount}</td>
                        <td className="tm-num">{log.gift}</td>
                        <td className="tm-num">{log.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {recordTab === "points" ? (
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>来源</th>
                      <th>类型</th>
                      <th>积分变动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.pointLogs.map((log) => (
                      <tr key={`${log.time}-${log.source}`}>
                        <td className="tm-num">{log.time}</td>
                        <td>{log.source}</td>
                        <td>{log.type}</td>
                        <td className="tm-num">{log.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </section>
          ) : null}

          {tab === "settings" ? (
            <section className="tm-card tm-card-narrow">
              <div className="tm-card-head">
                <h3>个人资料</h3>
              </div>
              <div className="tm-avatar-edit">
                <div className="tm-member-avatar large">{profile.avatarText}</div>
                <div>
                  <button type="button" className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => showToast("头像上传（演示）")}>
                    更换头像
                  </button>
                  <p className="tm-field-hint">支持 JPG / PNG，建议 200×200 以上</p>
                </div>
              </div>
              <form
                className="tm-settings-grid"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!session) return;
                  setSaving(true);
                  try {
                    const updated = await updateMemberProfileSettings({
                      sessionToken: session.sessionToken,
                      displayName: nickname,
                      birthday,
                      title,
                      remark,
                    });
                    setDashboard(updated);
                    setNickname(updated.profile.name);
                    setBirthday(updated.profile.birthday);
                    setTitle(updated.profile.title || "不便透露");
                    setRemark(updated.profile.remark || "");
                    showToast("资料已保存");
                  } catch (error) {
                    showToast(error instanceof Error ? error.message : "保存失败，请稍后重试");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <FormField label="昵称">
                  <input className="tm-input" value={nickname} onChange={(event) => setNickname(event.target.value)} />
                </FormField>
                <FormField label="手机号">
                  <input className="tm-input" value={profile.maskedPhone} disabled />
                </FormField>
                <FormField label="生日">
                  <input className="tm-input" type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} />
                </FormField>
                <FormField label="称呼">
                  <select className="tm-input" value={title} onChange={(event) => setTitle(event.target.value)}>
                    <option>不便透露</option>
                    <option>先生</option>
                    <option>女士</option>
                  </select>
                </FormField>
                <FormField label="备注 / 偏好">
                  <input
                    className="tm-input"
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    placeholder="例如：偏好推理本、忌恐怖、常来 5-6 人局"
                  />
                </FormField>
                <div className="tm-settings-actions">
                  <button type="submit" className="tm-btn tm-btn-primary">
                    {saving ? "保存中…" : "保存资料"}
                  </button>
                  <button
                    type="button"
                    className="tm-btn tm-btn-ghost"
                    onClick={() => {
                      setNickname(profile.name);
                      setBirthday(profile.birthday);
                      setTitle(profile.title || "不便透露");
                      setRemark(profile.remark || "");
                    }}
                  >
                    撤销修改
                  </button>
                </div>
              </form>

              <div className="tm-settings-section">
                <div className="tm-card-head">
                  <h3>通知偏好</h3>
                </div>
                <ToggleRow title="新剧本上架提醒" description="本店上新时通过短信通知你" defaultChecked />
                <ToggleRow title="会员日 / 活动通知" description="会员日、主题局、节日活动" defaultChecked />
                <ToggleRow title="积分到期提醒" description="积分即将到期前提醒兑换" />
              </div>

              <div className="tm-settings-section">
                <div className="tm-card-head">
                  <h3>管理员入口</h3>
                  <span className="tm-meta">仅限门店管理员 / 授权员工</span>
                </div>
                <p className="tm-field-hint">如果你是老板、店长或 DM，可从这里进入商家后台控制台。</p>
                <div className="tm-settings-actions">
                  <PublicButton href="/admin/login" variant="secondary">
                    进入管理员后台
                  </PublicButton>
                </div>
              </div>

              <div className="tm-danger-note">
                会员的余额、积分、等级与交易流水由门店统一管理，个人中心仅可修改资料与通知偏好，
                无法自行修改账户金额，以保障资金安全。
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <PublicFooter
        action={
          <button
            type="button"
            className="tm-btn tm-btn-secondary"
            onClick={async () => {
              try {
                if (session?.sessionToken) {
                  await logoutMember(session.sessionToken);
                }
              } catch {
                // ignore logout RPC failure and clear local session anyway
              } finally {
                clearStoredMemberSession();
                router.push("/landing");
              }
            }}
          >
            退出登录
          </button>
        }
      />
      <Toast message={toastMessage} />
    </div>
  );
}

function ToggleRow({
  title,
  description,
  defaultChecked = false,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="tm-toggle-row">
      <div>
        <div className="t-name">{title}</div>
        <div className="t-desc">{description}</div>
      </div>
      <button
        type="button"
        className={`tm-switch ${checked ? "checked" : ""}`}
        onClick={() => setChecked((prev) => !prev)}
        aria-pressed={checked}
      >
        <span />
      </button>
    </div>
  );
}
