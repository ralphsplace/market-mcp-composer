# ChatGPT connection

The original Worker uses a bearer token for direct MCP testing. The separate `wrangler.chatgpt.jsonc` deployment uses Cloudflare Access Managed OAuth and verifies Access JWTs. Follow [CHATGPT_ACCESS.md](CHATGPT_ACCESS.md) for the exact account setup and connection sequence.

Connect the Access-protected Worker's `/mcp` URL in ChatGPT developer mode after configuring your Access policy and Managed OAuth. Complete sign-in, scan tools, and verify only the Finviz tool appears. Publication has additional domain-verification and review steps. UI availability varies by workspace.

The upstream credentials remain in Cloudflare secrets. ChatGPT receives tool results only; a private Git repository stores source, not secrets.

References: https://developers.openai.com/plugins/build/auth ; https://developers.openai.com/plugins/build/mcp-server ; https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/
