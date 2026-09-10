export const brand = {
  name: 'Shared circles',
  defaultVariant: 'color',
  assets: {
    blue: { source: 'design/brand/assets/continuum-blue.svg', output: 'web/public/assets/continuum-blue.svg', href: '/assets/continuum-blue.svg' },
    color: { source: 'design/brand/assets/continuum-color.svg', output: 'web/public/assets/continuum-color.svg', href: '/assets/continuum-color.svg' },
    mono: { source: 'design/brand/assets/continuum-mono.svg', output: 'web/public/assets/continuum-mono.svg', href: '/assets/continuum-mono.svg' }
  }
} as const;
