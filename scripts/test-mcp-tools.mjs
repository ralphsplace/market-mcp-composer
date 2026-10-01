import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/tool-definitions.ts', 'utf8')
  .replace("import type { Provider } from './providers/types';", '');

const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;

const { buildToolDefinitions } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);

const tools = buildToolDefinitions([
  { id: 'finviz', description: 'FinViz fixture lookup' }
]);

assert.deepEqual(
  tools.map(tool => tool.name),
  ['finviz_lookup_ticker', 'get_market_snapshot']
);

for (const tool of tools) {
  assert.equal(tool.annotations?.readOnlyHint, true);
  assert.equal(tool.inputSchema?.type, 'object');
  assert.equal(tool.inputSchema?.additionalProperties, false);
}

const finviz = tools.find(tool => tool.name === 'finviz_lookup_ticker');
assert.deepEqual(finviz.inputSchema.required, ['ticker']);
assert.equal(finviz.inputSchema.properties.ticker.type, 'string');

const snapshot = tools.find(tool => tool.name === 'get_market_snapshot');
assert.deepEqual(snapshot.inputSchema.required, ['symbols']);
assert.equal(snapshot.inputSchema.properties.symbols.minItems, 1);
assert.equal(snapshot.inputSchema.properties.symbols.maxItems, 20);
assert.equal(snapshot.inputSchema.properties.symbols.uniqueItems, true);

console.log('MCP tool registry contract passed: finviz_lookup_ticker, get_market_snapshot');
