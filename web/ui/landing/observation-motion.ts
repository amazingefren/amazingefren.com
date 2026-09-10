export function installObservationMotion(document: Document, view: Pick<Window, 'matchMedia'>) {
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  const colorScheme = view.matchMedia('(prefers-color-scheme: dark)');
  let settled = preference.matches;
  function isDark() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' || (!theme && colorScheme.matches);
  }
  document.documentElement.setAttribute('data-observation-birds', settled ? 'settled' : 'entering');
  function sync() {
    const root = document.documentElement;
    const scene = document.querySelector('.observation-birds');
    const dark = isDark();
    if (preference.matches) settled = true;
    root.setAttribute('data-observation-birds', dark ? 'waiting' : settled ? 'settled' : 'entering');
    if (!scene) { root.removeAttribute('data-observation-motion'); return; }
    root.setAttribute('data-observation-motion', preference.matches || dark ? 'static' : document.hidden ? 'paused' : 'running');
  }
  function finish(event: Event) {
    if (isDark() || (event as AnimationEvent).animationName !== 'ae-observation-trails') return;
    settled = true;
    sync();
  }
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('animationend', finish);
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  colorScheme.addEventListener('change', sync);
  sync();
  return () => {
    observer.disconnect();
    document.removeEventListener('animationend', finish);
    document.removeEventListener('visibilitychange', sync);
    preference.removeEventListener('change', sync);
    colorScheme.removeEventListener('change', sync);
  };
}

export function observationMotionBootstrap() {
  return `(${installObservationMotion.toString()})(document,window)`;
}
