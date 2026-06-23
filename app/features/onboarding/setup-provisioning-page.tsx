import { LogoFlat } from '@/components/logo/logo-flat';
import { paths } from '@/utils/config/paths.config';
import { DATUMCTL_DOWNLOAD_URL } from '@/utils/config/query.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowRightIcon, CheckIcon, ExternalLinkIcon, LoaderCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

const STEP_DURATION_MS = 2500;

type StepStatus = 'complete' | 'loading' | 'pending';

interface SetupStep {
  title: string;
  subtext: string;
}

const buildSteps = (orgName: string): SetupStep[] => [
  {
    title: `Setting up ${orgName}`,
    subtext: '(You can rename it or create more anytime)',
  },
  {
    title: 'Configuring your first project',
    subtext: '(Ditto)',
  },
  {
    title: 'Applying $50 in credit to your billing account',
    subtext: "(We'll notify you before you run out)",
  },
];

export interface SetupProvisioningPageProps {
  orgName: string;
}

export const SetupProvisioningPage = ({ orgName }: SetupProvisioningPageProps) => {
  const navigate = useNavigate();
  const [completedCount, setCompletedCount] = useState(1);
  const steps = buildSteps(orgName);
  const allComplete = completedCount >= steps.length;

  useEffect(() => {
    if (completedCount >= steps.length) return;

    const timer = window.setTimeout(() => {
      setCompletedCount((count) => Math.min(count + 1, steps.length));
    }, STEP_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [completedCount, steps.length]);

  const stepStatus = (index: number): StepStatus => {
    if (index < completedCount) return 'complete';
    if (index === completedCount) return 'loading';
    return 'pending';
  };

  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div className="bg-background relative flex min-h-screen w-full flex-col md:flex-row">
      <LogoFlat
        className="absolute top-8 left-[41px] z-10 hidden h-6 w-auto md:block"
        aria-label="Datum"
      />

      <div className="bg-card flex w-full flex-col px-10 pt-8 pb-8 md:min-h-screen md:w-1/2">
        <LogoFlat className="mb-8 h-6 w-auto shrink-0 md:hidden" aria-label="Datum" />

        <div className="relative flex flex-1 flex-col items-center justify-center gap-10 py-10">
          <h2 className="text-foreground text-center text-2xl font-semibold">
            {allComplete ? 'Complete!' : 'Thank you!'}
          </h2>

          <div className="flex w-full max-w-[311px] flex-col gap-6">
            {steps.map((step, index) => {
              const status = stepStatus(index);
              const isActive = status !== 'pending';

              return (
                <div key={step.title} className="flex items-center gap-4">
                  <StepIcon status={status} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p
                      className={cn(
                        'text-foreground text-[13px] leading-[18px]',
                        !isActive && 'opacity-40'
                      )}>
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        'text-foreground text-xs leading-4 opacity-60',
                        !isActive && 'opacity-40'
                      )}>
                      {step.subtext}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative flex w-full flex-col items-center justify-center md:w-1/2">
            <Button
              htmlType="button"
              type="primary"
              className={cn(
                'relative w-fit overflow-hidden md:w-full',
                !allComplete &&
                  'border border-[rgba(156,121,121,0.1)] bg-[#f2eaea] text-[rgba(156,121,121,0.4)] hover:bg-[#f2eaea]'
              )}
              disabled={!allComplete}
              onClick={() => navigate(paths.account.organizations.root, { replace: true })}>
              {!allComplete && (
                <span
                  className="bg-primary/90 absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                Access the portal
                <Icon icon={ArrowRightIcon} className="size-4" />
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 relative flex-1 overflow-hidden md:flex md:min-h-screen">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-10 py-12">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-foreground text-2xl font-semibold">
              Folks <span className="text-primary">love</span> our CLI!
            </p>
            <Link
              to={DATUMCTL_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground flex items-center gap-2 text-xs hover:underline">
              Take it for a test drive
              <Icon icon={ExternalLinkIcon} className="size-3" />
            </Link>
          </div>

          <img
            src="/images/onboarding/cli-terminal.png"
            alt="Datum Cloud CLI welcome screen"
            className="h-auto w-full max-w-[400px]"
          />
        </div>

        <img
          src="/images/onboarding/provisioning-bottom-right-landscape.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 z-0 w-full object-contain object-bottom-right"
        />
      </div>
    </div>
  );
};

const StepIcon = ({ status }: { status: StepStatus }) => {
  if (status === 'complete') {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4d6356]">
        <Icon icon={CheckIcon} className="text-background size-4" />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[rgba(77,99,86,0.3)]">
        <Icon icon={LoaderCircleIcon} className="text-foreground size-4 animate-spin opacity-70" />
      </div>
    );
  }

  return (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[rgba(77,99,86,0.15)]">
      <Icon icon={LoaderCircleIcon} className="text-foreground size-4 opacity-30" />
    </div>
  );
};
