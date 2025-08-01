export interface MoreActionProps<TData> {
  key: string;
  label: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  className?: string;
  action: (row?: TData) => void | Promise<void>;
  isDisabled?: (row?: TData) => boolean;
}
