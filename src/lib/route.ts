// Hash routing. Pages serves this app from a subpath and invite links are
// already in people's hands, so the hash stays the router: no 404 rewrite to
// maintain and every link handed out before the rebuild still resolves.
//
//   #play&c=CODE&u=URL&k=KEY&lock=1   player view (invite link)
//   #play&c=CODE&gm=TOKEN             legacy GM link — still honoured
//   #gm&c=CODE&t=TOKEN                GM console
//   (empty)                           GM console, locked until credentials

export type View = 'console' | 'play';

export interface Route {
  view: View;
  /** Campaign code, uppercased. */
  code: string;
  /** GM token from the link, if any. */
  gmToken: string;
  /** Supabase URL override (`u=`), else the build's env value. */
  sbUrl: string;
  /** Supabase publishable key override (`k=`), else the build's env value. */
  sbKey: string;
  /** `lock=1` — hide the console, the code field and the passphrase unlock. */
  locked: boolean;
}

/** Strip a trailing slash so a pasted project URL and ours compare equal. */
export const cleanUrl = (u: string): string => String(u || '').trim().replace(/\/+$/, '');

/**
 * Parse a location hash into a route. Unknown keys are ignored; a malformed
 * hash degrades to the locked console rather than throwing.
 */
export function parseHash(hash: string): Route {
  const raw = String(hash || '').replace(/^#/, '');
  const parts = raw.split('&').filter(Boolean);
  const head = (parts[0] || '').toLowerCase();

  const params = new Map<string, string>();
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq > 0) params.set(part.slice(0, eq).toLowerCase(), decodeURIComponent(part.slice(eq + 1)));
  }

  const view: View = head === 'play' ? 'play' : 'console';

  return {
    view,
    code: (params.get('c') || '').trim().toUpperCase(),
    // `t` is the current GM param; `gm` is the prototype's, kept for old links.
    gmToken: (params.get('t') || params.get('gm') || '').trim(),
    sbUrl: cleanUrl(params.get('u') || ''),
    sbKey: (params.get('k') || '').trim(),
    locked: params.get('lock') === '1',
  };
}

export const currentRoute = (): Route =>
  parseHash(typeof window === 'undefined' ? '' : window.location.hash);

/** Build the invite link a player gets. Carries no credentials. */
export function playerLink(base: string, code: string): string {
  return `${cleanUrl(base)}/#play&c=${encodeURIComponent(code.toUpperCase())}&lock=1`;
}

/** Build the GM link. Anyone holding it is the GM — treat it like a password. */
export function gmLink(base: string, code: string, token: string): string {
  return `${cleanUrl(base)}/#gm&c=${encodeURIComponent(code.toUpperCase())}&t=${encodeURIComponent(token)}`;
}
