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
import { routes } from '@/constants/routes'
import { GraphqlClient } from '@/modules/graphql/graphql'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createOrganizationGql } from '@/resources/gql/organization.gql'
import {
  NewOrganizationSchema,
  newOrganizationSchema,
} from '@/resources/schemas/organization.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { useIsPending } from '@/utils/misc'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useRef } from 'react'
import { AppLoadContext, Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const action = withMiddleware(async ({ request, context }) => {
  const { gqlClient, cache } = context as AppLoadContext
  const organizationGql = createOrganizationGql(gqlClient as GraphqlClient)

  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: newOrganizationSchema })
    const payload = parsed.payload as NewOrganizationSchema

    await organizationGql.createOrganization(payload.name)

    // Invalidate the organizations cache
    await cache.removeItem('organizations')

    return redirectWithToast(routes.account.organizations.root, {
      title: 'Organization created successfully',
      description: 'You have successfully created an organization.',
      type: 'success',
    })
  } catch (error) {
    return dataWithToast(
      {},
      {
        title: 'Error',
        description:
          error instanceof Error ? error.message : (error as Response).statusText,
        type: 'error',
      },
    )
  }
}, authMiddleware)

export default function AccountOrganizationsNew() {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, { name }] = useForm({
    constraint: getZodConstraint(newOrganizationSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newOrganizationSchema })
    },
  })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a new organization</CardTitle>
          <CardDescription>
            Create a new organization to manage projects in Datum Cloud.
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
              description="Enter a short, human-friendly name. Can be changed later."
              errors={name.errors}>
              <Input
                {...getInputProps(name, { type: 'text' })}
                key={name.id}
                placeholder="e.g. My Organization"
                ref={inputRef}
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="link"
              disabled={isPending}
              onClick={() => {
                navigate(routes.account.organizations.root)
              }}>
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled={isPending}
              isLoading={isPending}>
              {isPending ? 'Creating' : 'Create'} Organization
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  )
}
