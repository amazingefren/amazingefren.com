import type { ReactNode } from 'react';

export function ActionLink({ href, children, variant = 'text', arrow = true }: { href: string; children: ReactNode; variant?: 'primary' | 'text'; arrow?: boolean }) {
  return <a className={variant === 'primary' ? 'button button-primary' : 'text-link'} href={href}>{children}{arrow && <span aria-hidden="true">↗</span>}</a>;
}
