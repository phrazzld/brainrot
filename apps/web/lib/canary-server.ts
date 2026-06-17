import { redactCanaryText } from './canary-redaction';

const DEFAULT_CANARY_ENDPOINT = 'https://canary-obs.fly.dev';
const CANARY_SERVICE = 'brainrot-publishing-house';
const CANARY_REPORT_TIMEOUT_MS = 5_000;

type CanaryHealth = {
  status: 'ok' | 'degraded';
  service: string;
  checks: {
    canary: 'configured' | 'missing';
    canaryServer: 'configured' | 'missing';
    canaryBrowser: 'configured' | 'missing';
  };
  timestamp: string;
};

type PublicCanaryConfig = {
  service: string;
  environment: string;
  endpoint: string;
  apiKey: string | null;
};

type ServerErrorContext = Record<string, unknown>;

function configuredValue(value: string | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

function withoutTrailingSlash(value: string | undefined): string {
  return String(value || DEFAULT_CANARY_ENDPOINT).replace(/\/+$/, '');
}

export function canaryEnvironment(): string {
  return (
    configuredValue(process.env.PUBLIC_CANARY_ENVIRONMENT) ||
    configuredValue(process.env.VERCEL_ENV) ||
    configuredValue(process.env.NODE_ENV) ||
    'production'
  );
}

export function publicCanaryConfig(): PublicCanaryConfig {
  const browserKey = configuredValue(process.env.PUBLIC_CANARY_API_KEY);
  const serverKey = configuredValue(process.env.CANARY_API_KEY);
  const safeBrowserKey = browserKey && browserKey !== serverKey ? browserKey : null;

  return {
    service: CANARY_SERVICE,
    environment: canaryEnvironment(),
    endpoint: withoutTrailingSlash(process.env.PUBLIC_CANARY_ENDPOINT),
    apiKey: safeBrowserKey,
  };
}

export function canaryHealth(): CanaryHealth {
  const serverKey = configuredValue(process.env.CANARY_API_KEY);
  const browserKey = publicCanaryConfig().apiKey;
  const ok = Boolean(serverKey && browserKey);

  return {
    status: ok ? 'ok' : 'degraded',
    service: CANARY_SERVICE,
    checks: {
      canary: ok ? 'configured' : 'missing',
      canaryServer: serverKey ? 'configured' : 'missing',
      canaryBrowser: browserKey ? 'configured' : 'missing',
    },
    timestamp: new Date().toISOString(),
  };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name || 'Error' : 'Error';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function redactContext(context: ServerErrorContext): ServerErrorContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      typeof value === 'string' ? redactCanaryText(value) : value,
    ]),
  );
}

export async function reportCanaryServerError(
  error: unknown,
  context: ServerErrorContext = {},
): Promise<boolean> {
  const apiKey = configuredValue(process.env.CANARY_API_KEY);
  if (!apiKey) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CANARY_REPORT_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${withoutTrailingSlash(process.env.CANARY_ENDPOINT)}/api/v1/errors`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service: CANARY_SERVICE,
            environment: canaryEnvironment(),
            severity: 'error',
            error_class: errorName(error),
            message: redactCanaryText(errorMessage(error)),
            stack:
              error instanceof Error && error.stack ? redactCanaryText(error.stack) : undefined,
            source: 'server',
            context: redactContext(context),
          }),
        },
      );

      return response.ok;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return false;
  }
}
