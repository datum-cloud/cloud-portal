import type { RenderItemProps } from './types';
import { Form } from '@datum-ui/components/new-form';

export const NotificationCheckboxItem = ({ preference }: RenderItemProps) => {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center space-x-3.5">
        <div className="flex size-[34px] items-center justify-center overflow-hidden rounded-xl border">
          <Form.Checkbox className="data-[state=checked]:bg-primary space-x-0 rounded-xl" />
        </div>

        <div className="text-1xs flex flex-col space-y-0.5 text-left">
          <span className="font-medium">{preference.label}</span>
          {preference.description && (
            <span className="text-foreground/80">{preference.description}</span>
          )}
        </div>
      </div>
    </div>
  );
};
