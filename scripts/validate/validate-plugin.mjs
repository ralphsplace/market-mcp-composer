import { readFileSync, existsSync } from 'node:fs';
const fail = m => { console.error(`FAIL: ${m}`); process.exitCode = 1; };
const pass = m => console.log(`PASS: ${m}`);
for (const f of ['plugin.json','skills/ticker-summary/SKILL.md','config/instance.local.json']) existsSync(f) ? pass(`${f} exists`) : fail(`${f} missing`);
const plugin = JSON.parse(readFileSync('plugin.json','utf8'));
if (plugin.$schema === 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') pass('portable plugin schema declared'); else fail('unexpected plugin schema');
if (plugin.name && plugin.version && plugin.description) pass('plugin identity complete'); else fail('plugin identity incomplete');
if (existsSync('config/instance.local.json')) {
  const c = JSON.parse(readFileSync('config/instance.local.json','utf8'));
  let url = c?.mcp?.serverUrl?.trim();
  if (!url && c?.cloudflare?.workerName && c?.cloudflare?.workersDevSubdomain) url = `https://${c.cloudflare.workerName}.${c.cloudflare.workersDevSubdomain}.workers.dev/mcp`;
  if (/^https:\/\/[^/]+(?:\/.*)?\/mcp\/?$/.test(url || '')) pass('instance MCP server URL resolves to HTTPS /mcp'); else fail('configure mcp.serverUrl or workerName + workersDevSubdomain');
}
const skill = readFileSync('skills/ticker-summary/SKILL.md','utf8');
if (skill.includes('finviz_lookup_ticker')) pass('skill references deployed FinViz tool'); else fail('skill tool reference missing');
if (!process.exitCode) console.log('PLUGIN PACKAGE INPUTS VALID');
