import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { ISecretControlResponse } from '@/resources/secrets';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { useMemo } from 'react';

export const SecretGeneralCard = ({ secret }: { secret: ISecretControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!secret) return [];

    return [
      {
        label: 'Resource name',
        content: (
          <BadgeCopy
            value={secret.name ?? ''}
            text={secret.name ?? ''}
            badgeType="muted"
            badgeTheme="solid"
          />
        ),
      },
      {
        label: 'Namespace',
        content: <span>{secret.namespace}</span>,
      },
      {
        label: 'Created at',
        content: <DateTime className="text-sm" date={secret?.createdAt ?? ''} variant="both" />,
      },
    ];
  }, [secret]);

  return (
    <Card size="sm" sectioned className="overflow-hidden">
      <CardHeader size="sm" bordered>
        <CardTitle className="text-sm">General</CardTitle>
      </CardHeader>
      <CardContent padding="none">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
