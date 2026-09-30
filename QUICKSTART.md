# Quickstart

This path assumes you already have a Cloudflare account. If not, start with [`CLOUDFLARE.md`](CLOUDFLARE.md).

1. Install Node.js 20+ and Git.
2. Clone this repository and run `npm ci`.
3. Run `npx wrangler login`.
4. Run `npm run instance:init`.
5. Edit the ignored `config/instance.local.json` for the target Cloudflare account/deployment. Do **not** put secrets in this file.
6. Run `npm run instance:render` to generate ignored `wrangler.chatgpt.local.jsonc`.
7. Store `FINVIZ_EXPORT_URL` and `FINVIZ_API_TOKEN` as Cloudflare Worker secrets; see `FINVIZ.md`.
8. Run `npm run check` and `npm test`.
9. Deploy with `npm run deploy:chatgpt`.
10. Run `npm run instance:show`, validate the deployed `/mcp` endpoint, and follow `CHATGPT.md`.

For plugin packaging, run `npm run plugin:validate` and `npm run plugin:package`. The package receives its MCP URL from `config/instance.local.json`.

Do not commit `config/instance.local.json`, `wrangler.chatgpt.local.jsonc`, `.dev.vars`, API tokens, or FinViz credentials.
