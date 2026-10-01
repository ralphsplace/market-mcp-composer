import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const manifest = JSON.parse(readFileSync('config/composition.example.json', 'utf8'));
const normalizeSource = readFileSync('src/normalize.ts', 'utf8');
const normalizeJavascript = ts.transpileModule(normalizeSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const normalizeModule = `data:text/javascript;base64,${Buffer.from(normalizeJavascript).toString('base64')}`;

const source = readFileSync('src/composition.ts', 'utf8')
  .replace("import manifest from '../config/composition.example.json' with { type: 'json' };", `const manifest = ${JSON.stringify(manifest)};`)
  .replace("import type { Provider, ProviderEnv } from './providers/types';", '')
  .replace("from './normalize'", `from '${normalizeModule}'`);

const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;

const { buildMarketSnapshot } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

const providers = [
  {
    id: 'finviz',
    description: 'fixture',
    async lookup(ticker) { return { ticker, mode: 'finviz-test', records: [{ ticker, company: 'Microsoft Corp.', sector: 'Technology', industry: 'Software', price: '123.40', volume: '1,000,000', 'rel volume': '1.8', change: '2.5%', 'p/e': '30.2', beta: '0.90' }] }; }
  },
  {
    id: 'yahoo',
    description: 'fixture',
    async lookup(ticker) { return { ticker, mode: 'yahoo-test', quote: { regularMarketPrice: 123.45, previousClose: 120.00, currency: 'USD', fullExchangeName: 'NasdaqGS', instrumentType: 'EQUITY', regularMarketTime: 1790000000 }, latestBar: { timestamp: 1790000000, open: 121, high: 124, low: 120.5, close: 123.45, volume: 1100000 } }; }
  }
];

const result = await buildMarketSnapshot(['MSFT'], providers, { DATA_MODE: 'fixture' });
assert.equal(result.composition, 'day-trader-research');
assert.equal(result.workflow, 'intradaySnapshot');
assert.equal(result.symbols.length, 1);
assert.equal(result.symbols[0].symbol, 'MSFT');
assert.equal(result.symbols[0].sources.length, 2);
assert.equal(result.symbols[0].sources[0].status, 'ok');
assert.deepEqual(result.symbols[0].quality.precedence.quote, ['ibkr', 'yahoo']);
assert.equal(result.symbols[0].normalized.market.price, 123.45);
assert.equal(result.symbols[0].normalized.market.previous_close, 120);
assert.equal(result.symbols[0].normalized.market.volume, 1100000);
assert.equal(result.symbols[0].normalized.market.source, 'yahoo');
assert.equal(result.symbols[0].normalized.fundamentals.company, 'Microsoft Corp.');
assert.equal(result.symbols[0].normalized.fundamentals.sector, 'Technology');
assert.equal(result.symbols[0].normalized.fundamentals.pe, 30.2);
assert.equal(result.symbols[0].normalized.technical.relative_volume, 1.8);
assert.equal(result.symbols[0].normalized.technical.change_pct, 2.5);
assert.equal(result.symbols[0].normalized.technical.latest_bar.close, 123.45);
assert.equal(result.symbols[0].normalized.portfolio, null);
assert.equal(result.symbols[0].normalized.options, null);
assert.deepEqual(result.symbols[0].normalized.quality.conflicts, []);

const conflictProviders = [
  {
    id: 'finviz',
    description: 'fixture',
    async lookup(ticker) { return { ticker, mode: 'finviz-test', records: [{ ticker, price: '121.00' }] }; }
  },
  {
    id: 'yahoo',
    description: 'fixture',
    async lookup(ticker) { return { ticker, mode: 'yahoo-test', quote: { regularMarketPrice: 123.45 } }; }
  }
];
const conflicted = await buildMarketSnapshot(['MSFT'], conflictProviders, { DATA_MODE: 'fixture' });
assert.equal(conflicted.symbols[0].normalized.market.price, 123.45);
assert.equal(conflicted.symbols[0].normalized.market.source, 'yahoo');
assert.equal(conflicted.symbols[0].normalized.quality.conflicts.length, 1);
assert.equal(conflicted.symbols[0].normalized.quality.conflicts[0].field, 'market.price');
assert.equal(conflicted.symbols[0].normalized.quality.conflicts[0].tolerance_pct, 0.5);
assert.equal(conflicted.symbols[0].normalized.quality.conflicts[0].selected_source, 'yahoo');
assert.equal(conflicted.symbols[0].normalized.quality.conflicts[0].observations[1].source, 'finviz');
assert.ok(conflicted.symbols[0].normalized.quality.conflicts[0].difference_pct > 0.5);
assert.ok(result.externalRequirements.some(x => x.provider === 'ibkr'));
assert.ok(result.externalRequirements.find(x => x.provider === 'ibkr').capabilities.includes('portfolio.positions'));

const failingProviders = [{
  id: 'yahoo',
  description: 'failure',
  async lookup() { const e = new Error('x'); e.code = 'UPSTREAM_RATE_LIMIT'; throw e; }
}];
const degraded = await buildMarketSnapshot(['SPY'], failingProviders, { DATA_MODE: 'fixture' });
assert.equal(degraded.symbols[0].sources[0].status, 'error');
assert.equal(degraded.symbols[0].sources[0].error, 'UPSTREAM_RATE_LIMIT');
assert.equal(degraded.symbols[0].normalized.market.price, null);
assert.deepEqual(degraded.symbols[0].normalized.quality.source_errors, [{ source: 'yahoo', error: 'UPSTREAM_RATE_LIMIT' }]);
assert.ok(degraded.symbols[0].normalized.quality.missing.includes('market.price'));

console.log('Composition snapshot tests passed');
