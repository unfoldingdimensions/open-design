// Local replacement for the deleted team-resource state seam. CapyDesign has
// no team resources and no resource hub, so every resource is local/personal
// and the copy red-line can never trip.
import type { TeamResourceCopyTarget } from '@capydesign/contracts';

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
