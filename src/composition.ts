import manifest from '../config/composition.example.json' with { type: 'json' };
import type { Provider, ProviderEnv } from './providers/types';

type ProviderResult = {
  source: string;
  status: 'ok' | 'error';
  data?: unknown;
  error?: string;
};

export async function buildMarketSnapshot(symbols: string[], providers: Provider[], env: ProviderEnv) {
  const now = new Date().toISOString();
  const providerConfig = manifest.providers as Record<string, any>;
  const serverConfig = manifest.mcpServers as Record<string, any>;
  const enabledIds = new Set(providers.map(p => p.id));

  const localProviders = providers.filter(p => {
    const cfg = providerConfig[p.id];
    if (!cfg) return false;
    return serverConfig[cfg.server]?.connection === 'composer';
  });

  const externalRequirements = Object.entries(providerConfig)
    .filter(([, cfg]: any) => serverConfig[cfg.server]?.connection === 'client-direct')
    .map(([id, cfg]: any) => ({
      provider: id,
      server: cfg.server,
      capabilities: cfg.capabilities
    }));

  const snapshots = [];
  for (const symbol of symbols) {
    const sources: ProviderResult[] = [];
    for (const provider of localProviders) {
      try {
        sources.push({
          source: provider.id,
          status: 'ok',
          data: await provider.lookup(symbol, env)
        });
      } catch (error: any) {
        sources.push({
          source: provider.id,
          status: 'error',
          error: typeof error?.code === 'string' ? error.code : 'PROVIDER_FAILURE'
        });
      }
    }

    snapshots.push({
      symbol,
      received_at: now,
      sources,
      quality: {
        enabledComposerProviders: [...enabledIds].filter(id => providerConfig[id] && serverConfig[providerConfig[id].server]?.connection === 'composer'),
        conflictPolicy: manifest.correlation.conflictPolicy,
        precedence: manifest.correlation.precedence
      }
    });
  }

  return {
    composition: manifest.composition.id,
    workflow: 'intradaySnapshot',
    generated_at: now,
    symbols: snapshots,
    externalRequirements
  };
}
