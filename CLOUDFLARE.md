# Cloudflare setup

This is the minimum Cloudflare setup required for the hosted MCP service. The runtime uses Cloudflare Workers plus Cloudflare Access / Zero Trust Managed OAuth.

## 1. Create an account and enable Zero Trust

1. Create or sign in to a Cloudflare account.
2. Open **Zero Trust** and complete the initial team/domain setup if the account has never used Zero Trust.
3. Keep the generated team domain, for example `https://<team>.cloudflareaccess.com`.

No paid Cloudflare plan is assumed by this repository; confirm current Cloudflare product limits for your account before deployment.

## 2. Authenticate Wrangler

```powershell
npx wrangler login
npx wrangler whoami
```

Wrangler should be the preferred source for discovering the Cloudflare account ID. Do not use an email address as an account ID.

## 3. Create the local instance configuration

Run:

```powershell
npm run instance:init
```

This creates the Git-ignored file:

```text
config/instance.local.json
```

All account/deployment-specific **non-secret** values are consolidated there:

- `cloudflare.accountId` — optional cache/reference; scripts should prefer Wrangler discovery.
- `cloudflare.workerName`
- `cloudflare.workersDevSubdomain`
- `cloudflare.teamDomain`
- `cloudflare.accessApplicationId` — optional until the Access app exists.
- `cloudflare.accessAud`
- `cloudflare.allowedEmail`
- `mcp.serverUrl` — optional explicit URL; otherwise tooling derives the standard workers.dev URL from worker name + subdomain.

**Do not put secrets in this file.** In particular, do not store Cloudflare API tokens, FinViz API tokens, passwords, client secrets, or session tokens there.

Generate the ignored Wrangler deployment config after filling the Access values:

```powershell
npm run instance:render
```

This writes `wrangler.chatgpt.local.jsonc`.

## 4. Create the administrative API token

For setup, validation and repair of Access applications, create a dedicated Cloudflare API token scoped to the target account with:

```text
Account -> Access: Apps and Policies -> Edit
```

Store it in the Windows User environment, not the instance file or repository:

```powershell
$secure = Read-Host 'Cloudflare Access API token' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    [Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCESS_API_TOKEN', $token, 'User')
}
finally {
    if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    $token = $null
}
```

Never commit that token.

## 5. Create/protect the Worker application

Deploy the Worker, then create a Cloudflare Access application protecting the Worker MCP endpoint. Use an Access policy that permits the intended identities. A simple personal deployment can use One-time PIN email authentication and an allow policy for the owner's email.

Record the resulting non-secret instance values in `config/instance.local.json`, then rerun `npm run instance:render`.

Set `AUTH_MODE` to `access`; the generated Wrangler file does this automatically.

## 6. Managed OAuth / DCR

Enable Managed OAuth for the Access application and enable Dynamic Client Registration (DCR). Keep localhost/loopback redirect exceptions disabled unless you have a specific development requirement.

The client must be able to discover protected-resource metadata, authorization-server metadata, authorization endpoint, token endpoint, and DCR registration endpoint. Do not guess OAuth endpoint paths; validate metadata published by Cloudflare.

## 7. Validate

A healthy protected MCP endpoint should return HTTP `401` to an anonymous request and advertise an OAuth challenge. The authorization-server metadata should advertise authorization, token and registration endpoints. After ChatGPT authentication succeeds, test the MCP tool with a ticker such as `MSFT`.

## 8. Repair policy

Treat **validate** and **repair** as separate operations. Validation must be read-only. Repair should first display current configuration and proposed changes. Never clear an existing redirect allowlist merely because setup is rerun. Preserve unrelated Access policies/application fields and back up application JSON before mutation.
