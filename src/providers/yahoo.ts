import { ProviderError, type Provider } from './types';

export class YahooFinanceError extends ProviderError {}

export function yahooChartUrl(ticker: string): URL {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
  url.searchParams.set('range', '5d');
  url.searchParams.set('interval', '1d');
  url.searchParams.set('includePrePost', 'false');
  url.searchParams.set('events', 'div,splits');
  return url;
}

function latestBar(result: any): Record<string, unknown> | null {
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote || !timestamps.length) return null;

  for (let i = timestamps.length - 1; i >= 0; i--) {
    const close = quote.close?.[i];
    if (close == null) continue;
    return {
      timestamp: timestamps[i],
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close,
      volume: quote.volume?.[i] ?? null
    };
  }
  return null;
}

export const yahoo: Provider = {
  id: 'yahoo',
  description: 'Read a ticker quote snapshot from the Yahoo Finance chart endpoint.',
  async lookup(ticker, env) {
    if (env.DATA_MODE === 'fixture') {
      return {
        ticker,
        mode: 'fixture',
        quote: ticker === 'SPY' ? { regularMarketPrice: 500, currency: 'USD' } : null
      };
    }

    const url = yahooChartUrl(ticker);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
        headers: { accept: 'application/json' }
      });
    } catch {
      throw new YahooFinanceError('UPSTREAM_NETWORK');
    }

    if (response.status >= 300 && response.status < 400) throw new YahooFinanceError('UPSTREAM_REDIRECT');
    if (response.status === 429) throw new YahooFinanceError('UPSTREAM_RATE_LIMIT');
    if (!response.ok) throw new YahooFinanceError(`UPSTREAM_HTTP_${response.status}`);
    if (Number(response.headers.get('content-length') || 0) > 1_000_000) throw new YahooFinanceError('UPSTREAM_TOO_LARGE');

    let body: string;
    try {
      body = await response.text();
    } catch {
      throw new YahooFinanceError('UPSTREAM_READ');
    }
    if (body.length > 1_000_000) throw new YahooFinanceError('UPSTREAM_TOO_LARGE');

    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new YahooFinanceError('UPSTREAM_INVALID_JSON');
    }

    if (parsed?.chart?.error) throw new YahooFinanceError('UPSTREAM_SYMBOL_ERROR');
    const result = parsed?.chart?.result?.[0];
    if (!result || typeof result !== 'object') throw new YahooFinanceError('UPSTREAM_SCHEMA');

    const meta = result.meta ?? {};
    return {
      ticker,
      mode: 'yahoo-finance-chart',
      quote: {
        currency: meta.currency ?? null,
        symbol: meta.symbol ?? ticker,
        exchangeName: meta.exchangeName ?? null,
        fullExchangeName: meta.fullExchangeName ?? null,
        instrumentType: meta.instrumentType ?? null,
        regularMarketPrice: meta.regularMarketPrice ?? null,
        previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
        regularMarketTime: meta.regularMarketTime ?? null,
        exchangeTimezoneName: meta.exchangeTimezoneName ?? null
      },
      latestBar: latestBar(result)
    };
  }
};
