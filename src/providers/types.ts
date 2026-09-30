export interface ProviderEnv {
  DATA_MODE: string;
  FINVIZ_EXPORT_URL?: string;
  FINVIZ_API_TOKEN?: string;
  STOCKTWITS_FEED_URL?: string;
}

export class ProviderError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export interface Provider {
  id: string;
  description: string;
  lookup(ticker: string, env: ProviderEnv): Promise<unknown>;
}

export async function fetchSource(raw?: string): Promise<string> {
  if (!raw) throw new ProviderError('SOURCE_NOT_CONFIGURED');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new ProviderError('SOURCE_HTTPS_REQUIRED');
  const response = await fetch(url.toString(), { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > 2_000_000) throw new ProviderError('SOURCE_UNAVAILABLE_OR_TOO_LARGE');
  const body = await response.text();
  if (body.length > 2_000_000) throw new ProviderError('SOURCE_TOO_LARGE');
  return body;
}
