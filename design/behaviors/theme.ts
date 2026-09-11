export const themeChoices = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof themeChoices)[number];
export const themeStorageKey = 'ae-theme';

export function installTheme(
  document: Document,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  key: string,
) {
  function normalize(value: unknown) {
    return value === 'light' || value === 'dark' ? value : 'system';
  }
  let current = 'system';
  try {
    current = normalize(storage?.getItem(key));
  } catch {}
  function apply(theme: string) {
    current = normalize(theme);
    if (current === 'system')
      document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', current);
    document
      .querySelectorAll<HTMLElement>('[data-theme-choice]')
      .forEach((button) => {
        const selected = button.getAttribute('data-theme-choice') === current;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
  }
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target || typeof target.closest !== 'function') return;
    const button = target.closest('[data-theme-choice]');
    if (!button) return;
    const choice = button.getAttribute('data-theme-choice');
    if (choice !== 'system' && choice !== 'light' && choice !== 'dark') return;
    apply(choice);
    try {
      if (choice === 'system') storage?.removeItem(key);
      else storage?.setItem(key, choice);
    } catch {}
  });
  apply(current);
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => apply(current));
  new MutationObserver(() => apply(current)).observe(
    document.body ?? document.documentElement,
    { childList: true, subtree: true },
  );
}

export function themeBootstrap() {
  return `(()=>{let storage=null;try{storage=window.localStorage}catch{}(${installTheme.toString()})(document,storage,${JSON.stringify(themeStorageKey)})})()`;
}
