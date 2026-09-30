# Finviz production setup

Extract this complete project to a new folder, for example:
D:\AI-Development\Projects\market-mcp-production
Do not overlay it on the calculator project. Requires Windows PowerShell 5.1 and Node 24 LTS.

Run in PowerShell:

```powershell
cd D:\AI-Development\Projects\market-mcp-production
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-production.ps1
```

Supply the Cloudflare setup token and your allowed login email at prompts.
The script checks the existing account/application before changes and uses
locked dependencies. It backs up Access settings, restricts this dedicated
application to your email, enables email PIN login and Managed OAuth,
deploys only market-mcp-composer-chatgpt, retains existing Finviz secrets or
prompts for missing ones, then checks anonymous rejection and OAuth discovery.
The original market-mcp-composer Worker is untouched. No cache is implemented.
It does not delete cloud resources. Stop on any error and share the error text.
Rerunning Setup clears the OAuth callback allowlist; use Callback for later changes.

Configuration writes require edit privileges. Read preflight cannot establish
all write privileges. If a write fails, preceding successful changes remain;
backups are under setup-backups. Tokens are not written to files.

## Final ChatGPT browser step

Create your custom MCP app in ChatGPT's developer settings, select OAuth,
and use:
https://market-mcp-composer-chatgpt.<your-subdomain>.workers.dev/mcp

Copy the exact redirect URI displayed by ChatGPT. Then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-production.ps1 -Action Callback
```

Enter the API token and that exact callback when prompted. Return to ChatGPT
and finish Connect and email PIN sign-in. Refresh tools; only
finviz_lookup_ticker should appear. Ask it to look up a ticker included in
your configured screener and confirm mode finviz-elite-screener and a matching
record. That live call is required before calling the connection operational.
OAuth discovery tests alone do not prove successful user authentication.

For later read-only hosted checks:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-production.ps1 -Action Check
```

## Security change

The Worker now requires exp, iat, sub and email claims in the signed Access
assertion and checks email against ALLOWED_EMAIL, in addition to signature,
issuer and audience. Cloudflare Access handles OAuth scope/policy enforcement;
the Worker receives a signed identity assertion, not the opaque OAuth token.
No credential or token is accepted from tool arguments.

The installer uses the specific account/application supplied in your session.
If the hostname/application differs, it stops instead of selecting another.
The PowerShell installer requires validation on your Windows machine; cloud
changes and final OAuth/Finviz tests cannot be run without your account access.
