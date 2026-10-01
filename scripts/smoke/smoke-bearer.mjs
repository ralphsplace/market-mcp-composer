const endpoint = process.env.MCP_URL;
const token = process.env.MCP_ACCESS_TOKEN;
if (!endpoint || !token) { console.error('Set MCP_URL and MCP_ACCESS_TOKEN in the shell; do not pass token as a command argument.'); process.exit(1); }
const names = (process.env.ENABLED_PROVIDERS || 'finviz,stocktwits').split(',');
const expectedTools = [...names.map(name => `${name}_lookup_ticker`), 'get_market_snapshot'];
for (const [id, method, params] of [[1,'initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'smoke',version:'1'}}],[2,'tools/list',{}],...names.map((name,i) => [i+3,'tools/call',{name:`${name}_lookup_ticker`,arguments:{ticker:'SPY'}}])]) {
  const r = await fetch(endpoint, {method:'POST',headers:{'content-type':'application/json','accept':'application/json, text/event-stream','authorization':`Bearer ${token}`},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
  let body;
  try { body = await r.json(); } catch { console.error(`${method}: invalid JSON (HTTP ${r.status})`); process.exit(1); }
  if (!r.ok || body.error || !body.result || body.result.isError) {
    const code = body.result?.isError ? body.result.content?.[0]?.text : body.error?.message;
    console.error(`${method}${params.name ? ` ${params.name}` : ''}: FAILED (HTTP ${r.status}${code ? `, ${code}` : ''})`);
    process.exit(1);
  }
  if (method === 'tools/list' && JSON.stringify(body.result.tools?.map(tool => tool.name)) !== JSON.stringify(expectedTools)) {
    console.error('tools/list: advertised tools differ from ENABLED_PROVIDERS'); process.exit(1);
  }
  if (method === 'tools/call') {
    let data;
    try { data = JSON.parse(body.result.content?.find(item => item.type === 'text')?.text); }
    catch { console.error(`${params.name}: invalid tool data`); process.exit(1); }
    if (data.mode === 'fixture' && process.env.SMOKE_REQUIRE_LIVE === '1') { console.error(`${params.name}: fixture data; live export not verified`); process.exit(1); }
    if (!Array.isArray(data.records)) { console.error(`${params.name}: missing records`); process.exit(1); }
    console.log(`${params.name}: OK (${data.mode}, ${data.records.length} matching records)`);
  } else console.log(`${method}: OK`);
}
