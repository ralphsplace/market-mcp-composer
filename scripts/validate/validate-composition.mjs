import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'config/composition.example.json';
const manifest = JSON.parse(readFileSync(path, 'utf8'));
const failures = [];

const fail = message => failures.push(message);
const requireObject = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
};

if (manifest.version !== '1.0') fail('version must be 1.0');
requireObject(manifest.composition, 'composition');
requireObject(manifest.mcpServers, 'mcpServers');
requireObject(manifest.providers, 'providers');
requireObject(manifest.normalization, 'normalization');
requireObject(manifest.correlation, 'correlation');
requireObject(manifest.workflows, 'workflows');

if (manifest.composition && !/^[a-z0-9][a-z0-9-]{1,63}$/.test(manifest.composition.id || '')) {
  fail('composition.id must be a lowercase slug');
}

const servers = manifest.mcpServers || {};
for (const [name, server] of Object.entries(servers)) {
  const hasUrl = typeof server?.url === 'string' && server.url.length > 0;
  const hasRef = typeof server?.urlRef === 'string' && server.urlRef.length > 0;
  if (hasUrl === hasRef) fail(`mcpServers.${name} must define exactly one of url or urlRef`);
  if (hasUrl && !server.url.startsWith('https://')) fail(`mcpServers.${name}.url must use HTTPS`);
  if (server?.transport !== 'streamable-http') fail(`mcpServers.${name}.transport must be streamable-http`);
}

const providers = manifest.providers || {};
for (const [name, provider] of Object.entries(providers)) {
  if (!provider?.server || !servers[provider.server]) fail(`providers.${name}.server references an unknown MCP server`);
  if (!Array.isArray(provider?.capabilities) || provider.capabilities.length === 0) fail(`providers.${name}.capabilities must be non-empty`);
  if (!Array.isArray(provider?.authority) || provider.authority.length === 0) fail(`providers.${name}.authority must be non-empty`);
}

const tolerances = manifest.correlation?.valueTolerancePct || {};
for (const [field, value] of Object.entries(tolerances)) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(`correlation.valueTolerancePct.${field} must be a non-negative finite number`);
  }
}

const precedence = manifest.correlation?.precedence || {};
for (const [field, providerNames] of Object.entries(precedence)) {
  if (!Array.isArray(providerNames) || providerNames.length === 0) {
    fail(`correlation.precedence.${field} must be a non-empty array`);
    continue;
  }
  for (const providerName of providerNames) {
    if (!providers[providerName]) fail(`correlation.precedence.${field} references unknown provider ${providerName}`);
  }
}

const secretKeyPattern = /(token|secret|password|api[_-]?key|client[_-]?secret)/i;
const walk = (value, pathParts = []) => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const next = [...pathParts, key];
    if (secretKeyPattern.test(key)) fail(`manifest must not contain secret-bearing key: ${next.join('.')}`);
    walk(child, next);
  }
};
walk(manifest);

if (failures.length) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log(`PASS: composition manifest ${path}`);
console.log(`PASS: ${Object.keys(servers).length} MCP server(s), ${Object.keys(providers).length} provider(s), ${Object.keys(manifest.workflows || {}).length} workflow(s)`);
console.log('COMPOSITION MANIFEST VALID');
