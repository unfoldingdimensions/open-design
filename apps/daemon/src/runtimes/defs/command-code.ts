import { DEFAULT_MODEL_OPTION } from './shared.js';
import type { RuntimeAgentDef, RuntimeModelOption } from '../types.js';

// Matches `command-code --list-models` rows: the model id is the first
// whitespace-separated token (`provider/name`), the rest of the line is a
// human description. Header/section lines (`Available models · 68 models`,
// `Open Source`, blanks) carry no `/`-qualified token and are skipped —
// same tolerant approach as the cursor-agent parser.
const COMMAND_CODE_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._/:@-]*\/[A-Za-z0-9][A-Za-z0-9._/:@-]*$/u;

export function parseCommandCodeModels(stdout: string): RuntimeModelOption[] | null {
  const lines = String(stdout || '').split('\n');
  const out = [DEFAULT_MODEL_OPTION];
  const seen = new Set<string>([DEFAULT_MODEL_OPTION.id]);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const id = line.split(/\s+/u)[0] ?? '';
    if (!COMMAND_CODE_MODEL_ID.test(id) || seen.has(id)) continue;
    seen.add(id);
    const label = line.slice(id.length).trim() || id;
    out.push({ id, label: label === id ? id : `${id} — ${label}` });
  }
  return out.length > 1 ? out : null;
}

// Static safety net only — the live list comes from `command-code
// --list-models` via `listModels` below. Ordered with the CLI default
// first, then the models this machine's user actually targets.
const COMMAND_CODE_FALLBACK_MODELS: RuntimeModelOption[] = [
  DEFAULT_MODEL_OPTION,
  { id: 'deepseek/deepseek-v4-flash', label: 'deepseek/deepseek-v4-flash (default)' },
  { id: 'deepseek/deepseek-v4-pro', label: 'deepseek/deepseek-v4-pro' },
  { id: 'z-ai/glm-5.3-flash', label: 'z-ai/glm-5.3-flash' },
  { id: 'qwen/qwen3.8-flash', label: 'qwen/qwen3.8-flash' },
];

export const commandCodeAgentDef = {
  id: 'command-code',
  name: 'Command Code',
  bin: 'command-code',
  // NOTE: never probe bare `cmd` — it collides with Windows' cmd.exe.
  fallbackBins: ['cmdc'],
  versionArgs: ['--version'],
  listModels: {
    args: ['--list-models'],
    timeoutMs: 15_000,
    parse: parseCommandCodeModels,
  },
  fallbackModels: COMMAND_CODE_FALLBACK_MODELS,
  reasoningOptions: [
    { id: 'default', label: 'Default' },
    { id: 'low', label: 'low' },
    { id: 'medium', label: 'medium' },
    { id: 'high', label: 'high' },
  ],
  // Prompt delivered via stdin (bare `-p`, no positional) to avoid Windows
  // `spawn ENAMETOOLONG` on large composed prompts — verified live.
  // `--yolo` is required: in `-p` mode cmdc otherwise refuses file writes
  // and shell commands with no TTY to approve them. `--skip-onboarding`
  // keeps automated runs from hanging on the taste-onboarding prompt.
  // `--no-session` is deliberately omitted so multi-turn sessions persist;
  // resume flows through `--session`/`-c` via runtimeContext (see below).
  buildArgs: (_prompt, _imagePaths, _extra, options = {}, runtimeContext = {}) => {
    const args = [
      '-p',
      '--output-format',
      'json',
      '--max-turns',
      '100',
      '--skip-onboarding',
      '--yolo',
    ];
    if (
      typeof runtimeContext.resumeSessionId === 'string' &&
      runtimeContext.resumeSessionId.length > 0
    ) {
      // `--session` takes an existing transcript path or session-id prefix.
      // Fresh sessions omit it (cmdc mints its own id); newSessionId is
      // intentionally ignored — passing an unknown id would fail the probe.
      args.push('--session', runtimeContext.resumeSessionId);
    }
    if (options.model && options.model !== 'default') {
      args.push('--model', options.model);
    }
    if (options.reasoning && options.reasoning !== 'default') {
      args.push('--effort', options.reasoning);
    }
    return args;
  },
  promptViaStdin: true,
  streamFormat: 'json-event-stream',
  eventParser: 'command-code',
  // No `-p`-mode image flag on the CLI today; revisit when one lands.
  supportsImagePaths: false,
} satisfies RuntimeAgentDef;
