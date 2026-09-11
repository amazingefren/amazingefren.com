import { themeBootstrap } from '../../../design/behaviors/theme.ts';
import { observationMotionBootstrap } from '../../ui/landing/observation-motion.ts';
import { lightTheme, darkTheme } from '../../../design/foundations/tokens.ts';
import type { DocumentProps } from 'rwsdk/router';
import type { ReactNode } from 'react';
import stylesUrl from './public.css?url';
import readingsStylesUrl from '../../ui/readings/readings.css?url';
import dashboardStylesUrl from '../../../dashboard/ui/guest/dashboard.css?url';

function DocumentContent({
  children,
  noIndex = false,
}: {
  children: ReactNode;
  noIndex?: boolean;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Efren Castro — solutions architect, public notes, and work in progress."
        />
        <meta
          name="theme-color"
          content={lightTheme['--ae-background']}
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content={darkTheme['--ae-background']}
          media="(prefers-color-scheme: dark)"
        />
        {noIndex && <meta name="robots" content="noindex, nofollow" />}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap() }} />
        <script
          dangerouslySetInnerHTML={{ __html: observationMotionBootstrap() }}
        />
        <link rel="stylesheet" href={stylesUrl} />
        <link rel="stylesheet" href={readingsStylesUrl} />
        <link rel="stylesheet" href={dashboardStylesUrl} />
        <title>Efren Castro — Public research</title>
      </head>
      <body>{children}</body>
    </html>
  );
}

export function Document({ children, request }: DocumentProps) {
  return (
    <DocumentContent
      noIndex={new URL(request.url).pathname === '/readings/demo'}
    >
      {children}
    </DocumentContent>
  );
}
