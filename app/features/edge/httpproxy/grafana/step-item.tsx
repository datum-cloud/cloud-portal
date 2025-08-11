import { Badge } from '@/components/ui/badge';

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  body?: React.ReactNode;
}

interface GuideStepItemProps extends GuideStep {
  stepNumber: number;
}

export const GuideStepItem = ({ stepNumber, title, description, body }: GuideStepItemProps) => {
  return (
    <div className="flex w-full items-start gap-3">
      <Badge variant="secondary" className="size-8 justify-center rounded-full p-0">
        {stepNumber}
      </Badge>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="leading-none font-medium">{title}</p>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {body}
      </div>
    </div>
  );
};
