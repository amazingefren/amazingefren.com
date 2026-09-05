import type { ConventionManifest } from '../schema/convention.schema.ts';

export default {
  kind: "convention",
  id: "prototype",
  purpose: "Build one coherent prototype with parallel agents and reviewable evidence.",
  owner: "amazingefren",
  status: "experimental",
  schemaVersion: 1,
  version: 1,
  syntax: {
    brief: "Read the private workbench manifest's finalPrototype reference. It selects the design, scope, paths, and acceptance scenarios.",
    dispatch: ["task ID", "exact prompt", "model and settings", "allowed inputs", "owned paths", "frozen contract revision", "dependencies", "acceptance IDs"],
    result: ["task ID", "changed paths", "checks and evidence", "failures", "unresolved decisions"],
  },
  records: {
    scope: "Separate interactive simulation, visual reference, and production implementation.",
    ownership: "One writer per file. Coordinator owns shared contracts, tokens, routing, composition, and dependency files.",
    acceptance: "Stable scenario ID, task, independent expected result, evidence, and passed/failed/blocked/not-run status.",
    intervention: "Trigger, action, affected task, and outcome. Keep failed attempts.",
  },
  rules: [
    "A brief does not dispatch agents. Start only when the user requests the build or orchestration.",
    "Freeze routes, component props, operation contracts, fixtures, tokens, and path ownership before parallel work. Resolve contract changes through the coordinator.",
    "Give agents only the task, selected references, governing manifests, and needed contracts. Record inherited history and source access; do not claim isolation without evidence.",
    "For design exploration, assign distinct concepts. For integration, share one approved direction. Agent count alone does not create diversity or quality.",
    "Keep archived prototypes unchanged. Build a new artifact in its declared directory; never copy private profile or research into a served directory.",
    "Use local synthetic services. Owner-mode demos are simulations, not authentication. Guests get separate state; role headers cannot grant owner access.",
    "Every visible control works within declared simulation scope or states its limitation. Do not add production endpoints, tracking, accounts, or external writes.",
    "Keep wording short. Reuse approved personal text; label fixture writing. Visual references do not authorize copying personal claims or assets.",
    "Implement first. Review rendered routes, interactions, mobile, keyboard, empty/error states, and access failures. Source checks alone cannot approve a visual prototype.",
    "The coordinator integrates and checks the result against the brief. User approval gates application implementation.",
    "Record evidence privately. Freeze scenarios and denominators before dispatch. Report untested items and unknown costs; do not infer accuracy from passing author-written tests.",
  ],
  examples: ["Result: <task-id> | <owned paths> | <acceptance IDs and observed outcomes> | <remaining failures>"],
  sources: [],
  implementations: [],
  tests: [],
} as const satisfies ConventionManifest;
