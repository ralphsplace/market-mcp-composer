# Connect Finviz MCP to ChatGPT through Cloudflare Access

This is a **second Worker** (`market-mcp-composer-chatgpt`). The original `market-mcp-composer` bearer-token endpoint remains available for direct testing. The new Worker starts closed: `AUTH_MODE=access` rejects requests until Cloudflare Access supplies a signed JWT with the correct issuer and audience. It is Finviz only.

Cloudflare Access Managed OAuth performs the OAuth code flow with ChatGPT. The Worker independently verifies `Cf-Access-Jwt-Assertion` using Cloudflare Access's JWKS, and checks the signature, RS256 algorithm, issuer, audience, and expiry. It never accepts an arbitrary header without cryptographic verification. `FINVIZ_API_TOKEN` stays in the new Worker's secret bindings and is not part of OAuth.

## A. Prepare and deploy the closed Worker

In PowerShell from this project folder:

```powershell
npm install
npm run test:finviz
npm run test:access
npm run check
npm run validate:chatgpt
npx wrangler login
npm run deploy:chatgpt
```

Note the exact `market-mcp-composer-chatgpt.<your-subdomain>.workers.dev` URL Wrangler prints. The Worker is intentionally unusable at this stage. Do not use the original Worker's URL in later steps.

Set the Finviz secrets **for the new Worker** (each command prompts without showing the value):

```powershell
npx wrangler secret put FINVIZ_EXPORT_URL --config wrangler.chatgpt.jsonc
npx wrangler secret put FINVIZ_API_TOKEN --config wrangler.chatgpt.jsonc
```

For `FINVIZ_EXPORT_URL`, use the verified `https://elite.finviz.com/export/screener?...` URL without `auth`. Use a current rotated Finviz token. Secrets are per Worker; the original Worker's secrets are not copied automatically.

## B. Enable Cloudflare Access and Managed OAuth

1. In Cloudflare dashboard → **Workers & Pages** → `market-mcp-composer-chatgpt` → **Settings → Domains & Routes**, enable **Cloudflare Access** on the `workers.dev` route. Cloudflare's dashboard offers this for Workers. If your account asks you to set up a Zero Trust organization first, complete that setup and enable a login method such as one-time PIN.
2. Select **Manage Cloudflare Access**. Create an **Allow** policy restricted to your own email identity. Do not use an Everyone policy. Copy the Access **Application AUD tag** and **Team domain** shown for this application. The team domain has the form `https://<team>.cloudflareaccess.com`.
3. In Zero Trust → **Access controls → Applications**, edit this Access application. In **Advanced settings**, enable **Managed OAuth** and **dynamic client registration**. Allow only the ChatGPT redirect URI shown during ChatGPT app setup (you can return here once ChatGPT displays it). An access-token lifetime of 5–15 minutes and a longer grant session are appropriate defaults.
4. Bind the copied values to the **new Worker**:

```powershell
npx wrangler secret put TEAM_DOMAIN --config wrangler.chatgpt.jsonc
npx wrangler secret put POLICY_AUD --config wrangler.chatgpt.jsonc
```

`TEAM_DOMAIN` must include `https://` and have no trailing path. `POLICY_AUD` is the Access application's AUD tag, **not** a Cloudflare account ID or the Finviz token. The Worker fails closed if either is absent or wrong.

## C. Confirm OAuth discovery before connecting ChatGPT

Use the new Worker's hostname. Open these URLs without adding credentials:

```text
https://market-mcp-composer-chatgpt.<your-subdomain>.workers.dev/.well-known/oauth-authorization-server
https://market-mcp-composer-chatgpt.<your-subdomain>.workers.dev/mcp
```

The first should return OAuth authorization-server metadata after Managed OAuth is enabled. The second should require authentication, not return an MCP `initialize` result. If the metadata path is unavailable, check that Managed OAuth is enabled on the Access application protecting the **new Worker route**. Do not remove the Worker's JWT check to make discovery pass.

## D. Create the ChatGPT developer-mode app

1. ChatGPT web → **Settings → Security and login** → enable **Developer mode**.
2. Open [ChatGPT Plugins](https://chatgpt.com/plugins), select **+**, and create a developer-mode app. Use the **new** URL ending in `/mcp`, for example `https://market-mcp-composer-chatgpt.<your-subdomain>.workers.dev/mcp`.
3. Choose **OAuth** and dynamic client registration if prompted. Copy the exact redirect URI ChatGPT displays into the Access application's **Managed OAuth → Allowed redirect URIs** list; do not guess a callback URI. Return to ChatGPT and complete the Access login with the email allowed by your policy.
4. Refresh the app's tools. It should list only `finviz_lookup_ticker`.
5. In a new chat choose **Developer mode** from the Plus menu, select the app, and ask: `Use finviz_lookup_ticker for SPY and show the returned Finviz fields.` Confirm it returns `mode: finviz-elite-screener` and a matching row from your configured screener.

The ChatGPT sign-in is not complete until the Access OAuth flow and tool call succeed. A passing `npm run test:access` proves local JWT validation, not the hosted Access policy or ChatGPT connection. If app creation reports a redirect or registration error, inspect the exact ChatGPT redirect URI and the Managed OAuth dynamic-registration settings. Never paste Finviz or OAuth tokens into ChatGPT.

## References

- Cloudflare: https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/
- Cloudflare Managed OAuth: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/
- ChatGPT developer mode: https://developers.openai.com/api/docs/guides/developer-mode
