import { SpinnerIcon } from '@datum-ui/components';

export const DataTableLoadingContent = ({ title = 'Loading...' }: { title?: string }) => {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-4.5`}>
      <SpinnerIcon size="3xl" />
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
};
