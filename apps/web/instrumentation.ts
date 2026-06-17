import type { Instrumentation } from 'next';

import { reportCanaryServerError } from '@/lib/canary-server';

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportCanaryServerError(error, {
    path: request.path,
    method: request.method,
    route_path: context.routePath,
    route_type: context.routeType,
    render_source: context.renderSource,
  });
};
