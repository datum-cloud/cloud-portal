import type { ProjectSuspensionReason } from '@/resources/projects';

export interface SuspensionAppealContext {
  projectName: string;
  projectDisplayName?: string;
  reasons: ProjectSuspensionReason[];
}

/** Prefilled HelpScout appeal message (AC #1 appeal path). */
export function buildSuspensionAppealRequest(ctx: SuspensionAppealContext) {
  const who = `${ctx.projectDisplayName ?? ctx.projectName} (${ctx.projectName})`;
  const reasonLine = ctx.reasons.length > 0 ? ctx.reasons.join(', ') : 'not shown';
  return {
    subject: `Suspension appeal: ${ctx.projectName}`,
    text:
      `Hello team,\n\n` +
      `I'd like to appeal the suspension of my project.\n\n` +
      `Details:\n` +
      `- Project: ${who}\n` +
      `- Reason category shown: ${reasonLine}\n` +
      `- Context: [briefly describe why you believe this should be reviewed]\n\n` +
      `Thank you!`,
  };
}
