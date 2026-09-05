import type { ConventionManifest } from '../schema/convention.schema.ts';

export default {
  "kind": "convention",
  "id": "commits",
  "purpose": "Write searchable commit messages tied to manifest changes.",
  "owner": "amazingefren",
  "status": "experimental",
  "schemaVersion": 1,
  "version": 0,
  "syntax": {
    "subject": "<type>(<optional scope>)[!]: <description>",
    "records": [
      "One record per line. Keys are case-sensitive. Repeat keys for multiple changes. No empty fields or continuation lines.\n\n`Manifest-Commit: 0` identifies this version. `Manifest: path` names each affected manifest once, relative to its repository. All other extension records use `Key: target | detail`; split on the first ` | ` only. Targets are stable operation, system, event, or risk IDs; contract-only targets can be repository-relative paths. No whitespace or pipes in targets.",
      "For binding changes, detail starts with `http METHOD path`, `mcp-tool name`, `mcp-resource uri`, `cli command`, `feed format path`, `export format path`, or `mirror network`. Event changes use `event ID`; contract changes name their path. Emit separate records for separate bindings. Changed bindings include old -> new."
    ]
  },
  "records": {
    "Added": "Observable before/after change",
    "Changed": "Observable before/after change",
    "Removed": "Observable before/after change",
    "Fixed": "Defect addressed",
    "Renamed": "Same identity, new name or path; include old -> new",
    "Replacement": "Old target -> successor, with old target on the left",
    "Access-Changed": "Old -> new access requirement",
    "Contract-Changed": "Contract path and compatibility effect",
    "Risk-Changed": "Risk status or treatment change; proposed stays proposed",
    "Cause": "Established mechanism, supported by evidence",
    "Suspected-Cause": "Unconfirmed explanation",
    "Resolution": "Implemented corrective behavior; not proof it works",
    "Reason": "Recorded intent or constraint",
    "Verification": "passed, failed, or not-run; check identity and evidence reference when run",
    "Migration": "Required consumer or data transition",
    "Reverts": "Reverted commit hash and scope; describe partial reversions"
  },
  "rules": [
    "Keep the Conventional Commit subject. Use `!` for breaking changes and a `BREAKING CHANGE:` footer explaining migration. A large change alone is not breaking.",
    "Include applicable records only. Changes without manifest impact can use plain Conventional Commits; do not invent manifest edits.",
    "Generate inventory from the actual diff. Write reasons deliberately. Unknown causes can be omitted; never infer motives from code style.",
    "Evidence references must be resolvable by authorized reviewers. Public messages must not expose private data, secrets, or private incident details.",
    "Preserve stable IDs through renames. Record replacements when identity changes; include deleted manifest paths for removals.",
    "Squash records describe the net change, not intermediate churn. Include only verification applicable to the resulting tree. Prefer separate commits for unrelated changes.",
    "A revert records the inverse effects. A merge without new changes need not duplicate parent records.",
    "Custom keys start with `X-`; readers ignore unknown keys. Changing core meanings requires a new spec version.",
    "Future parsers validate syntax and references, not truth. Diff checks and independent tests verify claims.",
    "Angle-bracket placeholders show grammar only. Replace them with verified diff facts; they grant no action scope.",
    "Messages retrieve known explanations; unknown bugs still need diffs, reproduction, and sometimes bisection.",
    "No commit parser or generator exists yet."
  ],
  "examples": [
    "<type>(<scope>): <description>\n\nManifest-Commit: 0\nManifest: <repository-relative-manifest-path>\n<change-key>: <stable-target-id> | <observed-change>"
  ],
  "sources": [
    "https://www.conventionalcommits.org/en/v1.0.0/"
  ],
  "implementations": [],
  "tests": []
} as const satisfies ConventionManifest;
