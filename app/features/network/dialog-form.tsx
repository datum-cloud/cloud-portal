import { NetworkForm } from './form';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shadcn/ui/dialog';
import { VisuallyHidden } from '@shadcn/ui/visuallyhidden';
import { forwardRef, useImperativeHandle, useState } from 'react';

export interface NetworkDialogFormRef {
  openDialog: () => void;
}

export const NetworkDialogForm = forwardRef<
  NetworkDialogFormRef,
  React.ComponentPropsWithoutRef<'div'> & {
    projectId: string;
    onSuccess?: (data?: INetworkControlResponse) => void;
  }
>(({ projectId, onSuccess }, ref) => {
  const [open, setOpen] = useState(false);

  // Expose openDialog method to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      openDialog: () => setOpen(true),
    }),
    []
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Create Network</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>
        <NetworkForm
          isClientSide
          className="rounded-lg border-none shadow-none"
          onCancel={() => setOpen(false)}
          onSuccess={(data: INetworkControlResponse) => {
            setOpen(false);
            onSuccess?.(data);
          }}
          projectId={projectId}
        />
      </DialogContent>
    </Dialog>
  );
});

NetworkDialogForm.displayName = 'NetworkDialogForm';
