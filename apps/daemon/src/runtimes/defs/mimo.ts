import {
  OPENCODE_PERMISSION_CAPABILITY,
  appendOpenCodePermissionBypass,
} from '../opencode-permissions.js';
import { DEFAULT_MODEL_OPTION } from './shared.js';
import type { RuntimeAgentDef } from '../types.js';

export const mimoAgentDef = {
  id: 'mimo',
  name: 'MiMo Code',
  bin: 'mimo',
  versionArgs: ['--version'],
  fallbackModels: [DEFAULT_MODEL_OPTION],
  // Same config/event family as OpenCode (`eventParser: 'opencode'` below),
  // so the same `--auto` / `--dangerously-skip-permissions` probe applies.
  // The live mimo CLI was not available where this was written, so no flag
  // is verified — but without this declaration there is no code path that
  // could pass a bypass at all. Probe-gated: when neither flag appears in
  // the advertisement, argv is unchanged.
  ...OPENCODE_PERMISSION_CAPABILITY,
  buildArgs: (_prompt, _imagePaths, _extra, options = {}) => {
    const args = ['run', '--format', 'json'];
    appendOpenCodePermissionBypass(args, 'mimo');
    if (options.model && options.model !== 'default') {
      args.push('--model', options.model);
    }
    return args;
  },
  promptViaStdin: true,
  streamFormat: 'json-event-stream',
  eventParser: 'opencode',
  // MiMo reads MCP servers from its layered config using the same
  // JSON schema as OpenCode's `mcp` config, but under the MIMOCODE_
  // env namespace instead of OPENCODE_. The daemon serialises the
  // enabled MCP servers into MIMOCODE_CONFIG_CONTENT following the
  // same structure as OPENCODE_CONFIG_CONTENT.
  externalMcpInjection: 'mimo-env-content',
} satisfies RuntimeAgentDef;