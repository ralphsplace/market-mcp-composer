# Security

## Configuration classes

The repository separates configuration into three classes:

1. **Portable source configuration** — committed to Git (`plugin.json`, generic `wrangler.jsonc`, code).
2. **Per-account/per-deployment non-secret configuration** — stored only in Git-ignored `config/instance.local.json` and generated `wrangler.chatgpt.local.jsonc`.
3. **Secrets** — never stored in either of those files. Cloudflare administrative tokens belong in the OS credential/environment mechanism; Worker runtime secrets such as the FinViz API token belong in Cloudflare Worker secrets.

`config/instance.local.json` may contain identifiers such as account ID, Access application ID/AUD, team domain, allowed identity, workers.dev subdomain, and public MCP URL. These are treated as deployment-local even when they are not cryptographic secrets.

Never commit API tokens, client secrets, passwords, session cookies, FinViz credentials, `.dev.vars`, or generated local deployment configuration.

The production Worker uses Cloudflare Access JWT verification and read-only MCP tools. Provider requests must not accept credentials from MCP tool arguments.
