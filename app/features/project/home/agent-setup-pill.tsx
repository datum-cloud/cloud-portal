import { AGENT_SETUP_COPIED_TOAST, agentSetupPrompt } from './agent-setup';
import { ClaudeLogo, CursorLogo, GitHubCopilotLogo } from '@/components/icon/agent-logos';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { AnalyticsAction, useAnalytics, type AnalyticsActionName } from '@/modules/rybbit';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Check, Copy, SquareTerminal } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
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
 * Where each chip goes when the pill is hovered: the stack fans out like a hand
 * of cards, spreading from its centre, tilting outwards and lifting into a
 * slight arc. One entry per chip, left to right; x and y in pixels, rotate in
 * degrees.
 */
const FAN = [
  { x: -4, y: -1, rotate: -9 },
  { x: -1.5, y: -2.5, rotate: -3 },
  { x: 1.5, y: -2.5, rotate: 3 },
  { x: 4, y: -1, rotate: 9 },
] as const;

/** Seconds between one chip and the next as the fan opens, so it ripples left to right. */
const FAN_STAGGER = 0.03;

/**
 * A spring rather than a timed curve: if the pointer leaves halfway, the chips
 * keep their momentum and ease back instead of stopping dead and reversing. A
 * little bounce lets each one settle into place.
 */
const FAN_SPRING = { type: 'spring', stiffness: 520, damping: 22, mass: 0.6 } as const;

/**
 * The pill passes its hover state ('rest' or 'fan') down to each chip through
 * these variants. The stagger only applies as the fan opens, so the chips come
 * back together at once when the pointer leaves.
 */
const chipVariants: Variants = {
  rest: { x: 0, y: 0, rotate: 0, transition: FAN_SPRING },
  fan: (index: number) => ({
    ...FAN[index],
    transition: { ...FAN_SPRING, delay: index * FAN_STAGGER },
  }),
};

/**
 * One agent mark in a small round chip, for the overlapping stack. A ring in
 * the pill's own colour (card) cuts each chip out of the one beneath, so the
 * overlaps read cleanly in light and dark. In dark, card and muted are the same
 * colour, so the chip uses the lighter accent there.
 */
function MarkChip({ index, children }: { index: number; children: ReactNode }) {
  return (
    <motion.span
      custom={index}
      variants={chipVariants}
      className="bg-muted dark:bg-accent text-foreground ring-card flex size-5.5 items-center justify-center rounded-full ring-2 will-change-transform">
      {children}
    </motion.span>
  );
}

/** The agents the setup prompt covers, as a stack of overlapping chips. */
function AgentMarks() {
  return (
    <span aria-hidden className="flex items-center -space-x-1.5">
      <MarkChip index={0}>
        <ClaudeLogo size={12} />
      </MarkChip>
      <MarkChip index={1}>
        <SquareTerminal size={12} strokeWidth={2} />
      </MarkChip>
      <MarkChip index={2}>
        <CursorLogo size={11} />
      </MarkChip>
      <MarkChip index={3}>
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

  // With reduced motion the chips stay put and the pill doesn't shrink on press.
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={copyPrompt}
      aria-label="Onboard your agent to Datum: copy a setup prompt for your coding agent"
      initial="rest"
      animate="rest"
      whileHover={reduceMotion ? undefined : 'fan'}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className="bg-card hover:border-foreground/25 focus-visible:ring-ring inline-flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none">
      <span className="text-foreground">Onboard your agent to Datum</span>
      <AgentMarks />
      <Icon icon={copied ? Check : Copy} size={13} className="text-muted-foreground" aria-hidden />
    </motion.button>
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
