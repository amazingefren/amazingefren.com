import { PrivacySummary } from '../../../privacy/ui/transparency/PrivacySummary.tsx';
import { ActionLink } from '../../../design/ui/ActionLink.tsx';
import { AboutProfile } from '../../ui/portfolio/AboutProfile.tsx';
import { OpenField } from '../../ui/landing/OpenField.tsx';
import { Shell } from '../../ui/shared/PublicShell.tsx';
export { Shell } from '../../ui/shared/PublicShell.tsx';
import type { RequestInfo } from 'rwsdk/worker';
import './public.css';

export function Home() {
  return (
    <Shell page="home">
      <OpenField />
    </Shell>
  );
}

export function Readings() {
  return (
    <Shell page="readings">
      <section className="page-heading">
        <h1>Readings.</h1>
      </section>
      <section className="reading-empty" aria-labelledby="empty-title">
        <div className="empty-symbol" aria-hidden="true">
          ◎
        </div>
        <div>
          <h2 id="empty-title">Nothing published yet.</h2>
          <ActionLink href="/readings/demo">View the layout demo</ActionLink>
        </div>
      </section>
    </Shell>
  );
}

export function ReadingDemo() {
  return (
    <Shell page="reading">
      <div className="reader-layout">
        <aside className="reader-aside">
          <a href="/readings">← Readings</a>
        </aside>
        <article className="reader">
          <header>
            <p className="eyebrow">LAYOUT DEMO</p>
            <h1>A reading room needs room to think.</h1>
          </header>
          <div className="prose">
            <p>
              Good notes make the path between a question and a decision easier
              to follow. They hold the loose parts long enough for a useful
              shape to emerge.
            </p>
            <p>
              The public reading room is where those notes will live. Each piece
              will carry its own context, sources, and revision history, with a
              plain HTML version available to keep.
            </p>
            <p>
              Until the first article is ready, this demonstration keeps the
              promise visible without pretending the work is finished.
            </p>
          </div>
          <footer>
            <span>Layout demo</span>
            <a href="/readings">
              Back to all readings <span aria-hidden="true">↗</span>
            </a>
          </footer>
        </article>
      </div>
    </Shell>
  );
}

export function About() {
  return (
    <Shell page="about">
      <AboutProfile />
    </Shell>
  );
}

export function NotFound() {
  return (
    <Shell page="not-found">
      <section className="not-found">
        <div>
          <h1>Page not found.</h1>
          <div className="not-found-actions">
            <ActionLink variant="primary" href="/">
              Back home
            </ActionLink>
            <ActionLink href="/readings">Browse readings</ActionLink>
          </div>
        </div>
        <div className="not-found-number" aria-hidden="true">
          404
        </div>
      </section>
    </Shell>
  );
}

export function PublicRoute({ request, response }: RequestInfo) {
  const path = new URL(request.url).pathname;
  if (path === '/') return <Home />;
  if (path === '/readings') return <Readings />;
  if (path === '/readings/demo') return <ReadingDemo />;
  if (path === '/about') return <About />;
  if (path === '/privacy')
    return (
      <Shell page="privacy">
        <PrivacySummary />
      </Shell>
    );
  response.status = 404;
  return <NotFound />;
}
