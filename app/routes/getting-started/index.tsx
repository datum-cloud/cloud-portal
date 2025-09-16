import { LogoFlat } from '@/components/logo/logo-flat';
import { OrganizationCard, CreateOrganizationCard } from '@/features/organization';
import { getSession } from '@/modules/cookie/session.server';
import { createUserControl } from '@/resources/control-plane/user.control';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api/organizations';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Getting Started');
});

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { session } = await getSession(request);

  const userControl = createUserControl(controlPlaneClient);
  const user = await userControl.detail(session?.sub ?? '');

  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  });

  const res = await req.json();
  if (!res.success) {
    return data([]);
  }

  // Check if user should access getting started
  // const hasOnboardedAt = !!user.onboardedAt;
  // const hasStandardOrg = res.data.some(
  //   (org: IOrganization) => org.type === OrganizationType.Standard
  // );

  // If user has onboarded and has a standard organization, redirect to organizations
  // if (hasOnboardedAt || hasStandardOrg) {
  //   return redirect(paths.account.organizations.root);
  // }

  return data(res.data);
};

export default function GettingStartedPage() {
  const organizations = useLoaderData<typeof loader>() as IOrganization[];

  /* const fetcher = useFetcher();
  const csrf = useAuthenticityToken();

  useEffect(() => {
    // If user has not onboarded, mark onboarding completed
    fetcher.submit(
      {
        onboardedAt: new Date().toISOString(),
        csrf,
      },
      {
        method: 'PATCH',
        encType: 'application/json',
        action: USER_PREFERENCES_UPDATE_ACTION,
      }
    );
  }, []); */

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center">
      <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-10">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center text-center">
          <LogoFlat height={32} className="mb-8" />
          <h1 className="mb-1 text-3xl font-bold">Welcome to Datum Cloud</h1>
          <p className="text-muted-foreground">
            Choose how you&apos;d like to get started with your organization
          </p>
        </div>

        {/* Organizations Grid */}
        <div className="w-full">
          <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2">
            {/* Standard Organizations */}
            {organizations.map((org) => (
              <OrganizationCard key={org.name} organization={org} variant="selection" />
            ))}

            {/* New Organization Option */}
            <CreateOrganizationCard />
          </div>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          You can always create additional organizations later from your account settings
        </p>
      </div>
    </div>
  );
}
