# Pokémon Card Vault

[English](#english) | [简体中文](#简体中文)

## English

A multilingual Pokémon TCG inventory and valuation dashboard built for ChatGPT Sites. Each visitor signs in with their own ChatGPT account and can only access their own inventory.

### Features

- Account-scoped inventory isolation
- TCGplayer market-price lookup in USD
- Single-card and sealed-product tracking
- Quantity controls, search, manual price refresh, and CSV export
- 80% cash-value estimate
- English, Japanese, French, Spanish, Arabic, Simplified Chinese, and Traditional Chinese
- Automatic locale detection and full RTL layout for Arabic
- Responsive desktop and mobile interface
- System-font stack with no build-time font downloads

### Stack

- React 19 and Vinext
- Cloudflare Workers and D1
- Drizzle ORM
- Tailwind CSS and Base UI
- ChatGPT Sites authentication headers

### Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The inventory routes require the ChatGPT Sites authentication environment and a D1 database binding named `DB`. Local interface work can run without production data, but authenticated inventory operations are intended for deployment through ChatGPT Sites.

### Deploy to ChatGPT Sites

1. Create a new Site from this repository.
2. Keep the D1 binding in `.openai/hosting.json` set to `DB`.
3. Apply the included migration in `drizzle/0000_inventory.sql`.
4. Publish the Site and choose the access policy appropriate for your audience.

Every inventory query is scoped by the authenticated ChatGPT user ID. A new user starts with an empty vault.

### Data and pricing

The app stores inventory records in your deployed D1 database. No inventory data is included in this repository. Market-price requests use TCGplayer's public product price endpoint; availability and behavior may change. This project is not affiliated with or endorsed by Pokémon, Nintendo, Creatures, Game Freak, or TCGplayer.

### License

[MIT](LICENSE)

## 简体中文

这是一个为 ChatGPT Sites 构建的多语言 Pokémon TCG 库存与估值面板。每位访客使用自己的 ChatGPT 账户登录，并且只能查看和管理自己的库存。

### 主要功能

- 按 ChatGPT 账户隔离库存数据
- 查询以美元计价的 TCGplayer 市场价格
- 支持单卡和密封产品
- 支持数量调整、库存搜索、手动更新价格和 CSV 导出
- 自动计算市场总值的 80% 现金价值
- 支持英语、日语、法语、西班牙语、阿拉伯语、简体中文和繁体中文
- 自动识别浏览器语言，并为阿拉伯语提供完整的 RTL 从右向左布局
- 适配桌面和移动设备
- 使用系统字体，无需在构建时下载字体

### 技术栈

- React 19 与 Vinext
- Cloudflare Workers 与 D1
- Drizzle ORM
- Tailwind CSS 与 Base UI
- ChatGPT Sites 身份验证请求头

### 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

库存接口需要 ChatGPT Sites 身份验证环境，以及名为 `DB` 的 D1 数据库绑定。本地环境可以用于界面开发，但需要身份验证的库存操作应通过 ChatGPT Sites 部署后使用。

### 部署到 ChatGPT Sites

1. 使用本仓库创建一个新的 Site。
2. 保持 `.openai/hosting.json` 中的 D1 绑定为 `DB`。
3. 应用 `drizzle/0000_inventory.sql` 中包含的数据库迁移。
4. 发布网站，并根据使用对象选择合适的访问权限。

所有库存查询都会使用当前登录的 ChatGPT 用户 ID 进行隔离。新用户首次登录时会看到一个空库存。

### 数据与价格

应用会把库存记录保存在你部署的 D1 数据库中，本仓库不包含任何用户库存数据。市场价格通过 TCGplayer 的公开商品价格端点获取，该端点的可用性和行为可能发生变化。

本项目与 Pokémon、Nintendo、Creatures、Game Freak 或 TCGplayer 不存在隶属、授权或背书关系。

### 开源许可证

[MIT](LICENSE)
