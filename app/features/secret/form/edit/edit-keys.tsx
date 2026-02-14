import { EditKeyValueDialog, EditKeyValueDialogRef } from './edit-key-value-dialog';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  KeysFormDialog,
  VariablesFormDialogRef,
} from '@/features/secret/form/keys/keys-form-dialog';
import { type Secret, useUpdateSecret } from '@/resources/secrets';
import { Button, toast } from '@datum-ui/components';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/ui/table';
import { PencilIcon, PlusIcon, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useParams } from 'react-router';

export const EditSecretKeys = ({ secret }: { secret?: Secret }) => {
  const { confirm } = useConfirmationDialog();
  const { projectId, secretId } = useParams();

  const variablesFormDialogRef = useRef<VariablesFormDialogRef>(null!);
  const editKeyValueDialogRef = useRef<EditKeyValueDialogRef>(null!);

  // Use secretId from URL params to ensure query key matches useSecret in overview
  const updateSecretMutation = useUpdateSecret(projectId ?? '', secretId ?? '', {
    onSuccess: () => {
      toast.success('Key deleted successfully', {
        description: 'The key has been deleted successfully',
      });
    },
  });

  const deleteSecret = async (variable: string) => {
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
      confirmValue: variable,
      confirmInputLabel: `Type "${variable}" to confirm.`,
      onSubmit: async () => {
        await updateSecretMutation.mutateAsync({
          data: {
            [variable]: null,
          },
        });
      },
    });
  };

  return (
    <>
      <Card className="overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
        <CardHeader className="mb-2 px-0 sm:px-6">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="text-lg font-medium">Key-value pairs</span>
            <Button
              icon={<Icon icon={PlusIcon} size={12} />}
              type="secondary"
              theme="outline"
              size="xs"
              onClick={() => variablesFormDialogRef.current?.show()}>
              Add
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 sm:px-6 sm:pb-4">
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
                {secret?.data?.map((variable) => (
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
                          <Icon icon={PencilIcon} className="size-3.5" />
                        </Button>
                        <Button
                          type="quaternary"
                          theme="borderless"
                          size="icon"
                          onClick={() => deleteSecret(variable)}
                          className="size-6 border">
                          <Icon icon={Trash2} className="size-3.5" />
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
        secretId={secretId}
        onSuccess={() => toast.success('Key added successfully')}
      />
      <EditKeyValueDialog ref={editKeyValueDialogRef} projectId={projectId} secretId={secretId} />
    </>
  );
};
