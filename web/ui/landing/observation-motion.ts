export function installObservationMotion(document: Document, view: Pick<Window, 'matchMedia'>) {
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  let settled = preference.matches;
  document.documentElement.setAttribute('data-observation-birds', settled ? 'settled' : 'entering');
  function sync() {
    const root = document.documentElement;
    const scene = document.querySelector('.observation-birds');
    if (!scene) { root.removeAttribute('data-observation-motion'); return; }
    if (preference.matches) settled = true;
    root.setAttribute('data-observation-motion', preference.matches ? 'static' : document.hidden ? 'paused' : 'running');
    root.setAttribute('data-observation-birds', settled ? 'settled' : 'entering');
  }
  function finish(event: Event) {
    if ((event as AnimationEvent).animationName !== 'ae-observation-trails') return;
    settled = true;
    sync();
  }
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('animationend', finish);
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  sync();
  return () => {
    observer.disconnect();
    document.removeEventListener('animationend', finish);
    document.removeEventListener('visibilitychange', sync);
    preference.removeEventListener('change', sync);
  };
}

export function observationMotionBootstrap() {
  return `(${installObservationMotion.toString()})(document,window)`;
}
