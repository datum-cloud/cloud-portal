import { AddDomainsForm, useSubmitDomains } from '@/features/edge/domain/add';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { type LoaderFunctionArgs, useNavigate, useParams } from 'react-router';

const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to add domains to this project.",
  metaTitle: 'Add domains',
});

export const loader = (args: LoaderFunctionArgs) =>
  runRouteGate(args, {
    resource: 'domains',
    verb: 'create',
    group: 'networking.datumapis.com',
    scope: 'project',
  });
export const meta = route.meta;
export const handle = {
  breadcrumb: () => <span>Add domains</span>,
};

export default route.Page(() => <AddDomainPage />);

function AddDomainPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // One domain opens it, so the user lands on its verification steps. Many
  // are created in the background, so the user goes to the Domains list to
  // watch them appear.
  const submitDomains = useSubmitDomains(projectId, {
    onCreated: (domain) =>
      navigate(
        domain?.name
          ? getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: domain.name,
            })
          : getPathWithParams(paths.project.detail.domains.root, { projectId })
      ),
    onQueued: () => navigate(getPathWithParams(paths.project.detail.domains.root, { projectId })),
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pt-2 pb-8">
      <div className="flex flex-col gap-2">
        <Title
          as="h1"
          level={2}
          weight="normal"
          textColor="default"
          className="font-title tracking-normal">
          Add domains
        </Title>
        <Text as="p" className="dark:text-card-quaternary text-foreground/60">
          Add one or more domains you own to route their traffic through Datum.
        </Text>
      </div>

      <AddDomainsForm layout="page" onSubmitDomains={submitDomains} />
    </div>
  );
}
