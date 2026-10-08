import { describe, expect, it } from 'vitest';
import { cleanUrl, gmLink, parseHash, playerLink } from './route';

describe('parseHash', () => {
  it('reads a player invite link', () => {
    const r = parseHash('#play&c=ashfall&u=https://x.supabase.co/&k=sb_publishable_abc&lock=1');
    expect(r.view).toBe('play');
    expect(r.code).toBe('ASHFALL');
    expect(r.sbUrl).toBe('https://x.supabase.co');
    expect(r.sbKey).toBe('sb_publishable_abc');
    expect(r.locked).toBe(true);
    expect(r.gmToken).toBe('');
  });

  it('reads a GM link', () => {
    const r = parseHash('#gm&c=ASHFALL&t=tok_123');
    expect(r.view).toBe('console');
    expect(r.gmToken).toBe('tok_123');
    expect(r.locked).toBe(false);
  });

  it("still honours the prototype's gm= parameter", () => {
    // Links minted before the rebuild must keep working.
    const r = parseHash('#play&c=ASHFALL&gm=tok_old');
    expect(r.view).toBe('play');
    expect(r.gmToken).toBe('tok_old');
  });

  it('prefers t= when both are present', () => {
    expect(parseHash('#gm&t=new&gm=old').gmToken).toBe('new');
  });

  it('falls back to the console for an empty or unknown hash', () => {
    expect(parseHash('').view).toBe('console');
    expect(parseHash('#').view).toBe('console');
    expect(parseHash('#nonsense&c=X').view).toBe('console');
  });

  it('decodes percent-encoded values', () => {
    expect(parseHash('#play&c=A%42').code).toBe('AB');
  });

  it('ignores a key with no value rather than throwing', () => {
    const r = parseHash('#play&c=X&lock&stray');
    expect(r.code).toBe('X');
    expect(r.locked).toBe(false);
  });
});

describe('cleanUrl', () => {
  it('drops trailing slashes so two spellings compare equal', () => {
    expect(cleanUrl('https://x.supabase.co/')).toBe('https://x.supabase.co');
    expect(cleanUrl('  https://x.supabase.co///  ')).toBe('https://x.supabase.co');
    expect(cleanUrl('')).toBe('');
  });
});

describe('link building', () => {
  const base = 'https://elliottph2772.github.io/DnD';

  it('builds a locked invite link with no credentials in it', () => {
    const link = playerLink(base, 'ashfall');
    expect(link).toBe(`${base}/#play&c=ASHFALL&lock=1`);
    expect(link).not.toContain('t=');
  });

  it('builds a GM link carrying the token', () => {
    expect(gmLink(base, 'ashfall', 'tok 1')).toBe(`${base}/#gm&c=ASHFALL&t=tok%201`);
  });

  it('round-trips through parseHash', () => {
    const r = parseHash(playerLink(base, 'ashfall').split('#')[1]);
    expect(r.code).toBe('ASHFALL');
    expect(r.locked).toBe(true);
  });
});
