<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 十三雾项目说明

## 项目整体介绍

- 项目目标：将 `temp/` 下的原生 HTML 原型迁移为可维护、可复用、可扩展的 Next.js 前端项目。
- 用户端主题：暖纸底色 + 墨夜 Hero + 印章红强调色，强调沉浸式剧本体验馆的品牌氛围。
- 商家后台主题：独立的墨夜操作台视觉体系，统一承载会员、剧本、推荐、妆造、权限、日志等管理页面。
- 页面实现原则：尽量以设计系统组件和语义 class 组合页面，避免在页面中重复堆叠零散样式。

## 前端目录结构

```text
src/
  app/
    page.tsx                    # 项目总览入口
    landing/                    # 用户端首页
    login/                      # 用户登录 / 注册
    member/                     # 会员中心
    scripts/                    # 剧本库
    scripts/[id]/               # 剧本详情
    makeup/                     # 妆造库
    admin/                      # 商家后台首页
    admin/login/                # 管理员登录
    admin/members/              # 会员管理
    admin/scripts/              # 剧本管理
    admin/recommendations/      # 推荐位管理
    admin/makeup/               # 妆造管理
    admin/settings/             # 门店设置
    admin/staff/                # 权限分配
    admin/logs/                 # 操作日志
    design-system/              # 设计系统预览页，仅开发环境可见
  components/
    thirteen-mists/ui.tsx       # 品牌 / 按钮 / 导航 / 后台壳层等基础组件
  features/
    thirteen-mists/public-pages.tsx
    thirteen-mists/admin-pages.tsx
    thirteen-mists/design-system-preview.tsx
  lib/
    thirteen-mists/public-data.ts
    thirteen-mists/admin-data.ts
    thirteen-mists/helpers.ts
```

## 设计系统架构

### 1. Token 层

- 统一放在 `src/app/globals.css`。
- 包含颜色、字体、字号、间距、圆角、阴影、动效、容器宽度、响应式 gutter 等基础变量。
- 命名规则使用 `--bg`、`--surface`、`--seal`、`--ink`、`--radius-*`、`--space-*` 等语义 token，禁止随意新增无语义变量。

### 2. 组件层

- 基础通用组件放在 `src/components/thirteen-mists/ui.tsx`。
- 当前已沉淀的基础组件包括：
  - `BrandSeal`
  - `PublicButton`
  - `PublicPill`
  - `PublicTopNav`
  - `PublicFooter`
  - `PublicSectionHeader`
  - `AdminRoleChip`
  - `PermissionMatrix`
  - `AdminShell`

### 3. 页面特性层

- 用户端页面组合逻辑集中在 `src/features/thirteen-mists/public-pages.tsx`。
- 商家后台页面组合逻辑集中在 `src/features/thirteen-mists/admin-pages.tsx`。
- 设计系统预览页放在 `src/features/thirteen-mists/design-system-preview.tsx`。
- 数据、假交互、前端会话模拟等通用逻辑应优先下沉到 `lib/`，不要散落在多个页面中重复实现。

## 组件复用规范

- 开发页面时，必须优先复用已有组件。
- 如果已有组件可以通过 `props`、`variant`、`size`、`className` 等方式扩展，应优先扩展已有组件，而不是重新创建相似组件。
- 只有在现有组件无法满足需求时，才新增组件。
- 新增组件前，先检查：
  - `src/components/thirteen-mists/ui.tsx`
  - 现有 feature 文件里的局部组件
  - `globals.css` 中是否已有对应语义样式基元
- 禁止为了局部页面方便，重复创建第二套按钮、卡片、表单、标签、布局壳组件。

## 开发注意事项

- `design-system` 页面仅用于开发预览，生产环境必须不可见。
- 动态路由遵守当前 Next.js 版本要求，`app/scripts/[id]/page.tsx` 使用 Promise 形式的 `params`。
- 用户端与后台共享品牌，但不是同一主题：
  - 用户端优先使用暖纸主题 token
  - 后台优先使用墨夜控制台主题 token
- 新增页面时，先复用现有布局和 class 体系，再考虑新增样式。
- 页面内若出现大段重复 class 组合，应优先抽组件或抽语义 class。
- 会员、后台登录、权限、流水等当前为前端演示逻辑；正式接后端时应保留 UI 结构，替换为真实 API 与服务端鉴权。
- 任何较大改动后，至少执行一次：
  - `GetDiagnostics`
  - `npm run lint`

## 后续扩展建议

- 将 `public-pages.tsx` 和 `admin-pages.tsx` 继续按页面拆分为更小的 feature 文件，降低单文件体积。
- 将部分局部组件继续下沉到 `components/`，例如通用表格、抽屉、模态框、筛选条。
- 接入真实后端时，优先保留现有数据模型结构，减少 UI 改动范围。
