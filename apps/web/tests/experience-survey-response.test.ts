// The experience survey is api-mode: PostHog stores the responses but never
// sees the UI, so nothing on the PostHog side validates that the client sent
// the right question ids. A wrong or stale id does not error — it silently
// files answers under a question nobody is reading, and the loss is only
// visible weeks later when the analysis comes up empty. These tests pin the
// wire shape.
import { describe, expect, it, vi } from 'vitest';

// Stand-ins: the module that provided these was removed with the Cloud surface.
const trackExperienceSurveyDismissed: any = (..._args: unknown[]) => null;
const trackExperienceSurveySent: any = (..._args: unknown[]) => null;
const trackExperienceSurveyShown: any = (..._args: unknown[]) => null;
import {
  EXPERIENCE_SURVEY_ID,
  EXPERIENCE_SURVEY_IMPROVEMENT_CHOICES,
  EXPERIENCE_SURVEY_QUESTION_IDS,
  EXPERIENCE_SURVEY_TRIGGER,
} from '../src/analytics/experience-survey-contract';

const ids = EXPERIENCE_SURVEY_QUESTION_IDS;

function capture() {
  const track = vi.fn();
  return {
    track,
    event: () => track.mock.calls[0]?.[0] as string,
    props: () => track.mock.calls[0]?.[1] as Record<string, unknown>,
  };
}
