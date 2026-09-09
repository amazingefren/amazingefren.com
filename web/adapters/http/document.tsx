import type { DocumentProps } from 'rwsdk/router';
import type { ReactNode } from 'react';
import stylesUrl from './public.css?url';
import dashboardStylesUrl from '../../../dashboard/ui/guest/dashboard.css?url';

const themeBootstrap = `(function(){var key='ae-theme';function read(){try{var value=localStorage.getItem(key);return value==='light'||value==='dark'?value:'system'}catch(_){return'system'}}function apply(theme){if(theme==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=theme;document.querySelectorAll('[data-theme-choice]').forEach(function(button){var selected=button.getAttribute('data-theme-choice')===theme;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected))})}function sync(){apply(read())}document.addEventListener('click',function(event){var target=event.target;if(!(target instanceof Element))return;var button=target.closest('[data-theme-choice]');if(!button)return;var theme=button.getAttribute('data-theme-choice');if(theme!=='system'&&theme!=='light'&&theme!=='dark')return;apply(theme);try{if(theme==='system')localStorage.removeItem(key);else localStorage.setItem(key,theme)}catch(_){}});sync();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync()})();`;

function DocumentContent({ children, noIndex = false }: { children: ReactNode; noIndex?: boolean }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Efren Castro — solutions architect, public notes, and work in progress." />
        <meta name="theme-color" content="#f5f0e8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#091321" media="(prefers-color-scheme: dark)" />
        {noIndex && <meta name="robots" content="noindex, nofollow" />}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="stylesheet" href={stylesUrl} />
        <link rel="stylesheet" href={dashboardStylesUrl} />
        <title>Efren Castro — Public research</title>
      </head>
      <body>{children}</body>
    </html>
  );
}

export function Document({ children, request }: DocumentProps) {
  return <DocumentContent noIndex={new URL(request.url).pathname === '/readings/demo'}>{children}</DocumentContent>;
}
