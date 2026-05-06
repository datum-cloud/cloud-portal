import { LoaderFunctionArgs, Outlet, useParams } from 'react-router';

export const loader = ({ params }: LoaderFunctionArgs) => {
  return { ticketName: params.ticketName ?? '' };
};

export const handle = {
  breadcrumb: (data: { ticketName: string } | undefined) => (
    <span>{data?.ticketName || 'Ticket'}</span>
  ),
};

export default function TicketLayout() {
  return <Outlet />;
}
