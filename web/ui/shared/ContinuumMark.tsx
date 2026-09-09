type ContinuumMarkProps = {
  className?: string;
};

export function ContinuumMark({ className }: ContinuumMarkProps) {
  return <img className={className} src="/assets/continuum-color.svg" alt="" aria-hidden="true" />;
}
