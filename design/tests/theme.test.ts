import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { themeBootstrap } from '../behaviors/theme.ts';

function fixture(saved: string | null, blocked = false) {
  const attributes = new Map<string, string>();
  const listeners = new Map<string, () => void>();
  const buttons = ['system', 'light', 'dark'].map((choice) => {
    const values = new Map([['data-theme-choice', choice]]);
    return {
      getAttribute: (key: string) => values.get(key),
      setAttribute: (key: string, value: string) => values.set(key, value),
      classList: { toggle() {} },
      closest() {
        return this;
      },
    };
  });
  let observe = () => {};
  const document = {
    readyState: 'loading',
    documentElement: {
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      removeAttribute: (key: string) => attributes.delete(key),
    },
    querySelectorAll: () => buttons,
    addEventListener: (name: string, handler: () => void) =>
      listeners.set(name, handler),
  };
  const storage = {
    getItem() {
      if (blocked) throw Error('blocked');
      return saved;
    },
    setItem(_key: string, value: string) {
      if (blocked) throw Error('blocked');
      saved = value;
    },
    removeItem() {
      if (blocked) throw Error('blocked');
      saved = null;
    },
  };
  runInNewContext(themeBootstrap(), {
    document,
    window: {
      get localStorage() {
        if (blocked) throw Error('blocked');
        return storage;
      },
    },
    MutationObserver: class {
      constructor(callback: () => void) {
        observe = callback;
      }
      observe() {}
    },
  });
  return {
    theme: () => attributes.get('data-theme'),
    saved: () => saved,
    selected: () =>
      buttons
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
        .map((button) => button.getAttribute('data-theme-choice')),
    click: (index: number) =>
      (listeners.get('click') as unknown as (event: unknown) => void)({
        target: buttons[index],
      }),
    replaceContent: () => {
      buttons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
      observe();
    },
  };
}

test('saved preference applies before page readiness and system removes it', () => {
  const page = fixture('dark');
  assert.equal(page.theme(), 'dark');
  assert.deepEqual(page.selected(), ['dark']);
  page.click(1);
  assert.equal(page.theme(), 'light');
  assert.equal(page.saved(), 'light');
  page.click(0);
  assert.equal(page.theme(), undefined);
  assert.equal(page.saved(), null);
  assert.deepEqual(page.selected(), ['system']);
});

test('unknown saved preference follows system', () => {
  assert.equal(fixture('invented').theme(), undefined);
});

test('blocked storage still permits changes and replaced controls retain selection', () => {
  const page = fixture(null, true);
  page.click(2);
  page.replaceContent();
  assert.equal(page.theme(), 'dark');
  assert.deepEqual(page.selected(), ['dark']);
});
