export interface ErrorTelemetryEntry {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
}

const ERROR_LOG_KEY = 'valendo_error_log';

/**
 * Records client runtime errors locally (up to 20 entries) for diagnostics
 * and forwards them to an optional webhook (`VITE_ERROR_WEBHOOK_URL`) when configured.
 */
export function reportClientError(error: unknown, componentStack?: string): void {
  const entry: ErrorTelemetryEntry = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    componentStack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(ERROR_LOG_KEY);
      const current: ErrorTelemetryEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [entry, ...current].slice(0, 20);
      localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage quota errors
  }

  try {
    const env = (import.meta as any).env || {};
    const webhookUrl = env.VITE_ERROR_WEBHOOK_URL;
    if (webhookUrl && typeof navigator !== 'undefined') {
      const payload = JSON.stringify(entry);
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(webhookUrl, payload);
      } else if (typeof fetch === 'function') {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }
  } catch {
    // Never throw from error reporter
  }
}
