// Local replacement for the deleted team-resource materialization layer.
// CapyDesign has no synced team resources, so nothing is ever materialized and
// no workspace-scoped storage root exists.
import path from 'node:path';

export interface TeamResourceMaterializationIdentity {
  kind: string;
  resourceId: string;
  workspaceId?: string;
  sourceKey?: string;
}

export type TeamResourceMaterializationResult =
  | {
      ok: true;
      dir: string;
      kind?: string;
      resourceId?: string;
      workspaceId?: string;
      sourceKey?: string;
    }
  | {
      ok: false;
      reason: string;
      dir?: string;
      kind?: string;
      resourceId?: string;
      workspaceId?: string;
      sourceKey?: string;
    };

export function teamResourceWorkspaceRoot(projectsRoot: string, ..._rest: unknown[]): string {
  return path.join(projectsRoot);
}

export function teamResourceMaterializationDir(..._parts: unknown[]): string {
  return '';
}

export function teamResourceSourceKey(_input: unknown, ..._rest: unknown[]): string {
  return '';
}

export async function readTeamResourceMaterialization(
  _input: unknown,
  ..._rest: unknown[]
): Promise<TeamResourceMaterializationResult | null> {
  return null;
}

export async function readWorkspaceScopedTeamResourceFile(
  _input: unknown,
  ..._rest: unknown[]
): Promise<unknown> {
  return null;
}

export async function materializeWorkspaceScopedTeamResource(
  _input: unknown,
  ..._rest: unknown[]
): Promise<TeamResourceMaterializationResult> {
  return { ok: false, reason: 'team_resources_removed' };
}
