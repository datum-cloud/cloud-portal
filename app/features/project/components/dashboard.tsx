import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/misc';
import { ArrowRight } from 'lucide-react';
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
        link && 'hover:bg-accent cursor-pointer transition-all'
      )}
      onClick={() => {
        if (link) {
          navigate(link);
        }
      }}>
      <CardHeader className="pb-0!">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
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

export { SectionTitle, SectionDescription, ArrowListItem, ExplorerCard };
