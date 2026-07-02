# 十三雾

`Thirteen_Mists` 是一个基于 Next.js App Router 的前端项目，包含：

- 用户端首页、剧本库、妆造库、会员中心
- 商家后台总览、会员管理、剧本管理、推荐位、妆造、设置、员工、日志
- 基于 Supabase RPC 的自定义手机号密码登录

## 本地启动

```bash
npm install
npm run dev
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

## Supabase 环境变量

项目使用以下环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

本地配置文件位置：

- `.env.local`

## 默认管理员账号

如果你已经执行过 Supabase 迁移与热修复 SQL，项目会自动写入 3 个默认后台管理员账号：

| 角色 | 账号 | 默认密码 |
| --- | --- | --- |
| 老板 | `wuzhu` | `shisanwu888` |
| 店长 | `lin_su` | `shisanwu888` |
| DM | `dm_xiaoye` | `shisanwu888` |

后台登录入口：

- `http://localhost:3000/admin/login`

## 如何查看管理员密码

数据库表 `public.admin_accounts` 中只保存 `password_hash`，不会保存明文密码。

如果你想确认默认密码来源，请查看这些 SQL 文件中的初始化语句：

- `supabase/migrations/20260622201000_add_custom_sessions_and_rpc.sql`
- `supabase/migrations/20260622223000_fix_auth_crypto_schema.sql`

你会看到类似下面的写法：

```sql
extensions.crypt('shisanwu888', extensions.gen_salt('bf'))
```

这里的 `'shisanwu888'` 就是默认管理员密码明文，数据库里实际落的是加密后的哈希。

## 如何重置管理员密码

目前有两种方式：

1. 重新执行包含默认管理员种子的热修复 SQL：
   - `supabase/migrations/20260622223000_fix_auth_crypto_schema.sql`
2. 登录后台后，在员工账号管理页面直接修改对应员工密码

## 相关文档

- `AGENTS.md`
