import { CardField, CardFieldLabel, CardFieldValue } from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';

export interface ListItem {
  label?: React.ReactNode | string;
  content?: React.ReactNode | string;
  className?: string;
  hidden?: boolean;
}

interface ListProps {
  /**
   * Array of list items to display
   */
  items: ListItem[];
  /**
   * Optional className for the list container
   */
  className?: string;
  /**
   * Optional className applied to all list items
   */
  itemClassName?: string;

  labelClassName?: string;
}

/**
 * Label / value rows rendered with the datum-ui `CardField` primitives, so a
 * `List` inside a `sectioned` Card lines up with hand-written `CardField`
 * rows (50/50 grid, inset dividers). Outside a Card the `--card-px` inset is
 * unset and the rows simply span their container.
 */
export const List = ({ items, className, itemClassName, labelClassName }: ListProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {items
        .filter((item) => !item.hidden)
        .map((item, index) => (
          <CardField key={index} className={cn(itemClassName, item.className)}>
            <CardFieldLabel className={labelClassName}>{item.label}</CardFieldLabel>
            <CardFieldValue className="min-w-0 wrap-break-word">{item.content}</CardFieldValue>
          </CardField>
        ))}
    </div>
  );
};
