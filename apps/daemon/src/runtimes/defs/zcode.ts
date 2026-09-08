import { DEFAULT_MODEL_OPTION } from './shared.js';
import type { RuntimeAgentDef } from '../types.js';

// ZCode ships its agent runtime inside the desktop app
// (`resources/glm/zcode.cjs`); the supported OD path is the `zcode` binary
// from `npm install -g zcode-app-cli@latest`, with `ZCODE_BIN` as the
// escape hatch (see executables.ts). Verified live against v0.16.5.
//
// Flag notes (every flag below was acceptance-tested; the root `--help`
// lists flags the parser rejects, so help text alone is not trusted):
// - `--prompt <text>` runs one headless turn; `-p` is the positional twin.
// - `--mode yolo` is the documented default for `--prompt` and is passed
//   explicitly so headless runs never block on an approval prompt.
// - `--resume <sessionId>` continues a persisted session (`sess_...`).
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
//   image paths ride it. Marked provisional until a live image run is
//   observed (see the docs note).
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
  buildArgs: (prompt, imagePaths, _extra, _options = {}, runtimeContext = {}) => {
    const args = ['--prompt', prompt, '--mode', 'yolo', '--no-color'];
    for (const imagePath of imagePaths) {
      args.push('--attach', imagePath);
    }
    if (
      typeof runtimeContext.resumeSessionId === 'string' &&
      runtimeContext.resumeSessionId.length > 0
    ) {
      args.push('--resume', runtimeContext.resumeSessionId);
    }
    return args;
  },
  promptViaStdin: false,
  // Provisional floor: unconfigured-CLI runs emit plain text. Whether
  // `--json` yields a structured stream for `--prompt` turns is unknown
  // until an authenticated run is observed — upgrade to a structured
  // streamFormat then, not before.
  streamFormat: 'plain',
  supportsImagePaths: true,
} satisfies RuntimeAgentDef;
