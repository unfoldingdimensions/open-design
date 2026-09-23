// Local replacement for the deleted team-resource state seam. CapyDesign has
// no team resources and no resource hub, so every resource is local/personal
// and the copy red-line can never trip.
import type { TeamResourceState } from '@capydesign/contracts';

/** The resource a copy-out route is about to duplicate into a personal copy. */
export interface TeamResourceCopyTarget {
  /** Personal resources copy freely; the red-line only applies to team resources. */
  scope: 'personal' | 'team';
  /** Lifecycle state — consulted only for team-scoped resources. */
  state?: TeamResourceState;
}

/**
 * Error a copy-out route throws when the red-line blocks the copy. Locally the
 * guard never trips (every resource resolves as `personal`), but the route
 * error branches stay intact so their handlers keep a single shape.
 */
export class TeamResourceCopyForbiddenError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TeamResourceCopyForbiddenError';
    this.code = code;
  }
}

export type TeamResourceKind = 'design-system' | 'plugin' | 'skill';

export interface TeamResourceKey {
  kind: TeamResourceKind;
  resourceId: string;
}

export interface TeamResourceStateProvider {
  resolve(key: TeamResourceKey): Promise<TeamResourceCopyTarget>;
  set?(key: TeamResourceKey, target: TeamResourceCopyTarget): void;
}

export function createDevTeamResourceStateProvider(): TeamResourceStateProvider {
  return {
    async resolve() {
      return { scope: 'personal' };
    },
    set() {},
  };
}

export async function enforceTeamResourceCopyAllowed(
  _provider: TeamResourceStateProvider,
  _key: TeamResourceKey,
): Promise<void> {
  // Local resources always copy freely.
}
