# Build and upload the plugin archive

The source repository intentionally does **not** commit `mcp.json`, because its remote MCP URL belongs to a specific deployment. The package builder renders `mcp.json` from the Git-ignored `config/instance.local.json`.

## Configure the target instance

```powershell
npm run instance:init
# edit config/instance.local.json
npm run instance:show
```

## Build

```powershell
npm ci
npm run plugin:validate
npm run plugin:package
```

The archive is written to `dist/market-mcp-composer-0.2.0.zip` and contains:

```text
plugin.json
mcp.json                 # generated for this deployment
PLUGIN_UPLOAD.md
skills/
  ticker-summary/
    SKILL.md
    references/output-format.md
  market-snapshot/
    SKILL.md
```

The package deliberately excludes Worker source, Cloudflare administrative API tokens, FinViz credentials, account configuration, and local state. The generated `mcp.json` necessarily contains the public remote MCP URL used by ChatGPT.

## ChatGPT upload

Where your ChatGPT/workspace UI provides plugin ZIP upload, upload the generated ZIP. Authentication still happens against the MCP server/Cloudflare Access after installation; packaging does not embed credentials or bypass OAuth.
