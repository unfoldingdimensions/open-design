export const PRODUCT_NAME = "CapyDesign";
export const DESKTOP_LOG_ECHO_ENV = "OD_DESKTOP_LOG_ECHO";
export const WEB_STANDALONE_HOOK_CONFIG_ENV = "OD_TOOLS_PACK_WEB_STANDALONE_HOOK_CONFIG";
export const WEB_STANDALONE_RESOURCE_NAME = "open-design-web-standalone";
export const ELECTRON_BUILDER_ASAR = false;
export const ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE = false;
export const ELECTRON_BUILDER_NODE_GYP_REBUILD = false;
export const ELECTRON_BUILDER_NPM_REBUILD = false;
export const ELECTRON_REBUILD_MODE = "sequential" as const;
export const ELECTRON_REBUILD_NATIVE_MODULES = ["better-sqlite3"] as const;
export const ELECTRON_BUILDER_FILE_PATTERNS = [
  "**/*",
  "!**/node_modules/.bin",
  "!**/node_modules/electron{,/**/*}",
  "!**/*.map",
  "!**/*.tsbuildinfo",
  "!**/.next/cache",
  "!**/.next/cache/**",
  "!**/node_modules/better-sqlite3/build/Release/obj",
  "!**/node_modules/better-sqlite3/build/Release/obj/**",
  "!**/node_modules/better-sqlite3/deps",
  "!**/node_modules/better-sqlite3/deps/**",
] as const;
export const NSIS_INSTALLER_LANGUAGE_BY_WEB_LOCALE = {
  en: "en_US",
  fa: "fa_IR",
  "pt-BR": "pt_BR",
  ru: "ru_RU",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
} as const;
export const INTERNAL_PACKAGES = [
  { directory: "packages/release", name: "@capydesign/release" },
  { directory: "packages/components", name: "@capydesign/components" },
  { directory: "packages/contracts", name: "@capydesign/contracts" },
  { directory: "packages/registry-protocol", name: "@capydesign/registry-protocol" },
  { directory: "packages/sidecar-proto", name: "@capydesign/sidecar-proto" },
  { directory: "packages/launcher-proto", name: "@capydesign/launcher-proto" },
  { directory: "packages/platform", name: "@capydesign/platform" },
  { directory: "packages/sidecar", name: "@capydesign/sidecar" },
  { directory: "packages/download", name: "@capydesign/download" },
  { directory: "packages/host", name: "@capydesign/host" },
  { directory: "packages/agui-adapter", name: "@capydesign/agui-adapter" },
  { directory: "packages/plugin-runtime", name: "@capydesign/plugin-runtime" },
  { directory: "packages/diagnostics", name: "@capydesign/diagnostics" },
  { directory: "apps/daemon", name: "@capydesign/daemon" },
  { directory: "apps/web", name: "@capydesign/web" },
  { directory: "apps/desktop", name: "@capydesign/desktop" },
  { directory: "apps/packaged", name: "@capydesign/packaged" },
] as const;
