# Portable plugin package

This repository can build a portable Agent Plugins ZIP containing both skills and a remote MCP declaration.

**Do not use this ZIP as the first ChatGPT web acceptance test.** On the web, first register the production MCP URL directly in Developer mode and prove that the resulting installed plugin exposes both tools in **Work**. See `CHATGPT.md`.

A manually imported package can load its skills while the web session still has no callable MCP tools. Treat that as a packaging/surface issue, not as proof that the Worker has no tools.

## Build

```powershell
npm ci
npm run plugin:validate
npm run plugin:package:portable
```

Expected archive:

```text
dist/market-mcp-composer-0.3.0.zip
```

Expected contents:

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

The generated `mcp.json` points at the configured HTTPS `/mcp` endpoint.

## Where this artifact belongs

Use the portable ZIP for:

- Codex/Desktop-compatible plugin workflows,
- portable Agent Plugins distribution,
- a formal/public MCP-backed submission flow that explicitly supports remote MCP servers.

For day-to-day ChatGPT web development, use the direct Developer-mode MCP connection described in `CHATGPT.md`.

## Web acceptance gate

Do not claim ChatGPT web integration is complete until a directly registered and installed MCP plugin in **Work** exposes:

```text
finviz_lookup_ticker
get_market_snapshot
```

and `get_market_snapshot` successfully returns a normalized snapshot.
