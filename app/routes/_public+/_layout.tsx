import { PublicLayout } from '@/components/layout/public';
import { Outlet } from 'react-router';

export default function layout() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}
