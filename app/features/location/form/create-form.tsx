import { GCPProvider } from './provider/gcp-provider'
import { SelectLocationClass } from './select-class'
import { SelectIATA } from './select-iata'
import { SelectLocationProvider } from './select-provider'
import { Field } from '@/components/field/field'
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
import { Separator } from '@/components/ui/separator'
import {
  ILocationControlResponse,
  LocationClass,
  LocationProvider,
} from '@/resources/interfaces/location.interface'
import { newLocationSchema } from '@/resources/schemas/location.schema'
// import { generateId, generateRandomString } from '@/utils/idGenerator'
import { useIsPending, convertObjectToLabels } from '@/utils/misc'
import { getFormProps, getInputProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useMemo, useRef } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { useHydrated } from 'remix-utils/use-hydrated'

export default function CreateLocationForm({
  defaultValue,
}: {
  defaultValue?: ILocationControlResponse
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, fields] = useForm({
    constraint: getZodConstraint(newLocationSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newLocationSchema })
    },
    defaultValue: {
      provider: LocationProvider.GCP,
      providerConfig: {
        provider: LocationProvider.GCP,
      },
    },
  })

  // Field Controls
  const nameControl = useInputControl(fields.name)
  const cityCodeControl = useInputControl(fields.cityCode)
  const classControl = useInputControl(fields.class)
  const labelsControl = useInputControl(fields.labels)

  const providerConfigControl = useInputControl(
    fields.providerConfig.getFieldset().provider,
  )

  // Generate a random suffix for the location name
  // const randomSuffix = useMemo(() => generateRandomString(6), [])

  const isEdit = useMemo(() => defaultValue?.uid !== undefined, [defaultValue])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  useEffect(() => {
    if (defaultValue) {
      // Transform provider config
      const provider = Object.keys(defaultValue.provider ?? {})[0] as LocationProvider
      const providerConfig = {
        projectId: defaultValue.provider?.[provider]?.projectId,
        region: defaultValue.provider?.[provider]?.region,
        zone: defaultValue.provider?.[provider]?.zone,
      }

      form.update({
        value: {
          // displayName: defaultValue?.displayName ?? '',
          name: defaultValue?.name ?? '',
          class: defaultValue?.class ?? LocationClass.DATUM_MANAGED,
          cityCode: defaultValue?.cityCode ?? '',
          resourceVersion: defaultValue?.resourceVersion ?? '',
          labels: convertObjectToLabels(defaultValue?.labels ?? {}),
          provider,
          providerConfig: {
            provider,
            ...providerConfig,
          },
        },
      })
    }
  }, [defaultValue])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} location</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the location with the new values below.'
            : 'Create a new location to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
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
              placeholder="e.g. My Location us-central1"
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
            description="A namespace-unique stable identifier for your location. This cannot be changed once the location is created"
            errors={fields.name.errors}>
            <Input
              {...getInputProps(fields.name, { type: 'text' })}
              key={fields.name.id}
              placeholder="e.g. my-location-us-3sd122"
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

          <Field label="Class" errors={fields.class.errors}>
            <SelectLocationClass
              defaultValue={fields.class.value}
              onValueChange={(value) => {
                classControl.change(value.value)
              }}
            />
          </Field>

          <Field label="City" errors={fields.cityCode.errors}>
            <SelectIATA
              placeholder="Select a city"
              defaultValue={fields.cityCode.value}
              onValueChange={(value) => {
                cityCodeControl.change(value.iata_code)
              }}
            />
          </Field>

          <Field
            label="Labels"
            errors={fields.labels.errors}
            description="Add labels to help identify, organize, and filter your locations.">
            <SelectLabels
              defaultValue={fields.labels.value as string[]}
              onChange={(value) => {
                labelsControl.change(value)
              }}
            />
          </Field>

          <Field label="Provider" errors={fields.provider.errors}>
            <SelectLocationProvider
              meta={fields.provider}
              onChange={(value) => {
                providerConfigControl.change(value)
              }}
            />
          </Field>

          <Separator />
          <h2 className="text-base font-medium">Provider Configuration</h2>
          {fields.provider.value === LocationProvider.GCP && (
            <GCPProvider isEdit={isEdit} meta={fields.providerConfig.getFieldset()} />
          )}
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
