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


## Continuous integration

Pull requests targeting `main` and pushes to `main` run the GitHub Actions workflow in `.github/workflows/ci.yml`.

The CI job uses Node.js 22 and runs:

```text
npm ci
npm run check
npm test
npm run plugin:validate:portable
```

`plugin:validate:portable` intentionally validates repository/plugin structure without requiring the Git-ignored `config/instance.local.json`. Full deployment-specific validation remains:

```powershell
npm run plugin:validate
npm run validate:all
```

Do not add Cloudflare credentials or FinViz secrets to GitHub Actions for this basic PR gate.
