import PublicLayout from '@/layouts/public/public'
import { Outlet } from 'react-router'

export default function layout() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  )
}
