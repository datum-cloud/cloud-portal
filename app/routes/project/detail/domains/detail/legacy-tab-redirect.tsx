import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { redirect, type LoaderFunctionArgs } from 'react-router';

/**
 * The domain detail page no longer has Activity or Settings tabs: activity
 * lives on the Overview page and delete is in the page header. Keep the old
 * tab URLs working for bookmarks and shared links.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(
    getPathWithParams(paths.project.detail.domains.detail.overview, {
      projectId: params.projectId ?? '',
      domainId: params.domainId ?? '',
    }),
    308
  );
}
