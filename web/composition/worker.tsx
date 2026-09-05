import { defineApp } from 'rwsdk/worker';
import { render, route } from 'rwsdk/router';
import manifest from '../web.manifest.ts';
import Home from '../adapters/http/home.tsx';
import { Document } from '../adapters/http/document.tsx';

const pages = { 'web/adapters/http/home.tsx': Home };

export default defineApp([
  render(Document, manifest.pages.map((page) => {
    if (page.access.kind !== 'public') throw new Error('Private pages require an authorization adapter');
    return route(page.path, pages[page.entrypoint]);
  }), { rscPayload: false }),
]);
