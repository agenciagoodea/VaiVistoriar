
/**
 * configsCache.ts
 * Módulo singleton para cache global das configurações do sistema.
 * Evita múltiplas queries à tabela `system_configs` ao navegar entre páginas.
 *
 * TTL padrão: 5 minutos (300.000 ms)
 */

import { supabase } from './supabase';

const CACHE_KEY = 'vvist_sys_configs_v2';
const TTL_MS = 5 * 60 * 1000;

interface ConfigEntry {
  key: string;
  value: string;
}

interface CacheStore {
  ts: number;
  data: ConfigEntry[];
}

/** Retorna os configs do cache ou busca no banco se expirado/ausente. */
export async function getSystemConfigs(): Promise<ConfigEntry[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: CacheStore = JSON.parse(raw);
      if (Date.now() - parsed.ts < TTL_MS) {
        return parsed.data;
      }
    }
  } catch (_) { /* ignora cache corrompido */ }

  const { data } = await supabase.from('system_configs').select('key, value');
  const entries = data || [];
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: entries }));
  } catch (_) { /* sessionStorage pode estar desabilitado */ }
  return entries;
}

/** Busca o valor de uma chave específica (usa o cache global). */
export async function getConfigValue(key: string): Promise<string | null> {
  const configs = await getSystemConfigs();
  return configs.find(c => c.key === key)?.value ?? null;
}

/** Invalida o cache forçando refresh na próxima chamada. */
export function invalidateConfigsCache(): void {
  sessionStorage.removeItem(CACHE_KEY);
}
