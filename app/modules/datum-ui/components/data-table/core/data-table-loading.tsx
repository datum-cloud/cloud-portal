import { SpinnerIcon } from '@datum-ui/components';

export const DataTableLoadingContent = ({ title = 'Loading...' }: { title?: string }) => {
  return (
    <div className={`flex h-[226px] flex-col items-center justify-center gap-3.5 px-6 py-7`}>
      <SpinnerIcon size="lg" />
      <span className="text-xs font-medium">{title}</span>
    </div>
  );
};
