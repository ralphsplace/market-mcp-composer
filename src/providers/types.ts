export interface ProviderEnv {
  DATA_MODE: string;
  FINVIZ_EXPORT_URL?: string;
  FINVIZ_API_TOKEN?: string;
  STOCKTWITS_FEED_URL?: string;
}
export interface Provider {
  id: string;
  description: string;
  lookup(ticker: string, env: ProviderEnv): Promise<unknown>;
}
export async function fetchSource(raw?: string): Promise<string> {
  if (!raw) throw new Error('Source is not configured');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Source must use HTTPS');
  const response = await fetch(url.toString(), { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > 2_000_000) throw new Error('Source unavailable or too large');
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error('Source too large');
  return body;
}
