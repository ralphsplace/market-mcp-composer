# Architecture

## Runtime boundary

```text
Client (ChatGPT/Codex)
  -> OAuth / Cloudflare Access
  -> Worker HTTP transport
  -> MCP JSON-RPC layer
  -> provider registry
  -> FinViz adapter
  -> FinViz Elite Screener CSV
```

`skills/` is deliberately outside the runtime data path. Skills instruct the model how to orchestrate MCP tools; they do not fetch market data or hold credentials.

## Consolidation rule

The first consolidated release preserves the known-good runtime implementation. Protocol/framework refactoring should happen only after the baseline is committed and covered by tests.
