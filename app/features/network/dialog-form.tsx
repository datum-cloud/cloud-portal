import { NetworkForm } from './form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { forwardRef, useImperativeHandle, useState } from 'react'

export interface NetworkDialogFormRef {
  openDialog: () => void
}

export const NetworkDialogForm = forwardRef<
  NetworkDialogFormRef,
  React.ComponentPropsWithoutRef<'div'> & {
    projectId: string
  }
>(({ projectId }, ref) => {
  const [open, setOpen] = useState(false)

  // Expose openDialog method to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      openDialog: () => setOpen(true),
    }),
    [],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Network</DialogTitle>
        </DialogHeader>
        <NetworkForm
          onCancel={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
          projectId={projectId}
        />
      </DialogContent>
    </Dialog>
  )
})

NetworkDialogForm.displayName = 'NetworkDialogForm'
