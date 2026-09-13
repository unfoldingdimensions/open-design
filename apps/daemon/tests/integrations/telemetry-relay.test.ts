import { describe, expect, it } from 'vitest';

import {
  normalizeCapyDesignTelemetryRelayUrl,
  OPEN_DESIGN_TELEMETRY_RELAY_URLS,
} from '../../src/integrations/telemetry-relay.js';

describe('CapyDesign telemetry relay URLs', () => {
  it('keeps production on telemetry.open-design.ai', () => {
    expect(OPEN_DESIGN_TELEMETRY_RELAY_URLS.prod).toBe(
      'https://telemetry.open-design.ai/api/langfuse',
    );
    expect(normalizeCapyDesignTelemetryRelayUrl(
      'https://telemetry.open-design.ai/api/langfuse//',
    )).toBe(OPEN_DESIGN_TELEMETRY_RELAY_URLS.prod);
  });

  it('moves legacy self-host test URLs to telemetry-test.open-design.ai', () => {
    expect(normalizeCapyDesignTelemetryRelayUrl(
      'https://telemetry-selfhost.open-design.ai/api/langfuse/',
    )).toBe(OPEN_DESIGN_TELEMETRY_RELAY_URLS.test);
  });

  it('leaves custom relay URLs unchanged', () => {
    expect(normalizeCapyDesignTelemetryRelayUrl(
      'https://telemetry.example.test/api/langfuse/',
    )).toBe('https://telemetry.example.test/api/langfuse');
  });
});
