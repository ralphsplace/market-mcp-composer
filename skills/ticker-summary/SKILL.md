---
name: ticker-summary
description: Retrieve and summarize a ticker from the FinViz market-data MCP when the user asks for a FinViz lookup or a concise summary of one stock symbol.
---

# FinViz ticker summary

Use this skill for requests that ask to look up or summarize a ticker using FinViz.

1. Normalize the ticker symbol to uppercase.
2. Call the MCP tool `finviz_lookup_ticker` with that ticker.
3. Treat the returned MCP data as the source of truth for this workflow. Do not invent missing fields or substitute unrelated market data.
4. If `records` is empty, state that the configured FinViz export did not contain a matching record.
5. When a record is returned, summarize the fields that are present. Prefer, when available: company, sector, industry, market cap, P/E, price, change, and volume.
6. Preserve the distinction between an empty/missing field and a numeric zero.
7. Identify FinViz as the source and note that the configured export may be delayed or incomplete when that matters to the request.
8. Do not place trades or imply that a lookup is investment advice.

For raw-field formatting guidance, see `references/output-format.md`.
