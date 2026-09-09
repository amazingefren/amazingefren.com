const birdShapes = [
  'M-36-16C-24-15-13-8-3-1L2-5L6-4L11-3L6 0C20-4 32-10 43-11C35-3 22 5 7 5L-3 19L0 4C-16-1-28-8-36-16Z',
  'M-25-24C-11-21-5-12 1-2C11-9 26-14 37-11C25-7 17-2 7 3L4 7L-3 20L-2 4C-10-4-14-15-25-24Z',
  'M-16-32C-5-26 2-16 4-4C13-15 18-22 29-29C24-13 17-4 8 4L2 18L-2 5C-9-6-11-18-16-32Z',
];
const flock = [
  { x: 214, y: 259, scale: .48, angle: 9, shape: 1, opacity: .42 },
  { x: 282, y: 217, scale: .62, angle: -12, shape: 0, opacity: .55 },
  { x: 380, y: 195, scale: .45, angle: 12, shape: 2, opacity: .36 },
  { x: 364, y: 281, scale: 1.32, angle: -9, shape: 0, opacity: .95 },
  { x: 465, y: 239, scale: .72, angle: 11, shape: 1, opacity: .62 },
  { x: 536, y: 284, scale: .46, angle: -18, shape: 0, opacity: .4 },
  { x: 440, y: 335, scale: .91, angle: 16, shape: 2, opacity: .78 },
  { x: 287, y: 342, scale: .71, angle: -19, shape: 1, opacity: .55 },
];

export function ObservationField() {
  return (
    <svg className="observation-field" viewBox="0 40 720 480" role="img" aria-label="Illustrative research field: a bird observation lab in dark mode and an illustrative galaxy in light mode">
      <defs>
        <pattern id="field-scanlines" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 3.5H4" stroke="#020613" strokeWidth="1" strokeOpacity=".32" /></pattern>
        <pattern id="field-phosphor" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M.5 0V3" stroke="#ff816d" strokeOpacity=".045" /><path d="M1.5 0V3" stroke="#b0ebd0" strokeOpacity=".035" /><path d="M2.5 0V3" stroke="#8baaff" strokeOpacity=".05" /></pattern>
        <radialGradient id="field-glass" cx="43%" cy="36%" r="75%"><stop stopColor="#e1edff" stopOpacity=".035" /><stop offset=".6" stopColor="#030813" stopOpacity="0" /><stop offset="1" stopColor="#030813" stopOpacity=".2" /></radialGradient>
        <filter id="field-recess" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="9" /></filter>
        <linearGradient id="field-edge" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--field-edge-top)" /><stop offset=".55" stopColor="var(--field-edge-side)" /><stop offset="1" stopColor="var(--field-edge-bottom)" /></linearGradient>
        <linearGradient id="eye-lid" x1="110" y1="140" x2="570" y2="424" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--palette-dark-amber)" /><stop offset=".36" stopColor="var(--palette-dark-orange)" /><stop offset=".7" stopColor="var(--palette-dark-red)" /><stop offset="1" stopColor="var(--palette-dark-plum)" />
        </linearGradient>
        <clipPath id="eye-window"><rect x="22" y="52" width="676" height="456" rx="160" /></clipPath>
      </defs>
      <rect x="20.5" y="50.5" width="679" height="459" rx="161.5" fill="none" stroke="url(#field-edge)" strokeWidth="var(--field-lip-width)" />
      <g clipPath="url(#eye-window)">
        <g className="eye-sky">
          <rect x="0" y="0" width="720" height="560" fill="#f5f0e8" />
          <g fill="none" stroke="#506b82" strokeWidth=".7" opacity=".18">
            <path d="M180 170V390M240 150V407M300 140V420M360 134V427M420 140V420M480 150V407M540 170V390" />
            <path d="M170 190H550M120 250H600M115 310H605M182 370H538" />
          </g>
          <g fill="none" stroke="#587289" strokeWidth="1" strokeLinecap="round">
            <path d="M170 309C217 277 236 230 282 217C319 208 361 205 396 181" strokeDasharray="2 7" strokeOpacity=".48" />
            <path d="M230 324C275 281 321 302 364 281C406 260 423 235 465 239C501 243 524 267 560 278" strokeDasharray="3 7" strokeOpacity=".6" />
            <path d="M241 373C269 351 286 343 320 348C362 356 402 358 440 335C466 319 484 302 498 288" strokeDasharray="2 7" strokeOpacity=".45" />
          </g>
          <g fill="#253b50">
            {flock.map((bird, index) => <path key={index} d={birdShapes[bird.shape]} transform={`translate(${bird.x} ${bird.y}) rotate(${bird.angle}) scale(${bird.scale})`} opacity={bird.opacity} />)}
          </g>
          <g fill="none" stroke="#a76642" strokeWidth="1.1" strokeLinecap="square">
            <path d="M303 244V237H312M413 244V237H404M303 306V313H312M413 306V313H404" />
            <path d="M279 214H286M282 210V217M439 332H446M442 328V335" strokeOpacity=".6" />
          </g>
        </g>
        <g className="eye-galaxy">
          <image href="/assets/galaxy-illustrated.png" x="22" y="52" width="676" height="456" preserveAspectRatio="xMidYMid slice" />
          <g fill="none" stroke="#c5d2e7" strokeWidth=".6" strokeOpacity=".15">
            <path d="M100 220H620M85 280H635M110 340H610M190 100V460M360 75V485M530 100V460" />
          </g>
        </g>
      </g>
      <g clipPath="url(#eye-window)" pointerEvents="none">
        <rect x="22" y="52" width="676" height="456" fill="url(#field-scanlines)" />
        <rect x="22" y="52" width="676" height="456" fill="url(#field-phosphor)" />
        <rect x="22" y="52" width="676" height="456" fill="url(#field-glass)" />
      </g>
      <g clipPath="url(#eye-window)" fill="none">
        <rect x="22" y="45" width="676" height="463" rx="160" stroke="var(--field-recess)" strokeWidth="24" filter="url(#field-recess)" />
        <rect x="23" y="53" width="674" height="454" rx="159" stroke="var(--field-cut)" strokeWidth="2" />
      </g>
      <rect x="20.5" y="50.5" width="679" height="459" rx="161.5" fill="none" stroke="url(#field-edge)" strokeWidth="2" />
    </svg>
  );
}
