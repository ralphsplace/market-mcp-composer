import { createRemoteJWKSet, customFetch, jwtVerify } from 'jose';

export interface AccessEnv {
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;
  ALLOWED_EMAIL?: string;
}

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function verifyAccess(request: Request, env: AccessEnv, fetcher?: typeof fetch): Promise<boolean> {
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) return false;
  let issuer: URL;
  try { issuer = new URL(env.TEAM_DOMAIN); } catch { return false; }
  if (issuer.protocol !== 'https:' || !issuer.hostname.endsWith('.cloudflareaccess.com') || issuer.pathname !== '/' || issuer.search || issuer.hash) return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return false;
  const base = issuer.origin;
  let keys = keySets.get(base);
  if (!keys) {
    keys = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', base), fetcher ? { [customFetch]: fetcher } : undefined);
    keySets.set(base, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: base, audience: env.POLICY_AUD, algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'email']
    });
    return Boolean(env.ALLOWED_EMAIL && typeof payload.sub === 'string' && payload.sub &&
      typeof payload.email === 'string' && payload.email.toLowerCase() === env.ALLOWED_EMAIL.toLowerCase());
  } catch { return false; }
}
