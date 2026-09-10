import { brand } from '../brand/brand.ts';

export function BrandMark({ className, variant = 'color', label }: { className?: string; variant?: keyof typeof brand.assets; label?: string }) {
  return <img className={['ae-brand-mark', className].filter(Boolean).join(' ')} src={brand.assets[variant].href} alt={label ?? ''} aria-hidden={label ? undefined : true} />;
}
