import { HandwritingText } from '@/features/onboarding/components/handwriting-text';
import {
  OnboardingEntrance,
  OnboardingStagger,
} from '@/features/onboarding/components/onboarding-entrance';
import { helpScoutAPI } from '@/modules/helpscout';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useCallback, useState } from 'react';
import { Link } from 'react-router';

const PLATFORM_CHANGES = [
  {
    title: 'No more personal orgs',
    description:
      'We’ve deprecated “personal” orgs. All organizations now have our “standard” quota limits, including around collaborators, projects, etc.',
  },
  {
    title: 'Payment method',
    description:
      'Datum is currently free during public beta, but we now require a payment method for each organization. Note: your account won’t accrue any charges without prior notice.',
  },
  {
    title: 'Contact details',
    description:
      'While adding your payment method, please confirm your legal name as well as any company name you want associated.',
  },
] as const;

const NOTICE_REVEAL_PROGRESS = 0.35;

const bodyTextClassName = 'text-foreground text-[13px] leading-[18px] opacity-60';
const linkClassName = 'text-foreground underline underline-offset-2 hover:opacity-80';

/**
 * Right-hand notice shown to returning users resuming legacy org setup on the
 * onboarding billing page. Explains the platform changes that require them to
 * add a payment method, with escape hatches (deactivate the org, support).
 */
export const BillingLegacyResumeNotice = ({ orgId }: { orgId: string }) => {
  const [contentVisible, setContentVisible] = useState(false);

  const revealContent = useCallback((progress: number) => {
    if (progress >= NOTICE_REVEAL_PROGRESS) {
      setContentVisible(true);
    }
  }, []);

  return (
    <OnboardingEntrance
      delay={1}
      className="w-full min-w-0 md:relative md:max-w-[410px] md:self-stretch">
      {/* On md+ the card is absolutely positioned so it never contributes to the
          row height — it matches the form card on the left and scrolls inside. */}
      <Card className="bg-card/50 text-foreground flex w-full min-w-0 flex-col rounded-xl border-none py-0 shadow-none md:absolute md:inset-0">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 md:p-[44px]">
          <div className="my-auto flex flex-col gap-5">
            <div className="flex items-center">
              <HandwritingText
                text="Hey there!"
                className="rotate-[-5.212deg]"
                onProgress={revealContent}
              />
            </div>

            <OnboardingStagger visible={contentVisible} index={0}>
              <p className={cn(bodyTextClassName, 'mt-4')}>We’ve made some important changes:</p>
            </OnboardingStagger>

            {PLATFORM_CHANGES.map((change, index) => (
              <OnboardingStagger key={change.title} visible={contentVisible} index={index + 1}>
                <div className="flex flex-col gap-0">
                  <p className="text-foreground text-base font-medium opacity-60">{change.title}</p>
                  <p className={bodyTextClassName}>{change.description}</p>
                </div>
              </OnboardingStagger>
            ))}

            <OnboardingStagger visible={contentVisible} index={PLATFORM_CHANGES.length + 1}>
              <p className={bodyTextClassName}>
                Don’t want to add a payment method? Please click{' '}
                <Link
                  to={getPathWithParams(paths.org.detail.settings.general, { orgId })}
                  className={linkClassName}>
                  here
                </Link>{' '}
                to deactivate your organization. If you need help or have questions, please email{' '}
                <a href="mailto:support@datum.net" className={linkClassName}>
                  support@datum.net
                </a>{' '}
                or{' '}
                <button
                  type="button"
                  onClick={() => helpScoutAPI.open()}
                  className={`${linkClassName} cursor-pointer`}>
                  chat to us here
                </button>
                .
              </p>
            </OnboardingStagger>
          </div>
        </CardContent>
      </Card>
    </OnboardingEntrance>
  );
};
