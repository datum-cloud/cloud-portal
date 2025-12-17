import { Button, Card, CardContent } from '@datum-ui/components';

export const ComingSoonFeatureCard = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <Card className="rounded-xl p-0 shadow-md">
      <CardContent className="flex items-center justify-between gap-2 p-5">
        <div className="flex max-w-[725px] flex-col gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-foreground/80 text-xs leading-relaxed font-normal">
            {description}
          </span>
        </div>
        <div>
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="xs"
            disabled
            className="text-xs font-normal">
            Coming Soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
