import { Field } from '@/components/field/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useIsPending } from '@/hooks/useIsPending'
import { useApp } from '@/providers/app.provider'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { newOrganizationSchema } from '@/resources/schemas/organization.schema'
import { ROUTE_PATH as ORG_ACTION_PATH } from '@/routes/api+/organizations+/$orgId'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { CircleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Form, MetaFunction, useFetcher } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Organization Settings')
})

export default function OrgSettingsPage() {
  const fetcher = useFetcher({ key: 'org-settings' })
  const isPending = useIsPending({ fetcherKey: 'org-settings' })
  const { organization, setOrganization } = useApp()
  const { confirm } = useConfirmationDialog()

  const [currentAction, setCurrentAction] = useState<'update' | 'delete'>()

  const [form, fields] = useForm({
    id: 'org-settings-form',
    constraint: getZodConstraint(newOrganizationSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newOrganizationSchema })
    },
    onSubmit(event, { formData }) {
      event.preventDefault()
      event.stopPropagation()
      const parsed = parseWithZod(formData, { schema: newOrganizationSchema })
      if (parsed.status === 'success') {
        setCurrentAction('update')
        fetcher.submit(formData, {
          method: 'PUT',
          action: getPathWithParams(ORG_ACTION_PATH, { orgId: organization?.id }),
        })
      }
    },
  })

  const deleteOrganization = async () => {
    await confirm({
      title: 'Delete Organization',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{organization?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${organization?.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the organization name to confirm deletion',
      confirmValue: organization?.name ?? 'delete',
      onSubmit: async () => {
        await fetcher.submit(
          {},
          {
            method: 'DELETE',
            action: getPathWithParams(ORG_ACTION_PATH, { orgId: organization?.id }),
          },
        )
      },
    })
  }

  useEffect(() => {
    if (organization) {
      form.update({ value: { name: organization.name } })
    }
  }, [organization])

  useEffect(() => {
    if (fetcher.data?.success) {
      if (currentAction === 'update') {
        form.update({ value: { name: fetcher.data.name } })
        setOrganization({ ...organization, name: fetcher.data.name } as OrganizationModel)
      }
    }
  }, [fetcher.data])

  return (
    <div className="mx-auto my-4 w-full max-w-2xl md:my-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Organization Name Section */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Name</CardTitle>
            <CardDescription>
              Used to identify your Organization on the Dashboard, Datum CLI, and in the
              URL of your Deployments.
            </CardDescription>
          </CardHeader>
          <Form
            method="POST"
            autoComplete="off"
            {...getFormProps(form)}
            className="flex flex-col gap-6">
            <AuthenticityTokenInput />
            <CardContent>
              <Field
                errors={fields.name.errors}
                description="Enter a short, human-friendly name. Can be changed later.">
                <Input
                  {...getInputProps(fields.name, { type: 'text' })}
                  key={fields.name.id}
                />
              </Field>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="submit" disabled={isPending} isLoading={isPending}>
                {isPending ? 'Saving' : 'Save'}
              </Button>
            </CardFooter>
          </Form>
        </Card>

        {/* Danger Zone */}

        {!organization?.personalOrg && (
          <Card className="border-destructive/50 hover:border-destructive border pb-0 transition-colors">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <CircleAlertIcon className="size-5 shrink-0" />
                <AlertTitle className="text-sm font-semibold">
                  Warning: Destructive Action
                </AlertTitle>
                <AlertDescription>
                  This action cannot be undone. Once deleted, this organization and all
                  its resources will be permanently removed. The organization name will be
                  reserved and cannot be reused for future organizations to prevent
                  deployment conflicts.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
              <Button
                variant="destructive"
                size="sm"
                className="font-medium"
                onClick={() => deleteOrganization()}>
                Delete
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
