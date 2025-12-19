import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
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
    <Card className="px-3 py-8 shadow">
      <CardHeader className="mb-2">
        <CardTitle>
          <span className="text-lg font-medium">General</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <List items={listItems} className="border-table-accent dark:border-quaternary border-t" />
      </CardContent>
    </Card>
  );
};
