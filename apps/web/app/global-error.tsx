'use client';

import { useEffect } from 'react';

import { captureCanaryBrowserError } from '@/lib/canary-client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureCanaryBrowserError(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <h1>something went wrong</h1>
            <p>the page hit an unexpected error.</p>
            <button type="button" onClick={() => reset()}>
              try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
