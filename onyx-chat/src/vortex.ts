declare global {
  interface Window {
    Vortex?: {
      init: (config: { clientId: string }) => unknown;
    };
    __vortexClient?: unknown;
  }
}

const VORTEX_CLIENT_ID = 'vtx_c441bad3feda17fccd10';

export function initVortex() {
  if (typeof window === 'undefined') return null;
  if (window.__vortexClient) return window.__vortexClient;

  if (window.Vortex && typeof window.Vortex.init === 'function') {
    try {
      window.__vortexClient = window.Vortex.init({ clientId: VORTEX_CLIENT_ID });
      return window.__vortexClient;
    } catch (err) {
      console.error('[Onyx Chat] Vortex init failed:', err);
    }
  }
  return null;
}
