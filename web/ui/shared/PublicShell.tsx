import type { ReactNode } from 'react';
import { BrandMark } from '../../../design/ui/BrandMark.tsx';
import { ThemeControl } from '../../../design/ui/ThemeControl.tsx';

type Page = 'home' | 'about' | 'readings' | 'reading' | 'privacy' | 'not-found';

const navigation = (page: Page) => (
  <nav className="site-nav" aria-label="Primary navigation">
    <a
      href="/readings"
      aria-current={
        page === 'readings' || page === 'reading' ? 'page' : undefined
      }
    >
      Readings
    </a>
    <a href="/about" aria-current={page === 'about' ? 'page' : undefined}>
      About me
    </a>
  </nav>
);

function Header({ page }: { page: Page }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="amazingefren home">
        <BrandMark className="brand-mark" variant="theme" />
        <span className="brand-name">amazingefren</span>
      </a>
      {navigation(page)}
      <div className="header-actions">
        <a className="header-contact" href="mailto:dev@amazingefren.com">
          Say hello <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Efren Castro</span>
      <span className="footer-rule" aria-hidden="true" />
      <span>Denver, Colorado</span>
      <a href="mailto:dev@amazingefren.com">
        dev@amazingefren.com <span aria-hidden="true">↗</span>
      </a>
      <ThemeControl />
    </footer>
  );
}

export function Shell({ page, children }: { page: Page; children: ReactNode }) {
  return (
    <div
      className={`site-shell site-${page}${page === 'home' ? ' site-open-field' : ''}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header page={page} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
