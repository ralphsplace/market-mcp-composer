# ChatGPT web connection

## Goal

The first acceptance target is simple and binary:

> In a **ChatGPT Work** conversation, the directly registered production MCP connection must expose both `finviz_lookup_ticker` and `get_market_snapshot`.

Do not start web validation by uploading the portable plugin ZIP. A ZIP can load skills while leaving the web session with no callable MCP tools. Validate the MCP connection itself first.

## 1. Run the repository preflight

From the repository root:

```powershell
npm run validate:chatgpt-web
```

This is read-only. It verifies:

- the source-level MCP tool registry contract,
- Cloudflare Access/OAuth discovery,
- the protected production `/mcp` endpoint,
- the exact production URL to register.

Expected tool contract:

```text
finviz_lookup_ticker
get_market_snapshot
```

## 2. Register the production MCP directly in ChatGPT

1. Open ChatGPT on the web.
2. Open **Settings → Security and login** and enable **Developer mode**.
3. Go to **ChatGPT Plugins**.
4. Select **+** to create a plugin from an MCP server.
5. Enter the production MCP URL printed by `npm run validate:chatgpt-web`.
6. Use OAuth and complete the Cloudflare Access authorization.
7. Create the connection/plugin.

Current production endpoint:

```text
https://market-mcp-composer-chatgpt.ralphsplace.workers.dev/mcp
```

## 3. Install it

Open the newly created plugin detail page and select **Install plugin**.

Do not continue while the page still shows **Install plugin**. A plugin that has not been installed will not contribute tools to the conversation.

## 4. Test in Work, not a normal Chat session

1. Return to the ChatGPT homepage.
2. Switch the top-level mode from **Chat** to **Work**.
3. Start a new Work conversation.
4. Type `@` and select the directly registered Market MCP plugin.
5. Ask:

```text
Use only this Market MCP connection.
List every callable MCP tool exposed by it.
Do not use web search or another connector.
```

Required result:

```text
finviz_lookup_ticker
get_market_snapshot
```

Then test the composition tool:

```text
Use only this Market MCP connection.
Call get_market_snapshot for MSFT and SPY.
Report normalized.market, normalized.fundamentals, normalized.technical,
normalized.quality, provider names under sources, and externalRequirements.
Do not use web search or another connector.
```

## 5. If the tool list is empty

Check these in order:

1. The plugin detail page must no longer show **Install plugin**.
2. The conversation must be in **Work**.
3. The selected plugin must be the one created directly from the production `/mcp` URL, not a ZIP-imported skills package.
4. Refresh/recreate the direct MCP connection after server tool changes.
5. Re-run `npm run validate:chatgpt-web` before changing Cloudflare or redeploying.

A plugin page that shows skills but no connected app/tool section is not proof that the MCP connection was registered for ChatGPT web.

## Portable ZIPs

The repository can still build a portable Agent Plugins archive with `mcp.json`. That artifact is useful for Codex/Desktop-compatible workflows and public MCP-backed submission. It is **not** the first acceptance path for ChatGPT web development.

See `PLUGIN_UPLOAD.md` for the portable package boundary.
