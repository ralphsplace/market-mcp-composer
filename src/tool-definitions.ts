import type { Provider } from './providers/types';

export const compositionTool = {
  name: 'get_market_snapshot',
  description: 'Correlate enabled composer-side market providers for one or more ticker symbols and describe client-direct data requirements.',
  annotations: { readOnlyHint: true },
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        minItems: 1,
        maxItems: 20,
        uniqueItems: true,
        items: {
          type: 'string',
          pattern: '^[A-Za-z0-9.\\-]{1,10}$'
        }
      }
    },
    required: ['symbols'],
    additionalProperties: false
  }
} as const;

export function buildToolDefinitions(providers: Pick<Provider, 'id' | 'description'>[]) {
  const providerTools = providers.map(provider => ({
    name: `${provider.id}_lookup_ticker`,
    description: provider.description,
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Ticker symbol to find in the configured export.'
        }
      },
      required: ['ticker'],
      additionalProperties: false
    }
  }));

  return [...providerTools, compositionTool];
}
