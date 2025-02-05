import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import GoogleIcon from '@/components/icons/google'
import { Form, useNavigation } from '@remix-run/react'
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { authenticator, getUserSession } from '@/modules/auth/auth.server'
import { routes } from '@/constants/routes'
export async function action({ request }: ActionFunctionArgs) {
  try {
    return authenticator.authenticate('google', request)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Authentication failed')
    }

    throw error // Re-throw other values or unhandled errors
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  return getUserSession(request, routes.home)
}

export default function Login() {
  const navigation = useNavigation()

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="grid min-h-[500px] p-0 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Welcome to Datum Cloud</h1>
              <p className="text-balance text-muted-foreground">
                Unlock your networking superpowers
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-4">
              <Form method="POST" className="w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  isLoading={navigation.state === 'submitting'}>
                  <GoogleIcon className="size-4" />
                  <span>Sign in with Google</span>
                </Button>
              </Form>
            </div>
            <div className="text-center text-sm">
              Don&apos;t have an account?{' '}
              <a href="#" className="underline underline-offset-4">
                Sign up
              </a>
            </div>
          </div>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/abstract-1.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{' '}
        <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
