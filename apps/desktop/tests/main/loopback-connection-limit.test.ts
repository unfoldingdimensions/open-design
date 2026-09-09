import { describe, expect, it, vi } from "vitest";

import { applyLoopbackConnectionLimitSwitch } from "../../src/main/index.js";

function stubApp(ready: boolean) {
  return {
    isReady: () => ready,
    commandLine: { appendSwitch: vi.fn() },
  } as unknown as Electron.App;
}

describe("applyLoopbackConnectionLimitSwitch", () => {
  it("applies the loopback ignore-limit switch before ready", () => {
    const app = stubApp(false);

    expect(applyLoopbackConnectionLimitSwitch(app)).toBe(true);
    expect(app.commandLine.appendSwitch).toHaveBeenCalledTimes(1);
    expect(app.commandLine.appendSwitch).toHaveBeenCalledWith(
      "ignore-connections-limit",
      "127.0.0.1,localhost",
    );
  });

  it("warns and reports failure instead of silently skipping after ready", () => {
    const app = stubApp(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      expect(applyLoopbackConnectionLimitSwitch(app)).toBe(false);
      expect(app.commandLine.appendSwitch).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});
