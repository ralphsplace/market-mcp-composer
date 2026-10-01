# Build and upload the ChatGPT plugin archive

For this deployment, the plugin should carry the remote MCP server directly in `mcp.json`.

Do **not** add a manual `chatgpt.appId` and do **not** package `.app.json` for the submission flow. The ChatGPT platform creates and manages the app/connection identity when the MCP-backed plugin is configured.

## 1. Validate the production MCP endpoint

The production endpoint is:

```text
https://market-mcp-composer-chatgpt.ralphsplace.workers.dev/mcp
```

It should already be protected by Cloudflare Access OAuth and expose:

```text
finviz_lookup_ticker
get_market_snapshot
```

## 2. Build the plugin

```powershell
npm ci
npm run plugin:validate
npm run plugin:package
```

Expected archive:

```text
dist/market-mcp-composer-0.2.2.zip
```

The archive contains:

```text
plugin.json
mcp.json
PLUGIN_UPLOAD.md
skills/
  ticker-summary/
    SKILL.md
    references/output-format.md
  market-snapshot/
    SKILL.md
```

The generated `mcp.json` points directly at the production HTTPS `/mcp` endpoint.

## 3. Upload using the MCP-backed plugin flow

In the ChatGPT plugin submission/upload UI, upload the ZIP as an MCP-backed plugin / **With MCP** submission.

Do not use a skills-only import path.

When prompted for the MCP server, use the existing packaged server configuration and complete the OAuth setup in the dashboard. The dashboard owns the registered app/connection identity for this submission.

After tool scanning, confirm both actions are present:

```text
finviz_lookup_ticker
get_market_snapshot
```

If only the skills appear and the tool list is empty, the plugin was imported through a skills-only path instead of the MCP-backed submission flow.

## 4. Validate in a new chat

```text
@Market MCP Composer
Use only Market MCP Composer.
List every callable MCP tool exposed by this plugin.
Do not use web search or another connector.
```

Expected:

```text
finviz_lookup_ticker
get_market_snapshot
```

Then:

```text
@Market MCP Composer
Use only Market MCP Composer.
Call get_market_snapshot for MSFT and SPY.
Report normalized.market, normalized.fundamentals, normalized.technical,
normalized.quality, provider names under sources, and externalRequirements.
Do not use web search or another connector.
```
