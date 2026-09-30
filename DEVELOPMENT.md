# Development

```powershell
npm ci
npm run check
npm test
```

Local Worker development defaults to fixture mode through `wrangler.jsonc`.

The production ChatGPT configuration is generated locally as `wrangler.chatgpt.local.jsonc` from the Git-ignored `config/instance.local.json`; both files are intentionally excluded from Git.

Build the plugin upload archive with:

```powershell
npm run plugin:validate
npm run plugin:package
```
