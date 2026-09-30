import { fetchSource, type Provider } from './types';
export const stocktwits: Provider = {
  id: 'stocktwits', description: 'Find a ticker in an authorized Stocktwits JSON feed.',
  async lookup(ticker, env) {
    if (env.DATA_MODE === 'fixture') return { ticker, mode: 'fixture', records: ticker === 'SPY' ? [{ ticker, label: 'Sample Stocktwits record' }] : [] };
    const parsed: unknown = JSON.parse(await fetchSource(env.STOCKTWITS_FEED_URL));
    if (!Array.isArray(parsed)) throw new Error('Feed must be a JSON array');
    return { ticker, mode: 'export', records: parsed.filter(item => item && typeof item === 'object' && 'ticker' in item && String(item.ticker).toUpperCase() === ticker).slice(0, 50) };
  }
};
