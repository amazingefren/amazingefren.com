import type { DesignManifest } from './contracts/design.schema.ts';

export default {
  kind: 'system',
  id: 'design',
  name: 'AE Design',
  purpose: 'Own the shared visual language and interaction rules for AE interfaces.',
  owner: 'amazingefren',
  status: 'declared',
  scope: 'required',
  visibility: 'public',
  context: {
    decisions: [
      'This manifest and its referenced contracts are the design source of truth. Feature manifests own content, routes, operations, access, and page-specific composition.',
      'Approved visual direction: sun/light uses orange accents and the warm Shared circles mark; moon/dark uses blue accents and the blue mark. Keep warm paper, dark navy, restrained rules, and rounded workspace controls.',
      'Use sans serif for interfaces and body copy, serif for editorial emphasis and reading, and monospace for short metadata. Do not add font downloads.',
      'Keep content direct. Reuse approved personal text. Synthetic data and unavailable states must be explicit.',
      'Tokens compile into checked-in CSS so pages remain usable without JavaScript or private engines. Compiled CSS and served logo copies are not editing entrypoints.',
      'The existing guest dashboard palette is retained as legacy tokens. It is not the approved specification for the next workbench.',
      'Public design checks are small drift checks, not a replacement for the future private system engine or visual review.'
    ],
    openQuestions: ['Dialogs, menus, and editor layout still need complete interaction review. Dashboard and Systems visual direction is approved; this is not application implementation approval.']
  },
  capabilities: ['foundations', 'brand', 'behaviors', 'components', 'design-validation'],
  governance: { permissionsDefined: [], dataClassification: 'public' },
  risks: [],
  dependencies: [],
  schemaVersion: 5,
  languageVersion: 2,
  foundations: {
    source: 'design/foundations/tokens.ts',
    stylesheet: 'design/foundations/tokens.css',
    rules: [
      'Use --ae-* semantic colors; never introduce local hex, RGB, HSL, or named palette values. The artwork exception is limited to the declared illustration file.',
      'Use the shared font families, text sizes, space scale, focus tokens, and control radii. Local grid geometry and responsive composition belong to the owning page.',
      'Do not override a canonical token in feature CSS. Add a justified token or an approved pattern in AE Design.',
      'Use flat panels and fine borders. Gradients belong to the dark public background and approved artwork; no new gradients, shadows, decorative badges, or animation without a reviewed pattern.',
      'The existing text scale includes editorial sizes. Small metadata sizes are not a license to shrink body copy or controls.'
    ]
  },
  brand: {
    contract: 'design/brand/brand.ts',
    component: 'design/ui/BrandMark.tsx',
    rules: [
      'Use the Shared circles asset through BrandMark. Keep its viewBox, proportions, path geometry, and gradient stop positions. Theme colors use the declared asset variants.',
      'Use BrandMark variant theme for interfaces adopting the sun/moon design. It uses the warm color mark in light mode and blue in dark mode. Existing public consumers stay unchanged until their migration. The light monochrome variant is for dark backgrounds only.',
      'Keep surrounding text and icons clear of the mark. Use the standard navigation size unless a reviewed composition declares another size.',
      'Never redraw the mark, invent initials badges or module logos, stretch it, recolor it with filters, or add shadows.',
      'A decorative mark beside the site name has empty alternative text. A standalone meaningful mark requires an accessible name.'
    ]
  },
  behaviors: [
    { id: 'design.theme', status: 'approved', purpose: 'Select a local display preference.', implementation: 'design/behaviors/theme.ts', rules: ['System, light, and dark are the only choices.', 'Use ae-theme storage and data-theme on the document root. System removes the explicit override.', 'Apply before paint; storage failure must not block the page.', 'Use the shared bootstrap and ThemeControl. Theme changes grant no permissions and send no analytics.'] },
    { id: 'design.navigation', status: 'approved', purpose: 'Keep navigation and commands distinct.', implementation: null, rules: ['Links navigate or download; buttons perform actions.', 'Set aria-current on the current destination. Never mark a disabled destination as a working link.', 'Keep public navigation separate from the workbench sidebar.', 'Icon-only controls need accessible names. Decorative arrows are hidden from assistive technology.'] },
    { id: 'design.focus', status: 'approved', purpose: 'Support keyboard and pointer access.', implementation: 'design/ui/primitives.css', rules: ['Keep a visible focus ring. Do not remove outlines without the shared replacement.', 'Preserve browser shortcuts and editable input behavior.', 'Workbench shortcuts use manifest-declared remappable Vim profiles with a disable option. No shortcut engine is implemented by AE Design.', 'Native controls are the baseline. Custom focus traps, menus, and dialogs need a reviewed pattern.'] },
    { id: 'design.states', status: 'approved', purpose: 'Make state and failures visible.', implementation: null, rules: ['Specify loading, empty, error, unavailable, disabled, and success behavior for each operation-backed control.', 'Use text with status styling; never rely on color alone.', 'Keep unknown values distinct from measured zero. Do not invent progress or live data.', 'Prevent duplicate submissions while pending. Preserve user input after a failed request.', 'Disabled controls must explain their limitation. UI state never substitutes for server authorization.'] },
    { id: 'design.motion', status: 'approved', purpose: 'Keep motion optional.', implementation: 'design/ui/primitives.css', rules: ['Respect prefers-reduced-motion.', 'No new autoplay motion, flicker, or attention loops.', 'Static CRT texture belongs only to the approved research artwork.'] }
  ],
  components: [
    { id: 'design.navigation-selection', status: 'approved', purpose: 'Identify the current destination with a soft filled shape.', implementation: 'design/ui/primitives.css', rules: ['Apply ae-nav-item to a real navigation link. aria-current=page selects the rounded theme fill and stronger label.', 'Keep every edge free of decorative stripes. Preserve a full visible keyboard focus ring.', 'Use buttons for actions and do not mark unavailable pages as working links.'] },
    { id: 'design.brand-mark', status: 'approved', purpose: 'Render the canonical brand asset.', implementation: 'design/ui/BrandMark.tsx', rules: ['Use color by default; provide a label only when the mark conveys information without adjacent text.'] },
    { id: 'design.theme-control', status: 'approved', purpose: 'Render the theme selector.', implementation: 'design/ui/ThemeControl.tsx', rules: ['Use with the shared theme bootstrap; aria-pressed tracks the selected preference.'] },
    { id: 'design.action-link', status: 'approved', purpose: 'Render a primary navigation action or a text link.', implementation: 'design/ui/ActionLink.tsx', rules: ['Use primary for the main destination, text for secondary destinations. Do not use a link for mutations.'] },
    { id: 'design.download-group', status: 'approved', purpose: 'Present equivalent document downloads together.', implementation: 'design/ui/DownloadGroup.tsx', rules: ['Each link names its format and downloads a real file. Collapse vertically on narrow screens.'] }
  ],
  patterns: [
    { id: 'design.public-shell', status: 'approved', purpose: 'Frame the public pages.', implementation: 'web/adapters/http/public.tsx', rules: ['Use the existing brand, public navigation, theme selector, skip link, and footer. Feature content goes inside the shell.'] },
    { id: 'design.about', status: 'approved', purpose: 'Present the owner profile.', implementation: 'web/ui/portfolio/AboutProfile.tsx', rules: ['Compact identity beside the approved bio; resume downloads and contact align below it. Stack at narrow widths.'] },
    { id: 'design.research-field', status: 'approved', purpose: 'Illustrate the public home.', implementation: 'web/ui/landing/ObservationField.tsx', rules: ['Static recessed window; birds on light paper in dark mode, illustrated galaxy in light mode.', 'This artwork is illustrative, not measured telemetry. Do not reuse its texture as workbench chrome.'] },
    { id: 'design.reading', status: 'approved', purpose: 'Present readable articles.', implementation: 'web/adapters/http/public.tsx', rules: ['Use the existing serif reading column and semantic article structure. Keep published content usable without JavaScript.'] },
    { id: 'design.guest-dashboard', status: 'legacy', purpose: 'Preserve the existing public synthetic dashboard.', implementation: 'dashboard/ui/guest/index.tsx', rules: ['Keep current rendering during migration. Do not copy this palette into new workbench features.'] },
    { id: 'design.workbench-status', status: 'approved', purpose: 'Distinguish work states and soften workspace controls.', implementation: null, rules: ['Owner accepted sun/moon workspace colors, distinct review states, and rounded controls on 2026-09-09.', 'Use status-progress for active work, status-ready for reviewable work, and status-attention for unresolved decisions. Always show a text label.', 'Use workbench radius tokens for cards, controls, and dialogs. Existing public radii remain unchanged.', 'Workspace accents are orange in light mode and blue in dark mode: sun and moon, as requested by the owner. The workbench active-surface gradient is limited to the featured in-progress card: warm orange in light mode, deep blue in dark mode. Navigation selection uses the workspace theme accent. The workbench shadow token provides restrained card elevation. Other panels stay flat.', 'Use neutral semantic theme tokens for shared palette adoption. Review each new consumer in both themes and mobile; the accepted visual direction does not prove accessibility or runtime behavior.'] },
    { id: 'design.workbench-shell', status: 'approved', purpose: 'Frame the accepted dashboard and Systems workspace.', implementation: null, rules: ['Owner accepted the workspace visual direction on 2026-09-09, with the sidebar stripe removed.', 'Group Dashboard, Documents, Tasks, Experiments, Relationships, Publishing, Systems, Connections, and Access under Personal workspace; keep Public side separate.', 'Current navigation uses a rounded soft fill, theme-colored icon and label, and medium text weight. No edge stripe, inset stripe shadow, or decorative side marker. Use design.navigation-selection.', 'Open the dashboard on counts and work. Preserve the module-first Systems explorer with search, dependencies, contracts, bindings, and local console.', 'Remove taglines, generic introductions, obvious interaction instructions, and redundant labels. Keep useful status, data source, and failure information.', 'Keep 14px controls and at least 12px metadata. Workspace cards use 14px corners and controls use 8px corners.', 'The visual direction is approved; production routes, authorization, adapters, and behavior still require implementation and verification.'] },
    { id: 'design.overlays', status: 'proposed', purpose: 'Standardize dialogs, menus, and command palettes.', implementation: null, rules: ['Review dismissal, focus restoration, keyboard behavior, and mobile layout before implementation.'] }
  ],
  adoption: {
    consumers: ['web', 'dashboard', 'studio', 'system-explorer'],
    stylesheet: 'design/ui/index.css',
    componentEntrypoint: 'design/ui/index.ts',
    themeBootstrap: 'design/behaviors/theme.ts',
    exceptions: [{ path: 'web/ui/landing/ObservationField.tsx', reason: 'Illustration-specific SVG colors and geometry; not interface chrome.' }],
    changeProcess: [
      'Read this manifest and the owning system manifest before UI work. Reuse approved components and patterns by their stable IDs.',
      'Public-page migration: adopt --ae-theme-accent, --ae-theme-accent-soft, --ae-theme-accent-contrast, and --ae-theme-ambient plus BrandMark variant theme. The older --ae-accent tokens retain existing public rendering until each consumer migrates.',
      'Keep approved public content, routes, artwork geometry, and reading behavior during visual migration. Workspace status-card gradients belong only to status cards; do not spread them across public page backgrounds.',
      'Read tokens.ts for foundation values, brand.ts for assets, and theme.ts for theme behavior. Never create parallel theme or logo implementations.',
      'If a required pattern is missing, declare it as proposed with its states and owning paths. Obtain prototype approval before adding new visual language.',
      'Use one writer for shared design files. Feature agents own their page composition and must coordinate changes to AE Design.',
      'Change a foundation at its source, run npm run design:sync, then mise run check and npm test. Review affected pages in both themes and narrow layouts.',
      'Keep exceptions explicit, narrow, and justified in this manifest. Do not add exceptions merely to silence a failing check.'
    ]
  },
  verification: {
    command: 'mise run check',
    tests: ['design/tests/design.test.ts', 'design/tests/theme.test.ts'],
    limits: ['Static checks catch token drift, missing references, and raw style values; they do not prove accessibility or visual quality.', 'Focus order, browser theme behavior, and layout still need browser review.', 'Private prototypes and engines are not scanned by public checks.']
  },
  contracts: ['design/contracts/design.schema.ts', 'design/foundations/tokens.ts', 'design/brand/brand.ts', 'design/behaviors/theme.ts'],
  operations: [],
  events: [],
  capabilityPaths: { foundations: 'design/foundations', brand: 'design/brand', behaviors: 'design/behaviors', components: 'design/ui', 'design-validation': 'design/tests' },
  structure: { contracts: 'design/contracts', adapters: 'design/adapters' },
  entrypoints: ['design/ui/index.ts', 'design/ui/index.css', 'design/adapters/css/render.ts', 'design/adapters/css/sync.ts', 'design/tests/check.ts']
} as const satisfies DesignManifest;
