import { brand } from '../brand/brand.ts';

export function BrandMark({ className, variant = 'color', label }: { className?: string; variant?: keyof typeof brand.assets | 'theme'; label?: string }) {
  if (variant === 'theme') return <span className={['ae-brand-themed', className].filter(Boolean).join(' ')}><BrandMark className="ae-brand-light" variant="color" label={label} /><BrandMark className="ae-brand-dark" variant="blue" label={label} /></span>;
  return <img className={['ae-brand-mark', className].filter(Boolean).join(' ')} src={brand.assets[variant].href} alt={label ?? ''} aria-hidden={label ? undefined : true} />;
}
