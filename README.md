# Market MCP Composer

A read-only market-data MCP service for ChatGPT/Codex, deployed on Cloudflare Workers and protected by Cloudflare Access. The first production provider is FinViz Elite Screener data.

## Start here

- New deployment: [`QUICKSTART.md`](QUICKSTART.md)
- No Cloudflare/Zero Trust setup yet: [`CLOUDFLARE.md`](CLOUDFLARE.md)
- ChatGPT web: validate and register the production MCP directly with [`CHATGPT.md`](CHATGPT.md). Portable ZIP packaging is documented separately in [`PLUGIN_UPLOAD.md`](PLUGIN_UPLOAD.md).
- FinViz setup: [`FINVIZ.md`](FINVIZ.md)

## Architecture

```text
ChatGPT / Codex
      |
      | OAuth + MCP
      v
Cloudflare Access
      |
      v
Cloudflare Worker (/mcp)
      |
      v
Provider adapter
      |
      v
FinViz Elite Screener export
```

The MCP server supplies authenticated live data. `skills/` supplies reusable workflows that explain how to use the MCP tools consistently.

## Current tools

`finviz_lookup_ticker({ ticker })` — production read-only lookup of a ticker in the configured FinViz Elite Screener CSV export.

`get_market_snapshot({ symbols })` — production read-only composition tool that returns normalized market/fundamental/technical data, source-quality metadata, raw provider observations, and client-direct external requirements.

`yahoo_lookup_ticker({ ticker })` — experimental read-only quote snapshot using Yahoo Finance's chart endpoint. This endpoint is not a documented Yahoo developer API and may change or throttle without notice; keep the provider disabled unless you intentionally choose to use it. See [`YAHOO_FINANCE.md`](YAHOO_FINANCE.md).

## Instance configuration

This repository contains no committed Cloudflare account or deployment instance values. Run `npm run instance:init` to create the Git-ignored `config/instance.local.json`; that file is the single source for non-secret per-account/per-deployment values. Secrets remain outside it. See [`CLOUDFLARE.md`](CLOUDFLARE.md).


## Production validation

After configuring `config/instance.local.json` and the Cloudflare administrative token, run:

```powershell
npm run validate:all
```

This validation path is read-only. It checks Cloudflare Access, Managed OAuth/DCR, OAuth discovery, and the protected MCP endpoint without deploying or repairing anything.
