import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * The CLI binary is `capt`. This suite pins the shipped identity so a future
 * rename cannot half-land: the package must expose exactly one bin, the shim
 * must be the file that bin points at, and that shim must resolve the tsc
 * output the daemon actually runs. `od` is deliberately not aliased — see
 * `docs/plans/capydesign-rebrand/prompts/05-cli-bin-rename.md`.
 */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(
  readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
) as { bin?: Record<string, string> };
const binDir = resolve(packageRoot, 'bin');
const shimPath = resolve(binDir, 'capt.mjs');
const distEntry = resolve(packageRoot, 'dist/cli.js');

describe('daemon CLI bin shim', () => {
  test('exposes exactly the capt bin, with no od alias', () => {
    expect(packageJson.bin).toEqual({ capt: './bin/capt.mjs' });
    expect(packageJson.bin).not.toHaveProperty('od');
  });

  test('ships a single shim file, the sanctioned .mjs in this package', () => {
    expect(readdirSync(binDir)).toEqual(['capt.mjs']);
  });

  test('the shim resolves the built CLI entry', () => {
    expect(existsSync(shimPath)).toBe(true);
    const source = readFileSync(shimPath, 'utf8');
    // The shim loads the compiled CLI and names the product when it is absent.
    expect(source).toContain('"../dist/cli.js"');
    expect(source).toContain('CapyDesign daemon dist entry not found');
    // In a built tree the entry the shim loads exists, so `capt <subcommand>`
    // cannot fail on a missing dist file.
    if (existsSync(resolve(packageRoot, 'dist'))) {
      expect(existsSync(distEntry)).toBe(true);
    }
  });
});
