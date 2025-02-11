import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { newProjectSchema } from '@/resources/schemas/project.schema'
import { Form } from 'react-router'
import { useHydrated } from 'remix-utils/use-hydrated'
import { useEffect, useMemo, useRef } from 'react'
import { generateProjectId, generateRandomId, useIsPending, cn } from '@/utils/misc'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getFormProps, getInputProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Field } from '@/components/field/field'
import { useApp } from '@/providers/app.provider'
import { SelectOrganization } from '@/components/select-organization/select-organization'
import { RocketIcon } from 'lucide-react'

export const CreateProjectForm = ({ className }: { className?: string }) => {
  const { organization } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const isPending = useIsPending()

  const [form, { name, description, orgEntityId }] = useForm({
    constraint: getZodConstraint(newProjectSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newProjectSchema })
    },
    defaultValue: {
      orgEntityId: organization?.userEntityID,
    },
  })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  const randomId = useMemo(() => generateRandomId(), [])

  const nameControl = useInputControl(name)
  const orgEntityIdControl = useInputControl(orgEntityId)

  useEffect(() => {
    orgEntityIdControl.change(organization?.userEntityID)
  }, [organization])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-xl leading-none">Create a new project</CardTitle>
        <CardDescription>
          Create a new project to get started with Datum Cloud.
        </CardDescription>
      </CardHeader>
      <Form method="POST" autoComplete="off" {...getFormProps(form)}>
        <AuthenticityTokenInput />

        <CardContent className="space-y-4">
          <Field label="Choose organization">
            <SelectOrganization
              currentOrg={organization!}
              onSelect={(org) => {
                orgEntityIdControl.change(org.userEntityID)
              }}
            />
          </Field>
          <Field
            label="Description"
            description="A short description for your project that can be changed at any time."
            errors={description.errors}>
            <Input
              placeholder="e.g. My Project"
              ref={inputRef}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const value = (e.target as HTMLInputElement).value

                if (value) {
                  nameControl.change(generateProjectId(value, randomId))
                }
              }}
              {...getInputProps(description, { type: 'text' })}
            />
          </Field>
          <Field
            label="Name"
            description="A globally unique stable identifier for your project. This cannot be changed once the project is created."
            errors={name.errors}>
            <Input
              placeholder="e.g. my-project-343j33"
              {...getInputProps(name, { type: 'text' })}
            />
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            variant="default"
            type="submit"
            disabled={isPending}
            isLoading={isPending}
            className="w-full">
            {isPending ? 'Creating' : 'Create'} Project
            <RocketIcon className="size-4" />
          </Button>
        </CardFooter>
      </Form>
    </Card>
  )
}
