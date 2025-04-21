import { VariablesForm } from './variables/variables-form'
import { Field } from '@/components/field/field'
import { SelectAnnotations } from '@/components/select-annotations/select-annotations'
import { SelectLabels } from '@/components/select-labels/select-labels'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SECRET_TYPES } from '@/constants/options'
import { useIsPending } from '@/hooks/useIsPending'
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface'
import { SecretVariablesSchema, secretSchema } from '@/resources/schemas/secret.schema'
import {
  FormMetadata,
  FormProvider,
  getFormProps,
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, Form } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const SecretForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId,
  defaultValue,
}: {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId?: string
  defaultValue?: ISecretControlResponse
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const navigate = useNavigate()
  const isPending = useIsPending()

  const [form, fields] = useForm({
    id: 'secret-form',
    constraint: getZodConstraint(secretSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: secretSchema })
    },
  })

  const nameControl = useInputControl(fields.name)
  const labelsControl = useInputControl(fields.labels)
  const annotationsControl = useInputControl(fields.annotations)
  const typeControl = useInputControl(fields.type)

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined
  }, [defaultValue])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} secret</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the secret with the new values below.'
            : 'Create a new secret to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <AuthenticityTokenInput />
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Field
                className="w-1/2"
                isRequired
                label="Name"
                description="A namespace-unique stable identifier for your secret. This cannot be changed once the secret is created"
                errors={fields.name.errors}>
                <Input
                  readOnly={isEdit}
                  {...getInputProps(fields.name, { type: 'text' })}
                  key={fields.name.id}
                  ref={inputRef}
                  placeholder="e.g. my-secret-3sd122"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = (e.target as HTMLInputElement).value
                    nameControl.change(value)
                  }}
                />
              </Field>
              <Field
                isRequired
                label="Type"
                errors={fields.type.errors}
                className="w-1/2">
                <Select
                  {...getSelectProps(fields.type)}
                  key={fields.type.id}
                  value={fields.type.value}
                  defaultValue={fields.type.value}
                  onValueChange={typeControl.change}>
                  <SelectTrigger
                    autoFocus
                    className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
                    <SelectValue placeholder="Select a Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(SECRET_TYPES).map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="w-[var(--radix-select-trigger-width)]">
                        {SECRET_TYPES[type as keyof typeof SECRET_TYPES].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-start gap-4">
              <Field
                className="w-1/2"
                label="Labels"
                errors={fields.labels.errors}
                description="Add labels to help identify, organize, and filter your secrets.">
                <SelectLabels
                  defaultValue={fields.labels.value as string[]}
                  onChange={(value) => {
                    labelsControl.change(value)
                  }}
                />
              </Field>
              <Field
                className="w-1/2"
                label="Annotations"
                errors={fields.annotations.errors}
                description="Add annotations to help identify, organize, and filter your secrets.">
                <SelectAnnotations
                  defaultValue={fields.annotations.value as string[]}
                  onChange={(value) => {
                    annotationsControl.change(value)
                  }}
                />
              </Field>
            </div>

            <VariablesForm
              form={form as FormMetadata<SecretVariablesSchema>}
              fields={
                fields as unknown as ReturnType<typeof useForm<SecretVariablesSchema>>[1]
              }
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="link"
              disabled={isPending}
              onClick={() => {
                navigate(-1)
              }}>
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled={isPending}
              isLoading={isPending}>
              {isPending
                ? `${isEdit ? 'Saving' : 'Creating'}`
                : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  )
}
