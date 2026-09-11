import { PrivacySummary } from '../../../privacy/ui/transparency/PrivacySummary.tsx';
import { ActionLink } from '../../../design/ui/ActionLink.tsx';
import { BrandMark } from '../../../design/ui/BrandMark.tsx';
import { ThemeControl } from '../../../design/ui/ThemeControl.tsx';
import { AboutProfile } from '../../ui/portfolio/AboutProfile.tsx';
import { OpenField } from '../../ui/landing/OpenField.tsx';
import type { ReactNode } from 'react';
import type { RequestInfo } from 'rwsdk/worker';
import './public.css';

type Page = 'home' | 'about' | 'readings' | 'reading' | 'privacy' | 'not-found';

const navigation = (page: Page) => (
  <nav className="site-nav" aria-label="Primary navigation">
    <a href="/readings" aria-current={page === 'readings' || page === 'reading' ? 'page' : undefined}>Readings</a>
    <a href="/about" aria-current={page === 'about' ? 'page' : undefined}>About me</a>
  </nav>
);

function Header({ page }: { page: Page }) {
  return <header className="site-header"><a className="brand" href="/" aria-label="amazingefren home"><BrandMark className="brand-mark" variant="theme" /><span className="brand-name">amazingefren</span></a>{navigation(page)}<div className="header-actions"><a className="header-contact" href="mailto:dev@amazingefren.com">Say hello <span aria-hidden="true">↗</span></a></div></header>;
}

function Footer() {
  return <footer className="site-footer"><span>© {new Date().getFullYear()} Efren Castro</span><span className="footer-rule" aria-hidden="true" /><span>Denver, Colorado</span><a href="mailto:dev@amazingefren.com">dev@amazingefren.com <span aria-hidden="true">↗</span></a><ThemeControl /></footer>;
}

export function Shell({ page, children }: { page: Page; children: ReactNode }) {
  return <div className={`site-shell site-${page}${page === 'home' ? ' site-open-field' : ''}`}><a className="skip-link" href="#main">Skip to content</a><Header page={page} /><main id="main" tabIndex={-1}>{children}</main><Footer /></div>;
}

export function Home() {
  return <Shell page="home"><OpenField /></Shell>;
}

export function Readings() {
  return <Shell page="readings"><section className="page-heading"><h1>Readings.</h1></section><section className="reading-empty" aria-labelledby="empty-title"><div className="empty-symbol" aria-hidden="true">◎</div><div><h2 id="empty-title">Nothing published yet.</h2><ActionLink href="/readings/demo">View the layout demo</ActionLink></div></section></Shell>;
}

export function ReadingDemo() {
  return <Shell page="reading"><div className="reader-layout"><aside className="reader-aside"><a href="/readings">← Readings</a></aside><article className="reader"><header><p className="eyebrow">LAYOUT DEMO</p><h1>A reading room needs room to think.</h1></header><div className="prose"><p>Good notes make the path between a question and a decision easier to follow. They hold the loose parts long enough for a useful shape to emerge.</p><p>The public reading room is where those notes will live. Each piece will carry its own context, sources, and revision history, with a plain HTML version available to keep.</p><p>Until the first article is ready, this demonstration keeps the promise visible without pretending the work is finished.</p></div><footer><span>Layout demo</span><a href="/readings">Back to all readings <span aria-hidden="true">↗</span></a></footer></article></div></Shell>;
}

export function About() {
  return <Shell page="about"><AboutProfile /></Shell>;
}

export function NotFound() {
  return <Shell page="not-found"><section className="not-found"><div><h1>Page not found.</h1><div className="not-found-actions"><ActionLink variant="primary" href="/">Back home</ActionLink><ActionLink href="/readings">Browse readings</ActionLink></div></div><div className="not-found-number" aria-hidden="true">404</div></section></Shell>;
}

export function PublicRoute({ request, response }: RequestInfo) {
  const path = new URL(request.url).pathname;
  if (path === '/') return <Home />;
  if (path === '/readings') return <Readings />;
  if (path === '/readings/demo') return <ReadingDemo />;
  if (path === '/about') return <About />;
  if (path === '/privacy') return <Shell page="privacy"><PrivacySummary /></Shell>;
  response.status = 404;
  return <NotFound />;
}
