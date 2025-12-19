import { EditKeyValueDialog, EditKeyValueDialogRef } from './edit-key-value-dialog';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  KeysFormDialog,
  VariablesFormDialogRef,
} from '@/features/secret/form/keys/keys-form-dialog';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { Button, toast } from '@datum-ui/components';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/ui/table';
import { PencilIcon, PlusIcon, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFetcher, useParams } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

export const EditSecretKeys = ({ defaultValue }: { defaultValue?: ISecretControlResponse }) => {
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();
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
            projectId: projectId ?? '',
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
      <Card className="px-3 py-8 shadow">
        <CardHeader className="mb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="text-lg font-medium">Key-value pairs</span>
            <Button
              icon={<PlusIcon size={12} />}
              type="secondary"
              theme="outline"
              size="xs"
              onClick={() => variablesFormDialogRef.current?.show()}>
              Add
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex max-w-full flex-col overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-background text-foreground h-8 border-r px-4 py-3 font-medium transition-all dark:bg-white/2 dark:hover:bg-white/5">
                    Key
                  </TableHead>
                  <TableHead className="bg-background text-foreground h-8 w-[100px] border-r px-4 py-3 font-medium transition-all dark:bg-white/2 dark:hover:bg-white/5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultValue?.data?.map((variable) => (
                  <TableRow
                    key={variable}
                    className="bg-table-cell hover:bg-table-cell-hover relative transition-colors">
                    <TableCell className="px-4 py-2.5">{variable}</TableCell>
                    <TableCell className="w-[100px] px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="quaternary"
                          theme="borderless"
                          size="icon"
                          onClick={() => editKeyValueDialogRef.current?.show(variable)}
                          className="size-6 border">
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          type="quaternary"
                          theme="borderless"
                          size="icon"
                          onClick={() => deleteSecret(variable)}
                          className="size-6 border">
                          <Trash2 className="size-3.5" />
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
