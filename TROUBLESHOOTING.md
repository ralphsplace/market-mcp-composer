# Troubleshooting

## `401` from `/mcp`

For an anonymous request this is expected when Cloudflare Access is enabled. Confirm a `WWW-Authenticate` challenge is present and that OAuth metadata is discoverable.

## ChatGPT cannot create/register the MCP app

Check, in order:

1. `/mcp` is public HTTPS and returns an OAuth challenge when unauthenticated.
2. Protected Resource Metadata is reachable.
3. Authorization-server metadata is reachable.
4. The metadata advertises authorization, token and registration endpoints.
5. Cloudflare Managed OAuth and DCR are enabled.
6. The Access policy permits the login identity.

Do not guess OAuth endpoint paths or modify unrelated Access settings before capturing the actual failure.

## FinViz tool returns an upstream error code

Check Worker secrets and the configured FinViz Elite export. Do not append the FinViz token to the stored export URL; the provider appends it at request time.
