import { ProviderError, type Provider } from './types';

export class FinvizError extends ProviderError {}

function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (quoted) throw new FinvizError('CSV_MALFORMED');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

export function exportUrl(raw?: string, token?: string): URL {
  if (!raw) throw new FinvizError('CONFIG_EXPORT_URL_MISSING');
  if (!token) throw new FinvizError('CONFIG_API_TOKEN_MISSING');
  let url: URL;
  try { url = new URL(raw); } catch { throw new FinvizError('CONFIG_EXPORT_URL_INVALID'); }
  if (url.protocol !== 'https:' || url.hostname !== 'elite.finviz.com' || url.pathname !== '/export/screener' || url.username || url.password || url.searchParams.has('auth') || url.hash)
    throw new FinvizError('CONFIG_EXPORT_URL_INVALID');
  url.searchParams.set('auth', token);
  return url;
}

export const finviz: Provider = {
  id: 'finviz', description: 'Find a ticker in a Finviz Elite Screener API CSV export.',
  async lookup(ticker, env) {
    if (env.DATA_MODE === 'fixture') return { ticker, mode: 'fixture', records: ticker === 'SPY' ? [{ ticker, label: 'Sample Finviz record' }] : [] };
    const url = exportUrl(env.FINVIZ_EXPORT_URL, env.FINVIZ_API_TOKEN);
    let response: Response;
    try { response = await fetch(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { accept: 'text/csv' } }); }
    catch { throw new FinvizError('UPSTREAM_NETWORK'); }
    if (response.status >= 300 && response.status < 400) throw new FinvizError('UPSTREAM_REDIRECT');
    if (response.status === 401 || response.status === 403) throw new FinvizError(`UPSTREAM_HTTP_${response.status}`);
    if (response.status === 429) throw new FinvizError('UPSTREAM_RATE_LIMIT');
    if (!response.ok) throw new FinvizError(`UPSTREAM_HTTP_${response.status}`);
    if (Number(response.headers.get('content-length') || 0) > 2_000_000) throw new FinvizError('UPSTREAM_TOO_LARGE');
    let csv: string;
    try { csv = await response.text(); } catch { throw new FinvizError('UPSTREAM_READ'); }
    if (csv.length > 2_000_000) throw new FinvizError('UPSTREAM_TOO_LARGE');
    if (/^\s*<!doctype html|^\s*<html/i.test(csv)) throw new FinvizError('UPSTREAM_HTML');
    const rows = parseCsv(csv);
    const columns = (rows.shift() || []).map(x => x.trim().toLowerCase().replace(/^\ufeff/, ''));
    const index = columns.findIndex(x => x === 'ticker' || x === 'symbol');
    if (index < 0) throw new FinvizError('CSV_TICKER_COLUMN_MISSING');
    return { ticker, mode: 'finviz-elite-screener', records: rows.filter(row => row[index]?.trim().toUpperCase() === ticker).map(row => Object.fromEntries(columns.map((name, i) => [name, row[i]?.trim() || '']))) };
  }
};
