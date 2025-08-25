import { DateFormat } from '@/components/date-format/date-format';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { TimeDistance } from '@/components/time-distance/time-distance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { useMemo } from 'react';

export const SecretGeneralCard = ({ secret }: { secret: ISecretControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!secret) return [];

    return [
      {
        label: 'Name',
        className: 'px-2',
        content: <TextCopy className="text-sm" value={secret.name ?? ''} text={secret.name} />,
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span>{secret.namespace}</span>,
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: (
          <div className="flex items-center gap-1">
            <DateFormat className="text-sm" date={secret?.createdAt ?? ''} />
            <TimeDistance date={secret?.createdAt ?? ''} className="text-sm" />
          </div>
        ),
      },
    ];
  }, [secret]);

  return (
    <Card className="w-full">
      <CardHeader className="px-6">
        <CardTitle className="text-base leading-none font-medium">General</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-2">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
