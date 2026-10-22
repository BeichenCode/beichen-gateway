# 北辰中转站 — AI 大模型统一网关

一个开箱即用的 LLM 网关与 API 资产管理系统：统一 OpenAI 兼容接口、多渠道调度、令牌计费、多用户体系，全部自托管，数据不出你的服务器。

🖥️ **在线演示**：[bz.013.ltd](https://bz.013.ltd/)

> 本项目参考 [QuantumNous/new-api](https://github.com/QuantumNous/new-api)（AGPL-3.0）的功能语义，以 Next.js / TypeScript 重新实现；new-api 的血统源自 [songquanpeng/one-api](https://github.com/songquanpeng/one-api)（MIT）。本项目与 new-api 官方无关，其名称与 Logo 均归原项目所有。

## 功能特性

- **统一网关**：对外暴露 OpenAI 兼容的 `/v1` 接口，同时支持 Claude（Anthropic）原生 `/v1/messages` 协议；内部调度到 OpenAI / Claude / Gemini / DeepSeek / 智谱 / 通义等任意 OpenAI 兼容上游
- **渠道管理**：多渠道加权调度、失败重试、渠道级熔断与半开恢复、上游密钥轮转与会话粘性，流式错误语义与主流网关一致
- **令牌与计费**：令牌级额度、有效期、模型白名单、IP 限制；按模型倍率精确计费，日志可审计
- **多用户体系**：注册/登录、邮箱验证、Turnstile 人机校验、内置智能验证码、邀请返利、用户分组倍率
- **模型健康自治**：内置模型指标自探测（经真实中继链路发流式探测，驱动模型广场的状态/延迟/吞吐徽章）；连续异常模型自动下架、恢复后自动回榜，全部可在控制台调节
- **运营配套**：钱包与订单、兑换码、商城、工单系统、公告与关于页、数据看板、双网关对比测速
- **官网落地页**：默认启用企业版官网落地页，另预留多套模板设计稿（暗夜版 / 网关版 / 云服务版 / 字报版等）可自行接入
- **部署友好**：默认 SQLite 零依赖开箱即用，支持切换 MySQL 等生产数据库

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6 · shadcn/ui · Arco Design · Vue 3 控制台组件层 · ECharts

## 快速开始

### 环境要求

- Node.js 20+（推荐 20 LTS）
- npm 10+
- 默认 SQLite，无需额外安装数据库服务

### 安装与初始化

```bash
# 1. 安装依赖
npm install

# 2. 创建 .env（项目根目录），最小配置：
cat > .env << 'EOF'
DATABASE_URL="file:./db/custom.db"
SESSION_SECRET="请换成你自己的随机长字符串"
EOF
# 注意：
# - SQLite 相对路径按 prisma/schema.prisma 所在目录解析；
#   想放到项目根的 db/ 下，可写绝对路径，如 file:/home/you/app/db/custom.db
# - SESSION_SECRET 是管理后台登录态的签名密钥，源码中的回退值仅为开发默认，
#   生产环境务必设置独立强随机值（如 openssl rand -hex 32 生成），不要复用回退值！

# 3. 初始化数据库
npx prisma db push
npx prisma generate

# 4. 写入种子数据（默认管理员 + 系统设置 + 常用模型定价）
npx tsx prisma/seed.ts
```

### 启动

```bash
# 开发模式（http://localhost:3000）
npm run dev

# 生产模式
npm run build && npm start
# start 脚本使用 bun 运行 standalone 产物；
# 未安装 bun 时可改用：NODE_ENV=production node .next/standalone/server.js
```

### 默认管理员

| 用户名 | 初始密码 |
|--------|----------|
| `root` | `123456` |

> ⚠️ 初始密码为项目默认值，首次登录后请立刻在控制台修改！

## 常用配置

以下全部在控制台「**系统设置**」页配置（存数据库），无需写 `.env`：

- 邮箱 SMTP / 邮箱验证注册
- 站点地址（ServerAddress）
- Turnstile 人机校验
- 计费方式与分组倍率
- 模型探测与健康自动上下架参数（ProbeEnabled / ProbeIntervalSec / HealthEnabled 等）

上游渠道（OpenAI 兼容地址 + 密钥）在控制台「**渠道**」页添加，密钥存库不落码。

## 开源协议

本项目采用 **[GNU AGPL-3.0](./LICENSE)** 协议开源。

- ✅ 允许自部署、商用（含收费提供服务）、学习与修改
- 📌 若你修改了本项目并通过网络对外提供服务，需依 AGPL-3.0 以相同协议向使用者公开修改后的源码
- 📌 分发时请保留本项目的版权与许可声明，并注明你所做的修改

### 来源声明（Attribution）

- 本项目在功能语义与行为口径上参考了 [QuantumNous/new-api](https://github.com/QuantumNous/new-api)（AGPL-3.0），部分统计口径与错误语义对其进行了对齐，特此致谢
- new-api 基于 [songquanpeng/one-api](https://github.com/songquanpeng/one-api)（MIT）二次开发，一脉相承的网关设计思路同样感谢原作者
- 本项目为独立的 Next.js 实现，与 new-api / one-api 官方无隶属或背书关系；「new-api」「one-api」名称与标识归其各自项目所有，请勿在本项目的衍生分发中使用上述名称或标识

### 免责声明

本项目仅供学习与自托管使用。若你基于本项目面向公众提供网络服务，请自行遵守所在司法辖区的法律法规（含增值电信业务许可 / ICP 备案等合规义务），由此产生的一切责任由服务提供者自行承担。

## 致谢

- [QuantumNous/new-api](https://github.com/QuantumNous/new-api) — 功能语义参考
- [songquanpeng/one-api](https://github.com/songquanpeng/one-api) — 网关设计思路源头
- [Vercel](https://vercel.com) / Next.js、[Prisma](https://www.prisma.io)、[shadcn/ui](https://ui.shadcn.com)、[Arco Design](https://arco.design) 等开源社区

## 赞助支持

如果这个项目对你有帮助，欢迎请作者喝杯咖啡 ☕ 你的赞助是持续维护和更新的动力。

| 支付宝 | 微信赞赏 |
|:---:|:---:|
| <img src="docs/images/sponsor-alipay.jpg" width="240" alt="支付宝收款码"/> | <img src="docs/images/sponsor-wechat.png" width="240" alt="微信赞赏码"/> |

> 扫码时请备注 GitHub ID 或留下昵称，感谢每一位支持者 ❤️
