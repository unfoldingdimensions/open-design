/**
 * Unit tests for resolveDefaultDataDir — the single resolver for the default
 * (env-less) daemon data directory after the `.od` -> `.capydesign` rename.
 *
 * Precedence: an existing `.capydesign` wins; otherwise an existing legacy
 * `.od` is used as-is; otherwise a fresh install defaults to `.capydesign`.
 * The legacy directory is never deleted or migrated, so old and new data
 * directories can coexist.
 */
import os from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DATA_DIR_NAME,
  LEGACY_DATA_DIR_NAME,
  resolveDefaultDataDir,
} from '../src/daemon-paths.js';

describe('resolveDefaultDataDir', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(os.tmpdir(), 'rdd-default-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('names the rebranded data dir .capydesign and keeps .od as legacy', () => {
    expect(DATA_DIR_NAME).toBe('.capydesign');
    expect(LEGACY_DATA_DIR_NAME).toBe('.od');
  });

  it('defaults to .capydesign for a fresh install', () => {
    expect(resolveDefaultDataDir(projectRoot)).toBe(path.join(projectRoot, '.capydesign'));
  });

  it('falls back to a legacy .od when only .od exists, and never migrates it', () => {
    const legacy = path.join(projectRoot, '.od');
    mkdirSync(legacy, { recursive: true });
    expect(resolveDefaultDataDir(projectRoot)).toBe(legacy);
    // Additive: the legacy dir is still there after resolution.
    expect(resolveDefaultDataDir(projectRoot)).toBe(legacy);
  });

  it('prefers .capydesign when both directories exist', () => {
    mkdirSync(path.join(projectRoot, '.od'), { recursive: true });
    const preferred = path.join(projectRoot, '.capydesign');
    mkdirSync(preferred, { recursive: true });
    expect(resolveDefaultDataDir(projectRoot)).toBe(preferred);
  });
});
