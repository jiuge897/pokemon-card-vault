# Pokémon Card Vault

A multilingual Pokémon TCG inventory and valuation dashboard built for ChatGPT Sites. Each visitor signs in with their own ChatGPT account and can only access their own inventory.

## Features

- Account-scoped inventory isolation
- TCGplayer market-price lookup in USD
- Single-card and sealed-product tracking
- Quantity controls, search, manual price refresh, and CSV export
- 80% cash-value estimate
- English, Japanese, French, Spanish, Arabic, Simplified Chinese, and Traditional Chinese
- Automatic locale detection and full RTL layout for Arabic
- Responsive desktop and mobile interface
- System-font stack with no build-time font downloads

## Stack

- React 19 and Vinext
- Cloudflare Workers and D1
- Drizzle ORM
- Tailwind CSS and Base UI
- ChatGPT Sites authentication headers

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The inventory routes require the ChatGPT Sites authentication environment and a D1 database binding named `DB`. Local interface work can run without production data, but authenticated inventory operations are intended for deployment through ChatGPT Sites.

## Deploy to ChatGPT Sites

1. Create a new Site from this repository.
2. Keep the D1 binding in `.openai/hosting.json` set to `DB`.
3. Apply the included migration in `drizzle/0000_inventory.sql`.
4. Publish the Site and choose the access policy appropriate for your audience.

Every inventory query is scoped by the authenticated ChatGPT user ID. A new user starts with an empty vault.

## Data and pricing

The app stores inventory records in your deployed D1 database. No inventory data is included in this repository. Market-price requests use TCGplayer's public product price endpoint; availability and behavior may change. This project is not affiliated with or endorsed by Pokémon, Nintendo, Creatures, Game Freak, or TCGplayer.

## License

[MIT](LICENSE)
