import { describe, expect, it } from 'vitest';
import { readExpandedIndexCss } from '../helpers/read-expanded-css';

// Light-only theme contract (see the contract comment in
// `src/styles/tokens.css` and `FORCED_APP_THEME` in
// `src/state/appearance.ts`): `data-theme` is always stamped `light`, so
// dark-gated app-shell rules could never match. This test fails the build
// if one is reintroduced. Embedded surfaces that follow the OS (terminal,
// canvas, third-party logos) read `prefers-color-scheme` in their own
// modules and are unaffected — this covers the shared stylesheets only.
const appShellCss = readExpandedIndexCss().replace(/\/\*[\s\S]*?\*\//g, '');

describe('light-only theme contract', () => {
  it('ships no dark-theme selector overrides in app-shell styles', () => {
    expect(appShellCss).not.toMatch(/\[data-theme\s*=\s*(?:"dark"|'dark')/);
    expect(appShellCss).not.toMatch(/html:not\(\[data-theme\]/);
  });

  it('ships no dark system-mode media blocks in app-shell styles', () => {
    expect(appShellCss).not.toMatch(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/);
  });
});
