import {
  buildWorkspacePermissions,
  type CollabMemberRole,
  type WorkspaceCollabContext,
} from '@capydesign/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import {
  MAX_PROJECT_DISPLAY_SNAPSHOTS,
  markProjectDisplaySnapshotsDirty,
  patchProjectDisplaySnapshots,
  projectDisplaySnapshotCount,
  projectDisplaySnapshotKey,
  readProjectDisplaySnapshot,
  removeProjectFromDisplaySnapshots,
  resetProjectDisplaySnapshots,
  writeProjectDisplaySnapshot,
} from '../../src/state/project-display-cache';
import type { Project } from '../../src/types';

function context(
  memberId: string,
  role: CollabMemberRole = 'member',
): WorkspaceCollabContext {
  return {
    workspaceId: 'workspace-a',
    workspaceType: 'team',
    workspaceMemberId: memberId,
    role,
    memberStatus: 'active',
    lifecycleState: 'active',
    billingState: 'active',
    planId: null,
    providerMode: 'platform_credits',
    seatSummary: {
      seatLimit: 5,
      usedSeats: 2,
      availableSeats: 3,
      isSeatFull: false,
    },
    permissions: buildWorkspacePermissions({
      role,
      lifecycleState: 'active',
    }),
    displayName: 'Workspace A',
  };
}

function project(id: string): Project {
  return {
    id,
    name: id,
    skillId: null,
    designSystemId: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('project display snapshots', () => {
  afterEach(() => resetProjectDisplaySnapshots());

  /*
   * The snapshot is WRITTEN from the shell's context (App owns the home grid and
   * reads `/api/workspace/context`, so its `role` is real). It is MARKED DIRTY
   * from the project page, whose context comes from the daemon's project scope
   * fast path and therefore always says `role: 'member'`.
   *
   * Same account, same workspace, same member — one person. Comparing them on a
   * key that folds in `role` meant a team owner's share/unshare never invalidated
   * their own home grid, so going Back showed the pre-share state. This is the
   * one defect in the family that shows the user stale DATA rather than a dead
   * control, which is why the comparison here has to be principal identity.
   */
  it('marks an owner-written snapshot dirty from the project scope placeholder role', () => {
    const shellOwner = context('member-a', 'owner');
    const scopePlaceholder = context('member-a');
    const scope = { accountGeneration: 1, context: shellOwner, view: 'recent' as const };
    writeProjectDisplaySnapshot(scope, [project('project-a')]);

    markProjectDisplaySnapshotsDirty({ context: scopePlaceholder, accountGeneration: 1 });

    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey(scope))).toMatchObject({
      projects: [{ id: 'project-a' }],
      dirty: true,
    });
  });

  it('patches an owner-written snapshot from the project scope placeholder role', () => {
    const shellOwner = context('member-a', 'owner');
    const scopePlaceholder = context('member-a');
    const scope = { accountGeneration: 1, context: shellOwner, view: 'all' as const };
    writeProjectDisplaySnapshot(scope, [project('project-a')]);

    removeProjectFromDisplaySnapshots({
      context: scopePlaceholder,
      projectId: 'project-a',
      accountGeneration: 1,
    });

    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey(scope))?.projects).toEqual([]);
  });

  // Relaxing role must not relax the account/workspace/member partition.
  it('never crosses a member boundary just because the roles differ', () => {
    const shellOwner = context('member-a', 'owner');
    const otherMember = context('member-b');
    const scope = { accountGeneration: 1, context: shellOwner, view: 'recent' as const };
    writeProjectDisplaySnapshot(scope, [project('project-a')]);

    markProjectDisplaySnapshotsDirty({ context: otherMember, accountGeneration: 1 });
    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey(scope))?.dirty).toBe(false);

    markProjectDisplaySnapshotsDirty({ context: context('member-a'), accountGeneration: 2 });
    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey(scope))?.dirty).toBe(false);
  });

  it('bounds snapshots with LRU eviction', () => {
    const memberA = context('member-a');
    const firstScope = { accountGeneration: 0, context: memberA, view: 'recent' as const };
    writeProjectDisplaySnapshot(firstScope, [project('project-first')]);
    for (let generation = 1; generation < MAX_PROJECT_DISPLAY_SNAPSHOTS; generation += 1) {
      writeProjectDisplaySnapshot({
        accountGeneration: generation,
        context: memberA,
        view: 'recent',
      }, [project(`project-${generation}`)]);
    }
    // Touch the first entry so generation 1 becomes the least recently used.
    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey(firstScope))).not.toBeNull();
    writeProjectDisplaySnapshot({
      accountGeneration: MAX_PROJECT_DISPLAY_SNAPSHOTS,
      context: memberA,
      view: 'recent',
    }, [project('project-overflow')]);

    expect(projectDisplaySnapshotCount()).toBe(MAX_PROJECT_DISPLAY_SNAPSHOTS);
    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey(firstScope))).not.toBeNull();
    expect(readProjectDisplaySnapshot(projectDisplaySnapshotKey({
      accountGeneration: 1,
      context: memberA,
      view: 'recent',
    }))).toBeNull();
  });
});
