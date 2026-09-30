import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { verifyAccess } from '../src/access-auth.ts';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
const issuer = 'https://test-suite.cloudflareaccess.com';
const env = { TEAM_DOMAIN: issuer, POLICY_AUD: 'test-audience', ALLOWED_EMAIL: 'tester@example.invalid' };
const fetcher = async url => {
  assert.equal(String(url), `${issuer}/cdn-cgi/access/certs`);
  return Response.json({ keys: [jwk] });
};
const jwt = await new SignJWT({ email: 'tester@example.invalid' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(issuer).setAudience(env.POLICY_AUD).setSubject('test-user').setIssuedAt().setExpirationTime('5m').sign(privateKey);
const request = value => new Request('https://example.invalid/mcp', { headers: value ? { 'Cf-Access-Jwt-Assertion': value } : {} });
assert.equal(await verifyAccess(request(jwt), env, fetcher), true);
assert.equal(await verifyAccess(request(), env, fetcher), false);
assert.equal(await verifyAccess(request(jwt), { ...env, POLICY_AUD: 'other' }, fetcher), false);
const parts = jwt.split('.');
parts[1] = parts[1].slice(0, 5) + (parts[1][5] === 'a' ? 'b' : 'a') + parts[1].slice(6);
assert.equal(await verifyAccess(request(parts.join('.')), env, fetcher), false);
assert.equal(await verifyAccess(request(jwt), { ...env, TEAM_DOMAIN: 'https://example.invalid' }, fetcher), false);
assert.equal(await verifyAccess(request(jwt), { ...env, ALLOWED_EMAIL: 'other@example.invalid' }, fetcher), false);
assert.equal(await verifyAccess(request(jwt), { ...env, ALLOWED_EMAIL: undefined }, fetcher), false);
for (const claims of [
  { email: env.ALLOWED_EMAIL, sub: 'test-user', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)-60 },
  { email: env.ALLOWED_EMAIL, sub: 'test-user', iat: Math.floor(Date.now()/1000) },
  { email: env.ALLOWED_EMAIL, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+60 }
]) {
  const invalid = await new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(issuer).setAudience(env.POLICY_AUD).sign(privateKey);
  assert.equal(await verifyAccess(request(invalid), env, fetcher), false);
}
console.log('Cloudflare Access JWT tests passed');
