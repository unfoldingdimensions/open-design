import { describe, expect, it } from 'vitest';

import {
  routeImageVisionRequest,
  type ImageVisionRoutingInput,
} from '../src/image-vision-router.js';

function input(overrides: Partial<ImageVisionRoutingInput> = {}): ImageVisionRoutingInput {
  return {
    text: '',
    hasImageAttachments: false,
    currentAgentId: 'command-code',
    projectImageAgentId: null,
    ...overrides,
  };
}

describe('routeImageVisionRequest', () => {
  it('keeps the current agent for ordinary text work', () => {
    const d = routeImageVisionRequest(
      input({ text: 'Refactor the auth module and add tests.', hasImageAttachments: false }),
    );
    expect(d).toEqual({ kind: 'keep-current', agentId: 'command-code' });
  });

  it('routes explicit image-generation phrasing to the project image agent', () => {
    const d = routeImageVisionRequest(
      input({
        text: 'Generate a hero image for the landing page',
        projectImageAgentId: 'antigravity',
        detectedAgents: [{ id: 'antigravity', available: true }],
      }),
    );
    expect(d).toEqual({ kind: 'route-to-image-agent', agentId: 'antigravity' });
  });

  it('routes a vision review of an attachment to the project image agent', () => {
    const d = routeImageVisionRequest(
      input({
        text: 'Review this and tell me what looks off',
        hasImageAttachments: true,
        projectImageAgentId: 'claude',
        detectedAgents: [{ id: 'claude', available: true }],
      }),
    );
    expect(d).toEqual({ kind: 'route-to-image-agent', agentId: 'claude' });
  });

  it('routes a bare attachment with no text to the image agent (pure vision)', () => {
    const d = routeImageVisionRequest(
      input({
        text: '',
        hasImageAttachments: true,
        projectImageAgentId: 'antigravity',
      }),
    );
    expect(d).toEqual({ kind: 'route-to-image-agent', agentId: 'antigravity' });
  });

  it('keeps current agent when image work but no image agent is configured', () => {
    const d = routeImageVisionRequest(
      input({ text: 'Generate a banner image for the promo.', projectImageAgentId: null }),
    );
    expect(d).toEqual({ kind: 'keep-current', agentId: 'command-code' });
  });

  it('keeps the explicit user-picked agent even for image work (override wins)', () => {
    const d = routeImageVisionRequest(
      input({
        text: 'Generate an image of a fox',
        projectImageAgentId: 'antigravity',
        explicitAgentId: 'codex',
      }),
    );
    expect(d).toEqual({ kind: 'keep-current', agentId: 'codex' });
  });

  it('falls back to current when the project image agent is not detected', () => {
    const d = routeImageVisionRequest(
      input({
        text: 'Generate an image of a fox',
        projectImageAgentId: 'antigravity',
        detectedAgents: [{ id: 'antigravity', available: false }],
      }),
    );
    expect(d).toEqual({ kind: 'keep-current', agentId: 'command-code' });
  });

  it('does not yank an ambiguous design-text request to a different CLI', () => {
    // "design the database schema" is NOT image work — conservative routing
    // must keep it on the main agent.
    const d = routeImageVisionRequest(
      input({
        text: 'Design the database schema for the billing service',
        projectImageAgentId: 'antigravity',
        detectedAgents: [{ id: 'antigravity', available: true }],
      }),
    );
    expect(d).toEqual({ kind: 'keep-current', agentId: 'command-code' });
  });

  it('routes review-of-image noun phrasing even without an attachment', () => {
    const d = routeImageVisionRequest(
      input({
        text: 'Give me a critique of the landing page design',
        projectImageAgentId: 'claude',
        detectedAgents: [{ id: 'claude', available: true }],
      }),
    );
    expect(d).toEqual({ kind: 'route-to-image-agent', agentId: 'claude' });
  });
});
