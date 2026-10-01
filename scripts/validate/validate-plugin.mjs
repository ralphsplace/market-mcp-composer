import { readFileSync, existsSync } from 'node:fs';

const portableOnly = process.argv.includes('--portable');
const fail = m => { console.error(`FAIL: ${m}`); process.exitCode = 1; };
const pass = m => console.log(`PASS: ${m}`);

for (const f of ['plugin.json','skills/ticker-summary/SKILL.md','skills/market-snapshot/SKILL.md']) {
  existsSync(f) ? pass(`${f} exists`) : fail(`${f} missing`);
}

const plugin = JSON.parse(readFileSync('plugin.json','utf8'));
if (plugin.$schema === 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
  pass('portable plugin schema declared');
} else {
  fail('unexpected plugin schema');
}

if (plugin.name && plugin.version && plugin.description) {
  pass('plugin identity complete');
} else {
  fail('plugin identity incomplete');
}

const instancePath = 'config/instance.local.json';
const examplePath = 'config/instance.example.json';

if (portableOnly) {
  existsSync(examplePath) ? pass(`${examplePath} exists`) : fail(`${examplePath} missing`);
  if (existsSync(examplePath)) {
    const c = JSON.parse(readFileSync(examplePath,'utf8'));
    if (c?.cloudflare && c?.mcp) {
      pass('instance template shape present');
    } else {
      fail('instance template shape incomplete');
    }
  }
  pass('instance-specific MCP URL validation skipped in portable mode');
} else {
  existsSync(instancePath) ? pass(`${instancePath} exists`) : fail(`${instancePath} missing`);
  if (existsSync(instancePath)) {
    const c = JSON.parse(readFileSync(instancePath,'utf8'));
    let url = c?.mcp?.serverUrl?.trim();
    if (!url && c?.cloudflare?.workerName && c?.cloudflare?.workersDevSubdomain) {
      url = `https://${c.cloudflare.workerName}.${c.cloudflare.workersDevSubdomain}.workers.dev/mcp`;
    }

    if (/^https:\/\/[^/]+(?:\/.*)?\/mcp\/?$/.test(url || '')) {
      pass('instance MCP server URL resolves to HTTPS /mcp');
    } else {
      fail('configure mcp.serverUrl or workerName + workersDevSubdomain');
    }

  }
}

const tickerSkill = readFileSync('skills/ticker-summary/SKILL.md','utf8');
if (tickerSkill.includes('finviz_lookup_ticker')) {
  pass('ticker skill references finviz_lookup_ticker');
} else {
  fail('ticker skill tool reference missing');
}

const snapshotSkill = readFileSync('skills/market-snapshot/SKILL.md','utf8');
if (snapshotSkill.includes('get_market_snapshot')) {
  pass('snapshot skill references get_market_snapshot');
} else {
  fail('snapshot skill tool reference missing');
}

if (plugin.name === 'market-mcp-composer' && plugin.version === '0.2.2') {
  pass('plugin identity targets full Market MCP Composer v0.2.2');
} else {
  fail('plugin identity must target market-mcp-composer v0.2.2');
}

if (!plugin?.extensions?.['com.openai']?.apps) {
  pass('plugin uses direct MCP packaging (no .app.json dependency)');
} else {
  fail('direct MCP package must not declare extensions.com.openai.apps');
}

if (!process.exitCode) {
  console.log(portableOnly ? 'PORTABLE PLUGIN INPUTS VALID' : 'PLUGIN PACKAGE INPUTS VALID');
}
