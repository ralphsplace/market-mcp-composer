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


## Runtime snapshot tool

This repository now exposes a read-only composition tool:

```text
get_market_snapshot({ symbols })
```

The tool executes only providers whose manifest server has:

```json
"connection": "composer"
```

Client-direct providers such as IBKR are **not** proxied through the Worker. Instead, the result includes an `externalRequirements` section describing the client-direct provider and the capabilities that the MCP client should obtain through its separately authenticated connection.

Example orchestration:

```text
ChatGPT
  |-- call get_market_snapshot(["MSFT", "SPY"]) --> Market MCP
  |-- inspect externalRequirements
  |-- obtain portfolio/options/risk context --------> IBKR MCP
  |-- correlate by symbol and source timestamps
```

This preserves the authentication boundary while still giving the client a machine-readable composition plan.

The current snapshot tool limits requests to 20 unique ticker symbols and preserves each provider response separately under `sources`. Provider failures are represented per source and do not discard successful results from other providers.


## Authenticated runtime smoke test

Use a temporary or non-production deployment with bearer authentication for the first runtime verification. Do not reuse the production Access deployment for this test unless you intentionally choose to do so.

For Windows PowerShell 5.1, use the repository helper instead of hand-building the Wrangler config or token:

```powershell
npm run smoke:composition:deploy
```

The helper performs the deployment **and immediately runs the composition smoke test in the same PowerShell process**. This is required because environment variables set inside an npm-launched PowerShell child process do not persist back into the parent interactive shell.

The deploy helper:
- writes the temporary Wrangler config in the repository root so the entry point resolves correctly;
- uses an absolute path for `src/index.ts`;
- generates a 48-byte bearer token with the PowerShell 5.1-compatible `RandomNumberGenerator.Create().GetBytes(...)` API;
- deploys in fixture mode with `finviz,yahoo`;
- installs the bearer token as a Worker secret without printing it;
- derives the Workers.dev URL from `config/instance.local.json`;
- sets `MCP_URL`, `MCP_ACCESS_TOKEN`, and `SMOKE_SYMBOLS` inside the helper process and runs the smoke test before that process exits.

After the smoke test, clean up:

```powershell
npm run smoke:composition:cleanup
```

Manual setup is still possible, but keep the Wrangler config in the repository root or use an absolute `main` path because Wrangler resolves a relative entry point from the config file location.

The smoke test verifies:

- MCP initialize succeeds;
- `tools/list` advertises `get_market_snapshot`;
- the snapshot returns exactly the requested symbols;
- each symbol has a `sources` array;
- IBKR does not appear as a composer-side source;
- IBKR appears under `externalRequirements`;
- expected IBKR portfolio/options/risk capabilities are declared.

Provider failures are reported as degraded results rather than causing the smoke test to fail, because one purpose of the composition tool is to preserve successful sources when another market provider is unavailable.

The bearer token is read only from the environment and is never accepted as a command-line argument.


## Normalized snapshot output

Each symbol now contains a provider-independent `normalized` object in addition to the preserved raw `sources`.

The normalized shape is intentionally conservative:

```json
{
  "symbol": "MSFT",
  "market": {
    "price": 0,
    "previous_close": 0,
    "volume": 0,
    "currency": "USD",
    "exchange": "NasdaqGS",
    "instrument_type": "EQUITY",
    "as_of": 0,
    "source": "yahoo"
  },
  "fundamentals": {
    "company": "Microsoft Corp.",
    "sector": "Technology",
    "industry": "Software",
    "market_cap": null,
    "pe": null,
    "forward_pe": null,
    "peg": null,
    "price_to_sales": null,
    "price_to_book": null,
    "beta": null
  },
  "technical": {
    "change_pct": null,
    "relative_volume": null,
    "rsi_14": null,
    "atr": null,
    "sma20_pct": null,
    "sma50_pct": null,
    "sma200_pct": null,
    "latest_bar": null
  },
  "portfolio": null,
  "options": null,
  "quality": {
    "conflicts": [],
    "stale": [],
    "missing": [],
    "source_errors": []
  }
}
```

The composer does not invent values. Missing upstream fields remain `null` and are listed in `quality.missing`.

Current mapping rules:

- Yahoo supplies the preferred composer-side quote, previous close, currency, exchange, instrument type, timestamp, and latest daily OHLCV when available.
- FinViz supplies screening/fundamental/technical fields and is a fallback for price/volume when Yahoo does not provide them.
- Raw provider payloads remain under `sources` for auditability.
- `portfolio` and `options` remain `null` because IBKR is client-direct and is not proxied by the Worker.
- `quality.source_errors` records failed composer-side providers without suppressing successful data from other sources.
- `quality.conflicts` and `quality.stale` are reserved for explicit correlation rules; this version does not invent thresholds for those classifications.
