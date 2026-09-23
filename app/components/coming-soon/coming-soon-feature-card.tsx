import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';

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
          <Text weight="medium">{title}</Text>
          <Text size="xs" className="text-foreground/80 leading-relaxed">
            {description}
          </Text>
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
