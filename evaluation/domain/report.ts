import type {
  EvaluationReport,
  EvaluationRun,
  EvaluationAggregate,
} from '../contracts/index.ts';

export function summarizeRun(run: EvaluationRun): EvaluationAggregate[] {
  return run.definition.subjects.map((subject) => {
    const attempts = run.attempts.filter(
      (item) => item.subjectId === subject.id,
    );
    const passed = attempts.filter((item) => item.score === true).length;
    const failed = attempts.filter((item) => item.score === false).length;
    const scheduled = run.definition.cases.length * run.definition.repetitions;
    return {
      subjectId: subject.id,
      scheduled,
      completed: attempts.filter((item) => item.status === 'completed').length,
      passed,
      failed,
      unknown: Math.max(0, scheduled - passed - failed),
      passRate: passed + failed ? passed / (passed + failed) : null,
    };
  });
}

export function reportMarkdown(report: EvaluationReport): string {
  return (
    [
      '# Benchmark observations',
      ...report.runs.flatMap((run) => [
        `\n## Run ${run.id}\n`,
        `Definition: ${report.definitions.find((item) => item.id === run.definitionId)?.name ?? run.definitionId} · revision ${run.definitionRevision}`,
        `State: ${run.status}\n`,
        '| Subject | Passed | Failed | Unknown | Scheduled |',
        '| --- | ---: | ---: | ---: | ---: |',
        ...run.aggregates.map(
          (item) =>
            `| ${item.subjectId.replaceAll('|', '\\|')} | ${item.passed} | ${item.failed} | ${item.unknown} | ${item.scheduled} |`,
        ),
      ]),
      '\n## Observations\n',
      ...report.observations.map((item) => `- ${item}`),
    ].join('\n') + '\n'
  );
}

export function nextMatrixId(
  prefix: string,
  entries: readonly { id: string }[],
) {
  let value = 1;
  while (entries.some((entry) => entry.id === `${prefix}-${value}`)) value++;
  return `${prefix}-${value}`;
}
