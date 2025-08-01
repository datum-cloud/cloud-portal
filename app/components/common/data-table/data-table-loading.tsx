import { LogoIcon } from '@/components/layout/logo';

export const DataTableLoading = ({ title = 'Loading...' }: { title?: string }) => {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-5`}>
      <LogoIcon width={64} className="animate-spin-pause" />
      <div className={`flex flex-col items-center`}>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
    </div>
  );
};
