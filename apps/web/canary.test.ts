import { describe, expect, it } from 'vitest';

import {
  createCanaryBrowserPayload,
  installCanaryBrowserObserver,
  loadCanaryConfig,
  redactCanaryText,
  reportCanaryPayload,
} from './lib/canary-client';
import { canaryHealth, publicCanaryConfig, reportCanaryServerError } from './lib/canary-server';

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(env)) {
    previous.set(key, process.env[key]);
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withEnvAsync<T>(
  env: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(env)) {
    previous.set(key, process.env[key]);
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('Brainrot Canary server config', () => {
  it('reports healthy only when server and browser keys are configured and distinct', () => {
    withEnv(
      {
        CANARY_API_KEY: 'server-key',
        PUBLIC_CANARY_API_KEY: 'browser-key',
        VERCEL_ENV: 'preview',
      },
      () => {
        expect(canaryHealth()).toMatchObject({
          status: 'ok',
          service: 'brainrot-publishing-house',
          checks: {
            canary: 'configured',
            canaryServer: 'configured',
            canaryBrowser: 'configured',
          },
        });
        expect(publicCanaryConfig()).toMatchObject({
          service: 'brainrot-publishing-house',
          environment: 'preview',
          apiKey: 'browser-key',
        });
      },
    );
  });

  it('does not expose a browser key that matches the server key', () => {
    withEnv(
      {
        CANARY_API_KEY: 'same-key',
        PUBLIC_CANARY_API_KEY: 'same-key',
      },
      () => {
        expect(canaryHealth()).toMatchObject({
          status: 'degraded',
          checks: {
            canaryServer: 'configured',
            canaryBrowser: 'missing',
          },
        });
        expect(publicCanaryConfig().apiKey).toBeNull();
      },
    );
  });

  it('does not expose the server-only endpoint in browser config', () => {
    withEnv(
      {
        CANARY_ENDPOINT: 'https://internal-canary.example.test',
        PUBLIC_CANARY_ENDPOINT: undefined,
        CANARY_API_KEY: 'server-key',
        PUBLIC_CANARY_API_KEY: 'browser-key',
      },
      () => {
        expect(publicCanaryConfig()).toMatchObject({
          endpoint: 'https://canary-obs.fly.dev',
          apiKey: 'browser-key',
        });
      },
    );
  });

  it('uses the public endpoint when configured for browser config', () => {
    withEnv(
      {
        CANARY_ENDPOINT: 'https://internal-canary.example.test',
        PUBLIC_CANARY_ENDPOINT: 'https://public-canary.example.test/',
        CANARY_API_KEY: 'server-key',
        PUBLIC_CANARY_API_KEY: 'browser-key',
      },
      () => {
        expect(publicCanaryConfig()).toMatchObject({
          endpoint: 'https://public-canary.example.test',
        });
      },
    );
  });

  it('does not throw when server reporting is unconfigured', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      throw new Error('fetch should not be called without a server key');
    }) as typeof fetch;

    try {
      await withEnvAsync({ CANARY_API_KEY: undefined }, async () => {
        await expect(reportCanaryServerError(new Error('server boom'))).resolves.toBe(false);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('redacts server error details before reporting', async () => {
    const originalFetch = global.fetch;
    const calls: Array<{ url: string; options?: RequestInit }> = [];
    global.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      calls.push({ url: String(url), options });
      return { ok: true } as Response;
    }) as typeof fetch;

    try {
      const error = new Error(
        `server boom for reader@example.com with ${['sk', 'live', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('_')}`,
      );
      error.stack = 'Error: server boom\n    at https://brainrot.example.test/read?token=secret';

      await withEnvAsync(
        {
          CANARY_API_KEY: 'server-key',
          CANARY_ENDPOINT: 'https://canary.example.test',
        },
        async () => {
          await expect(
            reportCanaryServerError(error, { path: '/read?token=secret' }),
          ).resolves.toBe(true);
        },
      );
    } finally {
      global.fetch = originalFetch;
    }

    const body = JSON.parse(String(calls[0].options?.body));
    expect(calls[0].url).toBe('https://canary.example.test/api/v1/errors');
    expect(calls[0].options?.headers).toMatchObject({
      Authorization: 'Bearer server-key',
      'Content-Type': 'application/json',
    });
    expect(calls[0].options?.signal).toBeInstanceOf(AbortSignal);
    expect(body.message).toContain('[redacted-email]');
    expect(body.message).toContain('[redacted-key]');
    expect(body.message).not.toContain('reader@example.com');
    expect(body.stack).toContain('?[redacted-query]');
    expect(body.context.path).toBe('/read?[redacted-query]');
  });
});

describe('Brainrot Canary browser observer', () => {
  it('redacts credentials, query strings, and high-entropy tokens', () => {
    const redacted = redactCanaryText(
      [
        'reader@example.com',
        'Bearer abc.def.ghi',
        ['sk', 'live', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('_'),
        'https://brainrot.example.test/read?token=secret',
        '/local?api_key=secret',
        'abcdefghijklmnopqrstuvwxyz1234567890ABCDEF',
        '123e4567-e89b-12d3-a456-426614174000',
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJicmFpbnJvdCJ9.signature',
        'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwKys=',
      ].join(' '),
    );

    expect(redacted).toContain('[redacted-email]');
    expect(redacted).toContain('Bearer [redacted-token]');
    expect(redacted).toContain('[redacted-key]');
    expect(redacted).toContain('[redacted-query]');
    expect(redacted).toContain('[redacted-token]');
    expect(redacted).not.toContain('reader@example.com');
    expect(redacted).not.toContain('secret');
    expect(redacted).not.toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(redacted).not.toContain('YWJjZGVmZ2hp');
  });

  it('creates the expected browser ingest payload', () => {
    const payload = createCanaryBrowserPayload(
      { service: 'brainrot-publishing-house', environment: 'production' },
      { message: 'brainrot canary smoke' },
      {
        location: { href: 'https://www.brainrotpublishing.com/?token=secret' },
        navigator: { userAgent: 'test-agent' },
      },
    );

    expect(payload).toMatchObject({
      service: 'brainrot-publishing-house',
      environment: 'production',
      source: 'browser',
      message: 'brainrot canary smoke',
      context: {
        page_url: 'https://www.brainrotpublishing.com/?[redacted-query]',
      },
    });
  });

  it('loads config and posts browser errors to Canary once installed', async () => {
    const listeners = new Map<string, (event: unknown) => Promise<void>>();
    const calls: Array<{ url: string; options?: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, options?: RequestInit) => {
      calls.push({ url: String(url), options });
      if (String(url) === '/api/canary-config') {
        return {
          ok: true,
          async json() {
            return {
              service: 'brainrot-publishing-house',
              environment: 'test',
              endpoint: 'https://canary.example.test/',
              apiKey: 'public-key',
            };
          },
        } as Response;
      }

      return { ok: true } as Response;
    };
    const page = {
      location: { href: 'https://www.brainrotpublishing.com/' },
      navigator: { userAgent: 'test-agent' },
      fetch: fetchImpl as typeof fetch,
      addEventListener(type: string, listener: (event: unknown) => Promise<void>) {
        listeners.set(type, listener);
      },
    };

    const config = await loadCanaryConfig(fetchImpl as typeof fetch);
    const installed = await installCanaryBrowserObserver({
      window: page,
      fetch: fetchImpl as typeof fetch,
      configPromise: Promise.resolve(config),
    });
    const secondInstall = await installCanaryBrowserObserver({ window: page });

    await listeners.get('error')?.({ error: new Error('browser boom') });

    expect(installed).toBe(true);
    expect(secondInstall).toBe(false);
    expect(calls.map((call) => call.url)).toEqual([
      '/api/canary-config',
      'https://canary.example.test/api/v1/errors',
    ]);
    expect(calls[1].options?.headers).toMatchObject({
      Authorization: 'Bearer public-key',
      'Content-Type': 'application/json',
    });
  });

  it('ignores incomplete browser config and missing keys', async () => {
    const config = await loadCanaryConfig(
      async () =>
        ({
          ok: true,
          async json() {
            return { endpoint: 'https://canary.example.test', apiKey: '' };
          },
        }) as Response,
    );

    await expect(reportCanaryPayload(config, {})).resolves.toBe(false);
  });

  it('keeps config loading failures from becoming observer failures', async () => {
    const listeners = new Map<string, (event: unknown) => Promise<void>>();
    const page = {
      location: { href: 'https://www.brainrotpublishing.com/' },
      navigator: { userAgent: 'test-agent' },
      fetch: (async () => {
        throw new Error('config unavailable');
      }) as typeof fetch,
      addEventListener(type: string, listener: (event: unknown) => Promise<void>) {
        listeners.set(type, listener);
      },
    };

    await expect(installCanaryBrowserObserver({ window: page })).resolves.toBe(true);
    await expect(listeners.get('error')?.({ error: new Error('browser boom') })).resolves.toBe(
      undefined,
    );
  });
});
