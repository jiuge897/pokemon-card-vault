# Pokémon Card Vault

[English](#english) | [简体中文](#简体中文)

Current release: **v1.02** · [Release notes](CHANGELOG.md)

Live Site: [Pokémon Card Vault](https://pokemon-card-vault-daily.ianghost897.chatgpt.site)

## English

A multilingual Pokémon TCG inventory and valuation dashboard built for ChatGPT Sites. Each visitor signs in with their own ChatGPT account and can only access their own inventory.

### Features

- Account-scoped inventory isolation
- TCGplayer market-price lookup in USD
- Single-card, sealed-product, and Pokémon Center merchandise tracking
- Quantity controls, search, manual price refresh, and CSV export
- Adjustable valuation model: cards 50%, sealed products 80%, merchandise 100%
- Purchase cost, optional sales-tax rate, profit, and ROI calculations
- Sell workflow with sale price, sale date, optional notes, realized profit, and locked realized ROI
- Holdings, sold-items, and all-items inventory filters
- Holding return, year-to-date return, and since-inception portfolio return
- ROI history that preserves realized performance after an item is sold
- Post-sale market tracking for missed gains and avoided losses without altering realized ROI
- Opt-in community leaderboards for portfolio value, return, missed gains, and best exits
- Privacy controls for leaderboard participation, nickname, and exact portfolio value
- “I pulled it myself” cost basis using the matching set's daily booster-pack price
- Automatic set detection from a TCGplayer Product ID, with manual set selection as fallback
- Pokémon Center official retail-price lookup for merchandise
- English, Japanese, French, Spanish, Arabic, Simplified Chinese, and Traditional Chinese
- Automatic locale detection and full RTL layout for Arabic
- Responsive desktop and mobile interface
- Localized typography across Latin, Chinese, Japanese, and Arabic interfaces

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
3. Apply the migrations in `drizzle/` in numeric order.
4. Publish the Site and choose the access policy appropriate for your audience.

Every inventory query is scoped by the authenticated ChatGPT user ID. A new user starts with an empty vault.

### Data and pricing

The app stores inventory and ROI history in your deployed D1 database. No user data is included in this repository. Card and sealed-product prices use public TCGplayer marketplace data; merchandise uses Pokémon Center retail data when available. External data availability and behavior may change. This project is not affiliated with or endorsed by Pokémon, Nintendo, Creatures, Game Freak, TCGplayer, or Pokémon Center.

### License

[MIT](LICENSE)

## 简体中文

这是一个为 ChatGPT Sites 构建的多语言 Pokémon TCG 库存与估值面板。每位访客使用自己的 ChatGPT 账户登录，并且只能查看和管理自己的库存。

### 主要功能

- 按 ChatGPT 账户隔离库存数据
- 查询以美元计价的 TCGplayer 市场价格
- 支持单卡、密封产品和 Pokémon Center 周边
- 支持数量调整、库存搜索、手动更新价格和 CSV 导出
- 按单卡 50%、密封产品 80%、周边 100% 计算折算价值
- 支持购买成本、可选消费税率、收益和收益率计算
- 支持填写售出价格、售出日期和备注，并固定记录已实现利润与已实现收益率
- 库存可按“持仓 / 已售出 / 全部”筛选
- 支持持仓收益率、年初至今收益率和建仓以来收益率
- 收益率历史在商品售出后继续保留真实的已实现表现
- 售出后继续追踪市场价，统计错失收益与避免损失，但不改变实际收益率
- 提供资产、收益率、最大错失收益和最佳止盈排行榜
- 排行榜默认不公开，可自行设置昵称、参与状态和是否隐藏具体资产金额
- “我抽出来的”单卡可按所属系列的当日补充包价格计算成本
- 可通过 TCGplayer Product ID 自动识别系列，识别失败时允许手动选择
- 周边可查询 Pokémon Center 官网售价
- 支持英语、日语、法语、西班牙语、阿拉伯语、简体中文和繁体中文
- 自动识别浏览器语言，并为阿拉伯语提供完整的 RTL 从右向左布局
- 适配桌面和移动设备
- 针对拉丁文字、中文、日文和阿拉伯文优化界面字体

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
3. 按编号顺序应用 `drizzle/` 中的数据库迁移。
4. 发布网站，并根据使用对象选择合适的访问权限。

所有库存查询都会使用当前登录的 ChatGPT 用户 ID 进行隔离。新用户首次登录时会看到一个空库存。

### 数据与价格

应用会把库存与收益率历史保存在你部署的 D1 数据库中，本仓库不包含任何用户数据。单卡与密封产品使用公开的 TCGplayer 市场资料；周边在可用时使用 Pokémon Center 官网售价。外部资料来源的可用性和行为可能发生变化。

本项目与 Pokémon、Nintendo、Creatures、Game Freak、TCGplayer 或 Pokémon Center 不存在隶属、授权或背书关系。

### 开源许可证

[MIT](LICENSE)
