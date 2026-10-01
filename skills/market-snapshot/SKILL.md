---
name: market-snapshot
description: Retrieve and summarize normalized market snapshots from the Market MCP Composer when the user asks for one or more symbols, source-quality metadata, or broker-data requirements.
---

# Market snapshot

Use this skill for requests that ask for a normalized market snapshot, correlated market research, source-quality metadata, or the external broker requirements for one or more symbols.

1. Normalize each ticker symbol to uppercase.
2. Call the MCP tool `get_market_snapshot` with the requested symbols.
3. Treat the returned MCP payload as the source of truth. Do not fill missing values from general knowledge, web search, or another connector unless the user explicitly asks for additional sources.
4. For each symbol, preserve and report the distinction between:
   - `normalized.market`
   - `normalized.fundamentals`
   - `normalized.technical`
   - `normalized.quality`
   - raw provider names under `sources`
5. Report `externalRequirements` separately from composer-side `sources`.
6. Do not claim IBKR data was collected by the Market MCP when IBKR appears only under `externalRequirements`.
7. If `normalized.quality.conflicts` contains entries, preserve the selected value, selected source, tolerance, and all source observations. Do not average conflicting values.
8. Preserve `null` values as missing/unknown; do not convert them to zero.
9. If a provider failed, report the corresponding `source_errors` entry without discarding successful providers.
10. Do not place trades or imply that the snapshot is investment advice.
