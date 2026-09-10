// Skill-staging skip-if-unchanged (perf fix #5).
//
// Measured: `stageActiveSkill` rm+copies every turn — p50 3.7ms for a 69KB
// skill, 59.6ms for the 1.3MB one. The copy exists as a write barrier, but
// nothing about an unchanged source requires re-copying it: skip when the
// staged fingerprint still matches the source, re-copy on source edits and
// on agent tampering with the staged copy.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stageActiveSkill } from '../src/cwd-aliases.js';

function makeSource(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'od-stage-src-'));
  fs.mkdirSync(path.join(dir, 'references'));
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# skill\n');
  fs.writeFileSync(path.join(dir, 'references', 'a.md'), 'a'.repeat(100));
  return dir;
}

function makeCwd(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'od-stage-cwd-'));
}

describe('stageActiveSkill skip-if-unchanged', () => {
  it('does not recopy when source and staged copies match', async () => {
    const src = makeSource();
    const cwd = makeCwd();
    try {
      const first = await stageActiveSkill(cwd, 'skill-bench', src, () => {});
      expect(first.staged).toBe(true);
      const stagedFile = path.join(first.stagedPath!, 'references', 'a.md');
      const ino = fs.statSync(stagedFile).ino;
      const second = await stageActiveSkill(cwd, 'skill-bench', src, () => {});
      expect(second).toEqual({ staged: true, stagedPath: first.stagedPath });
      // A re-copy (rm + create) would hand back a new inode; a skip keeps it.
      expect(fs.statSync(stagedFile).ino).toBe(ino);
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('recopies when the source changes', async () => {
    const src = makeSource();
    const cwd = makeCwd();
    try {
      const first = await stageActiveSkill(cwd, 'skill-bench', src, () => {});
      expect(first.staged).toBe(true);
      fs.writeFileSync(path.join(src, 'references', 'a.md'), 'b'.repeat(200));
      const second = await stageActiveSkill(cwd, 'skill-bench', src, () => {});
      expect(second.staged).toBe(true);
      expect(fs.readFileSync(path.join(second.stagedPath!, 'references', 'a.md'), 'utf8')).toBe('b'.repeat(200));
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('recopies when the staged copy was tampered with', async () => {
    const src = makeSource();
    const cwd = makeCwd();
    try {
      const first = await stageActiveSkill(cwd, 'skill-bench', src, () => {});
      expect(first.staged).toBe(true);
      fs.writeFileSync(path.join(first.stagedPath!, 'references', 'a.md'), 'tampered');
      const second = await stageActiveSkill(cwd, 'skill-bench', src, () => {});
      expect(second.staged).toBe(true);
      expect(fs.readFileSync(path.join(second.stagedPath!, 'references', 'a.md'), 'utf8')).toBe('a'.repeat(100));
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
