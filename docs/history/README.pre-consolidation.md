# Market MCP Composer

For the exact Finviz setup and deployment sequence, read [docs/FINVIZ_SETUP.md](docs/FINVIZ_SETUP.md). The Finviz adapter follows the account's Screener API instructions: take a configured screener URL, replace `/screener` with `/export/screener`, and append `auth` from a separate Worker secret. It expects CSV with a `Ticker` or `Symbol` column. A successful build does not prove your account's live API response.

For a ChatGPT OAuth connection, read [docs/CHATGPT_ACCESS.md](docs/CHATGPT_ACCESS.md). It deploys a separate Access-protected Worker and does not change the existing bearer-test endpoint.

A single Cloudflare Worker deployment exposes the selected provider tools at `/mcp`. Both providers return labeled fixtures by default. Finviz live mode uses the Finviz Elite Screener API CSV export at `https://elite.finviz.com/export/screener` with your account's API token. Stocktwits live mode still requires an operator-supplied JSON feed.

## Windows PowerShell

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
# Paste the generated token into .dev.vars as MCP_ACCESS_TOKEN.
npm run validate
npm run check
npm run dev
```

In another terminal, set `$env:MCP_ACCESS_TOKEN` to the same value:

```powershell
$env:MCP_URL = 'http://127.0.0.1:8787/mcp'
$env:ENABLED_PROVIDERS = 'finviz,stocktwits'
npm run smoke
```

## Select a combination

```powershell
npm run configure -- ENABLED_PROVIDERS finviz
npm run configure -- ENABLED_PROVIDERS stocktwits
npm run configure -- ENABLED_PROVIDERS finviz,stocktwits
npm run configure -- DATA_MODE fixture
npm run validate
```

Restart `npm run dev`, set `$env:ENABLED_PROVIDERS` to match, then run smoke. Tool names are `finviz_lookup_ticker` and `stocktwits_lookup_ticker`. Disabled provider tools cannot be called.

## Deploy and update

```powershell
npx wrangler login
npm run secret:access
# Paste a separate random 32+ character MCP connection token.
# For Finviz, enter a Screener export URL without the auth parameter, then the API token separately:
npm run secret:set
npm run secret:finviz-token
npm run secret:stocktwits
npm run configure -- DATA_MODE export
npm run validate
npm run check
npm run deploy
```

Rerun `configure`, `validate`, `check`, and `deploy` for selection changes. Rerun a `secret:*` script to rotate its secret. Set `FINVIZ_EXPORT_URL` to the URL copied from your configured Elite screener after changing `/screener` to `/export/screener`; omit `auth`. The Worker adds `auth` from `FINVIZ_API_TOKEN` at request time. Never commit `.dev.vars` or tokens. Source responses are limited to 2 MB and 10 seconds. The current lookup searches rows returned by the configured screener, so a ticker outside its filters produces an empty result. No live cache is assumed.

## Add a provider

Implement `Provider` in `src/providers/<name>.ts`; register it in `src/providers/index.ts`; add its ID to the configure and validate scripts; document its permitted source format and secret; then test fixture and live behavior. Keep tools read-only and credentials in Worker secrets. The `compose-market-mcp` skill guides repeat changes.

## ChatGPT connection

Read [docs/CHATGPT.md](docs/CHATGPT.md). The bearer gate supports direct MCP tests, but is not a complete OAuth 2.1 implementation. Finish OAuth before connecting it as an authenticated ChatGPT plugin.
