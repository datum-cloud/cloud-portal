import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { paths } from '@/config/paths';
import { LOCATION_CLASSES, LOCATION_PROVIDERS } from '@/features/location/constants';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createLocationsControl } from '@/resources/control-plane/locations.control';
import { ILocationControlResponse, LocationClass } from '@/resources/interfaces/location.interface';
import { loader as apiLocationsLoader } from '@/routes/old/api+/locations/_index';
import { getPathWithParams } from '@/utils/path';
import { toTitleCase } from '@/utils/text';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  ActionFunctionArgs,
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router';

export const loader = async ({ context, params, request }: LoaderFunctionArgs) => {
  // Create a new request with the projectId as a query parameter
  const url = new URL(request.url);
  url.searchParams.set('projectId', params.projectId as string);
  const modifiedRequest = new Request(url.toString(), request);

  // Call the API locations loader
  const response = await apiLocationsLoader({ request: modifiedRequest, context, params });
  // The API loader returns data wrapped with the data() function
  // We can directly return the response as it contains the locations data
  return response;
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const locationsControl = createLocationsControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData());
      const { locationName, projectId } = formData;

      await locationsControl.delete(projectId as string, locationName as string);
      return dataWithToast(null, {
        title: 'Location deleted successfully',
        description: 'The location has been deleted successfully',
        type: 'success',
      });
    }
    default:
      throw new Error('Method not allowed');
  }
};

export default function LocationsPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  const { confirm } = useConfirmationDialog();

  const { orgId, projectId } = useParams();

  const deleteLocation = async (location: ILocationControlResponse) => {
    await confirm({
      title: 'Delete Location',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{location.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await submit(
          {
            locationName: location.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'location-resources',
            navigate: false,
          }
        );
      },
    });
  };

  const columns: ColumnDef<ILocationControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(paths.projects.locations.edit, {
                orgId,
                projectId,
                locationId: row.original.name,
              })}
              className="text-primary font-semibold">
              {row.original.name}
            </Link>
          );
        },
      },
      {
        header: 'Class',
        accessorKey: 'class',
        cell: ({ row }) => {
          return (
            <Badge
              variant={row.original.class === LocationClass.SELF_MANAGED ? 'outline' : 'sunglow'}>
              {LOCATION_CLASSES[row.original.class as keyof typeof LOCATION_CLASSES]?.label}
            </Badge>
          );
        },
      },
      {
        header: 'Provider',
        accessorKey: 'provider',
        meta: {
          className: 'w-24',
        },
        cell: ({ row }) => {
          const provider =
            LOCATION_PROVIDERS[
              Object.keys(row.original.provider ?? {})[0] as keyof typeof LOCATION_PROVIDERS
            ];

          return Object.keys(row.original.provider ?? {}).length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex max-w-[50px] items-center justify-center">
                  <img
                    src={provider.icon}
                    alt={provider.label}
                    className="mx-auto size-5 cursor-pointer"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  {Object.entries(row.original.provider ?? {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="mb-1 text-sm font-medium">{provider.label}</span>
                      {Object.entries(value as unknown as Record<string, string>).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1 text-xs">
                          <span className="capitalize">{toTitleCase(k)}:</span>
                          <span className="text-muted-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="w- flex items-center justify-center">-</span>
          );
        },
      },
      {
        header: 'City Code',
        accessorKey: 'cityCode',
        meta: {
          className: 'w-32 text-center',
        },
        cell: ({ row }) => {
          return (
            row.original.cityCode && (
              <span className="block max-w-[65px] text-center">{row.original.cityCode}</span>
            )
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ],
    [orgId, projectId]
  );

  const rowActions: DataTableRowActionsProps<ILocationControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(paths.projects.locations.edit, {
              orgId,
              projectId,
              locationId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteLocation(row),
      },
    ],
    [orgId, projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No locations found.',
        subtitle: 'Create your first location to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Location',
            to: getPathWithParams(paths.projects.locations.new, { orgId, projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Locations',
        description: 'Manage deployment locations for your project resources',
        actions: (
          <Link to={getPathWithParams(paths.projects.locations.new, { orgId, projectId })}>
            <Button>
              <PlusIcon className="size-4" />
              New Location
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
