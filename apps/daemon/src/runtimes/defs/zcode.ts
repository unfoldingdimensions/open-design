import { DEFAULT_MODEL_OPTION } from './shared.js';
import type { RuntimeAgentDef } from '../types.js';

// ZCode ships its agent runtime inside the desktop app
// (`resources/glm/zcode.cjs` — no PATH binary on Windows). Two supported
// launch shapes, both resolving through the `zcode` bin name:
// - Windows: a `zcode.cmd` shim on PATH that runs
//   `node %LOCALAPPDATA%\Programs\ZCode\<...>\zcode.cjs` (tracks the live
//   install, so app updates flow through);
// - Any OS: the `zcode` binary from `npm install -g zcode-app-cli@latest`.
// `ZCODE_BIN` overrides either (see executables.ts). Verified live
// against runtime v0.16.5.
//
// Flag notes (every flag below was acceptance-tested; the root `--help`
// lists flags the parser rejects, so help text alone is not trusted):
// - `--prompt <text>` runs one headless turn; `-p` is the positional twin.
// - `--mode yolo` is the documented default for `--prompt` and is passed
//   explicitly so headless runs never block on an approval prompt.
// - Plain `--prompt` turns print only the response text (stderr empty)
//   and never emit a session id, so there is nothing to resume: every
//   turn is a fresh session. `--resume`/`-c` are deliberately NOT wired —
//   `-c` resumes the latest session for the whole cwd, which is the wrong
//   granularity when several OD conversations share one project.
// - `--no-color` keeps the plain-text stream free of ANSI escapes.
// - There is NO `--model` flag for headless runs (bundle string is
//   TUI-scoped): the turn always uses the CLI config's `model.main`.
//   The picker therefore offers Default only; switch models via the
//   CLI (`/model`) or `~/.zcode/cli/config.json`.
// - `--max-turns` / `--settings` appear in `--help` but the parser
//   rejects them on this build — deliberately not passed.
// - Auth is CLI-owned (`zcode login` / Coding Plan API key / inline
//   provider apiKey); detection proves only that the binary runs.
// - `--attach <file>` (repeatable) attaches local files to `--prompt`;
//   image paths ride it (verified live: attached PNG described correctly).
export const zcodeAgentDef = {
  id: 'zcode',
  name: 'ZCode',
  bin: 'zcode',
  versionArgs: ['--version'],
  // Prompt travels as the `--prompt` argv value (no verified stdin
  // sentinel on this build); the byte budget below keeps Windows'
  // ~32KB CreateProcess limit a typed AGENT_PROMPT_TOO_LARGE error
  // instead of a raw spawn failure — same posture as the deepseek def.
  maxPromptArgBytes: 30_000,
  fallbackModels: [DEFAULT_MODEL_OPTION],
  // No headless model/effort flags exist, so no reasoning options.
  buildArgs: (prompt, imagePaths, _extra, _options = {}, _runtimeContext = {}) => {
    const args = ['--prompt', prompt, '--mode', 'yolo', '--no-color'];
    for (const imagePath of imagePaths) {
      args.push('--attach', imagePath);
    }
    return args;
  },
  promptViaStdin: false,
  // Plain text, verified live: response lines stream progressively on
  // stdout. `--json` was observed and rejected — one trailing batch
  // object per turn, which would freeze the chat UI (same gotcha as the
  // deepseek def documents). No usage/cost events in this mode.
  streamFormat: 'plain',
  supportsImagePaths: true,
} satisfies RuntimeAgentDef;
