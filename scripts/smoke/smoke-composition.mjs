const endpoint = process.env.MCP_URL;
const token = process.env.MCP_ACCESS_TOKEN;
const symbols = (process.env.SMOKE_SYMBOLS || 'MSFT,SPY')
  .split(',')
  .map(x => x.trim().toUpperCase())
  .filter(Boolean);

if (!endpoint || !token) {
  console.error('Set MCP_URL and MCP_ACCESS_TOKEN in the shell; do not pass the token as a command argument.');
  process.exit(1);
}

if (symbols.length < 1 || symbols.length > 20) {
  console.error('SMOKE_SYMBOLS must contain between 1 and 20 symbols.');
  process.exit(1);
}

async function rpc(id, method, params = {}) {
  const maxAttempts = method === 'initialize' ? 20 : 1;
  let lastStatus = null;
  let lastBody = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
    });

    const raw = await response.text();
    lastStatus = response.status;
    lastBody = raw;

    if (method === 'initialize' && (response.status === 401 || response.status === 500) && attempt < maxAttempts) {
      if (attempt === 1) {
        console.log(`initialize: waiting for temporary deployment/secret propagation (HTTP ${response.status})...`);
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      continue;
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      const preview = raw.trim().slice(0, 300).replace(/\s+/g, ' ');
      throw new Error(
        `${method}: invalid JSON (HTTP ${response.status}${preview ? `, body=${JSON.stringify(preview)}` : ''})`
      );
    }

    if (!response.ok || body.error || !body.result || body.result.isError) {
      const code = body.result?.isError
        ? body.result.content?.[0]?.text
        : body.error?.message ?? body.message ?? body.error;
      throw new Error(
        `${method}: FAILED (HTTP ${response.status}${code ? `, ${String(code).slice(0, 300)}` : ''})`
      );
    }

    return body.result;
  }

  const preview = lastBody.trim().slice(0, 300).replace(/\s+/g, ' ');
  throw new Error(
    `${method}: temporary deployment did not become ready before timeout (last HTTP ${lastStatus}${preview ? `, body=${JSON.stringify(preview)}` : ''})`
  );
}

await rpc(1, 'initialize', {
  protocolVersion: '2025-11-25',
  capabilities: {},
  clientInfo: { name: 'composition-smoke', version: '1' }
});
console.log('initialize: OK');

const tools = await rpc(2, 'tools/list');
const toolNames = tools.tools?.map(tool => tool.name) || [];

if (!toolNames.includes('get_market_snapshot')) {
  throw new Error('tools/list: get_market_snapshot is not advertised');
}
console.log('tools/list: get_market_snapshot advertised');

const result = await rpc(3, 'tools/call', {
  name: 'get_market_snapshot',
  arguments: { symbols }
});

let snapshot;
try {
  snapshot = JSON.parse(result.content?.find(item => item.type === 'text')?.text);
} catch {
  throw new Error('get_market_snapshot: invalid JSON tool payload');
}

if (!Array.isArray(snapshot.symbols) || snapshot.symbols.length !== symbols.length) {
  throw new Error('get_market_snapshot: unexpected symbol count');
}

for (const symbol of snapshot.symbols) {
  if (!Array.isArray(symbol.sources)) {
    throw new Error(`get_market_snapshot ${symbol.symbol}: missing sources array`);
  }
  if (!symbol.normalized || symbol.normalized.symbol !== symbol.symbol) {
    throw new Error(`get_market_snapshot ${symbol.symbol}: missing normalized snapshot`);
  }
  if (!symbol.normalized.market || !symbol.normalized.fundamentals || !symbol.normalized.technical || !symbol.normalized.quality) {
    throw new Error(`get_market_snapshot ${symbol.symbol}: incomplete normalized shape`);
  }
  if (symbol.sources.some(source => source.source === 'ibkr')) {
    throw new Error(`get_market_snapshot ${symbol.symbol}: IBKR was proxied unexpectedly`);
  }
}

if (!Array.isArray(snapshot.externalRequirements)) {
  throw new Error('get_market_snapshot: missing externalRequirements');
}

const ibkr = snapshot.externalRequirements.find(x => x.provider === 'ibkr');
if (!ibkr) {
  throw new Error('get_market_snapshot: IBKR external requirement not present');
}

const requiredCapabilities = ['portfolio.positions', 'market.options', 'portfolio.risk'];
for (const capability of requiredCapabilities) {
  if (!ibkr.capabilities?.includes(capability)) {
    throw new Error(`get_market_snapshot: IBKR requirement missing capability ${capability}`);
  }
}

console.log(`get_market_snapshot: OK (${snapshot.symbols.length} symbols, normalized shape present)`);
console.log(`IBKR boundary: OK (client-direct, ${ibkr.capabilities.length} declared capabilities)`);

const failures = snapshot.symbols.flatMap(symbol =>
  symbol.sources
    .filter(source => source.status === 'error')
    .map(source => `${symbol.symbol}:${source.source}:${source.error}`)
);

if (failures.length) {
  console.log(`Degraded provider results observed: ${failures.join(', ')}`);
} else {
  console.log('Composer-side providers: all successful');
}
