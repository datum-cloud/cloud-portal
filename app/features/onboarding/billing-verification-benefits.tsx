import { YoureGettingHeading } from '@/features/onboarding/youre-getting-heading';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';

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

export const BillingVerificationBenefits = () => (
  <Card className="bg-card/50 text-foreground flex w-full flex-col rounded-xl border-none shadow-none md:min-h-full md:max-w-[410px] md:self-stretch">
    <CardContent className="flex flex-1 flex-col p-[44px] md:min-h-full">
      <div className="my-auto flex flex-col gap-5">
        <div className="flex items-center">
          <YoureGettingHeading />
        </div>
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex flex-col gap-0">
            <p className="text-foreground text-base font-medium opacity-60">{benefit.title}</p>
            <p className="text-foreground text-[13px] leading-[18px] opacity-60">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
