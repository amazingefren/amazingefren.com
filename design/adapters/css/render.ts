import { foundations, lightTheme, darkTheme } from '../../foundations/tokens.ts';

function declarations(tokens: Readonly<Record<string, string>>) {
  return Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join('\n');
}

export function renderTokens() {
  const dark = `  color-scheme: dark;\n${declarations(darkTheme)}`;
  return `:root {\n  color-scheme: light;\n${declarations(foundations)}\n${declarations(lightTheme)}\n}\n\n[data-theme="light"] { color-scheme: light; }\n\n[data-theme="dark"] {\n${dark}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${dark.split('\n').map(line => `  ${line}`).join('\n')}\n  }\n}\n`;
}
