import { NextResponse } from 'next/server';

import { publicCanaryConfig } from '@/lib/canary-server';

export function GET() {
  return NextResponse.json(publicCanaryConfig(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
