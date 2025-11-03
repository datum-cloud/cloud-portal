import { List, ListItem } from '@/components/list/list';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import { Badge } from '@datum-ui/components';
import { useMemo } from 'react';

export const MetadataPreview = ({ values }: { values: MetadataSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (values) {
      return [
        { label: 'Name', content: values.name },
        {
          label: 'Labels',
          hidden: (values.labels ?? []).length === 0,
          content: (
            <div className="flex flex-wrap gap-2">
              {values.labels?.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
          ),
        },
        {
          label: 'Annotations',
          hidden: (values.annotations ?? []).length === 0,
          content: (
            <div className="flex flex-wrap gap-2">
              {values.annotations?.map((annotation) => (
                <Badge key={annotation} variant="outline">
                  {annotation}
                </Badge>
              ))}
            </div>
          ),
        },
      ];
    }

    return [];
  }, [values]);

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />;
};
