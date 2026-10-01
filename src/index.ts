import { enabled } from './providers';
import { ProviderError, type ProviderEnv } from './providers/types';
import { verifyAccess, type AccessEnv } from './access-auth';
interface Env extends ProviderEnv, AccessEnv { ENABLED_PROVIDERS: string; AUTH_MODE?: string; MCP_ACCESS_TOKEN?: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const ok = (id: unknown, value: unknown) => ({ jsonrpc: '2.0', id, result: value });
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/health') return json({ status: 'ok' });
    if (path !== '/mcp') return new Response('Not found', { status: 404 });
    const authorized = env.AUTH_MODE === 'access'
      ? await verifyAccess(request, env)
      : env.AUTH_MODE === 'bearer' || !env.AUTH_MODE
        ? Boolean(env.MCP_ACCESS_TOKEN && env.MCP_ACCESS_TOKEN.length >= 32 && request.headers.get('authorization') === `Bearer ${env.MCP_ACCESS_TOKEN}`)
        : false;
    if (!authorized) return new Response('Unauthorized', { status: 401, headers: { 'www-authenticate': 'Bearer' } });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    let providers;
    try { providers = enabled(env.ENABLED_PROVIDERS); } catch { return json(err(null, -32603, 'Invalid provider configuration'), 500); }
    let msg: any;
    try { msg = await request.json(); } catch { return json(err(null, -32700, 'Invalid JSON'), 400); }
    const id = msg?.id ?? null;
    if (msg?.jsonrpc !== '2.0') return json(err(id, -32600, 'Invalid request'), 400);
    if (msg.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (msg.method === 'initialize') return json(ok(id, { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'market-mcp-composer', version: '0.2.0' }, instructions: 'Read-only tools. Fixture data is illustrative, not live prices. Source records may be delayed or incomplete.' }));
    if (msg.method === 'ping') return json(ok(id, {}));
    if (msg.method === 'tools/list') return json(ok(id, { tools: providers.map(p => ({ name: `${p.id}_lookup_ticker`, description: p.description, annotations: { readOnlyHint: true }, inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Ticker symbol to find in the configured export.' } }, required: ['ticker'], additionalProperties: false } })) }));
    if (msg.method === 'tools/call') {
      const provider = providers.find(p => `${p.id}_lookup_ticker` === msg.params?.name);
      if (!provider) return json(err(id, -32602, 'Unknown or disabled tool'));
      const ticker = msg.params?.arguments?.ticker;
      if (typeof ticker !== 'string' || !/^[A-Za-z0-9.\-]{1,10}$/.test(ticker)) return json(err(id, -32602, 'Invalid ticker'));
      try { return json(ok(id, { content: [{ type: 'text', text: JSON.stringify(await provider.lookup(ticker.toUpperCase(), env)) }] })); }
      catch (error) {
        const code = error instanceof ProviderError ? error.code : 'PROVIDER_FAILURE';
        return json(ok(id, { isError: true, content: [{ type: 'text', text: code }] }));
      }
    }
    return json(err(id, -32601, 'Method not found'));
  }
};
