import { BackButton } from '@/components/back-button/back-button';
import { showMutationErrorToast } from '@/modules/quota';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { type DomainSchema, domainSchema, useCreateDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { type LoaderFunctionArgs, useNavigate, useParams } from 'react-router';

const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to add domains to this project.",
  metaTitle: 'Add a domain',
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
  breadcrumb: () => <span>Add a domain</span>,
};

export default route.Page(() => <AddDomainPage />);

function AddDomainPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();
  const createDomain = useCreateDomain(projectId);

  const handleSubmit = async ({ domain: domainName }: DomainSchema) => {
    try {
      const domain = await createDomain.mutateAsync({ domainName });
      trackAction(AnalyticsAction.AddDomain);
      navigate(
        domain?.name
          ? getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: domain.name,
            })
          : getPathWithParams(paths.project.detail.domains.root, { projectId })
      );
    } catch (error) {
      showMutationErrorToast(error, { fallbackTitle: 'Domain', scope: 'project', projectId });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-8">
      <div className="flex flex-col gap-4">
        <BackButton
          fallbackPath={getPathWithParams(paths.project.detail.domains.root, { projectId })}
          className="self-start">
          Back
        </BackButton>
        <div className="flex flex-col gap-2">
          <Title
            as="h1"
            level={2}
            weight="normal"
            textColor="default"
            className="font-title tracking-normal">
            Add a domain
          </Title>
          <Text as="p" className="dark:text-card-quaternary text-foreground/60">
            Add a domain you own to route its traffic through Datum.
          </Text>
        </div>
      </div>

      <Form.Root
        id="add-domain-form"
        schema={domainSchema}
        isSubmitting={createDomain.isPending}
        onSubmit={handleSubmit}
        className="flex flex-col gap-8">
        <Form.Field name="domain" label="Domain name" required>
          <Form.Input
            placeholder="example.com"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            data-e2e="add-domain-page-name-input"
          />
        </Form.Field>

        <div className="flex justify-end">
          <Form.Submit loadingText="Adding domain">Continue</Form.Submit>
        </div>
      </Form.Root>
    </div>
  );
}
