import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readExpandedIndexCss } from '../helpers/read-expanded-css';

// Theme contract (see the contract comment in `src/styles/tokens.css` and
// `FORCED_APP_THEME` in `src/state/appearance.ts`): the app stamps
// `data-theme="light"` at boot, so dark-gated app-shell rules never match.
// Dormant dark blocks from upstream are tolerated below the pin but must
// never become reachable — these tests fail the build if the pin goes away
// while dark rules remain. Embedded surfaces that follow the OS (terminal,
// canvas, third-party logos) read `prefers-color-scheme` in their own
// modules and are unaffected — this covers the shared stylesheets only.
const appShellCss = readExpandedIndexCss().replace(/\/\*[\s\S]*?\*\//g, '');
const appearanceTs = readFileSync(
  new URL('../../src/state/appearance.ts', import.meta.url),
  'utf8',
);

describe('light-only theme contract', () => {
  it('keeps the force-light pin that makes dark rules dormant', () => {
    expect(appearanceTs).toContain(`FORCED_APP_THEME = 'light'`);
    expect(appearanceTs).toMatch(/setAttribute\('data-theme',\s*FORCED_APP_THEME\)/);
  });

  it('tolerates dormant dark-theme selectors only behind the pin', () => {
    expect(appearanceTs).toContain(`FORCED_APP_THEME = 'light'`);
    expect(appShellCss).not.toMatch(/\[data-theme\s*=\s*(?:"light"|'light')/);
  });

  it('tolerates dormant dark system-mode media blocks only behind the pin', () => {
    expect(appearanceTs).toContain(`FORCED_APP_THEME = 'light'`);
    expect(appShellCss).toMatch(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/);
  });
});
