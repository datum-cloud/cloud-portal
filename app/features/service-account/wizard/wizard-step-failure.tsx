import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { CircleAlertIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export interface WizardStepFailureProps {
  title: string;
  description: ReactNode;
  retryLabel: string;
  onRetry: () => void;
  onGoToKeys: () => void;
}

/**
 * Recovery surface for both partial-failure (key create failed after account
 * existed) and poller-failure (account created but email never resolved).
 * The two error modes share the same shape: warning + headline + recovery
 * actions; only the copy differs. The wizard parent supplies the strings.
 *
 * Layout matches the running state (centered, large icon) so the two
 * post-form states have a consistent visual rhythm.
 */
export function WizardStepFailure({
  title,
  description,
  retryLabel,
  onRetry,
  onGoToKeys,
}: WizardStepFailureProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[346px] flex-col items-center justify-center gap-6 px-5 text-center">
      <Icon icon={CircleAlertIcon} className="text-destructive size-16" aria-hidden="true" />

      <div className="flex flex-col items-center gap-1.5">
        <span className="text-foreground text-lg font-semibold">{title}</span>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="small"
          onClick={onGoToKeys}>
          Go to Keys Tab
        </Button>
        <Button htmlType="button" type="primary" theme="solid" size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </motion.div>
  );
}
