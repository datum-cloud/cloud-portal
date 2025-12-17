import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { Card, CardContent } from '@datum-ui/components';
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
    <Card className="w-full p-0 shadow-md">
      <CardContent className="p-9">
        <h3 className="mb-6 text-lg font-medium">General</h3>
        <List items={listItems} className="border-table-accent border-t" />
      </CardContent>
    </Card>
  );
};
