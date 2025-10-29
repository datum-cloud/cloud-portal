import { EditKeyValueDialog, EditKeyValueDialogRef } from './edit-key-value-dialog';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  KeysFormDialog,
  VariablesFormDialogRef,
} from '@/features/secret/form/keys/keys-form-dialog';
import { Button } from '@/modules/datum-ui/components/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/components/table';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { PencilIcon, PlusIcon, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import { toast } from 'sonner';

export const EditSecretKeys = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue?: ISecretControlResponse;
}) => {
  const { confirm } = useConfirmationDialog();
  const fetcher = useFetcher();
  const csrf = useAuthenticityToken();

  const variablesFormDialogRef = useRef<VariablesFormDialogRef>(null!);
  const editKeyValueDialogRef = useRef<EditKeyValueDialogRef>(null!);
  const [currentAction, setCurrentAction] = useState<'delete' | 'edit'>();

  const deleteSecret = async (variable: string) => {
    setCurrentAction('delete');
    await confirm({
      title: 'Delete Key',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{variable}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            projectId,
            secretId: defaultValue?.name ?? '',
            data: {
              [variable]: null,
            },
            csrf,
          },
          {
            action: SECRET_ACTIONS_ROUTE_PATH,
            encType: 'application/json',
            method: 'PATCH',
          }
        );
      },
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success } = fetcher.data;

      if (success) {
        setCurrentAction(undefined);
        if (currentAction === 'delete') {
          toast.success('Key deleted successfully', {
            description: 'The key has been deleted successfully',
          });
        }
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Key-value pairs</CardTitle>
            <CardDescription>
              Configure and edit the key-value pairs securely stored as secrets.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => variablesFormDialogRef.current?.show()}>
            <PlusIcon className="size-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-full flex-col overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultValue?.data?.map((variable) => (
                  <TableRow key={variable}>
                    <TableCell className="px-2 py-1">{variable}</TableCell>
                    <TableCell className="w-[100px] px-2 py-1">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editKeyValueDialogRef.current?.show(variable)}
                          className="text-muted-foreground hover:bg-muted hover:text-primary size-8">
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSecret(variable)}
                          className="text-muted-foreground hover:bg-muted hover:text-destructive size-8">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <KeysFormDialog
        ref={variablesFormDialogRef}
        projectId={projectId}
        secretId={defaultValue?.name}
        onSuccess={() => toast.success('Key added successfully')}
      />
      <EditKeyValueDialog
        ref={editKeyValueDialogRef}
        projectId={projectId}
        secretId={defaultValue?.name}
      />
    </>
  );
};
