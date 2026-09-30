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


## Dependency security

The current dependency tree requires Node.js 22 or later. Use the same major Node version locally and in CI.

Before changing dependencies, classify findings by production versus development scope:

```text
npm run security:audit:prod
npm run security:audit:all
```

`security:audit:prod` checks the runtime dependency surface while omitting development dependencies. `security:audit:all` checks the full local toolchain.

Do not run `npm audit fix` or `npm audit fix --force` automatically. Review each advisory, identify the parent dependency that introduces it, prefer upgrading the parent dependency, and rerun `npm ci`, `npm run check`, `npm test`, and `npm run plugin:validate:portable` before merging.

Dependabot is configured for weekly npm and GitHub Actions update PRs. These PRs are subject to the same protected-`main` review and CI workflow as other changes.

### npm 12 install-script warnings

npm 12 may block dependency install scripts unless they are explicitly allowed. Do not add `allowScripts` entries merely to remove warnings. Approve an install script only when the package requires it for a project function and the package/version has been reviewed.
