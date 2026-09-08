import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Keyboard focus on form controls must be as visible as button focus.
// Buttons use `button:focus-visible { outline: 1px solid var(--blue) ... }`;
// inputs/selects/textareas must not settle for a border-color shift with
// `outline: none`.
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

describe('form control focus visibility', () => {
  it.each([['input'], ['textarea'], ['select']])(
    'gives %s a visible focus-visible outline instead of outline:none',
    (element) => {
      const block = new RegExp(`${element}:focus-visible[^{]*\\{([^}]*)\\}`).exec(css)?.[1];
      expect(block, `${element}:focus-visible block`).toBeDefined();
      expect(block).toMatch(/outline:\s*var\(--stroke-thin/);
      expect(block).not.toMatch(/outline:\s*none/);
    },
  );

  it('keeps the entry sidebar halo-only (quiet panel exemption)', () => {
    const block = /\.entry-side input:focus-visible[^{]*\{([^}]*)\}/.exec(css)?.[1];
    expect(block, '.entry-side focus-visible block').toBeDefined();
    expect(block).toMatch(/outline:\s*none/);
  });
});
