import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';

export const NoteCard = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string | React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <Card className="bg-card-warning text-card-warning-foreground relative overflow-hidden border-none py-6">
      <CardHeader className="px-8">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8">
        {description}

        <div className="bg-card-warning-foreground/10 absolute top-0 left-0 h-full w-[6px]"></div>
      </CardContent>
    </Card>
  );
};
