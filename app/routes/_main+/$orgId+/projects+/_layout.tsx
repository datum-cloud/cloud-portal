import { Outlet } from 'react-router'

export const handle = {
  breadcrumb: () => <>Projects</>,
}

export default function ProjectsLayout() {
  return <Outlet />
}
