import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import { SecretDangerCard } from '@/features/secret/form/overview/danger-card';
import { SecretGeneralCard } from '@/features/secret/form/overview/general-card';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { useSecret, type Secret } from '@/resources/secrets';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { useParams } from 'react-router';

export default function EditSecret() {
  const { projectId, secretId } = useParams();
  const { data: initialData } = useGuardedRouteData<Secret, Record<string, never>>('secret-detail');

  // Get live secret data from React Query
  const { data: queryData } = useSecret(projectId ?? '', secretId ?? '', {
    enabled: !!projectId && !!secretId,
  });

  // Use React Query data when available, fallback to SSR data
  const secret = queryData ?? initialData;

  const { canUpdate, canDelete } = useResourcePermissions({
    resource: 'secrets',
    group: '',
    scope: 'project',
    verbs: ['update', 'delete'],
  });

  return (
    <div className="mx-auto w-full">
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <SecretGeneralCard secret={(secret ?? {}) as any} />
        </Col>
        <Col span={24}>
          <EditSecretKeys secret={secret} readOnly={!canUpdate} />
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Secret</h3>
          <SecretDangerCard secret={(secret ?? {}) as any} actionHidden={!canDelete}>
            {!canDelete && (
              <RestrictedOverlay message="You don't have permission to delete this secret" />
            )}
          </SecretDangerCard>
        </Col>
      </Row>
    </div>
  );
}
