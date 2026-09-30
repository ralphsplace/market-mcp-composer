# Yahoo Finance provider

The Yahoo provider is intentionally marked **experimental**.

## Tool

```text
yahoo_lookup_ticker({ ticker })
```

It returns a normalized quote snapshot plus the latest available daily OHLCV bar.

## Endpoint

The adapter currently reads:

```text
https://query1.finance.yahoo.com/v8/finance/chart/{ticker}
```

with a small fixed request:

```text
range=5d
interval=1d
includePrePost=false
events=div,splits
```

No browser impersonation, proxying, cookie/crumb acquisition, or rate-limit circumvention is used.

## Important status

This chart endpoint is widely used by third-party libraries, but it is not a documented Yahoo developer API. It can change, throttle, or become unavailable without notice. Review Yahoo's current terms and your intended use before enabling it in a production deployment.

For that reason, the provider is **not enabled automatically**. Add `yahoo` to `ENABLED_PROVIDERS` only when you intentionally want to use it.

Example:

```text
ENABLED_PROVIDERS=finviz,yahoo
```

## Returned fields

The provider returns, when available:

- currency
- symbol
- exchange name
- instrument type
- regular market price
- previous close
- regular market time
- exchange timezone
- latest OHLCV bar

Missing upstream fields are returned as `null` instead of being invented.

## Error behavior

Provider errors are surfaced as stable codes through the MCP tool result, including:

```text
UPSTREAM_NETWORK
UPSTREAM_REDIRECT
UPSTREAM_RATE_LIMIT
UPSTREAM_HTTP_<status>
UPSTREAM_TOO_LARGE
UPSTREAM_READ
UPSTREAM_INVALID_JSON
UPSTREAM_SYMBOL_ERROR
UPSTREAM_SCHEMA
```

## Validation

Run:

```powershell
npm run check
npm test
npm run plugin:validate:portable
```

The Yahoo contract test uses mocked upstream responses and does not depend on Yahoo being reachable during CI.
