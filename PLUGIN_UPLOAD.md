# Build and upload the ChatGPT plugin archive

The ChatGPT web plugin does **not** connect to the remote MCP server directly from a packaged `mcp.json`. The remote MCP server must first be registered as a ChatGPT app. The plugin then references that existing app through `.app.json`.

This distinction is important: a plugin can load its skills while exposing zero tools if no ChatGPT app is bound to it.

## 1. Register or refresh the ChatGPT MCP app

Use ChatGPT Developer Mode / Apps to create or refresh an app for:

```text
https://market-mcp-composer-chatgpt.ralphsplace.workers.dev/mcp
```

Complete Cloudflare Access OAuth and **Scan Tools**. Confirm that the app exposes:

```text
finviz_lookup_ticker
get_market_snapshot
```

If the app already exists, use its Refresh action to obtain the latest tool set and enable the new action when required.

Copy the app's technical ID from the ChatGPT app/admin URL. Supported IDs begin with `plugin_asdk_app_`, `asdk_app_`, `connector_`, or `templated_apps_`.

## 2. Store the non-secret app ID locally

Add this to the Git-ignored `config/instance.local.json`:

```json
"chatgpt": {
  "appId": "plugin_asdk_app_..."
}
```

The app ID is a reference, not a credential. Secrets remain outside the repository.

## 3. Validate and package

```powershell
npm ci
npm run plugin:validate
npm run plugin:package
```

The archive is written to:

```text
dist/market-mcp-composer-0.2.1.zip
```

and contains:

```text
plugin.json
.app.json                 # generated reference to the registered ChatGPT app
PLUGIN_UPLOAD.md
skills/
  ticker-summary/
    SKILL.md
    references/output-format.md
  market-snapshot/
    SKILL.md
```

The ChatGPT web package intentionally does **not** contain `mcp.json`. The registered ChatGPT app owns the MCP URL, authentication, tool scan, permissions, and action lifecycle.

## 4. Upload/install the plugin

Upload `dist/market-mcp-composer-0.2.1.zip` using the ChatGPT plugin upload flow available to your account/workspace.

After installation, the plugin should show both skills and its required Market MCP Composer app.

Test in a new chat:

```text
@Market MCP Composer Use only Market MCP Composer.
List every callable tool from the bound app.
Do not use web search or another connector.
```

Expected callable tools:

```text
finviz_lookup_ticker
get_market_snapshot
```

If the skills appear but the callable tool list is empty, verify the plugin's required app is connected and that `.app.json` references the correct ChatGPT app ID.
