// Build-time configuration. The publishable key is designed to be public and
// ships inside the bundle either way; the Anthropic key never appears here —
// it lives in Supabase secrets and only gm-agent reads it.

import { cleanUrl, type Route } from './route';

interface Env {
  sbUrl: string;
  sbKey: string;
  hostedBase: string;
}

const env: Env = {
  sbUrl: cleanUrl(import.meta.env.VITE_SUPABASE_URL ?? ''),
  sbKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
  hostedBase: cleanUrl(import.meta.env.VITE_HOSTED_BASE ?? ''),
};

/** Env values, with a link's `u=`/`k=` overrides applied when present. */
export function configFor(route: Route): Env {
  return {
    sbUrl: route.sbUrl || env.sbUrl,
    sbKey: route.sbKey || env.sbKey,
    hostedBase: env.hostedBase || (typeof window === 'undefined' ? '' : cleanUrl(window.location.href.split('#')[0])),
  };
}

export default env;
