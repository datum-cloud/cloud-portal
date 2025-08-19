import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paths } from '@/utils/config/paths.config';
import { Link, useNavigation, useSubmit } from 'react-router';

export default function AuthCard({ mode }: { mode: 'login' | 'signup' }) {
  const navigation = useNavigation();
  const submit = useSubmit();

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="grid min-h-[500px] p-0 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <p className="text-2xl font-bold">
              {mode === 'login' ? 'Welcome to Datum Cloud' : 'Create an account'}
            </p>
            <p className="text-muted-foreground text-balance">
              {mode === 'login'
                ? 'Unlock your networking superpowers'
                : 'Embark on your digital journey with us'}
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4">
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              isLoading={
                navigation.state === 'submitting' && navigation.formAction === paths.auth.root
              }
              disabled={navigation.state === 'submitting'}
              onClick={() => {
                submit(null, { method: 'POST', action: paths.auth.root });
              }}>
              <span>{mode === 'login' ? 'Sign in' : 'Sign up'}</span>
            </Button>
          </div>
          <div className="text-muted-foreground text-center text-sm">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Link
              to={mode === 'login' ? paths.auth.signUp : paths.auth.logIn}
              className="hover:text-primary font-medium underline underline-offset-4 transition-all">
              {mode === 'login' ? 'Sign up' : 'Log in'}
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
  );
}
