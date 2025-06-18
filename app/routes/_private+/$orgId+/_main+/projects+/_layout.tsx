import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Projects</span>,
};

export default function ProjectsLayout() {
  return <Outlet />;
}
