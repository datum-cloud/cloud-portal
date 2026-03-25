import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
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
