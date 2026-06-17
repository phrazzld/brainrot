import { canaryText, redactCanaryText } from './canary-redaction';

const DEFAULT_CONFIG_PATH = '/api/canary-config';
const OBSERVER_VERSION = 'brainrot-web-v1';

type CanaryClientConfig = {
  service: string;
  environment: string;
  endpoint: string;
  apiKey: string;
};

type CanaryPayload = {
  service: string;
  environment: string;
  severity: 'error';
  error_class: string;
  message: string;
  stack?: string;
  source: 'browser';
  context: Record<string, string>;
};

type BrowserLike = {
  fetch: typeof fetch;
  addEventListener: Window['addEventListener'];
  location: Pick<Location, 'href'>;
  navigator: Pick<Navigator, 'userAgent'>;
  __brainrotCanaryObserverInstalled?: boolean;
};

export { redactCanaryText } from './canary-redaction';

export function normalizeCanaryBrowserError(input: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  const maybeRecord = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const reason = maybeRecord.error || maybeRecord.reason;
  const sourceError = reason instanceof Error ? reason : input instanceof Error ? input : null;
  const messageSource = reason || maybeRecord.message || input;
  const message = redactCanaryText(canaryText(messageSource) || 'Unhandled browser error');
  const name = sourceError?.name || 'Error';
  const stack = sourceError?.stack ? redactCanaryText(sourceError.stack) : undefined;

  return { name, message, stack };
}

export function createCanaryBrowserPayload(
  config: Partial<CanaryClientConfig>,
  input: unknown,
  page: Pick<BrowserLike, 'location' | 'navigator'>,
): CanaryPayload {
  const error = normalizeCanaryBrowserError(input);

  return {
    service: config.service || 'brainrot-publishing-house',
    environment: config.environment || 'production',
    severity: 'error',
    error_class: error.name,
    message: error.message,
    stack: error.stack,
    source: 'browser',
    context: {
      observer: OBSERVER_VERSION,
      page_url: redactCanaryText(page.location.href),
      user_agent: redactCanaryText(page.navigator.userAgent),
    },
  };
}

export async function loadCanaryConfig(
  fetchImpl: typeof fetch = fetch,
  configPath = DEFAULT_CONFIG_PATH,
): Promise<CanaryClientConfig | null> {
  const response = await fetchImpl(configPath, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok) return null;

  const config = (await response.json()) as Partial<CanaryClientConfig>;
  if (!config.apiKey || !config.endpoint) return null;

  return {
    service: config.service || 'brainrot-publishing-house',
    environment: config.environment || 'production',
    endpoint: String(config.endpoint).replace(/\/+$/, ''),
    apiKey: config.apiKey,
  };
}

export async function reportCanaryPayload(
  config: Partial<CanaryClientConfig> | null,
  payload: Partial<CanaryPayload>,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!config?.apiKey || !config?.endpoint) return false;

  const endpoint = String(config.endpoint).replace(/\/+$/, '');
  const response = await fetchImpl(`${endpoint}/api/v1/errors`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  return response.ok;
}

export async function captureCanaryBrowserError(input: unknown): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;

    const config = await loadCanaryConfig();
    if (!config) return false;

    return await reportCanaryPayload(config, createCanaryBrowserPayload(config, input, window));
  } catch {
    return false;
  }
}

export async function installCanaryBrowserObserver(
  options: {
    window?: BrowserLike;
    fetch?: typeof fetch;
    configPromise?: Promise<CanaryClientConfig | null>;
  } = {},
): Promise<boolean> {
  const page = options.window || (typeof window !== 'undefined' ? (window as BrowserLike) : null);
  if (!page) return false;

  if (page.__brainrotCanaryObserverInstalled) return false;
  page.__brainrotCanaryObserverInstalled = true;

  const fetchImpl = options.fetch || page.fetch.bind(page);
  const configPromise = (options.configPromise || loadCanaryConfig(fetchImpl)).catch(() => null);

  const capture = async (event: unknown) => {
    try {
      const config = await configPromise;
      if (!config) return;

      await reportCanaryPayload(config, createCanaryBrowserPayload(config, event, page), fetchImpl);
    } catch {
      // Observability must never break the page it observes.
    }
  };

  page.addEventListener('error', capture);
  page.addEventListener('unhandledrejection', capture);
  return true;
}
