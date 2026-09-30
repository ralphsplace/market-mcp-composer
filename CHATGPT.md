# ChatGPT connection

The repository does not commit an account-specific MCP URL. The active deployment URL comes from the ignored `config/instance.local.json`.

Show the current instance values with:

```powershell
npm run instance:show
```

Use the displayed **MCP URL** for direct MCP registration in ChatGPT developer mode:

1. Create a new MCP app/connection.
2. Enter the MCP URL ending in `/mcp`.
3. Select **OAuth** authentication.
4. Select **Dynamic Client Registration (DCR)** when offered.
5. Leave base scopes empty unless the authorization server advertises/your deployment requires specific scopes.
6. Complete Cloudflare Access login with an identity allowed by the Access policy.
7. Test: `Use the FinViz connector to look up MSFT.`

The Cloudflare login email is the identity authorized by the Access policy; it does not inherently need to be the Cloudflare account owner's email.

For a distributable skills + MCP package, use [`PLUGIN_UPLOAD.md`](PLUGIN_UPLOAD.md). The packaging step renders `mcp.json` from the ignored instance config, so the deployment URL is present in the upload archive but not committed to Git.
