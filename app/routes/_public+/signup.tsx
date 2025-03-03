import { GitHubIcon } from '@/components/icons/github'
import { GoogleIcon } from '@/components/icons/google'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes } from '@/constants/routes'
import { useTheme } from '@/hooks/useTheme'
import { authenticator, isAuthenticated } from '@/modules/auth/auth.server'
import { dataWithToast } from '@/utils/toast.server'
import {
  ActionFunctionArgs,
  Form,
  Link,
  LoaderFunctionArgs,
  useNavigation,
} from 'react-router'

export async function action({ request }: ActionFunctionArgs) {
  try {
    return authenticator.authenticate('google', request)
  } catch (error) {
    return dataWithToast(
      {},
      {
        title: 'Signup failed',
        description: error instanceof Error ? error.message : 'Signup failed',
        type: 'error',
      },
      { status: 401 },
    )
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, routes.home)
}

export default function Signup() {
  const theme = useTheme()
  const navigation = useNavigation()

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid min-h-[500px] p-0 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Embark on your digital journey with us
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4">
            <Form action={routes.auth.google} method="POST" className="w-full">
              <Button
                variant="outline"
                className="w-full"
                isLoading={
                  navigation.state === 'submitting' &&
                  navigation.formAction === routes.auth.google
                }
                disabled={navigation.state === 'submitting'}>
                <GoogleIcon className="size-4" />
                <span>Sign up with Google</span>
              </Button>
            </Form>

            <Form action={routes.auth.github} method="POST" className="w-full">
              <Button
                variant="outline"
                className="w-full"
                isLoading={
                  navigation.state === 'submitting' &&
                  navigation.formAction === routes.auth.github
                }
                disabled={navigation.state === 'submitting'}>
                <GitHubIcon className="size-4" />
                <span>Sign up with GitHub</span>
              </Button>
            </Form>
          </div>
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link
              to={routes.auth.logIn}
              className="font-medium underline underline-offset-4 transition-all hover:text-sunglow">
              Log in
            </Link>
          </div>
        </div>
        <div className="relative hidden bg-muted md:block">
          <img
            src={`/images/abstract-1-${theme}.png`}
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </CardContent>
    </Card>
  )
}
