// Local cache, keyed per campaign code. A new code must never inherit another
// campaign's party, so the code is part of the key and a read for one code can
// never return another's payload.

const PREFIX = 'nocturne-gm-v1';

export const cacheKey = (code: string): string =>
  code ? `${PREFIX}:${String(code).toUpperCase()}` : PREFIX;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const store = (): Store | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Private windows and blocked site data throw on access, not on use.
    return null;
  }
};

export function readCache<T>(code: string): T | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(cacheKey(code));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(code: string, value: unknown): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(cacheKey(code), JSON.stringify(value));
  } catch {
    // Quota or a blocked store — the cache is a convenience, never the truth.
  }
}

export function clearCache(code: string): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(cacheKey(code));
  } catch {
    /* nothing to do */
  }
}

/** Client identity, stable across reloads. Every write carries it as `by`. */
const CFG_KEY = 'nocturne-gm-cfg';

export function clientId(): string {
  const s = store();
  const fresh = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);
  if (!s) return fresh();
  try {
    const cfg = JSON.parse(s.getItem(CFG_KEY) || '{}') as { clientId?: string };
    if (cfg.clientId) return cfg.clientId;
    const id = fresh();
    s.setItem(CFG_KEY, JSON.stringify({ ...cfg, clientId: id }));
    return id;
  } catch {
    return fresh();
  }
}

export function readCfg<T extends object>(): Partial<T> {
  const s = store();
  if (!s) return {};
  try {
    return JSON.parse(s.getItem(CFG_KEY) || '{}') as Partial<T>;
  } catch {
    return {};
  }
}

export function writeCfg(patch: object): void {
  const s = store();
  if (!s) return;
  try {
    const cur = JSON.parse(s.getItem(CFG_KEY) || '{}') as object;
    s.setItem(CFG_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch {
    /* nothing to do */
  }
}
