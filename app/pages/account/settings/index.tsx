import { routes } from '@/constants/routes';
import { Navigate } from 'react-router';

export default function AccountSettingsIndex() {
  return <Navigate to={routes.account.profile} />;
}
