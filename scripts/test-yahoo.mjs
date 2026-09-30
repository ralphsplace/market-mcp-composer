import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/providers/yahoo.ts', 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText.replace("from './types'", "from 'data:text/javascript;base64," + Buffer.from(`
export class ProviderError extends Error {
  constructor(code) { super(code); this.code = code; }
}
`).toString('base64') + "'");

const { yahoo, yahooChartUrl } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

const u = yahooChartUrl('BRK-B');
assert.equal(u.hostname, 'query1.finance.yahoo.com');
assert.equal(u.pathname, '/v8/finance/chart/BRK-B');
assert.equal(u.searchParams.get('range'), '5d');
assert.equal(u.searchParams.get('interval'), '1d');

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).hostname, 'query1.finance.yahoo.com');
    assert.equal(options.redirect, 'manual');
    return new Response(JSON.stringify({
      chart: {
        result: [{
          meta: {
            currency: 'USD',
            symbol: 'SPY',
            exchangeName: 'PCX',
            fullExchangeName: 'NYSEArca',
            instrumentType: 'ETF',
            regularMarketPrice: 501.25,
            chartPreviousClose: 499.5,
            regularMarketTime: 1770000000,
            exchangeTimezoneName: 'America/New_York'
          },
          timestamp: [1769900000, 1770000000],
          indicators: { quote: [{
            open: [498, 500],
            high: [502, 503],
            low: [497, 499],
            close: [500, 501.25],
            volume: [100, 200]
          }] }
        }],
        error: null
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await yahoo.lookup('SPY', { DATA_MODE: 'live' });
  assert.equal(result.mode, 'yahoo-finance-chart');
  assert.equal(result.quote.regularMarketPrice, 501.25);
  assert.equal(result.quote.previousClose, 499.5);
  assert.equal(result.latestBar.close, 501.25);
  assert.equal(result.latestBar.volume, 200);

  globalThis.fetch = async () => new Response('Too Many Requests', { status: 429 });
  await assert.rejects(yahoo.lookup('SPY', { DATA_MODE: 'live' }), { code: 'UPSTREAM_RATE_LIMIT' });

  globalThis.fetch = async () => new Response('{bad json', { status: 200 });
  await assert.rejects(yahoo.lookup('SPY', { DATA_MODE: 'live' }), { code: 'UPSTREAM_INVALID_JSON' });

  globalThis.fetch = async () => new Response(JSON.stringify({ chart: { result: null, error: null } }), { status: 200 });
  await assert.rejects(yahoo.lookup('SPY', { DATA_MODE: 'live' }), { code: 'UPSTREAM_SCHEMA' });
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Yahoo Finance contract tests passed');
