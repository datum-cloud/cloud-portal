import { paths } from '@/utils/config/paths.config';
import { redirect } from 'react-router';

export const loader = async () => {
  return redirect(paths.account.organizations.root);
};
