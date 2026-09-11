import { themeChoices } from '../behaviors/theme.ts';

export function ThemeControl() {
  return (
    <div className="theme-control" aria-label="Color theme">
      <span className="theme-control-label">Theme</span>
      <div
        className="theme-control-options"
        role="group"
        aria-label="Choose color theme"
      >
        {themeChoices.map((option) => (
          <button
            key={option}
            type="button"
            className={option === 'system' ? 'is-selected' : undefined}
            aria-pressed={option === 'system'}
            data-theme-choice={option}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
