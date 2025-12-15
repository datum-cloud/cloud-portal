import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { ArrowRight, CheckIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xl font-semibold">{children}</p>
);

const SectionDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-base font-thin">{children}</p>
);

const ArrowListItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center">
    <ArrowRight className="mr-2 size-4" />
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
  className,
}: {
  image: string;
  title: ReactNode;
  text: ReactNode;
  primaryButton: ReactNode;
  secondaryButton?: ReactNode;
  completed?: boolean;
  className?: string;
}) => {
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
          {completed && (
            <div className="text-card-success bg-card-success-secondary absolute -top-7 -right-7 flex h-14 w-14 items-center justify-center rounded-full">
              <CheckIcon className="absolute bottom-3 left-3 size-3" />
            </div>
          )}
        </div>
        <CardTitle className="text-center text-xl font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="@container flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center text-sm font-normal">
        <span className="max-w-sm">{text}</span>

        <div className="mt-auto flex flex-row items-center justify-center gap-3">
          {primaryButton}
          {secondaryButton}
        </div>
      </CardContent>
    </Card>
  );
};

export { SectionTitle, SectionDescription, ArrowListItem, ExplorerCard, ActionCard };
