import { AboutProfile } from '../../ui/portfolio/AboutProfile.tsx';
import { ObservationField } from '../../ui/landing/ObservationField.tsx';
import { ContinuumMark } from '../../ui/shared/ContinuumMark.tsx';
import { ThemeControl } from '../../ui/shared/ThemeControl.tsx';
import type { ReactNode } from 'react';
import type { RequestInfo } from 'rwsdk/worker';
import './public.css';

type Page = 'home' | 'about' | 'readings' | 'reading' | 'not-found';

const navigation = (page: Page) => (
  <nav className="site-nav" aria-label="Primary navigation">
    <a href="/readings" aria-current={page === 'readings' || page === 'reading' ? 'page' : undefined}>Readings</a>
    <a href="/about" aria-current={page === 'about' ? 'page' : undefined}>About me</a>
    <a href="/guest/dashboard">Workbench</a>
  </nav>
);

function Header({ page }: { page: Page }) {
  return <header className="site-header"><a className="brand" href="/" aria-label="amazingefren home"><ContinuumMark className="brand-mark" /><span className="brand-name">amazingefren</span></a>{navigation(page)}<div className="header-actions"><ThemeControl /><a className="header-contact" href="mailto:dev@amazingefren.com">Say hello <span aria-hidden="true">↗</span></a></div></header>;
}

function Footer() {
  return <footer className="site-footer"><span>© {new Date().getFullYear()} Efren Castro</span><span className="footer-rule" aria-hidden="true" /><span>Denver, Colorado</span><a href="mailto:dev@amazingefren.com">dev@amazingefren.com <span aria-hidden="true">↗</span></a></footer>;
}

function Shell({ page, children }: { page: Page; children: ReactNode }) {
  return <div className={`site-shell site-${page}`}><a className="skip-link" href="#main">Skip to content</a><Header page={page} /><main id="main" tabIndex={-1}>{children}</main><Footer /></div>;
}

export function Home() {
  return <Shell page="home"><section className="hero"><div className="hero-copy"><p className="eyebrow">EFREN CASTRO <span>/</span> A PUBLIC NOTEBOOK</p><h1><span>My workbench</span><br /><em>for observability</em><br /><span>in the AI era.</span></h1><p className="hero-lede">A place to explore, experiment,<br />and share what I notice.</p><div className="hero-actions"><a className="button button-primary" href="/readings">Explore the readings <span aria-hidden="true">↗</span></a><a className="text-link" href="/about">About me <span aria-hidden="true">↗</span></a></div></div><div className="hero-art"><ObservationField /></div><div className="hero-meta"><span>01 — OBSERVATIONS</span><span>ALWAYS CURIOUS.</span></div></section></Shell>;
}

export function Readings() {
  return <Shell page="readings"><section className="page-heading"><p className="eyebrow">PUBLIC NOTES <span>/</span> 2026</p><h1>Readings.</h1><p className="page-lede">A place for longer thoughts on software, applied AI, and the work around them.</p></section><section className="reading-empty" aria-labelledby="empty-title"><div className="empty-symbol" aria-hidden="true">◎</div><div><p className="eyebrow">THE READING ROOM</p><h2 id="empty-title">Nothing published yet.</h2><p>Original essays and stable copies will appear here as they are ready.</p><a className="text-link" href="/readings/demo">View the layout demo <span aria-hidden="true">↗</span></a></div></section><div className="page-back"><a href="/">← Back home</a><span>No published readings yet</span></div></Shell>;
}

export function ReadingDemo() {
  return <Shell page="reading"><div className="reader-layout"><aside className="reader-aside"><a href="/readings">← Readings</a><span className="eyebrow">DEMONSTRATION TEXT</span><span>Layout preview</span></aside><article className="reader"><header><p className="eyebrow">DEMONSTRATION READING <span>/</span> 00</p><h1>A reading room needs room to think.</h1><p className="reader-deck">A small preview of the article format. This page is layout content, not a published essay.</p></header><div className="prose"><p>Good notes make the path between a question and a decision easier to follow. They hold the loose parts long enough for a useful shape to emerge.</p><p>The public reading room is where those notes will live. Each piece will carry its own context, sources, and revision history, with a plain HTML version available to keep.</p><p>Until the first article is ready, this demonstration keeps the promise visible without pretending the work is finished.</p></div><footer><span>Demo only · no publication revision</span><a href="/readings">Back to all readings <span aria-hidden="true">↗</span></a></footer></article></div></Shell>;
}

export function About() {
  return <Shell page="about"><AboutProfile /></Shell>;
}

export function NotFound() {
  return <Shell page="not-found"><section className="not-found"><div><p className="eyebrow">PUBLIC SITE <span>/</span> 404</p><h1>That page<br /><em>is elsewhere.</em></h1><p>The address does not point to a published page. Try the readings or head back to the beginning.</p><div className="not-found-actions"><a className="button button-primary" href="/">Back home <span aria-hidden="true">↗</span></a><a className="text-link" href="/readings">Browse readings <span aria-hidden="true">↗</span></a></div></div><div className="not-found-number" aria-hidden="true">404</div></section></Shell>;
}

export function PublicRoute({ request, response }: RequestInfo) {
  const path = new URL(request.url).pathname;
  if (path === '/') return <Home />;
  if (path === '/readings') return <Readings />;
  if (path === '/readings/demo') return <ReadingDemo />;
  if (path === '/about') return <About />;
  response.status = 404;
  return <NotFound />;
}
