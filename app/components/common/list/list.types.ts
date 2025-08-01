export interface ListItem {
  label?: React.ReactNode | string;
  content?: React.ReactNode | string;
  className?: string;
  hidden?: boolean;
}

export interface ListProps {
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
