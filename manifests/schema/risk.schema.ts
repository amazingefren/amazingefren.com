export interface Risk {
  id: string;
  owner: string;
  scenario: string;
  consequence: string;
  status: "open" | "mitigated" | "accepted" | "avoided";
  inherent: { likelihood: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5; rationale: string };
  residual: { likelihood: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5; rationale: string } | null;
  treatment: {
    strategy: "avoid" | "reduce" | "transfer" | "accept";
    action: string;
    status: "proposed" | "implemented" | "verified";
    implementations: readonly string[];
    evidence: readonly string[];
  };
  resolution: string | null;
  reviewedOn: string;
  reviewTrigger: string;
}
