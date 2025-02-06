import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { newProjectSchema } from '@/resources/schemas/project.schema'
import { Form } from '@remix-run/react'
import { useHydrated } from 'remix-utils/use-hydrated'
import { useEffect, useMemo, useRef } from 'react'
import { generateProjectId, generateRandomId, useIsPending } from '@/utils/misc'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
export const CreateProjectForm = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
  const isPending = useIsPending()

  const [form, { name, description }] = useForm({
    constraint: getZodConstraint(newProjectSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newProjectSchema })
    },
  })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  const randomId = useMemo(() => generateRandomId(), [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl leading-none">Create a new project</CardTitle>
        <CardDescription>
          Create a new project to get started with Datum Cloud.
        </CardDescription>
      </CardHeader>
      <Form method="POST" autoComplete="off" {...getFormProps(form)}>
        <AuthenticityTokenInput />
        <HoneypotInputs />

        <CardContent className="space-y-4">
          <FormItem>
            <FormLabel>Organization</FormLabel>
            <FormControl>
              <Input
                disabled
                readOnly
                value="My Organization" // Replace with actual org name from your data
              />
            </FormControl>
          </FormItem>
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. My Project"
                {...getInputProps(name, { type: 'text' })}
                ref={inputRef}
              />
            </FormControl>
            {name.value && (
              <FormDescription>
                Project ID: {generateProjectId(name.value, randomId)}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. This is a project for my company"
                {...getInputProps(description, { type: 'text' })}
              />
            </FormControl>
            <FormDescription>What would best describe your project?</FormDescription>
            <FormMessage />
          </FormItem>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="default" type="submit" disabled={isPending}>
            Create new project
          </Button>
        </CardFooter>
      </Form>
    </Card>
  )
}
