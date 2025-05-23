import { GitHubIcon } from '@/components/icons/github'
import { GoogleIcon } from '@/components/icons/google'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes } from '@/constants/routes'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { mergeMeta, metaObject } from '@/utils/meta'
import {
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useNavigation,
  useSubmit,
} from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject(
    'Log in to Datum - A network cloud you can take anywhere',
    'Run network workloads anywhere and programmatically connect to your unique ecosystem.',
  )
})

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, routes.home)
}

export default function Login() {
  const navigation = useNavigation()
  const submit = useSubmit()

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="grid min-h-[500px] p-0 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <p className="text-2xl font-bold">Welcome to Datum Cloud</p>
            <p className="text-muted-foreground text-balance">
              Unlock your networking superpowers
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4">
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              isLoading={
                navigation.state === 'submitting' &&
                navigation.formAction === routes.auth.google
              }
              disabled={navigation.state === 'submitting'}
              onClick={() => {
                submit(null, { method: 'POST', action: routes.auth.google })
              }}>
              <GoogleIcon className="size-4" />
              <span>Sign in with Google</span>
            </Button>

            <Button
              variant="outline"
              className="w-full cursor-pointer"
              isLoading={
                navigation.state === 'submitting' &&
                navigation.formAction === routes.auth.github
              }
              disabled={navigation.state === 'submitting'}
              onClick={() => {
                submit(null, { method: 'POST', action: routes.auth.github })
              }}>
              <GitHubIcon className="size-4" />
              <span>Sign in with GitHub</span>
            </Button>
          </div>
          <div className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link
              to={routes.auth.signUp}
              className="hover:text-primary font-medium underline underline-offset-4 transition-all">
              Sign up
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
