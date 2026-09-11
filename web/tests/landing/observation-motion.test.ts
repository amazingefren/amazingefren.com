import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { observationMotionBootstrap } from '../../ui/landing/observation-motion.ts';

function fixture(
  reduced = false,
  mounted = true,
  theme: string | null = null,
  systemDark = false,
) {
  const attributes = new Map<string, string>();
  if (theme) attributes.set('data-theme', theme);
  const listeners = new Map<string, (event?: unknown) => void>();
  let observe = () => {};
  let change = () => {};
  let schemeChange = () => {};
  const scene = {};
  const document = {
    hidden: false,
    documentElement: {
      getAttribute: (key: string) => attributes.get(key) ?? null,
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      removeAttribute: (key: string) => attributes.delete(key),
    },
    querySelector: () => (mounted ? scene : null),
    addEventListener: (name: string, handler: (event?: unknown) => void) =>
      listeners.set(name, handler),
  };
  const media = {
    matches: reduced,
    addEventListener: (_name: string, handler: () => void) => {
      change = handler;
    },
  };
  const scheme = {
    matches: systemDark,
    addEventListener: (_name: string, handler: () => void) => {
      schemeChange = handler;
    },
  };
  runInNewContext(observationMotionBootstrap(), {
    document,
    window: {
      matchMedia: (query: string) =>
        query.includes('color-scheme') ? scheme : media,
    },
    MutationObserver: class {
      constructor(callback: () => void) {
        observe = callback;
      }
      observe() {}
    },
  });
  return {
    theme: (value: string | null) => {
      if (value) attributes.set('data-theme', value);
      else attributes.delete('data-theme');
      observe();
    },
    systemDark: (value: boolean) => {
      scheme.matches = value;
      schemeChange();
    },
    state: () => attributes.get('data-observation-motion'),
    birds: () => attributes.get('data-observation-birds'),
    visibility: (hidden: boolean) => {
      document.hidden = hidden;
      listeners.get('visibilitychange')?.();
    },
    preference: (value: boolean) => {
      media.matches = value;
      change();
    },
    finish: (name: string) =>
      listeners.get('animationend')?.({ animationName: name }),
    mount: (value: boolean) => {
      mounted = value;
      observe();
    },
  };
}

test('bird motion starts when its scene arrives without requiring a control', () => {
  const page = fixture(false, false);
  assert.equal(page.state(), undefined);
  assert.equal(page.birds(), 'entering');
  page.mount(true);
  assert.equal(page.state(), 'running');
  page.mount(false);
  assert.equal(page.state(), undefined);
});

test('hidden pages pause and resume the bird entrance', () => {
  const page = fixture();
  page.visibility(true);
  assert.equal(page.state(), 'paused');
  page.visibility(false);
  assert.equal(page.state(), 'running');
});

test('reduced motion skips the entrance and restores a static final bird scene', () => {
  const page = fixture(true);
  assert.equal(page.state(), 'static');
  assert.equal(page.birds(), 'settled');
  page.preference(false);
  assert.equal(page.state(), 'running');
  assert.equal(page.birds(), 'settled');
  page.preference(true);
  assert.equal(page.state(), 'static');
});

test('only the full entrance finishes the sequence and it stays settled across navigation', () => {
  const page = fixture();
  page.finish('ae-observation-flight');
  assert.equal(page.birds(), 'entering');
  page.finish('ae-observation-lock');
  assert.equal(page.birds(), 'entering');
  page.finish('ae-observation-trails');
  assert.equal(page.birds(), 'settled');
  page.mount(false);
  page.mount(true);
  assert.equal(page.birds(), 'settled');
});

test('reduced motion stays visible even before the streamed scene mounts', () => {
  const page = fixture(true, false);
  assert.equal(page.birds(), 'settled');
  page.mount(true);
  assert.equal(page.state(), 'static');
  assert.equal(page.birds(), 'settled');
});

test('dark startup waits for light before consuming the bird entrance', () => {
  const page = fixture(false, true, 'dark');
  assert.equal(page.state(), 'static');
  assert.equal(page.birds(), 'waiting');
  page.finish('ae-observation-trails');
  page.theme('light');
  assert.equal(page.state(), 'running');
  assert.equal(page.birds(), 'entering');
  page.finish('ae-observation-trails');
  page.theme('dark');
  page.theme('light');
  assert.equal(page.birds(), 'settled');
});

test('system theme changes reveal birds while explicit theme overrides remain authoritative', () => {
  const page = fixture(false, true, null, true);
  assert.equal(page.birds(), 'waiting');
  page.systemDark(false);
  assert.equal(page.birds(), 'entering');
  page.theme('dark');
  page.systemDark(true);
  page.systemDark(false);
  assert.equal(page.birds(), 'waiting');
  page.theme('light');
  page.systemDark(true);
  assert.equal(page.birds(), 'entering');
});

test('dark-to-light respects reduced motion and document visibility', () => {
  const reduced = fixture(true, true, 'dark');
  reduced.theme('light');
  assert.equal(reduced.state(), 'static');
  assert.equal(reduced.birds(), 'settled');
  const hidden = fixture(false, true, 'dark');
  hidden.visibility(true);
  hidden.theme('light');
  assert.equal(hidden.state(), 'paused');
  assert.equal(hidden.birds(), 'entering');
  hidden.visibility(false);
  assert.equal(hidden.state(), 'running');
});
