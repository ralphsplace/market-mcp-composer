# Market MCP Composer

A read-only market-data MCP service for ChatGPT/Codex, deployed on Cloudflare Workers and protected by Cloudflare Access. The first production provider is FinViz Elite Screener data.

## Start here

- New deployment: [`QUICKSTART.md`](QUICKSTART.md)
- No Cloudflare/Zero Trust setup yet: [`CLOUDFLARE.md`](CLOUDFLARE.md)
- Connect or package for ChatGPT: [`CHATGPT.md`](CHATGPT.md) and [`PLUGIN_UPLOAD.md`](PLUGIN_UPLOAD.md)
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

## Current production tool

`finviz_lookup_ticker({ ticker })` — read-only lookup of a ticker in the configured FinViz Elite Screener CSV export.

## Instance configuration

This repository contains no committed Cloudflare account or deployment instance values. Run `npm run instance:init` to create the Git-ignored `config/instance.local.json`; that file is the single source for non-secret per-account/per-deployment values. Secrets remain outside it. See [`CLOUDFLARE.md`](CLOUDFLARE.md).
