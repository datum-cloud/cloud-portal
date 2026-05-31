import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { CiCdCard } from '@/features/service-account/card/ci-cd-card';
import { ServiceCard } from '@/features/service-account/card/service-card';
import { CreateServiceAccountWizard } from '@/features/service-account/wizard/create-service-account-wizard';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import {
  useCaseSchema,
  type CreateServiceAccountKeyResponse,
  type UseCase,
} from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { useEffect, useRef, useState } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Create a Service Account'));

export const loader = withLoaderErrors(async (args: LoaderFunctionArgs) => {
  const projectId = args.params.projectId;
  if (!projectId) throw new BadRequestError('Project ID is required');

  const allowed = await gateRouteAccess(projectId, {
    resource: 'serviceaccounts',
    verb: 'create',
    group: 'iam.miloapis.com',
    scope: 'project',
  });

  if (!allowed) return data({ restricted: true as const });
  return data({ restricted: false as const });
});

export default function ServiceAccountsNewPage() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to create service accounts."
      />
    );
  }

  return <NewPageInner />;
}

function NewPageInner() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Capture deep-link intent once on mount (?action=create&case=cicd|service).
  // The case param is validated against the canonical Zod enum so a junk
  // value like ?case=foo is silently dropped instead of being passed through.
  const initialOpenRef = useRef(searchParams.get('action') === 'create');
  const initialCaseRef = useRef<UseCase | undefined>(
    useCaseSchema.safeParse(searchParams.get('case')).data
  );

  const [wizardOpen, setWizardOpen] = useState(initialOpenRef.current);
  const [useCase, setUseCase] = useState<UseCase | undefined>(initialCaseRef.current);

  // Strip the deep-link params after consuming them so refresh / share stays clean
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      nextParams.delete('case');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openWith = (next: UseCase) => {
    setUseCase(next);
    setWizardOpen(true);
  };

  const navigateToAccount = (
    accountName: string,
    keyResponse?: CreateServiceAccountKeyResponse,
    defaultRevealTab?: 'github' | 'kubernetes'
  ) =>
    navigate(
      getPathWithParams(paths.project.detail.serviceAccounts.detail.keys, {
        projectId,
        serviceAccountId: accountName,
      }),
      {
        state: keyResponse || defaultRevealTab ? { keyResponse, defaultRevealTab } : undefined,
      }
    );

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} className="w-full md:h-full">
          <CiCdCard onCreate={() => openWith('cicd')} />
        </Col>
        <Col xs={24} md={12} className="w-full md:h-full">
          <ServiceCard onCreate={() => openWith('service')} />
        </Col>
      </Row>

      <CreateServiceAccountWizard
        projectId={projectId ?? ''}
        useCase={useCase}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onNavigateToAccount={navigateToAccount}
      />
    </div>
  );
}
