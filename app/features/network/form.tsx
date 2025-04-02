import { SelectIPFamily } from './select-ip-family'
import { SelectIPAM } from './select-ipam'
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
import { useIsPending } from '@/hooks/useIsPending'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { newNetworkSchema, updateNetworkSchema } from '@/resources/schemas/network.schema'
import { ROUTE_PATH as NETWORK_ACTIONS_ROUTE_PATH } from '@/routes/api+/networks+/actions'
// import { generateId, generateRandomString } from '@/utils/idGenerator'
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Form, useFetcher, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { useHydrated } from 'remix-utils/use-hydrated'
import { toast } from 'sonner'

export const NetworkForm = ({
  projectId,
  defaultValue,
  className,
  isClientSide = false,
  onCancel,
  onSuccess,
}: {
  projectId?: string
  defaultValue?: INetworkControlResponse
  className?: string
  isClientSide?: boolean
  onCancel?: () => void
  onSuccess?: (data: INetworkControlResponse) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const navigate = useNavigate()
  const fetcher = useFetcher({ key: 'network-form' })
  const isPending = useIsPending({ fetcherKey: 'network-form' })

  const [isLoading, setIsLoading] = useState<boolean>()

  const [form, fields] = useForm({
    id: 'network-form',
    constraint: getZodConstraint(defaultValue ? updateNetworkSchema : newNetworkSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    defaultValue: {
      ipam: 'Auto',
      mtu: 1460,
      name: '',
      ipFamily: 'IPv4',
    },
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: defaultValue ? updateNetworkSchema : newNetworkSchema,
      })
    },
    onSubmit(event, { submission }) {
      event.preventDefault()
      event.stopPropagation()

      if (submission?.status !== 'success') {
        return
      }

      setIsLoading(true)

      // Get the form element
      const formElement = event.currentTarget as HTMLFormElement
      const formData = new FormData(formElement)
      const csrf = formData.get('csrf')

      const payload = {
        ...(submission?.value ?? {}),
        csrf: csrf as string,
      }

      if (isEdit) {
        Object.assign(payload, {
          resourceVersion: defaultValue?.resourceVersion,
          networkId: defaultValue?.name,
        })
      }

      if (isClientSide) {
        // Submit the form using fetch API
        fetch(NETWORK_ACTIONS_ROUTE_PATH, {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...payload, projectId: projectId as string }),
        })
          .then((response) => response.json())
          .then((result) => {
            setIsLoading(false)
            if (result.success) {
              onSuccess?.(result.data)
            } else {
              toast.error(
                isEdit ? 'Failed to update network' : 'Failed to create network',
                {
                  description: result?.message,
                },
              )
            }
          })
          .catch((error) => {
            setIsLoading(false)
            console.error('Error submitting network form:', error)
          })
      } else {
        // Submit the form using the Remix submit function
        // This will trigger the action defined in the route
        fetcher.submit(
          { ...payload, projectId: projectId as string },
          {
            method: isEdit ? 'PUT' : 'POST',
            action: NETWORK_ACTIONS_ROUTE_PATH,
            encType: 'application/json',
          },
        )
      }
    },
  })

  // Generate a random suffix for the network name
  // const randomSuffix = useMemo(() => generateRandomString(6), [])
  const isEdit = useMemo(() => defaultValue?.uid !== undefined, [defaultValue])

  // Field Controls
  const nameControl = useInputControl(fields.name)
  const ipFamilyControl = useInputControl(fields.ipFamily)
  const ipamControl = useInputControl(fields.ipam)

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  useEffect(() => {
    if (defaultValue) {
      form.update({
        value: {
          // displayName: defaultValue.displayName ?? '',
          name: defaultValue.name ?? '',
          ipFamily: defaultValue.ipFamilies?.[0] ?? 'IPv4',
          ipam: defaultValue.ipam?.mode ?? 'Auto',
          mtu: defaultValue.mtu ?? 1460,
        },
      })
    }
  }, [defaultValue])

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, data } = fetcher.data

      if (success) {
        onSuccess?.(data)
      }
    }
  }, [fetcher.data, fetcher.state])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} network</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the network with the new values below.'
            : 'Create a new network to get started with Datum Cloud.'}
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

          {isEdit && (
            <input
              type="hidden"
              name="resourceVersion"
              value={defaultValue?.resourceVersion}
            />
          )}

          <CardContent className="space-y-4">
            {/* <Field
            label="Display name"
            description="Enter a short, human-friendly name. Can be changed later."
            errors={fields.displayName.errors}>
            <Input
              {...getInputProps(fields.displayName, { type: 'text' })}
              key={fields.displayName.id}
              placeholder="e.g. My Network"
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                if (!isEdit) {
                  const value = (e.target as HTMLInputElement).value

                  if (value) {
                    nameControl.change(generateId(value, { randomText: randomSuffix }))
                  }
                }
              }}
            />
          </Field> */}
            <Field
              isRequired
              label="Name"
              description="A namespace-unique stable identifier for your network. This cannot be changed once the network is created"
              errors={fields.name.errors}>
              <Input
                {...getInputProps(fields.name, { type: 'text' })}
                key={fields.name.id}
                ref={inputRef}
                placeholder="e.g. my-network-us-22sdss"
                readOnly={isEdit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.preventDefault()
                  const value = (e.target as HTMLInputElement).value
                  nameControl.change(value)
                }}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onBlur={(e: React.FormEvent<HTMLInputElement>) => {
                  e.preventDefault()
                  if (isEdit) {
                    nameControl.change(defaultValue?.name ?? '')
                  }
                  /* else {
                  const value = (e.target as HTMLInputElement).value
                  if (value.length === 0) {
                    nameControl.change(
                      generateId(fields.displayName.value ?? '', {
                        randomText: randomSuffix,
                      }),
                    )
                  }
                } */
                }}
              />
            </Field>
            <Field isRequired label="IP Family" errors={fields.ipFamily.errors}>
              <SelectIPFamily
                defaultValue={fields.ipFamily.value}
                onValueChange={(value) => {
                  ipFamilyControl.change(value.value)
                }}
              />
            </Field>
            <Field isRequired label="IPAM Mode" errors={fields.ipam.errors}>
              <SelectIPAM
                meta={fields.ipam}
                onChange={(value) => {
                  ipamControl.change(value)
                }}
              />
            </Field>
            <Field isRequired label="MTU" errors={fields.mtu.errors}>
              <Input
                {...getInputProps(fields.mtu, { type: 'number' })}
                defaultValue={fields.mtu.value}
                key={fields.mtu.id}
                placeholder="e.g. 1460"
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="link"
              disabled={isPending}
              onClick={() => {
                form.reset()

                if (onCancel) {
                  onCancel()
                } else {
                  navigate(-1)
                }
              }}>
              Cancel
            </Button>
            <Button
              form={form.id}
              variant="default"
              type="submit"
              disabled={isPending || isLoading}
              isLoading={isPending || isLoading}>
              {isPending || isLoading
                ? `${isEdit ? 'Saving' : 'Creating'}`
                : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  )
}
