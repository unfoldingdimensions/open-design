import type { ReleaseChannel } from "@open-design/release";

/**
 * @module protocol
 *
 * The CapyDesign renderer host-bridge wire contract: the injected-global name
 * and version, client/updater constant registries, and every request/result
 * type that crosses the host bridge — including the {@link CapyDesignHostBridge}
 * shape itself. Pure declarations only; depends on nothing else in the package.
 */

export const OPEN_DESIGN_HOST_GLOBAL = "__od__";
export const OPEN_DESIGN_HOST_VERSION = 2;

export const OPEN_DESIGN_HOST_CLIENT_TYPES = Object.freeze({
  DESKTOP: "desktop",
} as const);

export type CapyDesignHostClientType =
  (typeof OPEN_DESIGN_HOST_CLIENT_TYPES)[keyof typeof OPEN_DESIGN_HOST_CLIENT_TYPES];

export type CapyDesignHostClient = {
  // BCP-47 locale string (e.g. "zh-CN", "pt-BR") the host process read from
  // the OS at startup. The renderer uses this so the packaged desktop app
  // can follow the OS language even when Chromium's built-in
  // `navigator.language` would have defaulted to en-US.
  osLocale?: string;
  platform?: string;
  type: CapyDesignHostClientType;
};

export type CapyDesignHostFailure = {
  details?: unknown;
  ok: false;
  reason: string;
};

export type CapyDesignHostActionResult =
  | { ok: true }
  | CapyDesignHostFailure;

/**
 * The workspace attribution the renderer gives the host so a folder import
 * lands in the caller's current workspace instead of the host's ambient one.
 *
 * This is a deliberate structural subset of the daemon/web
 * `WorkspaceCollabContext`, redeclared here rather than imported: this package
 * is the renderer host-bridge wire contract and must stay independent of the
 * daemon/web contracts package (enforced by the "stays independent from
 * daemon/web contracts" test). A full `WorkspaceCollabContext` is structurally
 * assignable to this type, so callers pass theirs unchanged.
 *
 * Only the fields the host actually forwards are modelled, and the enum-like
 * fields stay `string` because the host treats them as opaque pass-through
 * values — the daemon remains the authority that parses and validates them.
 * Deliberately no index signature: an interface never satisfies one, so adding
 * it would reject the very `WorkspaceCollabContext` callers pass. Callers hand
 * over a variable, not a fresh literal, so the extra fields ride along fine.
 */
export type CapyDesignHostWorkspaceContext = {
  lifecycleState: string;
  memberStatus: string;
  permissions: {
    canShareProjects: boolean;
    canWriteSyncedFiles: boolean;
  };
  role: string;
  workspaceId: string;
  workspaceMemberId: string;
  workspaceType: string;
};

export type CapyDesignHostProjectImportInit = {
  designSystemId?: string | null;
  name?: string;
  skillId?: string | null;
  workspaceContext?: CapyDesignHostWorkspaceContext | null;
};

export type CapyDesignHostProjectImportSuccess = {
  conversationId: string;
  entryFile: string | null;
  ok: true;
  projectId: string;
};

export type CapyDesignHostProjectImportResult =
  | CapyDesignHostProjectImportSuccess
  | {
      canceled: true;
      ok: false;
    }
  | CapyDesignHostFailure;

export type CapyDesignHostProjectReplaceWorkingDirSuccess = {
  baseDir: string;
  entryFile: string | null;
  ok: true;
};

export type CapyDesignHostProjectReplaceWorkingDirResult =
  | CapyDesignHostProjectReplaceWorkingDirSuccess
  | {
      canceled: true;
      ok: false;
    }
  | CapyDesignHostFailure;

export type CapyDesignHostPickWorkingDirSuccess = {
  baseDir: string;
  ok: true;
  // Single-use HMAC token (minted by the host main process for `baseDir`)
  // that the renderer threads into POST /api/projects/:id/working-dir once
  // the project exists. Lets the Home flow pick a folder before the project
  // is created without exposing the daemon's desktop-auth gate.
  token: string;
};

export type CapyDesignHostPickWorkingDirResult =
  | CapyDesignHostPickWorkingDirSuccess
  | {
      canceled: true;
      ok: false;
    }
  | CapyDesignHostFailure;

export type CapyDesignHostPdfPrintOptions = {
  deck?: boolean;
};

export type CapyDesignHostCaptureClip = { x: number; y: number; width: number; height: number };
export type CapyDesignHostCaptureOptions = { clip?: CapyDesignHostCaptureClip };
export type CapyDesignHostCaptureSuccess = { dataUrl: string; h: number; ok: true; w: number };
export type CapyDesignHostCaptureResult = CapyDesignHostCaptureSuccess | CapyDesignHostFailure;

export type CapyDesignHostPreviewNavigationFailure = {
  errorCode: number;
  eventId: number;
  frameName?: string;
  occurredAtMs: number;
  validatedUrl: string;
};

export type CapyDesignHostPreviewNavigationFailureListener = (
  failure: CapyDesignHostPreviewNavigationFailure,
) => void;

export type CapyDesignHostBrowserClearDataOptions = {
  cookies?: boolean;
  storage?: boolean;
};

/**
 * App theme values the renderer may pin the host window appearance to.
 * `light`/`dark` force the native window material (macOS under-window
 * vibrancy glass follows the OS appearance by default, which reads as a
 * muddy gray when the OS is dark but the app theme is explicitly light);
 * `system` restores following the OS.
 */
export const OPEN_DESIGN_HOST_APPEARANCE_THEMES = Object.freeze({
  DARK: "dark",
  LIGHT: "light",
  SYSTEM: "system",
} as const);

export type CapyDesignHostAppearanceTheme =
  (typeof OPEN_DESIGN_HOST_APPEARANCE_THEMES)[keyof typeof OPEN_DESIGN_HOST_APPEARANCE_THEMES];

export const OPEN_DESIGN_HOST_UPDATER_ACTIONS = Object.freeze({
  CHECK: "check",
  CLEAR_CACHE: "clear-cache",
  DOWNLOAD: "download",
  INSTALL: "install",
  QUIT: "quit",
  STATUS: "status",
} as const);

export type CapyDesignHostUpdaterAction =
  (typeof OPEN_DESIGN_HOST_UPDATER_ACTIONS)[keyof typeof OPEN_DESIGN_HOST_UPDATER_ACTIONS];

/** @internal Updater actions that return a status snapshot (every action except `quit`). */
export type CapyDesignHostUpdaterStatusAction = Exclude<
  CapyDesignHostUpdaterAction,
  typeof OPEN_DESIGN_HOST_UPDATER_ACTIONS.QUIT
>;

export const OPEN_DESIGN_HOST_UPDATER_STATES = Object.freeze({
  AVAILABLE: "available",
  CHECKING: "checking",
  DOWNLOADED: "downloaded",
  DOWNLOADING: "downloading",
  ERROR: "error",
  IDLE: "idle",
  INSTALLING: "installing",
  NOT_AVAILABLE: "not-available",
  UNSUPPORTED: "unsupported",
} as const);

export type CapyDesignHostUpdaterState =
  (typeof OPEN_DESIGN_HOST_UPDATER_STATES)[keyof typeof OPEN_DESIGN_HOST_UPDATER_STATES];

export type CapyDesignHostUpdaterMode = "js-incremental" | "package-launcher";
export type CapyDesignHostUpdaterChannel = ReleaseChannel;

export type CapyDesignHostUpdaterActionOptions = {
  payload?: Record<string, unknown>;
};

export type CapyDesignHostUpdaterCapabilitySet = {
  canApplyInPlace: boolean;
  canDownload: boolean;
  canOpenInstaller: boolean;
  requiresManualInstall: boolean;
};

export type CapyDesignHostUpdaterPathSnapshot = {
  downloadRoot?: string;
  manifestPath?: string;
};

export type CapyDesignHostUpdaterChecksumSnapshot = {
  algorithm: "sha256" | "sha512";
  url?: string;
  value?: string;
};

export type CapyDesignHostUpdaterArtifactSnapshot = {
  name?: string;
  platformKey?: string;
  size?: number;
  type?: string;
  url: string;
};

export type CapyDesignHostUpdaterProgressSnapshot = {
  receivedBytes: number;
  totalBytes?: number;
};

export type CapyDesignHostUpdaterErrorSnapshot = {
  code: string;
  details?: unknown;
  message: string;
};

export type CapyDesignHostUpdaterInstallResult = {
  activeVersion?: string;
  artifactPath?: string;
  dryRun?: boolean;
  helperLogPath?: string;
  launcherRuntimePath?: string;
  launchPath?: string;
  openedAt: string;
  path: string;
};

export type CapyDesignHostUpdaterReleaseSnapshot = {
  arch: string;
  artifact: CapyDesignHostUpdaterArtifactSnapshot;
  checksum: CapyDesignHostUpdaterChecksumSnapshot;
  channel: CapyDesignHostUpdaterChannel;
  downloadedAt: string;
  key: string;
  metadata?: Record<string, unknown>;
  path: string;
  platformKey: string;
  version: string;
};

export type CapyDesignHostUpdaterIncomingSnapshot = {
  arch: string;
  artifact: CapyDesignHostUpdaterArtifactSnapshot;
  channel: CapyDesignHostUpdaterChannel;
  key?: string;
  metadata?: Record<string, unknown>;
  progress?: CapyDesignHostUpdaterProgressSnapshot;
  startedAt: string;
  version: string;
};

export type CapyDesignHostUpdaterCacheLifecycleTrigger = "cold-start" | "manual" | "next-version-ready";

export type CapyDesignHostUpdaterReleaseLifecycleState =
  | "cleanup-deferred"
  | "cleanup-removed"
  | "deprecated"
  | "retained"
  | "unknown";

export type CapyDesignHostUpdaterCacheLifecycleSummary = {
  lastRunAt?: string;
  lastTrigger?: CapyDesignHostUpdaterCacheLifecycleTrigger;
  platform: string;
  releases: {
    cleanupDeferred: number;
    cleanupRemoved: number;
    deprecated: number;
    errors: number;
    retained: number;
    total: number;
    unknown: number;
  };
};

export type CapyDesignHostUpdaterCacheSnapshot = {
  lifecycle?: CapyDesignHostUpdaterCacheLifecycleSummary;
};

export type CapyDesignHostUpdaterReinstallReason =
  | "launcher-schema"
  | "outer-below-min"
  | "outer-version-unreadable";

/**
 * Present when the release feed requires a full installer reinstall instead of
 * an in-place payload update. `installedVersion` is the physically installed
 * outer package version; `url` is an optional operator-supplied explanation
 * link.
 */
export type CapyDesignHostUpdaterReinstallSnapshot = {
  installedVersion?: string;
  minVersion?: string;
  reason: CapyDesignHostUpdaterReinstallReason;
  url?: string;
};

export type CapyDesignHostUpdaterStatusSnapshot = {
  active?: CapyDesignHostUpdaterReleaseSnapshot;
  arch: string;
  artifact?: CapyDesignHostUpdaterArtifactSnapshot;
  artifactUrl?: string;
  availableVersion?: string;
  cache?: CapyDesignHostUpdaterCacheSnapshot;
  capabilities: CapyDesignHostUpdaterCapabilitySet;
  channel: CapyDesignHostUpdaterChannel;
  checksum?: CapyDesignHostUpdaterChecksumSnapshot;
  currentVersion: string;
  downloadPath?: string;
  enabled: boolean;
  error?: CapyDesignHostUpdaterErrorSnapshot;
  incoming?: CapyDesignHostUpdaterIncomingSnapshot;
  installResult?: CapyDesignHostUpdaterInstallResult;
  lastCheckedAt?: string;
  metadata?: Record<string, unknown>;
  mode: CapyDesignHostUpdaterMode;
  paths?: CapyDesignHostUpdaterPathSnapshot;
  platform: string;
  progress?: CapyDesignHostUpdaterProgressSnapshot;
  reinstall?: CapyDesignHostUpdaterReinstallSnapshot;
  state: CapyDesignHostUpdaterState;
  supported: boolean;
};

export type CapyDesignHostUpdaterResult =
  | { ok: true; status: CapyDesignHostUpdaterStatusSnapshot }
  | CapyDesignHostFailure;

export type CapyDesignHostUpdaterStatusListener = (status: CapyDesignHostUpdaterStatusSnapshot) => void;

export type CapyDesignHostUpdaterMenuLabels = {
  check: string;
  checking: string;
  downloading: string;
  install: string;
  installing: string;
  restart: string;
};

export type CapyDesignHostUpdaterOpenDialogRequest = {
  source: string;
};

export type CapyDesignHostUpdaterOpenDialogListener = (request: CapyDesignHostUpdaterOpenDialogRequest) => void;

export type CapyDesignHostBridge = {
  // Optional so older host builds still satisfy the bridge shape; callers
  // must feature-detect before invoking.
  appearance?: {
    setTheme(theme: CapyDesignHostAppearanceTheme): void;
  };
  browser: {
    clearData(options?: CapyDesignHostBrowserClearDataOptions): Promise<CapyDesignHostActionResult>;
  };
  capture: {
    page(options?: CapyDesignHostCaptureOptions): Promise<CapyDesignHostCaptureResult>;
  };
  client: CapyDesignHostClient;
  pdf: {
    print(html: string, nonce?: string, options?: CapyDesignHostPdfPrintOptions): Promise<CapyDesignHostActionResult>;
  };
  pet: {
    setVisible(visible: boolean): void;
  };
  // Optional so web builds and older desktop hosts keep the same contract.
  // Electron is the only layer that can observe a compositor-affecting
  // subframe navigation failure after the iframe DOM remains healthy.
  preview?: {
    getLatestNavigationFailure(): CapyDesignHostPreviewNavigationFailure | null;
    subscribeNavigationFailure(listener: CapyDesignHostPreviewNavigationFailureListener): () => void;
  };
  project: {
    pickAndImport(init?: CapyDesignHostProjectImportInit): Promise<CapyDesignHostProjectImportResult>;
    pickAndReplaceWorkingDir(projectId: string): Promise<CapyDesignHostProjectReplaceWorkingDirResult>;
    // Optional so older host builds still satisfy the bridge shape; callers
    // must feature-detect before invoking.
    pickWorkingDir?(): Promise<CapyDesignHostPickWorkingDirResult>;
  };
  shell: {
    openExternal(url: string): Promise<CapyDesignHostActionResult>;
    openPath(projectId: string): Promise<CapyDesignHostActionResult>;
  };
  updater: {
    check(options?: CapyDesignHostUpdaterActionOptions): Promise<CapyDesignHostUpdaterStatusSnapshot>;
    "clear-cache"(options?: CapyDesignHostUpdaterActionOptions): Promise<CapyDesignHostUpdaterStatusSnapshot>;
    download(options?: CapyDesignHostUpdaterActionOptions): Promise<CapyDesignHostUpdaterStatusSnapshot>;
    install(options?: CapyDesignHostUpdaterActionOptions): Promise<CapyDesignHostUpdaterStatusSnapshot>;
    quit(options?: CapyDesignHostUpdaterActionOptions): Promise<CapyDesignHostActionResult>;
    setMenuLabels(labels: CapyDesignHostUpdaterMenuLabels): Promise<CapyDesignHostActionResult>;
    status(options?: CapyDesignHostUpdaterActionOptions): Promise<CapyDesignHostUpdaterStatusSnapshot>;
    subscribe(listener: CapyDesignHostUpdaterStatusListener): () => void;
    subscribeOpenDialog(listener: CapyDesignHostUpdaterOpenDialogListener): () => void;
  };
  version: typeof OPEN_DESIGN_HOST_VERSION;
};

export type CapyDesignHostGlobalScope = Record<string, unknown> & {
  window?: unknown;
};
