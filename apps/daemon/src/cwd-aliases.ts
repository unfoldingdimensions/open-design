// Stage the active skill into the agent's project cwd so its side files
// (assets/, references/) are reachable through a cwd-relative path
// (`.od-skills/<folder>/...`). The chat handler invokes
// `stageActiveSkill()` once per turn before spawning the agent; the
// skill preamble emitted by `withSkillRootPreamble()` advertises both
// the cwd-relative alias path (primary) and the absolute repo path
// (fallback) so agents work whether or not staging succeeds.
//
// Why a per-project copy and not a symlink/junction
// -------------------------------------------------
// An earlier draft of this fix (PR #435 round 1) created a directory
// link pointing at the repository's live `skills/` tree. Reviewers
// flagged that as a write-amplification vulnerability: agents have
// write access to their cwd, and a `Write`/`Edit`/`Bash` call against
// `.od-skills/<id>/SKILL.md` resolves through the symlink and mutates
// the shipped resource itself. Per-project copies eliminate that
// channel — every byte under `.od-skills/` is a private working copy,
// and corrupting it has no effect on other projects or on the source.
//
// Cost. We only stage the *active* skill, not the entire SKILLS_DIR;
// individual skills are typically 1–3 MB. On APFS / btrfs / ReFS
// `fs.cp` uses copy-on-write where available, so the steady-state cost
// is a few syscalls.
//
// Source symlinks. We `dereference: true` so the staged copy is fully
// self-contained — nothing inside it can write back to a real file
// outside the project. We also call `stat()` (not `lstat()`) on the
// source root so an environment that puts `skills/` itself behind a
// symlink (e.g. a content-addressable mount) is followed correctly.

import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { chmod, cp, lstat, mkdir, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

export const SKILLS_CWD_ALIAS = '.od-skills';

export type SkillStagingLogger = (message: string) => void;

export interface SkillStagingResult {
  /** True when a usable copy of the source is sitting at `stagedPath`. */
  staged: boolean;
  /** Absolute path of the staged directory if staging succeeded. */
  stagedPath?: string;
  /** Populated when staging was skipped or failed; never thrown. */
  reason?: string;
}

export function skillCwdAliasSegment(dir: string): string {
  const folder = path.basename(dir) || 'skill';
  const normalizedDir = path.resolve(dir).replaceAll('\\', '/');
  const digest = createHash('sha256').update(normalizedDir).digest('hex').slice(0, 10);
  return `${folder}-${digest}`;
}

// copy_file_range(2) — used by fs.cp under the hood — is rejected with
// these errno codes when source and destination live on different
// filesystems (commonly EXDEV; a container image layer copied onto a
// ZFS/overlay bind mount surfaces EPERM). Node doesn't fall back to a
// userspace copy on any of them, so we do.
const RECOVERABLE_COPY_CODES = new Set(['EPERM', 'EXDEV', 'ENOTSUP', 'EOPNOTSUPP']);

type SkillCopyFn = (
  source: string,
  destination: string,
  options: { recursive: boolean; dereference: boolean; preserveTimestamps: boolean },
) => Promise<void>;

// Recursive copy that mirrors `cp({ dereference: true })` without going
// through copy_file_range. `stat()` (not `lstat`) follows symlinks, so
// every staged entry lands as a real directory or regular file — keeping
// `.od-skills/` a self-contained write barrier even on the fallback path.
async function copyTreeDereferenced(srcDir: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    const entryStat = await stat(from);
    if (entryStat.isDirectory()) {
      await copyTreeDereferenced(from, to);
    } else if (entryStat.isFile()) {
      await pipeline(createReadStream(from), createWriteStream(to));
      // createWriteStream opens the destination with the default 0644, so
      // restore the source's permission bits (notably the exec bit on
      // skill helper scripts) and mtime — `fs.cp` preserves these, and
      // skills shell out to staged scripts. Mask to 0o777 so the
      // agent-writable staging copy never inherits setuid/setgid/sticky.
      await chmod(to, entryStat.mode & 0o777);
      await utimes(to, entryStat.atime, entryStat.mtime);
    }
    // Sockets, FIFOs, and devices can't appear in a sane skill folder and
    // copying them would hang or fail — skip them.
  }
}

type SkillDirFingerprint = {
  files: number;
  dirs: number;
  bytes: number;
  maxMtimeMs: number;
};

// Content fingerprint for the skip-if-unchanged gate below: file/dir counts
// plus total bytes plus the newest mtime, following symlinks exactly like the
// staging copy does (`stat`, not `lstat`). Returns null when the directory
// cannot be walked (missing, a file, unreadable) — the caller treats that as
// "changed" and copies.
async function fingerprintSkillDir(root: string): Promise<SkillDirFingerprint | null> {
  const print: SkillDirFingerprint = { files: 0, dirs: 0, bytes: 0, maxMtimeMs: 0 };
  async function walk(dir: string): Promise<boolean> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      let entryStat;
      try {
        entryStat = await stat(full);
      } catch {
        return false;
      }
      if (entryStat.isDirectory()) {
        print.dirs += 1;
        if (!(await walk(full))) return false;
      } else if (entryStat.isFile()) {
        print.files += 1;
        print.bytes += entryStat.size;
        if (entryStat.mtimeMs > print.maxMtimeMs) print.maxMtimeMs = entryStat.mtimeMs;
      }
      // Sockets, FIFOs, and devices are skipped by the copy too — ignoring
      // them here keeps the two in agreement about what "the dir" holds.
    }
    return true;
  }
  if (!(await walk(root))) return null;
  return print;
}

const STAGE_STAMPS_FILE = '.od-stage-fingerprints.json';

type StageStamp = {
  source: SkillDirFingerprint;
  staged: SkillDirFingerprint;
};

function samePrint(a: SkillDirFingerprint, b: SkillDirFingerprint): boolean {
  return (
    a.files === b.files
    && a.dirs === b.dirs
    && a.bytes === b.bytes
    && a.maxMtimeMs === b.maxMtimeMs
  );
}

async function readStageStamps(aliasRoot: string): Promise<Record<string, StageStamp>> {
  try {
    const raw = await readFile(path.join(aliasRoot, STAGE_STAMPS_FILE), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, StageStamp>;
  } catch {
    return {};
  }
}

// True when the staged tree can be proven to match the source without
// copying: a stamp from the last successful copy agrees with both live
// trees. Any I/O failure, a missing stamp, or any disagreement reads as
// "changed" — the caller copies and re-stamps.
async function stagedStampMatches(
  cwd: string,
  folderName: string,
  sourceDir: string,
  stagedPath: string,
): Promise<boolean> {
  const aliasRoot = path.join(cwd, SKILLS_CWD_ALIAS);
  const [stamps, sourcePrint, stagedPrint] = await Promise.all([
    readStageStamps(aliasRoot),
    fingerprintSkillDir(sourceDir),
    fingerprintSkillDir(stagedPath),
  ]);
  const stamp = stamps[folderName];
  if (!stamp || !sourcePrint || !stagedPrint) return false;
  return samePrint(stamp.source, sourcePrint) && samePrint(stamp.staged, stagedPrint);
}

async function recordStagedStamp(
  cwd: string,
  folderName: string,
  sourceDir: string,
  stagedPath: string,
  log: SkillStagingLogger,
): Promise<void> {
  const aliasRoot = path.join(cwd, SKILLS_CWD_ALIAS);
  const [stamps, sourcePrint, stagedPrint] = await Promise.all([
    readStageStamps(aliasRoot),
    fingerprintSkillDir(sourceDir),
    fingerprintSkillDir(stagedPath),
  ]);
  if (!sourcePrint || !stagedPrint) return;
  try {
    await writeFile(
      path.join(aliasRoot, STAGE_STAMPS_FILE),
      JSON.stringify({ ...stamps, [folderName]: { source: sourcePrint, staged: stagedPrint } }),
      'utf8',
    );
  } catch (err) {
    // The stamp is a pure optimization: losing it only costs the next turn
    // its skip, never the staging itself.
    log(`[od] skill-stage: stamp write skipped: ${(err as Error).message}`);
  }
}

/**
 * Copy `<sourceDir>` to `<cwd>/.od-skills/<folderName>/` so an agent can
 * reach skill side files via a cwd-relative path. Idempotent and
 * non-throwing — failures are logged and surfaced via the result so the
 * caller falls back to absolute-path delivery (`--add-dir` for
 * Claude/Copilot, embedded absolute path in the preamble for others).
 *
 * The previous-turn copy is replaced wholesale on every call, which is
 * the simplest correct way to handle skill-source updates (e.g. the
 * user just edited a `references/*.md` mid-session).
 */
export async function stageActiveSkill(
  cwd: string | null | undefined,
  folderName: string,
  sourceDir: string,
  log: SkillStagingLogger = () => {},
  // Seam for tests: the real copy_file_range EPERM only reproduces on
  // specific cross-filesystem mounts (ZFS/overlay), so tests inject a
  // copy that rejects with a synthetic code to drive the fallback path.
  nativeCopy: SkillCopyFn = (source, destination, options) =>
    cp(source, destination, options),
): Promise<SkillStagingResult> {
  if (!cwd) {
    return { staged: false, reason: 'no project cwd' };
  }
  if (!isSafeAliasSegment(folderName)) {
    return { staged: false, reason: `unsafe folder name "${folderName}"` };
  }

  // `stat()` follows symlinks so a symlinked SKILLS_DIR or a symlinked
  // skill folder is treated as the directory it points at, not skipped.
  let sourceStat;
  try {
    sourceStat = await stat(sourceDir);
  } catch (err) {
    return {
      staged: false,
      reason: `source missing: ${(err as Error).message}`,
    };
  }
  if (!sourceStat.isDirectory()) {
    return { staged: false, reason: 'source is not a directory' };
  }

  const aliasRoot = path.join(cwd, SKILLS_CWD_ALIAS);
  const stagedPath = path.join(aliasRoot, folderName);

  // The alias root is OD-reserved. If the user (or some unrelated tool)
  // has put a real file under that name, refuse to clobber it. A
  // legacy symlink left by an earlier daemon version is replaced with
  // a real directory so we own the writable namespace.
  try {
    const aliasStat = await lstat(aliasRoot);
    if (aliasStat.isSymbolicLink()) {
      log(
        `[od] skill-stage: replacing legacy symlink at ${aliasRoot} with a real directory`,
      );
      await rm(aliasRoot, { recursive: true, force: true });
    } else if (!aliasStat.isDirectory()) {
      log(
        `[od] skill-stage: ${aliasRoot} exists and is not a directory; refusing to stage`,
      );
      return {
        staged: false,
        reason: 'alias root taken by a non-directory entry',
      };
    }
  } catch {
    // does not exist — created by `cp` below
  }

  try {
    // Skip-if-unchanged: the copy is a write barrier, not a refresh — when
    // the staged tree still matches the source there is nothing to gain from
    // rebuilding it (measured up to ~60ms for the largest skill). The stamp
    // records the source AND staged fingerprints taken at copy time, so both
    // a source edit and agent tampering with the staged copy read as
    // "changed" and re-copy — the per-turn self-heal the wholesale copy used
    // to provide is preserved. A stamp is compared instead of the two live
    // trees because the copy rounds mtimes to whole milliseconds, so a live
    // staged-vs-source mtime equality never holds. Residual edge: a
    // same-millisecond, same-size rewrite is invisible to the stamp.
    if (await stagedStampMatches(cwd, folderName, sourceDir, stagedPath)) {
      return { staged: true, stagedPath };
    }
    // Wipe a stale per-skill copy first so a removed source file is
    // reflected and a partially-failed previous run cannot leave junk
    // behind.
    await rm(stagedPath, { recursive: true, force: true });
    try {
      await nativeCopy(sourceDir, stagedPath, {
        recursive: true,
        // Resolve every symlink we find inside the skill so the staged
        // copy is a fully self-contained set of regular files. This is
        // what makes the copy a true write barrier — no entry under
        // `.od-skills/...` can resolve back to a real file outside the
        // project cwd.
        dereference: true,
        preserveTimestamps: true,
      });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? '';
      if (!RECOVERABLE_COPY_CODES.has(code)) throw err;
      log(
        `[od] skill-stage: native copy failed (${code}); retrying with stream copy`,
      );
      await rm(stagedPath, { recursive: true, force: true });
      await copyTreeDereferenced(sourceDir, stagedPath);
    }
    await recordStagedStamp(cwd, folderName, sourceDir, stagedPath, log);
    return { staged: true, stagedPath };
  } catch (err) {
    log(`[od] skill-stage failed: ${(err as Error).message}`);
    return { staged: false, reason: (err as Error).message };
  }
}

const UNSAFE_ALIAS_RE = /[\\/]|\0/;

/**
 * Returns true if `name` is safe to use as a single path segment under
 * the alias root. Rejects empty strings, dot-segments (`.`/`..`), path
 * separators (`/`, `\`), null bytes, and absolute paths so a malformed
 * caller cannot escape the alias root.
 */
function isSafeAliasSegment(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  if (name.length === 0) return false;
  if (name === '.' || name === '..') return false;
  if (UNSAFE_ALIAS_RE.test(name)) return false;
  if (path.isAbsolute(name)) return false;
  return true;
}
