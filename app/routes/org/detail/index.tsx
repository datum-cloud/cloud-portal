import { paths } from '@/config/paths';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }));
};
