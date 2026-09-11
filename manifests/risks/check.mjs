import assert from 'node:assert/strict';

export function scoreRisk(assessment) {
  if (assessment === null) return null;
  for (const value of [assessment.likelihood, assessment.impact]) {
    assert(
      Number.isInteger(value) && value >= 1 && value <= 5,
      'Risk scale must be 1-5',
    );
  }
  assert(assessment.rationale?.trim(), 'Risk score needs rationale');
  return assessment.likelihood * assessment.impact;
}

export async function checkRisks(risks, scope, ids, checkPath) {
  assert(Array.isArray(risks), `Missing risk catalog: ${scope}`);
  for (const risk of risks) {
    assert(
      risk.id.startsWith(`${scope}.`) && !ids.has(risk.id),
      `Invalid or duplicate risk ID: ${risk.id}`,
    );
    ids.add(risk.id);
    for (const field of ['owner', 'scenario', 'consequence', 'reviewTrigger'])
      assert(risk[field]?.trim(), `Missing risk ${field}`);
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(risk.reviewedOn),
      'Missing risk review date',
    );
    assert(['open', 'mitigated', 'accepted', 'avoided'].includes(risk.status));
    scoreRisk(risk.inherent);
    scoreRisk(risk.residual);
    const treatment = risk.treatment;
    assert(
      ['avoid', 'reduce', 'transfer', 'accept'].includes(treatment.strategy),
    );
    assert(['proposed', 'implemented', 'verified'].includes(treatment.status));
    assert(treatment.action?.trim());
    assert(
      Array.isArray(treatment.implementations) &&
        Array.isArray(treatment.evidence),
    );
    for (const path of [...treatment.implementations, ...treatment.evidence])
      await checkPath(path);
    if (treatment.status !== 'proposed')
      assert(
        treatment.implementations.length > 0,
        'Treatment needs implementation references',
      );
    if (treatment.status === 'verified')
      assert(
        treatment.evidence.length > 0,
        'Verified treatment needs evidence',
      );
    if (risk.status !== 'open') {
      assert(risk.resolution?.trim(), 'Closed risk needs resolution');
      assert.equal(
        treatment.status,
        'verified',
        'Closed risk needs verified treatment',
      );
      if (risk.status !== 'avoided')
        assert(risk.residual, 'Residual assessment required');
    }
    if (risk.status === 'avoided') assert.equal(treatment.strategy, 'avoid');
    if (risk.status === 'accepted') assert.equal(treatment.strategy, 'accept');
  }
}
