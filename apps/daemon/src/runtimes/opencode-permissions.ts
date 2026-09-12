import { agentCapabilities } from './capabilities.js';
import type { RuntimeAgentDef } from './types.js';

export const OPENCODE_AUTO_APPROVE_FLAG = '--auto';
export const OPENCODE_SKIP_PERMISSIONS_FLAG = '--dangerously-skip-permissions';
export const OPENCODE_WORKSPACE_DIR_FLAG = '--dir';

export const OPENCODE_PERMISSION_CAPABILITY = {
  helpArgs: ['run', '--help'],
  capabilityFlags: {
    [OPENCODE_AUTO_APPROVE_FLAG]: 'autoApprove',
    [OPENCODE_SKIP_PERMISSIONS_FLAG]: 'skipPermissions',
  },
} satisfies Pick<RuntimeAgentDef, 'helpArgs' | 'capabilityFlags'>;

/**
 * Pass OpenCode's non-interactive approval bypass when the installed CLI
 * advertises one.
 *
 * `--auto` ("auto-approve permissions that are not explicitly denied") is
 * what current OpenCode builds actually ship: `opencode run --help` on
 * 1.18.x lists `--auto` and contains `dangerously-skip-permissions` zero
 * times, so a gate on the legacy flag alone never fired and every run fell
 * back to interactive approval prompts a headless child cannot answer.
 * `--auto` is preferred when advertised; the legacy flag is kept as a
 * fallback for older builds that still carry it. Neither advertised means
 * neither sent — an unknown option would fail the spawn loudly, while a
 * missing bypass fails as denied tools, and guessing wrong picks the loud
 * failure for a run that might otherwise have worked.
 */
export function appendOpenCodePermissionBypass(args: string[], agentId: string): void {
  const caps = agentCapabilities.get(agentId);
  if (caps?.autoApprove) {
    args.push(OPENCODE_AUTO_APPROVE_FLAG);
    return;
  }
  if (caps?.skipPermissions) {
    args.push(OPENCODE_SKIP_PERMISSIONS_FLAG);
  }
}

/**
 * Pin OpenCode's workspace to the resolved project directory.
 *
 * OpenCode does not treat its process cwd as the project: it walks up to the
 * nearest enclosing git root and adopts THAT as the worktree (verified with
 * `opencode debug scrap`, whose every registered project is a git root). A
 * managed project directory is not a git repository, and a development install
 * keeps the daemon data directory under the repository root — so OpenCode walks
 * past the project and adopts the whole Open Design checkout.
 *
 * The consequences are all silent: the agent names the repository root as its
 * workspace and writes the deliverable there, the project directory stays
 * empty, `snapshotProjectArtifactsAsync(cwd)` sees nothing, and the Run reports
 * `no_artifact`. `permission.external_directory` cannot catch it either — once
 * the repository is the worktree, writing inside it is an in-project write.
 *
 * Sent unconditionally, matching the BYOK OpenCode definition that already
 * carried this workaround. Gating it on the `--help` capability probe would
 * turn a missing flag back into the silent data-loss bug; an OpenCode build
 * without `--dir` should fail loudly at spawn instead.
 */
export function appendOpenCodeWorkspaceDir(
  args: string[],
  cwd: string | null | undefined,
): void {
  if (typeof cwd !== 'string' || cwd.length === 0) return;
  args.push(OPENCODE_WORKSPACE_DIR_FLAG, cwd);
}
