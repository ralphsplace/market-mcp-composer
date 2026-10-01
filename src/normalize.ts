type SourceResult = {
  source: string;
  status: 'ok' | 'error';
  data?: any;
  error?: string;
};

const numberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/,/g, '').replace(/%$/, '');
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'n/a') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const firstRecord = (source?: SourceResult): Record<string, any> | null => {
  const records = source?.data?.records;
  return Array.isArray(records) && records.length && records[0] && typeof records[0] === 'object'
    ? records[0]
    : null;
};

const pick = (record: Record<string, any> | null, ...keys: string[]): unknown => {
  if (!record) return null;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== '') return record[key];
  }
  return null;
};

type CorrelationPolicy = {
  valueTolerancePct?: Record<string, number>;
};

export function normalizeSymbolSnapshot(
  symbol: string,
  sources: SourceResult[],
  correlation: CorrelationPolicy = {}
) {
  const bySource = Object.fromEntries(sources.map(source => [source.source, source]));
  const finviz = firstRecord(bySource.finviz);
  const yahooQuote = bySource.yahoo?.data?.quote ?? null;
  const yahooBar = bySource.yahoo?.data?.latestBar ?? null;

  const yahooPrice = numberOrNull(yahooQuote?.regularMarketPrice);
  const finvizPrice = numberOrNull(pick(finviz, 'price'));
  const yahooPreviousClose = numberOrNull(yahooQuote?.previousClose);
  const yahooVolume = numberOrNull(yahooBar?.volume);
  const finvizVolume = numberOrNull(pick(finviz, 'volume'));

  const conflicts: Array<{
    field: string;
    tolerance_pct: number;
    selected_source: string | null;
    selected_value: number | null;
    observations: Array<{ source: string; value: number }>;
    difference_pct: number;
  }> = [];

  const priceTolerancePct = correlation.valueTolerancePct?.['quote.price'];
  if (
    typeof priceTolerancePct === 'number' &&
    Number.isFinite(priceTolerancePct) &&
    priceTolerancePct >= 0 &&
    yahooPrice != null &&
    finvizPrice != null
  ) {
    const denominator = Math.max(Math.abs(yahooPrice), Math.abs(finvizPrice));
    const differencePct = denominator === 0
      ? 0
      : Math.abs(yahooPrice - finvizPrice) / denominator * 100;

    if (differencePct > priceTolerancePct) {
      conflicts.push({
        field: 'market.price',
        tolerance_pct: priceTolerancePct,
        selected_source: 'yahoo',
        selected_value: yahooPrice,
        observations: [
          { source: 'yahoo', value: yahooPrice },
          { source: 'finviz', value: finvizPrice }
        ],
        difference_pct: Number(differencePct.toFixed(4))
      });
    }
  }

  const market = {
    price: yahooPrice ?? finvizPrice,
    previous_close: yahooPreviousClose,
    volume: yahooVolume ?? finvizVolume,
    currency: stringOrNull(yahooQuote?.currency),
    exchange: stringOrNull(yahooQuote?.fullExchangeName ?? yahooQuote?.exchangeName),
    instrument_type: stringOrNull(yahooQuote?.instrumentType),
    as_of: yahooQuote?.regularMarketTime ?? yahooBar?.timestamp ?? null,
    source: yahooPrice != null ? 'yahoo' : finvizPrice != null ? 'finviz' : null
  };

  const fundamentals = {
    company: stringOrNull(pick(finviz, 'company')),
    sector: stringOrNull(pick(finviz, 'sector')),
    industry: stringOrNull(pick(finviz, 'industry')),
    market_cap: stringOrNull(pick(finviz, 'market cap', 'marketcap')),
    pe: numberOrNull(pick(finviz, 'p/e', 'pe')),
    forward_pe: numberOrNull(pick(finviz, 'forward p/e', 'forward pe')),
    peg: numberOrNull(pick(finviz, 'peg')),
    price_to_sales: numberOrNull(pick(finviz, 'p/s', 'price/sales')),
    price_to_book: numberOrNull(pick(finviz, 'p/b', 'price/book')),
    beta: numberOrNull(pick(finviz, 'beta'))
  };

  const technical = {
    change_pct: numberOrNull(pick(finviz, 'change')),
    relative_volume: numberOrNull(pick(finviz, 'rel volume', 'relative volume')),
    rsi_14: numberOrNull(pick(finviz, 'rsi (14)', 'rsi')),
    atr: numberOrNull(pick(finviz, 'atr')),
    sma20_pct: numberOrNull(pick(finviz, 'sma20')),
    sma50_pct: numberOrNull(pick(finviz, 'sma50')),
    sma200_pct: numberOrNull(pick(finviz, 'sma200')),
    latest_bar: yahooBar
      ? {
          timestamp: yahooBar.timestamp ?? null,
          open: numberOrNull(yahooBar.open),
          high: numberOrNull(yahooBar.high),
          low: numberOrNull(yahooBar.low),
          close: numberOrNull(yahooBar.close),
          volume: numberOrNull(yahooBar.volume)
        }
      : null
  };

  const missing: string[] = [];
  if (market.price == null) missing.push('market.price');
  if (market.previous_close == null) missing.push('market.previous_close');
  if (market.volume == null) missing.push('market.volume');
  if (fundamentals.company == null) missing.push('fundamentals.company');
  if (fundamentals.sector == null) missing.push('fundamentals.sector');
  if (technical.relative_volume == null) missing.push('technical.relative_volume');

  const sourceErrors = sources
    .filter(source => source.status === 'error')
    .map(source => ({
      source: source.source,
      error: source.error ?? 'PROVIDER_FAILURE'
    }));

  return {
    symbol,
    market,
    fundamentals,
    technical,
    portfolio: null,
    options: null,
    quality: {
      conflicts,
      stale: [],
      missing,
      source_errors: sourceErrors
    }
  };
}
