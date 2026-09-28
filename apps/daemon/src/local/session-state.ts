// Local session state.
//
// CapyDesign has no sign-in: the daemon is never signed in, never has a
// profile, and never exposes a credential revision or a control-plane endpoint.
// Callers keep their historical shapes; every answer is the signed-out /
// no-profile one.
//
// This is the neutral-ward rename of the former `local/vela-session.ts`.

export interface SessionStatus {
  loggedIn: boolean;
  user?: { id?: string; email?: string | null } | null;
}

/** The daemon has no remote session, so it is always signed out. */
export function readSessionStatus(
  _env?: NodeJS.ProcessEnv,
  _configuredEnv?: Record<string, string>,
): SessionStatus {
  return { loggedIn: false, user: null };
}

/** No remote profile exists locally. */
export function readSessionProfileKey(_env?: NodeJS.ProcessEnv): string {
  return 'local';
}

/** No remote credential exists to revise. */
export function readSessionCredentialRevision(_env?: NodeJS.ProcessEnv): string | null {
  return null;
}

export interface SessionControlContext {
  apiUrl: string;
  controlKey: string;
}

export function readSessionControlContext(
  _env?: NodeJS.ProcessEnv,
  _configuredEnv?: Record<string, string>,
): SessionControlContext | null {
  return null;
}
