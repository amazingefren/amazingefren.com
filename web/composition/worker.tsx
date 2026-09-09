import { defineApp } from 'rwsdk/worker';
import { render, route } from 'rwsdk/router';
import manifest from '../web.manifest.ts';
import dashboard from '../../dashboard/dashboard.manifest.ts';
import { createGuestSummaryHttpHandler, createOwnerSummaryHttpHandler } from '../../dashboard/adapters/http/summary.ts';
import { createSyntheticGuestTelemetry } from '../../dashboard/ports/telemetry/synthetic.ts';
import { PublicRoute } from '../adapters/http/public.tsx';
import { Document } from '../adapters/http/document.tsx';
import { GuestDashboardRoute } from './dashboard.tsx';

const pages = { 'web/adapters/http/public.tsx': PublicRoute } as const;
const guestDashboard = dashboard.views.find((view) => view.id === 'guest');
if (!guestDashboard) throw new Error('Dashboard guest view is not declared');
const publicPages = manifest.pages.filter((page) => page.path !== '*');
const dashboardSummaryPath = httpPath('dashboard.read-summary');
const guestDashboardSummaryPath = httpPath('dashboard.read-guest-summary');
const guestSummaryHandler = createGuestSummaryHttpHandler({ telemetry: createSyntheticGuestTelemetry(), now: Date.now }, 'public-guest-preview');
const ownerSummaryHandler = createOwnerSummaryHttpHandler({
  auth: {
    async authorize() {
      return { allowed: false as const, error: { code: 'unauthenticated' as const, message: 'An authenticated owner is required' } };
    },
  },
  telemetry: {
    async read() {
      return { kind: 'unavailable' as const, source: 'owner-telemetry-unavailable', observedAt: null };
    },
  },
  now: Date.now,
}, () => null);

function httpPath(operationId: string) {
  const operation = dashboard.operations.find((item) => item.id === operationId);
  const binding = operation?.bindings.find((item) => item.surface.kind === 'http');
  if (!binding || binding.surface.kind !== 'http') throw new Error(`No HTTP binding for ${operationId}`);
  return binding.surface.path;
}

export default defineApp([
  route(guestDashboardSummaryPath, { get: ({ request }) => guestSummaryHandler(request) }),
  route(dashboardSummaryPath, { get: ({ request }) => ownerSummaryHandler(request) }),
  render(Document, [...publicPages.map((page) => {
    if (page.access.kind !== 'public') throw new Error('Private pages require an authorization adapter');
    const handler = pages[page.entrypoint as keyof typeof pages];
    if (!handler) throw new Error(`No public handler for ${page.entrypoint}`);
    return route(page.path, handler);
  }), route(guestDashboard.path, GuestDashboardRoute), route('*', PublicRoute)], { rscPayload: true }),
]);
