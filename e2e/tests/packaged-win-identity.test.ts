import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { releaseAppVersionArgs, resolvePackagedWinInstallIdentity } from "@/vitest/packaged-win-identity";

const repoRoot = join(import.meta.dirname, "../..");

describe("packaged windows smoke identity", () => {
  it("[P2] pins apps/desktop productName to the packaged identity chain", () => {
    const desktopPackage = JSON.parse(
      readFileSync(join(repoRoot, "apps/desktop/package.json"), "utf8"),
    ) as { productName?: string };
    const canonical = resolvePackagedWinInstallIdentity({
      namespace: "default",
      releaseVersion: undefined,
    }).displayName;

    // A rename that updates the builders but misses the app-level productName
    // ships an Electron bundle whose dock/taskbar name still reads the old
    // product. This pin makes that drift a test failure here.
    expect(desktopPackage.productName).toBe("CapyDesign");
    expect(desktopPackage.productName).toBe(canonical);

    for (const platform of ["win", "mac"] as const) {
      const constants = readFileSync(
        join(repoRoot, `tools/pack/src/${platform}/constants.ts`),
        "utf8",
      );
      expect(constants).toContain(`PRODUCT_NAME = ${JSON.stringify(desktopPackage.productName)}`);
    }
  });

  it("[P2] lets a prerelease version override the stable release namespace", () => {
    expect(resolvePackagedWinInstallIdentity({
      namespace: "release-stable-win",
      releaseVersion: "0.8.0-prerelease.2",
    })).toEqual({
      displayName: "CapyDesign Prerelease",
      namespaceToken: "release-stable-win",
    });
    expect(releaseAppVersionArgs("0.8.0-prerelease.2")).toEqual(["--app-version", "0.8.0-prerelease.2"]);
  });

  it("[P2] keeps stable release namespaces on the canonical display identity", () => {
    expect(resolvePackagedWinInstallIdentity({
      namespace: "release-stable-win",
      releaseVersion: "0.8.0",
    })).toEqual({
      displayName: "CapyDesign",
      namespaceToken: "release-stable-win",
    });
    expect(resolvePackagedWinInstallIdentity({
      namespace: "default",
      releaseVersion: undefined,
    })).toEqual({
      displayName: "CapyDesign",
      namespaceToken: "default",
    });
  });

  it("[P2] matches first-class preview and beta release identities", () => {
    expect(resolvePackagedWinInstallIdentity({
      namespace: "release-stable-win",
      releaseVersion: "0.8.0-preview.1",
    }).displayName).toBe("CapyDesign Preview");
    expect(resolvePackagedWinInstallIdentity({
      namespace: "release-beta-win",
      releaseVersion: undefined,
    }).displayName).toBe("CapyDesign Beta");
  });

  it("[P2] keeps ad hoc namespaces isolated from release channel identities", () => {
    expect(resolvePackagedWinInstallIdentity({
      namespace: "beta-local-flow",
      releaseVersion: undefined,
    })).toEqual({
      displayName: "CapyDesign beta-local-flow",
      namespaceToken: "beta-local-flow",
    });
    expect(releaseAppVersionArgs("   ")).toEqual([]);
  });
});
