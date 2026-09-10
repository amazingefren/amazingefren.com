import type { DashboardSummary } from "../../contracts/summary.ts";
import { BrandMark, ThemeControl } from "../../../design/ui/index.ts";
import { DASHBOARD_METRIC_IDS } from "../../contracts/summary.ts";
import { DashboardChart } from "../charts/index.tsx";
import {
  metricDescription,
  metricEvidenceLabel,
  metricLabel,
  metricStatusLabel,
  metricValueLabel,
  localDateTimeValue
} from "../summary/index.ts";
import "./dashboard.css";

export interface GuestDashboardProps {
  summary?: DashboardSummary | null;
}

export function GuestDashboard({ summary = null }: GuestDashboardProps) {
  const metricById = new Map((summary?.metrics ?? []).map((metric) => [metric.id, metric]));
  const windowFrom = localDateTimeValue(summary?.from);
  const windowTo = localDateTimeValue(summary?.to);

  return (
    <div className="dashboard-shell">
      <a className="dashboard-skip" href="#dashboard-main">Skip to dashboard</a>
      <header className="dashboard-header">
        <a className="dashboard-brand" href="/" aria-label="amazingefren home"><BrandMark variant="theme" className="dashboard-brand-mark" /><span>amazingefren</span></a>
        <div className="dashboard-header-context"><ThemeControl /></div>
        <a className="dashboard-return" href="/">Return to site <span aria-hidden="true">↗</span></a>
      </header>
      <main id="dashboard-main" className="dashboard-main" tabIndex={-1}>
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <div>

            <h1 id="dashboard-title">Telemetry</h1>

          </div>

        </section>

        <section className="dashboard-window" aria-labelledby="dashboard-window-title">
          <div className="dashboard-window-heading"><div><h2 id="dashboard-window-title">Time window</h2></div><p>UTC · up to 31 days</p></div>
          <form className="dashboard-window-form" method="get" action="/guest/telemetry">
            <label><span>From (UTC)</span><input type="datetime-local" name="from" value={windowFrom} step="3600" required /></label>
            <span className="dashboard-window-arrow" aria-hidden="true">→</span>
            <label><span>To (UTC)</span><input type="datetime-local" name="to" value={windowTo} step="3600" required /></label>
            <button type="submit">Read window <span aria-hidden="true">↗</span></button>
          </form>
        </section>

        <section className="dashboard-summary" aria-labelledby="dashboard-summary-title">
          <div className="dashboard-section-heading"><div><h2 id="dashboard-summary-title">Summary</h2></div><SummaryMeta summary={summary} /></div>
          <div className="dashboard-metric-grid">
            {DASHBOARD_METRIC_IDS.map((id) => <MetricCard id={id} metric={metricById.get(id)} key={id} />)}
          </div>
        </section>

        <DashboardChart metrics={summary?.metrics ?? []} />


      </main>
    </div>
  );
}

function SummaryMeta({ summary }: { summary: DashboardSummary | null }) {
  return <dl className="dashboard-summary-meta"><div><dt>Scope</dt><dd><span className="dashboard-synthetic-dot" aria-hidden="true" />{summary?.dataScope === "synthetic" ? <span className="dashboard-sample-badge">Sample data</span> : "Unavailable"}</dd></div><div><dt>Source freshness</dt><dd>{summary?.freshness ? new Date(summary.freshness).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Unavailable"}</dd></div></dl>;
}

function MetricCard({ id, metric }: { id: (typeof DASHBOARD_METRIC_IDS)[number]; metric: DashboardSummary["metrics"][number] | undefined }) {
  return <article className={`dashboard-metric-card dashboard-card-${metric?.status ?? "unavailable"}`}><div className="dashboard-card-top"><span className="dashboard-card-index">{String(DASHBOARD_METRIC_IDS.indexOf(id) + 1).padStart(2, "0")}</span><span className="dashboard-status">{metricStatusLabel(metric?.status)}</span></div><h3>{metricLabel(id)}</h3><p className="dashboard-card-value">{metricValueLabel(metric)}</p><p className="dashboard-card-description">{metricDescription(id)}</p><p className="dashboard-card-evidence">{metricEvidenceLabel(metric)}</p>{metric?.status === "stale" && <p className="dashboard-card-warning">Source timestamp is older than this reading.</p>}</article>;
}
