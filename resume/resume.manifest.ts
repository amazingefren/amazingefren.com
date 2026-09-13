import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'resume',
  name: 'AE Resume',
  purpose: 'Publish approved TEX, DOCX, and PDF resume artifacts.',
  owner: 'amazingefren',
  status: 'declared',
  visibility: 'public',
  decisions: [
    'Existing TEX, DOCX, and PDF remain public.',
    'Generation scripts, source context, and QA live in ae-resume-engine.',
  ],
  capabilities: ['resume-downloads'],
  governance: {
    permissionsDefined: [],
    dataClassification: 'public',
  },
  risks: [],
  schemaVersion: 6,
  operations: [],
  capabilityPaths: {
    'resume-downloads': 'resume',
  },
  entrypoints: [
    'resume/Efren_Castro_Flagship_Resume.tex',
    'resume/Efren_Castro_Flagship_Resume.docx',
    'resume/Efren_Castro_Flagship_Resume.pdf',
  ],
} as const satisfies SystemManifest;
