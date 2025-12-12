import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { ArrowRight } from 'lucide-react';
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
  className,
}: {
  image?: ReactNode;
  title: ReactNode;
  text: ReactNode;
  primaryButton?: ReactNode;
  secondaryButton?: ReactNode;
  className?: string;
}) => {
  return (
    <Card className={className}>
      <CardHeader className="gap-6 px-0">
        <div className="bg-accent h-30 w-full rounded-lg">{image}</div>
        <CardTitle className="text-center text-xl font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-6 text-center text-sm font-normal">
        {text}
        <div className="flex items-center justify-center gap-3">
          {primaryButton}
          {secondaryButton}
        </div>
      </CardContent>
    </Card>
  );
};

export { SectionTitle, SectionDescription, ArrowListItem, ExplorerCard, ActionCard };
