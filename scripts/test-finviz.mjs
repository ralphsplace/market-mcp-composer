import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/providers/finviz.ts', 'utf8');
const typesModule = 'data:text/javascript;base64,' + Buffer.from(`
export class ProviderError extends Error {
  constructor(code) { super(code); this.code = code; }
}
`).toString('base64');

const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText.replace("from './types'", `from '${typesModule}'`);

const { finviz, exportUrl } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const token = 'test-token-not-a-credential';
const base = 'https://elite.finviz.com/export/screener?v=111&f=sec_technology';
assert.equal(exportUrl(base, token).searchParams.get('auth'), token);
assert.equal(exportUrl(base, token).searchParams.get('f'), 'sec_technology');
for (const bad of ['https://finviz.com/export/screener', 'https://elite.finviz.com/screener', `${base}&auth=bad`, 'http://elite.finviz.com/export/screener']) {
  assert.throws(() => exportUrl(bad, token), { code: 'CONFIG_EXPORT_URL_INVALID' });
}
const env = { DATA_MODE: 'export', FINVIZ_EXPORT_URL: base, FINVIZ_API_TOKEN: token };
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).searchParams.get('auth'), token);
    assert.equal(options.redirect, 'manual');
    return new Response('No.,Ticker,Company,Price\r\n1,SPY,"Example, Inc.",500\r\n2,QQQ,Other,400\r\n', { status: 200, headers: { 'content-type': 'text/csv' } });
  };
  const result = await finviz.lookup('SPY', env);
  assert.equal(result.mode, 'finviz-elite-screener');
  assert.deepEqual(result.records, [{ 'no.': '1', ticker: 'SPY', company: 'Example, Inc.', price: '500' }]);
  globalThis.fetch = async () => new Response('Forbidden', { status: 403 });
  await assert.rejects(finviz.lookup('SPY', env), { code: 'UPSTREAM_HTTP_403' });
  globalThis.fetch = async () => new Response('<html>Sign in</html>', { status: 200 });
  await assert.rejects(finviz.lookup('SPY', env), { code: 'UPSTREAM_HTML' });
  globalThis.fetch = async () => new Response('Wrong,Columns\nA,B', { status: 200 });
  await assert.rejects(finviz.lookup('SPY', env), { code: 'CSV_TICKER_COLUMN_MISSING' });
} finally { globalThis.fetch = originalFetch; }
console.log('Finviz contract tests passed');
