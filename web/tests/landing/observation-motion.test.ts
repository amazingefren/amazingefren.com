import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { observationMotionBootstrap } from '../../ui/landing/observation-motion.ts';

function fixture(reduced = false, mounted = true) {
  const attributes = new Map<string, string>();
  const listeners = new Map<string, (event?: unknown) => void>();
  let observe = () => {};
  let change = () => {};
  const scene = {};
  const document = {
    hidden: false,
    documentElement: { setAttribute: (key: string, value: string) => attributes.set(key, value), removeAttribute: (key: string) => attributes.delete(key) },
    querySelector: () => mounted ? scene : null,
    addEventListener: (name: string, handler: (event?: unknown) => void) => listeners.set(name, handler)
  };
  const media = { matches: reduced, addEventListener: (_name: string, handler: () => void) => { change = handler; } };
  runInNewContext(observationMotionBootstrap(), {
    document,
    window: { matchMedia: () => media },
    MutationObserver: class { constructor(callback: () => void) { observe = callback; } observe() {} }
  });
  return {
    state: () => attributes.get('data-observation-motion'),
    birds: () => attributes.get('data-observation-birds'),
    visibility: (hidden: boolean) => { document.hidden = hidden; listeners.get('visibilitychange')?.(); },
    preference: (value: boolean) => { media.matches = value; change(); },
    finish: (name: string) => listeners.get('animationend')?.({ animationName: name }),
    mount: (value: boolean) => { mounted = value; observe(); }
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
