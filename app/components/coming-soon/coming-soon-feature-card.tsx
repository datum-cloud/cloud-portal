import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';

export const ComingSoonFeatureCard = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-2">
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
