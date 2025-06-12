import { routes } from '@/constants/routes';
import { getPathWithParams } from '@/utils/helpers';
import { LoaderFunctionArgs, Navigate, redirect, useParams } from 'react-router';

export const loader = ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;
  return redirect(getPathWithParams(routes.org.dashboard, { orgId }));
};
