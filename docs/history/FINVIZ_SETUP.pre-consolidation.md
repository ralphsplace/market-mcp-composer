# Finviz Elite Screener API setup

This integration covers the **Screener CSV export** documented in the Finviz Elite account UI. It does not implement Finviz's other API categories. The configured screener decides which rows are exported; `finviz_lookup_ticker` searches those rows. A valid export with no matching ticker returns `records: []`.

## 1. Rotate the exposed token

If your token appeared in a screenshot or chat, use **Regenerate Token** on Finviz's API and Exports page. The old token should no longer be used. Never put `auth` in a committed URL, command argument, log, or chat.

## 2. Prepare the export URL

In Finviz Elite, configure the actual Screener filters you want. Copy its URL, replace only the path `/screener` with `/export/screener`, and preserve the query parameters. For example:

```text
Screener: https://elite.finviz.com/screener?v=111&f=fa_div_pos,sec_technology
Export:   https://elite.finviz.com/export/screener?v=111&f=fa_div_pos,sec_technology
```

The example filters are illustrative and may exclude SPY. Do not append `auth`; the Worker adds the token at request time. `FINVIZ_EXPORT_URL` must be HTTPS on `elite.finviz.com` with the exact `/export/screener` path. The account page also notes that legacy `.ashx` URLs redirect; use the current path shown above.

## 3. Local development (Windows PowerShell)

From the project folder:

```powershell
npm install
npm run configure -- ENABLED_PROVIDERS finviz
npm run configure -- DATA_MODE export
notepad .dev.vars
```

Create `.dev.vars` if necessary. It needs three lines, with your real values in place of the placeholders:

```text
MCP_ACCESS_TOKEN=YOUR_OWN_RANDOM_TOKEN_AT_LEAST_32_CHARACTERS
FINVIZ_EXPORT_URL=https://elite.finviz.com/export/screener?v=111&f=YOUR_FILTERS
FINVIZ_API_TOKEN=YOUR_NEW_FINVIZ_TOKEN
```

Do not use the example filter literally. Do not put a Finviz token into `MCP_ACCESS_TOKEN`: these are separate credentials. `.dev.vars` is ignored by Git. Validate and start:

```powershell
npm run validate
npm run check
npm run test:finviz
npm run dev
```

In a second PowerShell window:

```powershell
cd D:\AI-Development\Projects\market-mcp-composer
$env:MCP_URL = 'http://127.0.0.1:8787/mcp'
$env:ENABLED_PROVIDERS = 'finviz'
$tokenLine = Get-Content .dev.vars | Where-Object { $_ -match '^MCP_ACCESS_TOKEN=' } | Select-Object -First 1
$env:MCP_ACCESS_TOKEN = $tokenLine.Substring('MCP_ACCESS_TOKEN='.Length)
npm run smoke
```

The smoke script checks `isError`, lists the enabled tool, and reports the mode and number of matching rows. It calls SPY by default; zero rows can be correct if your screener excludes SPY. If a provider call fails, the error code is shown without the URL or token.

## 4. Production deployment

Set the same provider selection and data mode locally before deploying. The Worker configuration travels with code; `.dev.vars` does not.

```powershell
npm run configure -- ENABLED_PROVIDERS finviz
npm run configure -- DATA_MODE export
npm run validate
npm run check
npm run test:finviz
npx wrangler login
npx wrangler secret put MCP_ACCESS_TOKEN
npx wrangler secret put FINVIZ_EXPORT_URL
npx wrangler secret put FINVIZ_API_TOKEN
npm run deploy
```

Enter each value at Wrangler's masked prompt. For `FINVIZ_EXPORT_URL`, enter the export URL **without `auth`**. Use a distinct production MCP access token. `wrangler secret put` may publish a new Worker version immediately; only perform this sequence when ready to change the deployed Worker. If you already uploaded these secrets, repeat only those that need correction.

Test the deployed URL in a new PowerShell window:

```powershell
$env:MCP_URL = 'https://market-mcp-composer.<your-subdomain>.workers.dev/mcp'
$env:ENABLED_PROVIDERS = 'finviz'
$secure = Read-Host 'Production MCP_ACCESS_TOKEN' -AsSecureString
$env:MCP_ACCESS_TOKEN = [System.Net.NetworkCredential]::new('', $secure).Password
npm run smoke
```

Replace the hostname if Wrangler displays another deployment URL. The smoke script never prints the token or export URL. To enable Stocktwits as well, first configure and validate a real authorized `STOCKTWITS_FEED_URL`, then select `finviz,stocktwits` and deploy. That adapter has a separate JSON-feed contract; it is not a verified official Stocktwits API.

## 5. Error codes

| Code | Meaning |
| --- | --- |
| `CONFIG_EXPORT_URL_MISSING`, `CONFIG_EXPORT_URL_INVALID` | Missing or wrong URL/path, embedded `auth`, or credentials in URL. |
| `CONFIG_API_TOKEN_MISSING` | Finviz token secret is absent. |
| `UPSTREAM_HTTP_401`, `UPSTREAM_HTTP_403` | Finviz denied the request; verify token/account access. |
| `UPSTREAM_REDIRECT` | Finviz redirected the export request; use the current `/export/screener` path. |
| `UPSTREAM_RATE_LIMIT` | Finviz returned HTTP 429. |
| `UPSTREAM_NETWORK`, `UPSTREAM_READ` | Request or response failed in the Worker. |
| `UPSTREAM_HTML` | An HTML page arrived instead of CSV, possibly login or access control. |
| `CSV_TICKER_COLUMN_MISSING`, `CSV_MALFORMED` | The returned data did not match the CSV contract. |
| `UPSTREAM_TOO_LARGE` | Export exceeded the 2 MB response cap. Narrow the screener. |

These codes are intentionally narrow. They identify the failing stage without returning the secret, request URL, upstream body, or stack trace. Live API success must be demonstrated by a smoke run against your account and deployed Worker.
