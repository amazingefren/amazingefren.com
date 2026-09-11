import type { RequestInfo } from 'rwsdk/worker';
import { parseSummaryQuery } from '../../dashboard/adapters/shared.ts';
import { readGuestSummary } from '../../dashboard/operations/read-guest-summary/index.ts';
import { createSyntheticGuestTelemetry } from '../../dashboard/ports/telemetry/synthetic.ts';
import { GuestDashboard } from '../../dashboard/ui/guest/index.tsx';

const guestTelemetry = createSyntheticGuestTelemetry();

function dateInput(value: Date) {
  return value.toISOString().slice(0, 16);
}

function defaultWindow() {
  const to = new Date();
  to.setMinutes(0, 0, 0);
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from: dateInput(from), to: dateInput(to) };
}

function DashboardError({ message }: { message: string }) {
  return (
    <main className="dashboard-error" id="dashboard-main">
      <p className="eyebrow">
        GUEST DASHBOARD <span>/</span> REQUEST ERROR
      </p>
      <h1>That window cannot be read.</h1>
      <p>{message}</p>
      <a className="text-link" href="/guest/dashboard">
        Try the default window <span aria-hidden="true">↗</span>
      </a>
    </main>
  );
}

export async function GuestDashboardRoute({ request, response }: RequestInfo) {
  const defaults = defaultWindow();
  const url = new URL(request.url);
  if (!url.searchParams.has('from'))
    url.searchParams.set('from', defaults.from);
  if (!url.searchParams.has('to')) url.searchParams.set('to', defaults.to);
  const parsed = parseSummaryQuery(url.href);
  const result = parsed.ok
    ? await readGuestSummary(
        { telemetry: guestTelemetry, now: Date.now },
        { input: parsed.value, sessionId: 'public-guest-preview' },
      )
    : parsed;
  if (!result.ok) {
    response.status = result.error.code === 'invalid_input' ? 400 : 503;
    return <DashboardError message={result.error.message} />;
  }
  return <GuestDashboard summary={result.value} />;
}
