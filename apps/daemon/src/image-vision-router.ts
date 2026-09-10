// Router for image/vision work → the project's designated image agent.
//
// A project may designate one chat-agent CLI (any detected runtime: agy,
// claude, codex, …) to handle image-generation and vision-review requests,
// while the project's normal chat agent keeps text/coding work. This module
// decides, for a given request, whether it is image/vision work and returns
// the agent that should run it.
//
// Contract:
//   - An explicit agent id supplied by the caller (composer pick / CLI
//     override) ALWAYS wins — the user's explicit choice is never silently
//     rerouted.
//   - Otherwise, when the request is image/vision work and the project has a
//     detected image agent, route to it.
//   - Otherwise keep the caller's effective agent (today's behavior).

export type DetectedAgentLike = { id: string; available: boolean };
export type DetectedAgentSet =
  | ReadonlyMap<string, boolean>
  | DetectedAgentLike[]
  | undefined;

export type ImageVisionRoutingInput = {
  /** User-supplied prompt text. */
  text: string;
  /** True when the request carries image attachment(s). */
  hasImageAttachments: boolean;
  /** True when the request references existing project image files. */
  referencesProjectImages?: boolean;
  /** The caller's already-resolved agent (composer pick / config default). */
  currentAgentId: string | null;
  /** Explicit agent the user forced (composer pick) — never rerouted. */
  explicitAgentId?: string | null;
  /** Project-designated image/vision agent (metadata.imageAgentId). */
  projectImageAgentId?: string | null;
  /** Detected agents on this machine (id → available). */
  detectedAgents?: DetectedAgentSet;
};

export type ImageVisionRoutingDecision =
  | { kind: 'keep-current'; agentId: string | null }
  | { kind: 'route-to-image-agent'; agentId: string };

// Match phrases that signal the user is asking the agent to LOOK AT an image
// (review/assess) or MAKE one. Kept conservative: an ambiguous request must
// NOT be yanked to a different CLI. We only route when the signal is strong.
const VISION_ACTION_RE =
  /\b(review|assess|evaluate|judge|check|inspect|compare|rate|look at|looks?|see what|describe|analyze|critique|verify|qa)\b/i;

const IMAGE_SUBJECT_RE =
  /\b(image|images|screenshot|screenshots|mockup|mockups|design|rendering|render|visual|artwork|illustration|logo|banner|poster|hero|thumbnail|icon|icons|ui|layout|composition|preview)\b/i;

const IMAGE_GENERATION_RE =
  /\b(generate|create|make|produce|design|draw|render|build|craft)\s+(an?\s+|the\s+)?(image|picture|photo|illustration|logo|banner|poster|hero|thumbnail|icon|artwork|visual|screenshot|mockup)\b/i;

const REVIEW_NOUN_RE =
  /\b(review|critique|feedback|qa|assessment|evaluation|opinion|look)\s+(of|on|at|for)?\s*(the\s+)?(image|design|mockup|screenshot|visual|hero|banner|logo|landing|page|ui|layout)\b/i;

function looksLikeVisionOrImageWork(input: {
  text: string;
  hasImageAttachments: boolean;
  referencesProjectImages?: boolean;
}): boolean {
  const text = input.text.trim();

  // The strongest signal: an image is attached AND the user asks to look/review.
  if (input.hasImageAttachments) {
    // "what do you think", "is this good", "review this", bare "?"-style asks
    // with an attachment are vision requests.
    if (text.length === 0) return true;
    if (VISION_ACTION_RE.test(text)) return true;
  }

  // Explicit image-generation phrasing ("generate an image of…").
  if (IMAGE_GENERATION_RE.test(text)) return true;
  // Review-of-image phrasing ("review the hero", "what do you think of the design").
  if (REVIEW_NOUN_RE.test(text)) return true;

  // A user referencing project images by name AND using a vision verb.
  if (input.referencesProjectImages && VISION_ACTION_RE.test(text)) return true;
  if (input.referencesProjectImages && IMAGE_SUBJECT_RE.test(text) && /\?/.test(text)) return true;

  return false;
}

/**
 * Decide which agent should run a chat request.
 *
 * Pure + synchronous so it is trivially unit-testable; the caller wires the
 * live detected-agent set and project metadata.
 */
export function routeImageVisionRequest(
  input: ImageVisionRoutingInput,
): ImageVisionRoutingDecision {
  // 1. Explicit user choice always wins.
  if (input.explicitAgentId) {
    return { kind: 'keep-current', agentId: input.explicitAgentId };
  }

  const isImageWork = looksLikeVisionOrImageWork({
    text: input.text,
    hasImageAttachments: input.hasImageAttachments,
    ...(input.referencesProjectImages !== undefined
      ? { referencesProjectImages: input.referencesProjectImages }
      : {}),
  });
  if (!isImageWork) {
    return { kind: 'keep-current', agentId: input.currentAgentId };
  }

  // 2. Image work + project designated an image agent that is detected → route.
  const imageAgentId = input.projectImageAgentId;
  if (imageAgentId) {
    const available = agentAvailable(imageAgentId, input.detectedAgents);
    // If we can't confirm availability, still route to the designated id —
    // the run layer keeps the caller's agent when the id has no definition
    // and warns on the daemon terminal, rather than silently running image
    // work on the wrong agent with no trace at all.
    if (available !== false) {
      return { kind: 'route-to-image-agent', agentId: imageAgentId };
    }
  }

  // 3. No image agent configured/detected → keep the caller's agent.
  return { kind: 'keep-current', agentId: input.currentAgentId };
}

function agentAvailable(id: string, detected: DetectedAgentSet): boolean | undefined {
  if (!detected) return undefined;
  if (detected instanceof Map) return detected.get(id);
  if (Array.isArray(detected)) {
    const found = detected.find((agent: DetectedAgentLike) => agent.id === id);
    return found ? found.available : undefined;
  }
  return undefined;
}

/**
 * Raster extensions the agent CLIs can actually receive as images.
 * Same set the media `--image` flag and the pi-rpc session gate on
 * (png/jpg/jpeg/webp/gif, plus avif/bmp which the model APIs accept).
 * SVG is deliberately excluded: it reads as text, so attaching one is not
 * by itself a signal the user wants vision work.
 */
const IMAGE_ATTACHMENT_EXT_RE = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;

/**
 * True when a single `attachments` entry looks like an image file.
 * `attachments` are project-relative paths of ANY kind (README.md included),
 * so the router must not treat "has attachments" as "has images" — that
 * misroute sends plain text work to the project's image agent.
 */
export function attachmentLooksLikeImage(entry: unknown): boolean {
  if (typeof entry !== 'string') return false;
  const base = entry.split(/[/\\]/).pop() ?? '';
  return IMAGE_ATTACHMENT_EXT_RE.test(base.trim());
}

/** True when at least one `attachments` entry looks like an image file. */
export function hasImageAttachment(entries: unknown): boolean {
  return Array.isArray(entries) && entries.some(attachmentLooksLikeImage);
}
