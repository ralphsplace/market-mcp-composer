# Quickstart

This path assumes you already have a Cloudflare account. If not, start with [`CLOUDFLARE.md`](CLOUDFLARE.md).

1. Install Node.js 22+ and Git.
2. Clone this repository `git clone https://github.com/ralphsplace/market-mcp-composer.git`.
3. Run `cd market-mcp-composer`.
4. Run `npm ci`.
5. Run `npx wrangler login`.
6. Run `npm run instance:init`.
7. Edit the ignored `config/instance.local.json` for the target Cloudflare account/deployment. Do **not** put secrets in this file.
8. Run `npm run instance:render` to generate ignored `wrangler.chatgpt.local.jsonc`.
9. Store `FINVIZ_EXPORT_URL` and `FINVIZ_API_TOKEN` as Cloudflare Worker secrets; see `FINVIZ.md`.
10. Run `npm run check` and `npm test`.
11. Deploy with `npm run deploy:chatgpt`.
12. Run `npm run instance:show`, validate the deployed `/mcp` endpoint, and follow `CHATGPT.md`.

For plugin packaging, run `npm run plugin:validate` and `npm run plugin:package`. The package receives its MCP URL from `config/instance.local.json`.

Do not commit `config/instance.local.json`, `wrangler.chatgpt.local.jsonc`, `.dev.vars`, API tokens, or FinViz credentials.
