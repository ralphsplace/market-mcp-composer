# Composition manifest

The composition manifest is the control-plane description for combining multiple MCP servers and data providers without hard-coding source precedence into application logic.

It is intended for research and monitoring workflows, not autonomous trading.

## Files

- `schemas/composition.schema.json` — JSON Schema for version 1.0.
- `config/composition.example.json` — portable example.
- `scripts/validate/validate-composition.mjs` — semantic validator that requires no additional npm package.

## Design goals

The manifest defines:

- which MCP servers participate;
- which provider owns each capability;
- source freshness expectations;
- normalized identity and field names;
- source precedence by fact type;
- time tolerances for correlating observations;
- conflict behavior;
- named workflows that describe what should be collected.

The manifest deliberately does **not** contain credentials, API keys, session cookies, bearer tokens, or OAuth client secrets.

## Market MCP + Interactive Brokers example

The example keeps the two security boundaries independent:

```text
ChatGPT / MCP client
   |
   +-- Cloudflare Access --> Market MCP Composer
   |
   +-- IBKR OAuth ---------> Interactive Brokers MCP
```

The Market MCP endpoint is resolved indirectly through `urlRef: "mcp.serverUrl"`, which points to the existing Git-ignored instance configuration instead of committing an account-specific Worker URL.

The IBKR endpoint is a public service address documented by Interactive Brokers:

```text
https://api.ibkr.com/v1/api/mcp-public
```

IBKR remains authoritative for account, positions, options, risk, and broker market data. The market composer remains responsible for external research sources such as FinViz.

## Why capabilities instead of tool names

The manifest names capabilities such as:

```text
market.quote
market.screening
portfolio.positions
portfolio.risk
market.options
```

rather than baking current MCP tool names into configuration. A later resolver can map these capabilities to the current `tools/list` response for each MCP server.

This keeps the manifest stable if a provider changes tool names or exposes several tools for the same capability.

## Source precedence

Example:

```json
{
  "positions": ["ibkr"],
  "options": ["ibkr"],
  "fundamentals": ["finviz"],
  "quote": ["ibkr"]
}
```

Precedence is fact-specific. It is not a ranking of providers overall.

When multiple sources disagree, the default example uses:

```text
preserve-all-and-flag
```

The composition layer should preserve source values, timestamps, and quality metadata rather than silently averaging conflicting market facts.

## Validation

Run:

```powershell
node scripts/validate/validate-composition.mjs
```

You can also validate another manifest:

```powershell
node scripts/validate/validate-composition.mjs path\to\composition.json
```

The validator checks referential integrity between providers and MCP servers, precedence references, HTTPS for explicit endpoints, transport, and rejects secret-bearing key names.

## Deployment model

Version 1.0 is configuration only. It does not proxy IBKR or create a new authentication hop.

The intended first deployment model is:

```text
ChatGPT
  |-- direct OAuth --> IBKR MCP
  |-- Cloudflare Access --> Market MCP
```

A future runtime PR can add a read-only `get_market_snapshot` composition tool that consumes this manifest and normalizes multi-source results. That runtime should preserve IBKR authentication as client-direct unless there is a deliberate, reviewed delegated-auth design.
