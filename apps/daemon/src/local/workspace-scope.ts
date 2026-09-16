// Local replacement for the deleted workspace-scope resolver. There is exactly
// one implicit local scope now, so a project-scoped call is always "local".

export type WorkspaceScope = {
  workspaceId: string | null;
  source: 'project' | 'selection' | 'none';
};

/** Every project lives in the one implicit local scope. */
export function resolveWorkspaceScope(_input: {
  projectWorkspaceId?: string | null;
  localSelection?: string | null;
}): WorkspaceScope {
  return { workspaceId: null, source: 'none' };
}
