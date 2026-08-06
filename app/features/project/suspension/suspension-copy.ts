import type { ProjectSuspensionReason } from '@/resources/projects';

/**
 * Per-reason consumer sentence fragments (AC #1 / AC #3). Never render the
 * raw enum value — `Fraud` can be raised automatically before any human
 * review, so its copy stays neutral and non-accusatory.
 */
export const REASON_COPY: Record<ProjectSuspensionReason, string> = {
  Fraud: 'a security review of unusual account activity',
  Abuse: 'a violation of our acceptable use policy',
  Billing: 'an outstanding billing issue',
  Compliance: 'a compliance requirement',
  Administrative: 'an administrative action',
};

export const SUSPENDED_TOOLTIP = 'This project is suspended — new changes are disabled.';

/**
 * Joined sentence fragments without a lead-in — for surfaces that supply
 * their own title (SuspensionBar). Empty reasons → null.
 */
export function joinReasonPhrases(reasons: ProjectSuspensionReason[]): string | null {
  if (reasons.length === 0) return null;
  const phrases = reasons.map((r) => REASON_COPY[r]);
  return phrases.length === 1
    ? phrases[0]
    : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}

/** "This project has been suspended due to <x> and <y>." Empty reasons → generic sentence. */
export function reasonSummary(reasons: ProjectSuspensionReason[]): string {
  const joined = joinReasonPhrases(reasons);
  return joined === null
    ? 'This project has been suspended.'
    : `This project has been suspended due to ${joined}.`;
}
