import type { CSSProperties } from "react";
import { DASHBOARD_METRIC_IDS, type DashboardMetric, type DashboardMetricId } from "../../contracts/summary.ts";
import {
  metricDescription,
  metricEvidenceLabel,
  metricLabel,
  metricStatusLabel,
  metricValueLabel
} from "../summary/index.ts";

export interface DashboardChartProps {
  metrics: readonly DashboardMetric[];
}

export function DashboardChart({ metrics }: DashboardChartProps) {
  const metricById = new Map(metrics.map((metric) => [metric.id, metric]));
  const countValues = DASHBOARD_METRIC_IDS.map((id) => metricById.get(id)).filter(isAvailableCount).map((metric) => metric.value);
  const countMax = Math.max(...countValues, 1);

  return (
    <section className="dashboard-panel dashboard-signals" aria-labelledby="dashboard-signals-title">
      <div className="dashboard-panel-heading">
        <div>

          <h2 id="dashboard-signals-title">Signals</h2>
        </div>
        <p className="dashboard-panel-note">Bar lengths use each metric&apos;s own unit. The table carries exact values.</p>
      </div>
      <figure className="dashboard-chart">
        <div className="dashboard-bars" role="img" aria-label={chartLabel(metrics)}>
          {DASHBOARD_METRIC_IDS.map((id) => {
            const metric = metricById.get(id);
            const width = chartWidth(metric, countMax);
            return (
              <div className="dashboard-bar-row" key={id}>
                <div className="dashboard-bar-label"><span>{metricLabel(id)}</span><strong>{metricValueLabel(metric)}</strong></div>
                <div className={`dashboard-bar-track dashboard-bar-${metric?.status ?? "unavailable"}`}><span style={{ width: `${width}%` }} /></div>
              </div>
            );
          })}
        </div>

      </figure>
      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <caption className="dashboard-visually-hidden">Dashboard metric details</caption>
          <thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Evidence</th><th scope="col">Source</th></tr></thead>
          <tbody>
            {DASHBOARD_METRIC_IDS.map((id) => {
              const metric = metricById.get(id);
              return <MetricTableRow id={id} metric={metric} key={id} />;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricTableRow({ id, metric }: { id: DashboardMetricId; metric: DashboardMetric | undefined }) {
  return (
    <tr>
      <th scope="row"><span>{metricLabel(id)}</span><small>{metricDescription(id)}</small></th>
      <td><strong>{metricValueLabel(metric)}</strong><small>{metricStatusLabel(metric?.status)}</small></td>
      <td>{metricEvidenceLabel(metric)}</td>
      <td>{metric?.source ?? "Unavailable"}</td>
    </tr>
  );
}

function chartWidth(metric: DashboardMetric | undefined, countMax: number): number {
  if (!metric || metric.value === null) return 0;
  if (metric.unit === "ratio") return Math.min(Math.max(metric.value, 0), 1) * 100;
  return Math.min(Math.max(metric.value / countMax, 0), 1) * 100;
}

function chartLabel(metrics: readonly DashboardMetric[]): string {
  return metrics.map((metric) => `${metricLabel(metric.id)}: ${metricValueLabel(metric)}; ${metricStatusLabel(metric.status)}`).join(". ");
}

function isAvailableCount(metric: DashboardMetric | undefined): metric is DashboardMetric & { value: number } {
  return metric !== undefined && metric.unit === "count" && metric.value !== null;
}
