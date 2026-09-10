import { ActionLink } from '../../../design/ui/ActionLink.tsx';
import { birdShapes } from './bird-shapes.ts';

const birds = [
  { x: 420, y: 280, scale: .58, angle: 9, shape: 1, opacity: .42, enter: 0, duration: 0.9 },
  { x: 760, y: 190, scale: .7, angle: -12, shape: 0, opacity: .55, enter: 0, duration: 1.1 },
  { x: 1160, y: 240, scale: .62, angle: 12, shape: 2, opacity: .36, enter: 0, duration: 0.8 },
  { x: 870, y: 510, scale: 1.65, angle: -9, shape: 0, opacity: .95, enter: 0, duration: 1 },
  { x: 1280, y: 620, scale: .78, angle: 11, shape: 1, opacity: .62, enter: 0, duration: 0.95 },
  { x: 590, y: 730, scale: .9, angle: -18, shape: 0, opacity: .4, enter: 0, duration: 0.85 },
  { x: 1030, y: 850, scale: .95, angle: 16, shape: 2, opacity: .78, enter: 0, duration: 1.05 },
  { x: 280, y: 600, scale: .6, angle: -19, shape: 1, opacity: .55, enter: 0, duration: 0.9 }
] as const;

function detectionBox(scale: number, shape: number, index: number) {
  const x = Math.max(19, (shape === 2 ? 36 : 48) * scale);
  const y = Math.max(17, (shape === 0 ? 27 : 39) * scale);
  const corner = 6 + index % 4 * 3;
  return `M${-x} ${-y + corner}V${-y}H${-x + corner}M${x - corner} ${-y}H${x}V${-y + corner}M${-x} ${y - corner}V${y}H${-x + corner}M${x - corner} ${y}H${x}V${y - corner}`;
}

export function OpenField() {
  return <>
    <div className="open-field-background" aria-hidden="true">
      <svg className="open-field-art" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
        <g className="observation-birds">
          <g className="observation-grid" fill="none" stroke="var(--ae-line)" strokeWidth="1" opacity=".7">
            {Array.from({ length: 17 }, (_, i) => <path key={`v${i}`} d={`M${i * 90} 0V1000`} />)}
            {Array.from({ length: 12 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 90}H1440`} />)}
          </g>
          <g className="observation-mobile-scene">
            <g className="observation-trails" fill="none" stroke="var(--ae-muted)" strokeWidth="1" strokeDasharray="3 9" opacity=".5">
              <path d="M180 680C290 580 340 350 420 280S650 170 760 190S1040 350 1160 240" />
              <path d="M370 820C480 750 630 560 870 510S1180 500 1280 620" />
              <path d="M210 460C360 430 460 730 590 730S850 960 1030 850" />
            </g>
            {birds.map((bird, index) => <g key={index} transform={`translate(${bird.x} ${bird.y})`}>
              <g className={`observation-flight observation-flight-${index}`} style={{ animationDelay: `${bird.enter}s`, animationDuration: `${bird.duration}s` }}>
                <g fill="var(--ae-body-copy)" opacity={bird.opacity} transform={`rotate(${bird.angle}) scale(${bird.scale})`}><path d={birdShapes[bird.shape]} /></g>
                {index === 3 && <g className="observation-lock" style={{ animationDelay: `${bird.enter + bird.duration * .72}s`, animationDuration: `${bird.duration * .28}s` }} fill="none" stroke="var(--ae-theme-accent)" strokeWidth={index === 3 ? 1.8 : 1.2} opacity={.48 + index % 3 * .2}>
                  <path d={detectionBox(bird.scale, bird.shape, index)} />
                </g>}
              </g>
            </g>)}
          </g>
        </g>
        <g className="observation-galaxy" opacity=".45"><image href="/assets/galaxy-illustrated.png" width="1440" height="1000" preserveAspectRatio="xMidYMid slice" /></g>
      </svg>
    </div>
    <section className="open-field-intro" aria-labelledby="home-title">
      <h1 id="home-title">My workbench<br /><em>for observability</em><br />in the AI era.</h1>
      <p>A place to explore, experiment,<br />and share what I notice.</p>
      <div className="open-field-actions"><ActionLink variant="primary" href="/readings">Explore the readings</ActionLink><ActionLink href="/about">About me</ActionLink></div>
    </section>
  </>;
}
