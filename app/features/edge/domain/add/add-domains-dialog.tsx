import { AddDomainsForm } from './add-domains-form';
import { useSubmitDomains } from './use-submit-domains';
import type { Domain } from '@/resources/domains';
import { Dialog } from '@datum-cloud/datum-ui/dialog';

interface AddDomainsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (domain: Domain) => void;
}

export const AddDomainsDialog = ({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: AddDomainsDialogProps) => {
  // One domain: close and hand it to the caller (the list opens it); the
  // dialog stays open on error. Many: close and stay on the list.
  const submitDomains = useSubmitDomains(projectId, {
    onCreated: (domain) => {
      onOpenChange(false);
      if (domain?.name) onSuccess?.(domain);
    },
    onQueued: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-96">
        <Dialog.Header
          title="Add domains"
          description="Add one domain or many — separated by new lines or commas."
          onClose={() => onOpenChange(false)}
        />
        <Dialog.Body className="space-y-4 p-5 pt-0">
          <AddDomainsForm layout="dialog" onSubmitDomains={submitDomains} />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
};
