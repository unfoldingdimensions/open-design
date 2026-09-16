// Local replacement for the deleted resource-hub principal. CapyDesign has no
// Cloud collaboration plane, so no resource principal can be derived.
import type { WorkspaceCollabContext } from '@capydesign/contracts';

export interface ResourceHubPrincipal {
  memberId: string;
  teamId: string;
  role: WorkspaceCollabContext['role'];
  lifecycleState: WorkspaceCollabContext['lifecycleState'];
  workspaceType?: WorkspaceCollabContext['workspaceType'];
}

export function contextToResourceHubPrincipal(
  _context: WorkspaceCollabContext | null,
): ResourceHubPrincipal | null {
  return null;
}
