import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheKey, clearCache, clientId, readCache, readCfg, writeCache, writeCfg } from './cache';

/** A localStorage that behaves, so the isolation rules can be asserted. */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cacheKey', () => {
  it('namespaces by campaign code, uppercased', () => {
    expect(cacheKey('ashfall')).toBe('nocturne-gm-v1:ASHFALL');
    expect(cacheKey('ASHFALL')).toBe('nocturne-gm-v1:ASHFALL');
  });

  it('falls back to the bare prefix with no code', () => {
    expect(cacheKey('')).toBe('nocturne-gm-v1');
  });
});

describe('per-campaign isolation', () => {
  it("never lets one campaign read another's party", () => {
    writeCache('ASHFALL', { party: ['Vex'] });
    writeCache('GRENNHAL', { party: ['Brann'] });
    expect(readCache<{ party: string[] }>('ASHFALL')?.party).toEqual(['Vex']);
    expect(readCache<{ party: string[] }>('GRENNHAL')?.party).toEqual(['Brann']);
  });

  it('returns null for a code that has never been played', () => {
    writeCache('ASHFALL', { party: ['Vex'] });
    expect(readCache('BRANDNEW')).toBeNull();
  });

  it('clears only the code it is given', () => {
    writeCache('ASHFALL', { a: 1 });
    writeCache('GRENNHAL', { b: 2 });
    clearCache('ASHFALL');
    expect(readCache('ASHFALL')).toBeNull();
    expect(readCache('GRENNHAL')).toEqual({ b: 2 });
  });

  it('treats a lowercase and uppercase code as the same campaign', () => {
    writeCache('ashfall', { a: 1 });
    expect(readCache('ASHFALL')).toEqual({ a: 1 });
  });
});

describe('damaged or unavailable storage', () => {
  it('returns null on unparseable JSON instead of throwing', () => {
    localStorage.setItem(cacheKey('ASHFALL'), '{not json');
    expect(readCache('ASHFALL')).toBeNull();
  });

  it('survives a storage that throws on every access', () => {
    const hostile = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', hostile);
    expect(readCache('ASHFALL')).toBeNull();
    expect(() => writeCache('ASHFALL', { a: 1 })).not.toThrow();
    expect(() => clearCache('ASHFALL')).not.toThrow();
    expect(clientId()).toMatch(/.+/);
  });
});

describe('clientId', () => {
  it('is stable across calls', () => {
    expect(clientId()).toBe(clientId());
  });

  it('is kept in the config, not the campaign cache', () => {
    const id = clientId();
    expect(readCfg<{ clientId: string }>().clientId).toBe(id);
    expect(readCache('')).toBeNull();
  });
});

describe('config', () => {
  it('merges patches rather than replacing the object', () => {
    writeCfg({ code: 'ASHFALL' });
    writeCfg({ slot: 2 });
    expect(readCfg<{ code: string; slot: number }>()).toMatchObject({ code: 'ASHFALL', slot: 2 });
  });

  it('reads as empty when nothing is stored', () => {
    expect(readCfg()).toEqual({});
  });
});
