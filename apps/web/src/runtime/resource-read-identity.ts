/**
 * Identity of a resource read (design system, plugin, shared resource).
 *
 * The Cloud workspace layer that produced these was removed, so a read identity
 * is always context-less: there is no workspace to scope a resource read to.
 * The shape survives because components still thread it through and ask
 * `isStillCurrent()` to fence stale async results.
 */
export interface WorkspaceResourceReadIdentity {
  /** Always null: CapyDesign resources live in one implicit local scope. */
  context: null;
  /**
   * Whether a read issued with this identity is still the current one. Local
   * reads have no identity to change, so this is always true.
   */
  isStillCurrent: () => boolean;
}

/** A read identity for a local-only resource read. */
export function localResourceReadIdentity(): WorkspaceResourceReadIdentity {
  return { context: null, isStillCurrent: () => true };
}
