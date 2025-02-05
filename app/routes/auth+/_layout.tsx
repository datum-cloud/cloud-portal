import { Outlet } from '@remix-run/react'

export default function AuthLayout() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h2>Auth Layout</h2>
      <Outlet />
    </div>
  )
}
