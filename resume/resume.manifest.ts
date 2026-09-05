import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: "system",
  "id": "resume",
  "name": "AE Resume",
  "purpose": "Publish approved TEX, DOCX, and PDF resume artifacts.",
  "owner": "amazingefren",
  "status": "declared",
  "scope": "required",
  "visibility": "public",
  "context": {
    "decisions": [
      "Existing TEX, DOCX, and PDF remain public.",
      "Generation scripts, source context, and QA live in ae-resume-engine."
    ],
    "openQuestions": []
  },
  "capabilities": [
    "resume-downloads"
  ],
  "governance": {
    "permissionsDefined": [],
    "dataClassification": "public"
  },
  "risks": [],
  "dependencies": [],
  "schemaVersion": 5,
  "contracts": [],
  "operations": [],
  "events": [],
  "capabilityPaths": {
    "resume-downloads": "resume"
  },
  "structure": {},
  "entrypoints": [
    "resume/Efren_Castro_Flagship_Resume.tex",
    "resume/Efren_Castro_Flagship_Resume.docx",
    "resume/Efren_Castro_Flagship_Resume.pdf"
  ]
} as const satisfies SystemManifest;
