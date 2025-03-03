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
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { newNetworkSchema, updateNetworkSchema } from '@/resources/schemas/network.schema'
// import { generateId, generateRandomString } from '@/utils/idGenerator'
import { useIsPending } from '@/utils/misc'
import { getFormProps, getInputProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useMemo, useRef } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { useHydrated } from 'remix-utils/use-hydrated'

export default function NetworkForm({
  defaultValue,
}: {
  defaultValue?: INetworkControlResponse
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, fields] = useForm({
    constraint: getZodConstraint(defaultValue ? updateNetworkSchema : newNetworkSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: defaultValue ? updateNetworkSchema : newNetworkSchema,
      })
    },
    defaultValue: {
      ipam: 'Auto',
      mtu: 1460,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} network</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the network with the new values below.'
            : 'Create a new network to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <Form method="POST" autoComplete="off" {...getFormProps(form)}>
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
              ref={inputRef}
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
            label="Name"
            description="A namespace-unique stable identifier for your network. This cannot be changed once the network is created"
            errors={fields.name.errors}>
            <Input
              {...getInputProps(fields.name, { type: 'text' })}
              key={fields.name.id}
              placeholder="e.g. my-network-us-22sdss"
              readOnly={isEdit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = (e.target as HTMLInputElement).value
                nameControl.change(value)
              }}
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              onBlur={(e: React.FormEvent<HTMLInputElement>) => {
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
          <Field label="IP Family" errors={fields.ipFamily.errors}>
            <SelectIPFamily
              defaultValue={fields.ipFamily.value}
              onValueChange={(value) => {
                ipFamilyControl.change(value.value)
              }}
            />
          </Field>
          <Field label="IPAM Mode" errors={fields.ipam.errors}>
            <SelectIPAM
              meta={fields.ipam}
              onChange={(value) => {
                ipamControl.change(value)
              }}
            />
          </Field>
          <Field label="MTU" errors={fields.mtu.errors}>
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
    </Card>
  )
}
