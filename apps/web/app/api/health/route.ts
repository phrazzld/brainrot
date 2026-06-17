import { NextResponse } from 'next/server';

import { canaryHealth } from '@/lib/canary-server';

export function GET() {
  return NextResponse.json(canaryHealth(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
