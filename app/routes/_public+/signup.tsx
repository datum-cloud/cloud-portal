import { GitHubIcon } from '@/components/icons/github'
import { GoogleIcon } from '@/components/icons/google'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes } from '@/constants/routes'
import { authenticator, isAuthenticated } from '@/modules/auth/auth.server'
import { mergeMeta, metaObject } from '@/utils/meta'
import { dataWithToast } from '@/utils/toast'
import {
  ActionFunctionArgs,
  Form,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useNavigation,
} from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject(
    'Signup for Datum - A network cloud you can take anywhere',
    'We help developers run network workloads anywhere and programmatically connect their ecosystem.',
  )
})

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
  const navigation = useNavigation()

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="grid min-h-[500px] p-0 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <p className="text-2xl font-bold">Create an account</p>
            <p className="text-muted-foreground text-balance">
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
              className="hover:text-sunglow font-medium underline underline-offset-4 transition-all">
              Log in
            </Link>
          </div>
        </div>
        <div className="bg-muted relative hidden md:block">
          <img
            src="/images/abstract-1-light.png"
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover dark:hidden"
          />
          <img
            src="/images/abstract-1-dark.png"
            alt="Image"
            className="absolute inset-0 hidden h-full w-full object-cover dark:block"
          />
        </div>
      </CardContent>
    </Card>
  )
}
