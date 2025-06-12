import { authenticator } from '@/modules/auth/auth.server';
import { mergeMeta, metaObject } from '@/utils/helpers';
import { MetaFunction, LoaderFunctionArgs } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject(
    'Log in to Datum - A network cloud you can take anywhere',
    'Run network workloads anywhere and programmatically connect to your unique ecosystem.'
  );
});

export function loader({ request }: LoaderFunctionArgs) {
  return authenticator.authenticate('zitadel', request);
}

export default function Login() {
  return <div>Loading...</div>;
}
