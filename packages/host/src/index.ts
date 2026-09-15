/**
 * @module host
 *
 * Public barrel for `@capydesign/host` — the CapyDesign renderer host-bridge
 * protocol. Re-exports the exact prior flat surface from the cohesive sibling
 * modules: the wire protocol (constants + types), bridge detection/validation,
 * adapter-result normalizers, and the renderer-facing action wrappers. This
 * file contains no logic.
 */

// --- protocol: constant registries + wire types ---
export {
  OPEN_DESIGN_HOST_GLOBAL,
  OPEN_DESIGN_HOST_VERSION,
  OPEN_DESIGN_HOST_APPEARANCE_THEMES,
  OPEN_DESIGN_HOST_CLIENT_TYPES,
  OPEN_DESIGN_HOST_UPDATER_ACTIONS,
  OPEN_DESIGN_HOST_UPDATER_STATES,
} from "./protocol.js";
export type {
  CapyDesignHostClientType,
  CapyDesignHostClient,
  CapyDesignHostFailure,
  CapyDesignHostActionResult,
  CapyDesignHostWorkspaceContext,
  CapyDesignHostProjectImportInit,
  CapyDesignHostProjectImportSuccess,
  CapyDesignHostProjectImportResult,
  CapyDesignHostProjectReplaceWorkingDirSuccess,
  CapyDesignHostProjectReplaceWorkingDirResult,
  CapyDesignHostPickWorkingDirSuccess,
  CapyDesignHostPickWorkingDirResult,
  CapyDesignHostPdfPrintOptions,
  CapyDesignHostCaptureClip,
  CapyDesignHostCaptureOptions,
  CapyDesignHostCaptureSuccess,
  CapyDesignHostCaptureResult,
  CapyDesignHostPreviewNavigationFailure,
  CapyDesignHostPreviewNavigationFailureListener,
  CapyDesignHostAppearanceTheme,
  CapyDesignHostBrowserClearDataOptions,
  CapyDesignHostUpdaterAction,
  CapyDesignHostUpdaterState,
  CapyDesignHostUpdaterMode,
  CapyDesignHostUpdaterChannel,
  CapyDesignHostUpdaterActionOptions,
  CapyDesignHostUpdaterCapabilitySet,
  CapyDesignHostUpdaterPathSnapshot,
  CapyDesignHostUpdaterChecksumSnapshot,
  CapyDesignHostUpdaterArtifactSnapshot,
  CapyDesignHostUpdaterProgressSnapshot,
  CapyDesignHostUpdaterErrorSnapshot,
  CapyDesignHostUpdaterInstallResult,
  CapyDesignHostUpdaterReleaseSnapshot,
  CapyDesignHostUpdaterIncomingSnapshot,
  CapyDesignHostUpdaterCacheLifecycleTrigger,
  CapyDesignHostUpdaterReleaseLifecycleState,
  CapyDesignHostUpdaterCacheLifecycleSummary,
  CapyDesignHostUpdaterCacheSnapshot,
  CapyDesignHostUpdaterReinstallReason,
  CapyDesignHostUpdaterReinstallSnapshot,
  CapyDesignHostUpdaterStatusSnapshot,
  CapyDesignHostUpdaterResult,
  CapyDesignHostUpdaterStatusListener,
  CapyDesignHostUpdaterMenuLabels,
  CapyDesignHostUpdaterOpenDialogRequest,
  CapyDesignHostUpdaterOpenDialogListener,
  CapyDesignHostBridge,
  CapyDesignHostGlobalScope,
} from "./protocol.js";

// --- detection: locate + validate the injected bridge ---
export {
  isCapyDesignHostBridge,
  getCapyDesignHost,
  isCapyDesignHostAvailable,
  detectCapyDesignHostClientType,
} from "./detection.js";

// --- normalize: adapter result -> renderer contract ---
export {
  normalizeCapyDesignHostProjectImportResult,
  normalizeCapyDesignHostProjectReplaceWorkingDirResult,
  normalizeCapyDesignHostPickWorkingDirResult,
} from "./normalize.js";

// --- actions: renderer-facing host action wrappers ---
export {
  openHostExternalUrl,
  openHostProjectPath,
  clearHostBrowserData,
  captureHostPage,
  pickAndImportHostProject,
  pickAndReplaceHostProjectWorkingDir,
  pickHostWorkingDir,
  printHostPdf,
  setHostPetVisible,
  getHostUpdaterStatus,
  checkHostUpdater,
  clearHostUpdaterCache,
  downloadHostUpdater,
  installHostUpdater,
  quitHostAfterUpdaterInstallerOpen,
  getLatestHostPreviewNavigationFailure,
  subscribeHostUpdater,
  subscribeHostUpdaterOpenDialog,
  subscribeHostPreviewNavigationFailure,
  setHostUpdaterMenuLabels,
} from "./actions.js";
