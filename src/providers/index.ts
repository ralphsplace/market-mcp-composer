import { finviz } from './finviz';
import { stocktwits } from './stocktwits';
import type { Provider } from './types';
export const registry: Record<string, Provider> = { finviz, stocktwits };
export function enabled(raw: string): Provider[] {
  const names = raw.split(',').map(x => x.trim().toLowerCase());
  if (names.some(x => !x || !registry[x]) || new Set(names).size !== names.length) throw new Error('Invalid provider selection');
  return names.map(x => registry[x]);
}
