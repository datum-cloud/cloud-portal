import { paths } from '@/utils/config/paths.config';
import { data, redirect } from 'react-router';

export const loader = async () => {
  return redirect(paths.account.organizations.root);
};

export const action = async () => {
  return data({ error: 'Method not allowed on index route' }, { status: 405 });
};
