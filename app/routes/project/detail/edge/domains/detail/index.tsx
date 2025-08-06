import { paths } from '@/config/paths';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, domainId } = params;

  return redirect(
    getPathWithParams(paths.project.detail.domains.detail.overview, {
      projectId,
      domainId,
    })
  );
};
