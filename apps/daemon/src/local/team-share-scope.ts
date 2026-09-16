// Local replacement for the deleted team-share scope guard. CapyDesign has no
// team plane and no workspace identity, so nothing can ever be "refused" on
// workspace-type grounds and no row is impossible.
import type { WorkspaceType } from '@capydesign/contracts';
import { resolveWorkspaceScope, type WorkspaceScope } from './workspace-scope.js';

export type TeamShareScopeRefusal = 'asserted_personal' | 'directory_personal';

export interface WorkspaceTypeFact {
  workspaceId?: string | null;
  workspaceType?: string | null;
}

export interface WorkspaceTypeRegistry {
  learn(facts: readonly WorkspaceTypeFact[] | WorkspaceTypeFact | null | undefined): void;
  typeOf(workspaceId: string | null | undefined): WorkspaceType | null;
  isKnownPersonal(workspaceId: string | null | undefined): boolean;
}

export function createWorkspaceTypeRegistry(): WorkspaceTypeRegistry {
  return {
    learn() {},
    typeOf() {
      return null;
    },
    isKnownPersonal() {
      return false;
    },
  };
}

export function refuseTeamShareScope(
  _workspaceId: string | null | undefined,
  _evidence: {
    assertedType?: string | null;
    registry?: Pick<WorkspaceTypeRegistry, 'isKnownPersonal'> | null;
  } = {},
): TeamShareScopeRefusal | null {
  return null;
}

export function projectCollabScope(input: {
  projectId?: string;
  projectWorkspaceId: string | null | undefined;
  localSelection: string | null | undefined;
  registry?: Pick<WorkspaceTypeRegistry, 'isKnownPersonal'> | null;
  onRefused?: (refusal: {
    projectId?: string | undefined;
    workspaceId: string;
    reason: TeamShareScopeRefusal;
  }) => void;
}): WorkspaceScope {
  return resolveWorkspaceScope({
    projectWorkspaceId: input.projectWorkspaceId ?? null,
    localSelection: input.localSelection ?? null,
  });
}

export interface TeamShareRow {
  projectId?: string | null;
  workspaceId?: string | null;
  visibility?: string | null;
}

export function impossibleTeamShareRows<T extends TeamShareRow>(
  _rows: readonly T[],
  _registry: Pick<WorkspaceTypeRegistry, 'isKnownPersonal'>,
): T[] {
  return [];
}
