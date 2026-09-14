# Changelog / 版本更新说明

## v1.03 — 2026-09-14

### 中文

#### 新功能

- 新增“卡册”视图：持仓中的单卡可以从库存行直接加入或移出卡册。
- 新增“展示架”视图：密封产品与 Pokémon Center 周边可以加入或移出展示架。
- 卡册与展示架使用响应式图片网格，并显示商品名称、数量与图片来源。
- 单卡和密封产品使用 TCGplayer 商品图片；周边商品优先读取 Pokémon Center 官方页面图片。
- 已售出商品不会继续占用卡册或展示架位置。
- 卡册与展示架的按钮、空状态、提示和错误信息已完成七语言本地化。

#### 数据与兼容性

- 库存新增 `display_location` 与 `image_url` 字段。
- 新增 `0007_collection_display.sql` 数据库迁移；旧库存默认保留在金库，不会自动公开展示。
- 展示位置更新仍按 ChatGPT 用户 ID 隔离，并在服务端限制商品类型与目标位置。

### English

#### Added

- A visual binder for held single cards, with add and remove actions directly from inventory rows.
- A display shelf for held sealed products and Pokémon Center merchandise.
- Responsive collection grids showing product artwork, quantity, and image source.
- TCGplayer product images for cards and sealed products, plus official Pokémon Center images for merchandise.
- Sold items are automatically excluded from active binder and display-shelf views.
- Complete localization of collection actions, empty states, hints, success messages, and errors across all seven supported languages.

#### Data and compatibility

- Added `display_location` and `image_url` inventory fields.
- Added the `0007_collection_display.sql` migration. Existing inventory remains in the vault until the user chooses to display it.
- Collection placement remains account-scoped and is validated by item type on the server.

## v1.02 — 2026-09-14

### 中文

- 新增售出流程、已实现收益与售后市场表现。
- 新增持仓、年初至今和建仓以来收益率。
- 新增最多资产、最大收益率、最强卖飞和最强止盈排行榜。
- 新增排行榜昵称、主动公开和隐藏具体资产金额设置。
- 补齐销售、收益与排行榜功能的七语言本地化。

### English

- Added the sell workflow, realized returns, and post-sale market performance.
- Added holding, year-to-date, and since-inception portfolio returns.
- Added leaderboards for portfolio value, ROI, missed gains, and best exits.
- Added leaderboard nickname, opt-in visibility, and exact-value privacy controls.
- Completed seven-language localization for sales, returns, and leaderboards.

## v1.01 — 2026-09-04

### 中文

这是 Pokémon Card Vault 首个完整功能版本，整合了此前网站上的全部主要更新。

#### 新功能

- 使用 ChatGPT 登录身份隔离库存；每位用户只能查看和管理自己的数据。
- 支持单卡、密封产品与 Pokémon Center 周边三类库存。
- 支持英语、日语、法语、西班牙语、阿拉伯语、简体中文和繁体中文；阿拉伯语支持从右向左布局。
- 单卡按市场价 50%、密封产品按 80%、周边按 100% 计算折算价值。
- 单卡与密封产品可以记录每件税前成本。
- 可勾选消费税并手动填写税率，系统自动计算税后成本。
- 自动计算市场收益、折算收益、市场收益率和折算收益率。
- 从商品加入日期开始记录收益率，并以图表显示历史变化。
- 新增“我抽出来的”成本来源：以所属系列当日 Booster Pack 市场价作为单卡成本。
- 通过 TCGplayer Product ID 自动识别所属系列；无法识别时可手动选择系列。
- 新增 Pokémon Center 周边查询，并以官网售价计入库存统计。
- 支持库存搜索、数量调整、价格更新和 CSV 导出。

#### 修复

- 修复 TCGplayer 旧产品详情接口失效导致单包成本无法自动填入的问题。
- 改用当前产品详情地址与 `setId` 系列字段，即使页面只提交 Product ID，也能识别对应系列。
- 保留手动输入成本和手动选择系列作为外部价格资料不可用时的备用方案。

#### 数据库

- 增加用户级库存隔离字段。
- 增加周边产品、成本、消费税、成本来源、创建日期与收益率历史所需字段和数据表。
- 全部数据库迁移位于 `drizzle/`，应按编号顺序执行。

### English

This is the first complete release of Pokémon Card Vault, consolidating all major Site updates.

#### Added

- ChatGPT account-scoped inventory isolation.
- Inventory types for cards, sealed products, and Pokémon Center merchandise.
- Seven localized interfaces, including full RTL support for Arabic.
- Adjusted valuations of 50% for cards, 80% for sealed products, and 100% for merchandise.
- Pre-tax unit cost, optional sales-tax rate, after-tax cost, profit, and ROI calculations.
- ROI history tracking and charting from each item's added date.
- An “I pulled it myself” cost source based on the matching set's daily booster-pack market price.
- Automatic set detection from a TCGplayer Product ID, with manual selection as fallback.
- Pokémon Center retail-price lookup for merchandise.
- Inventory search, quantity controls, price refresh, and CSV export.

#### Fixed

- Replaced the obsolete TCGplayer product-details request that prevented automatic pack-cost entry.
- Updated set detection to use the current product-details source and its `setId` field.
- Kept manual pack cost and set selection available when external pricing data cannot be retrieved.

#### Database

- Added account ownership, merchandise, cost, tax, cost-source, creation-date, and ROI-history data.
- Apply the migrations in `drizzle/` in numeric order.
