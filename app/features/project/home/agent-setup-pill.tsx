import { AGENT_SETUP_COPIED_TOAST, agentSetupPrompt } from './agent-setup';
import { ClaudeLogo, CursorLogo, GitHubCopilotLogo } from '@/components/icon/agent-logos';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { AnalyticsAction, useAnalytics, type AnalyticsActionName } from '@/modules/rybbit';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Check, Copy, SquareTerminal } from 'lucide-react';
import type { ReactNode } from 'react';

/** Copies the agent setup prompt, with a toast, and records which control was used. */
function useCopyAgentSetupPrompt(
  organizationId: string | undefined,
  projectId: string,
  action: AnalyticsActionName
) {
  const [copied, copy] = useCopyToClipboard();
  const { trackAction } = useAnalytics();

  const copyPrompt = async () => {
    const ok = await copy(agentSetupPrompt(organizationId, projectId), {
      withToast: true,
      toastMessage: AGENT_SETUP_COPIED_TOAST,
    });
    if (ok) {
      trackAction(action);
    } else {
      toast.error("Couldn't copy the setup prompt. Check that this page can use the clipboard.");
    }
  };

  return [copied, copyPrompt] as const;
}

/**
 * One agent mark in a small round chip, for the overlapping stack. A ring in
 * the pill's own colour (card) cuts each chip out of the one beneath, so the
 * overlaps read cleanly in light and dark. In dark, card and muted are the same
 * colour, so the chip uses the lighter accent there.
 */
function MarkChip({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted dark:bg-accent text-foreground ring-card flex size-5.5 items-center justify-center rounded-full ring-2">
      {children}
    </span>
  );
}

/** The agents the setup prompt covers, as a stack of overlapping chips. */
function AgentMarks() {
  return (
    <span aria-hidden className="flex items-center -space-x-1.5">
      <MarkChip>
        <ClaudeLogo size={12} />
      </MarkChip>
      <MarkChip>
        <SquareTerminal size={12} strokeWidth={2} />
      </MarkChip>
      <MarkChip>
        <CursorLogo size={11} />
      </MarkChip>
      <MarkChip>
        <GitHubCopilotLogo size={12} />
      </MarkChip>
    </span>
  );
}

/**
 * "Onboard your agent to Datum": copies a one-line prompt that points a coding
 * agent at the hosted setup instructions, naming this organization and project.
 */
export function AgentSetupPill({
  organizationId,
  projectId,
}: {
  organizationId?: string;
  projectId: string;
}) {
  const [copied, copyPrompt] = useCopyAgentSetupPrompt(
    organizationId,
    projectId,
    AnalyticsAction.CopyAgentSetupPrompt
  );

  return (
    <button
      type="button"
      onClick={copyPrompt}
      aria-label="Onboard your agent to Datum: copy a setup prompt for your coding agent"
      className="bg-card hover:border-foreground/25 focus-visible:ring-ring inline-flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none">
      <span className="text-foreground">Onboard your agent to Datum</span>
      <AgentMarks />
      <Icon icon={copied ? Check : Copy} size={13} className="text-muted-foreground" aria-hidden />
    </button>
  );
}

/** The same copy action as a button, for the suggested next steps list. */
export function CopyAgentSetupPromptButton({
  organizationId,
  projectId,
}: {
  organizationId?: string;
  projectId: string;
}) {
  const [copied, copyPrompt] = useCopyAgentSetupPrompt(
    organizationId,
    projectId,
    AnalyticsAction.CopyAgentSetupPromptNextSteps
  );

  return (
    <Button
      type="secondary"
      theme="outline"
      size="xs"
      className="shrink-0"
      icon={<Icon icon={copied ? Check : Copy} size={12} aria-hidden="true" />}
      onClick={copyPrompt}>
      Copy prompt
    </Button>
  );
}
