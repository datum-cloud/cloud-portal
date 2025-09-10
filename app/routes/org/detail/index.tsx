import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }));
};
