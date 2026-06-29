import { HandwritingText } from '@/features/onboarding/components/handwriting-text';
import {
  OnboardingEntrance,
  OnboardingStagger,
} from '@/features/onboarding/components/onboarding-entrance';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { useCallback, useState } from 'react';

const BENEFITS = [
  {
    title: 'Access to all features',
    description: 'Validate your account and get immediate access to our full platform.',
  },
  {
    title: '$50 in usage credit',
    description: "Explore Datum Cloud for free. We'll notify you before any charges might occur.",
  },
  {
    title: 'Free support',
    description: 'All users can access live chat, email, or Discord based support.',
  },
] as const;

const BENEFITS_REVEAL_PROGRESS = 0.35;

export const BillingVerificationBenefits = () => {
  const [benefitsVisible, setBenefitsVisible] = useState(false);

  const revealBenefits = useCallback((progress: number) => {
    if (progress >= BENEFITS_REVEAL_PROGRESS) {
      setBenefitsVisible(true);
    }
  }, []);

  return (
    <OnboardingEntrance delay={1}>
      <Card className="bg-card/50 text-foreground flex w-full flex-col rounded-xl border-none shadow-none md:min-h-full md:max-w-[410px] md:self-stretch">
        <CardContent className="flex flex-1 flex-col p-[44px] md:min-h-full">
          <div className="my-auto flex flex-col gap-5">
            <div className="flex items-center">
              <HandwritingText
                text="You're getting..."
                className="rotate-[-5.212deg]"
                onProgress={revealBenefits}
              />
            </div>
            {BENEFITS.map((benefit, index) => (
              <OnboardingStagger key={benefit.title} visible={benefitsVisible} index={index}>
                <div className="flex flex-col gap-0">
                  <p className="text-foreground text-base font-medium opacity-60">
                    {benefit.title}
                  </p>
                  <p className="text-foreground text-[13px] leading-[18px] opacity-60">
                    {benefit.description}
                  </p>
                </div>
              </OnboardingStagger>
            ))}
          </div>
        </CardContent>
      </Card>
    </OnboardingEntrance>
  );
};
