# FinViz provider

The production provider reads a FinViz Elite Screener CSV export.

Store these as Cloudflare Worker secrets/secure configuration and never commit their values:

- `FINVIZ_EXPORT_URL` — must be an HTTPS `elite.finviz.com/export/screener` URL without the `auth` query parameter.
- `FINVIZ_API_TOKEN` — the FinViz API token appended by the provider only at request time.

The provider rejects non-HTTPS URLs, other hostnames/paths, embedded credentials, embedded `auth`, redirects, oversized responses, HTML responses and malformed/missing ticker data.
