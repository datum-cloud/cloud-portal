import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-ui/components';
import { useMemo } from 'react';

export const SecretGeneralCard = ({ secret }: { secret: ISecretControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!secret) return [];

    return [
      {
        label: 'Resource name',
        className: 'px-2',
        content: (
          <BadgeCopy
            value={secret.name ?? ''}
            text={secret.name ?? ''}
            badgeTheme="light"
            badgeType="muted"
          />
        ),
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span>{secret.namespace}</span>,
      },
      {
        label: 'Last update',
        className: 'px-2',
        content: (
          <DateTime
            className="text-sm"
            date={secret?.annotations?.updatedAt ?? ''}
            variant="both"
          />
        ),
      },
      {
        label: 'Created at',
        className: 'px-2',
        content: <DateTime className="text-sm" date={secret?.createdAt ?? ''} variant="both" />,
      },
    ];
  }, [secret]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">General</CardTitle>
      </CardHeader>
      <CardContent>
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
