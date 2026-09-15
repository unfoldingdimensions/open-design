import { describe, expect, it } from 'vitest';

import {
  BRAND_USAGE,
  isBrandHelpArg,
} from '../src/cli-help/index.js';

describe('capt brand help surface', () => {
  it('routes help, --help, and -h to the usage text', () => {
    expect(isBrandHelpArg('help')).toBe(true);
    expect(isBrandHelpArg('--help')).toBe(true);
    expect(isBrandHelpArg('-h')).toBe(true);
  });

  it('does not treat subcommands or a missing arg as a help request', () => {
    expect(isBrandHelpArg('list')).toBe(false);
    expect(isBrandHelpArg('continue')).toBe(false);
    expect(isBrandHelpArg(undefined)).toBe(false);
  });

  it('advertises deterministic retry alongside the other brand commands', () => {
    expect(BRAND_USAGE).toContain('capt brand list');
    expect(BRAND_USAGE).toContain('capt brand create');
    expect(BRAND_USAGE).toContain('capt brand continue');
    expect(BRAND_USAGE).toContain('capt brand extract-from-html');
    expect(BRAND_USAGE).toContain('capt brand finalize');
  });
});
