import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const manifest = JSON.parse(readFileSync('config/composition.example.json', 'utf8'));
const source = readFileSync('src/composition.ts', 'utf8')
  .replace("import manifest from '../config/composition.example.json' with { type: 'json' };", `const manifest = ${JSON.stringify(manifest)};`)
  .replace("import type { Provider, ProviderEnv } from './providers/types';", '');

const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;

const { buildMarketSnapshot } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

const providers = [
  {
    id: 'finviz',
    description: 'fixture',
    async lookup(ticker) { return { ticker, mode: 'finviz-test', records: [{ ticker, sector: 'Technology' }] }; }
  },
  {
    id: 'yahoo',
    description: 'fixture',
    async lookup(ticker) { return { ticker, mode: 'yahoo-test', quote: { regularMarketPrice: 123.45 } }; }
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

console.log('Composition snapshot tests passed');
