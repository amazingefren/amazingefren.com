import web from '../web/web.manifest.ts';
import studio from '../studio/studio.manifest.ts';
import auth from '../auth/auth.manifest.ts';
import publishing from '../publishing/publishing.manifest.ts';
import system_explorer from '../system-explorer/system-explorer.manifest.ts';
import manifests from '../manifests/manifests.manifest.ts';
import api from '../api/api.manifest.ts';
import mcp from '../mcp/mcp.manifest.ts';
import integrations from '../integrations/integrations.manifest.ts';
import resume from '../resume/resume.manifest.ts';
import evidence from '../evidence/evidence.manifest.ts';

import privacy from '../privacy/privacy.manifest.ts';
import commits from './commits/commits.manifest.ts';

export const systems = [web, studio, auth, publishing, system_explorer, manifests, api, mcp, integrations, resume, evidence, privacy] as const;
export const conventions = [commits] as const;
export const catalog = [...systems, ...conventions] as const;
