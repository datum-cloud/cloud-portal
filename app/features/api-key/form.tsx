import { SelectExpires } from './select-expires'
import { Field } from '@/components/field/field'
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
import { newApiKeySchema } from '@/resources/schemas/api-key.schema'
import { useIsPending } from '@/utils/misc'
import { FieldMetadata, getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useRef } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const ApiKeyForm = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, fields] = useForm({
    constraint: getZodConstraint(newApiKeySchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newApiKeySchema })
    },
    defaultValue: {
      name: '',
      description: '',
      expiresAt: '90',
    },
  })

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new API key</CardTitle>
        <CardDescription>
          Create a new API key to get started with Datum Cloud.
        </CardDescription>
      </CardHeader>
      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
        className="flex flex-col gap-6">
        <AuthenticityTokenInput />

        <CardContent className="space-y-4">
          <Field
            label="Name"
            description="Enter a short, human-friendly name."
            errors={fields.name.errors}>
            <Input
              {...getInputProps(fields.name, { type: 'text' })}
              key={fields.name.id}
              placeholder="e.g. My API Key"
              ref={inputRef}
            />
          </Field>
          <Field label="Description" errors={fields.description.errors}>
            <Input
              {...getInputProps(fields.description, { type: 'text' })}
              key={fields.description.id}
              placeholder="e.g. My API Key for Server"
            />
          </Field>
          <Field label="Expiration" errors={fields.expiresAt.errors}>
            <SelectExpires meta={fields.expiresAt as FieldMetadata<string>} />
          </Field>
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
            {isPending ? 'Creating' : 'Create'}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  )
}
