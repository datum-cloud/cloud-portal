import { Button, Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { ArrowRight } from 'lucide-react';
import { ReactNode, useTransition } from 'react';
import { useNavigate } from 'react-router';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xl font-semibold">{children}</p>
);

const SectionDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-base font-thin">{children}</p>
);

const ArrowListItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center">
    <IconWrapper icon={ArrowRight} className="mr-2 size-4" />
    {children}
  </div>
);

const ExplorerCard = ({
  title,
  description,
  icon,
  link,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  link?: string;
}) => {
  const navigate = useNavigate();
  return (
    <Card
      className={cn(
        'flex h-full flex-col gap-3',
        link && 'hover:border-primary group cursor-pointer transition-all'
      )}
      onClick={() => {
        if (link) {
          navigate(link);
        }
      }}>
      <CardHeader className="pb-0!">
        <CardTitle className="group-hover:text-primary flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SectionDescription>{description}</SectionDescription>
      </CardContent>
    </Card>
  );
};

const ActionCard = ({
  image,
  title,
  text,
  primaryButton,
  secondaryButton,
  completed,
  onSkip,
  showSkip = true,
  className,
}: {
  image: string;
  title: ReactNode;
  text: ReactNode;
  primaryButton: ReactNode;
  secondaryButton?: ReactNode;
  completed?: boolean;
  onSkip?: () => Promise<void> | void;
  showSkip?: boolean;
  className?: string;
}) => {
  const [isPending, startTransition] = useTransition();

  const handleSkip = () => {
    if (onSkip) {
      startTransition(async () => {
        await onSkip();
      });
    }
  };

  return (
    <Card
      className={cn(
        'h-full w-full gap-3 p-6 xl:p-8',
        completed && 'border-card-success-border bg-card-success',
        className
      )}>
      <CardHeader className="gap-6 px-0">
        <div className="bg-accent relative h-36 w-full overflow-hidden rounded-lg xl:h-31.5">
          <img
            src={image}
            alt="Protect your app"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <CardTitle className="text-center text-xl font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="@container flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center text-sm font-normal">
        <span className="max-w-sm">{text}</span>

        <div className="mt-auto flex flex-row items-center justify-center gap-3">
          {primaryButton}
          {secondaryButton}
          {showSkip && !completed && onSkip && (
            <Button type="quaternary" theme="outline" loading={isPending} onClick={handleSkip}>
              Skip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { SectionTitle, SectionDescription, ArrowListItem, ExplorerCard, ActionCard };
