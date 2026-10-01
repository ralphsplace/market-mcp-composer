---
name: market-snapshot
description: Retrieve and summarize normalized market snapshots from the Market MCP Composer when the user asks for one or more symbols, source-quality metadata, or broker-data requirements.
---

# Market snapshot

Use this skill for requests that ask for a normalized market snapshot, correlated market research, source-quality metadata, or external broker requirements.

1. Normalize requested ticker symbols to uppercase.
2. Call the MCP tool `get_market_snapshot` with the requested symbols.
3. Treat the returned MCP payload as the source of truth. Do not fill missing values from general knowledge, web search, or another connector unless the user explicitly asks for additional sources.
4. Preserve the distinction between `normalized.market`, `normalized.fundamentals`, `normalized.technical`, `normalized.quality`, and the raw provider entries under `sources`.
5. Report `externalRequirements` separately from composer-side `sources`.
6. Do not claim IBKR data was collected by the Market MCP when IBKR appears only under `externalRequirements`.
7. If `normalized.quality.conflicts` contains entries, preserve the selected value, selected source, tolerance, and all observations. Do not average conflicting values.
8. Preserve `null` as missing/unknown; do not convert it to zero.
9. Report provider failures from `source_errors` without discarding successful provider results.
10. Do not place trades.
