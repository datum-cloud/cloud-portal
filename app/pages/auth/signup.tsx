import { authenticator } from '@/modules/auth/auth.server';
import { mergeMeta, metaObject } from '@/utils/helpers';
import { MetaFunction, LoaderFunctionArgs } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject(
    'Signup for Datum - A network cloud you can take anywhere',
    'We help developers run network workloads anywhere and programmatically connect their ecosystem.'
  );
});

export function loader({ request }: LoaderFunctionArgs) {
  return authenticator.authenticate('zitadel', request);
}

export default function Signup() {
  return <div>Loading...</div>;
}
