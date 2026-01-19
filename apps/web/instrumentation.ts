/**
 * Next.js Instrumentation
 * Initializes Sentry and other monitoring tools on server startup
 *
 * This file is automatically loaded by Next.js 14+ at server startup.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only initialize on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentryServer } = await import('./sentry.server.config');
    initSentryServer();

    console.log('[Instrumentation] Server-side monitoring initialized');
  }

  // Edge runtime initialization (if needed)
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime uses a lighter Sentry configuration
    // For now, we skip edge initialization as it requires separate config
    console.log('[Instrumentation] Edge runtime detected, using limited monitoring');
  }
}

/**
 * Optional: Called when a request is about to be handled
 * Useful for request-level instrumentation
 */
export function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
    revalidateReason: 'on-demand' | 'stale' | undefined;
    renderType: 'dynamic' | 'dynamic-resume';
  }
) {
  // Log request errors with context
  console.error('[Request Error]', {
    error: error.message,
    digest: error.digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });

  // Report to Sentry if available
  if (process.env.SENTRY_DSN) {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error, {
        extra: {
          path: request.path,
          method: request.method,
          routePath: context.routePath,
          routeType: context.routeType,
          routerKind: context.routerKind,
        },
      });
    });
  }
}
