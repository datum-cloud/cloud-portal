import { paths } from '@/config/paths';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;

  return redirect(
    getPathWithParams(paths.project.detail.config.secrets.detail.edit, {
      projectId,
      secretId,
    })
  );
};
