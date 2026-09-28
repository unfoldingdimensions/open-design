// Runtime app version, read from the daemon's `/api/version`.
//
// This used to live inside the web analytics provider, which was removed
// together with the Open Design Cloud surface. It is not analytics: the Updater
// and What's-New popups print the *running* app version, so the placeholder,
// the resolver and the hook live here now, free of any telemetry dependency.
import { useEffect, useState } from 'react';

/** The pre-resolution placeholder. Never state this to a user as fact. */
export const APP_VERSION_PLACEHOLDER = '0.0.0';

/**
 * Whether an app version is safe to show a user as fact. False for the
 * pre-resolution placeholder and for anything blank, so a caller can pick
 * another real source (or wait) instead of stating a version nobody reported.
 */
export function isResolvedAppVersion(version: string | null | undefined): boolean {
  if (version == null) return false;
  const trimmed = version.trim();
  return trimmed.length > 0 && trimmed !== APP_VERSION_PLACEHOLDER;
}

let runtimeAppVersion: string | null = null;
let runtimeAppVersionPromise: Promise<string | null> | null = null;

/**
 * Fetch the daemon-pinned app version once per page load. The hook, the capture
 * paths and repeated calls all settle on one `/api/version` round-trip.
 */
export async function loadRuntimeAppVersion(): Promise<string | null> {
  if (runtimeAppVersion) return runtimeAppVersion;
  if (!runtimeAppVersionPromise) {
    runtimeAppVersionPromise = (async () => {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return null;
        const body = (await res.json()) as {
          version?: { version?: string; channel?: string };
        };
        const next = body?.version?.version?.trim();
        runtimeAppVersion = next && next.length > 0 ? next : null;
        return runtimeAppVersion;
      } catch {
        return null;
      }
    })();
  }
  return runtimeAppVersionPromise;
}

/** The running app version, starting on the placeholder until it resolves. */
export function useAppVersion(): string {
  const [version, setVersion] = useState(APP_VERSION_PLACEHOLDER);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadRuntimeAppVersion();
      if (!cancelled && next) setVersion(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return version;
}
