import { Button, Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { CircleXIcon } from 'lucide-react';

export const NoteCard = ({
  title,
  description,
  icon,
  closable,
  onClose,
}: {
  title: string;
  description: string | React.ReactNode;
  icon?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
}) => {
  return (
    <Card className="bg-card-warning text-card-warning-foreground relative gap-2.5 overflow-hidden border-none py-6 shadow-none">
      <CardHeader className="px-8">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          {icon}
          {title}
          {closable && onClose && (
            <CircleXIcon
              className="fill-secondary/20 hover:fill-secondary stroke-card-warning absolute top-4 right-4 size-6 cursor-pointer text-transparent transition-all"
              onClick={onClose}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8">
        {description}

        <div className="bg-card-warning-foreground/10 absolute top-0 left-0 h-full w-[4px]"></div>
      </CardContent>
    </Card>
  );
};
