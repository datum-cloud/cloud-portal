import { toOrganizationFromMembership } from './organization.adapter';
import type { Organization, OrganizationList } from './organization.schema';
import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
import { createGqlClient } from '@/modules/graphql/client';
import { generateQueryOp } from '@/modules/graphql/generated';
import type { com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest } from '@/modules/graphql/generated';
import { logger } from '@/modules/logger';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'OrganizationGatewayService';

const membershipListOp = generateQueryOp({
  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces: [
    {},
    {
      items: {
        metadata: {
          uid: true,
          name: true,
          namespace: true,
          creationTimestamp: true,
          resourceVersion: true,
        },
        spec: {
          organizationRef: { name: true },
          userRef: { name: true },
        },
        status: {
          organization: { displayName: true, type: true },
          conditions: { reason: true, status: true, type: true },
        },
      },
      metadata: { continue: true },
    } satisfies com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest,
  ],
});

export type GatewayOrgMember = {
  name: string;
  givenName?: string | null;
  familyName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  type?: string | null;
};

function sortOrganizations(orgs: Organization[]): Organization[] {
  return [...orgs].sort((a, b) => {
    if (a.type === 'Personal' && b.type !== 'Personal') return -1;
    if (b.type === 'Personal' && a.type !== 'Personal') return 1;
    const aName = a.displayName ?? a.name ?? '';
    const bName = b.displayName ?? b.name ?? '';
    return aName.localeCompare(bName);
  });
}

function memberDisplayName(member: GatewayOrgMember): string {
  const fullName = [member.givenName, member.familyName].filter(Boolean).join(' ').trim();
  return fullName || member.email?.trim() || member.name;
}

function toMemberAvatars(members: GatewayOrgMember[]) {
  return members
    .filter((member) => member.type !== 'invitation')
    .map((member) => ({
      name: memberDisplayName(member),
      avatarUrl: member.avatarUrl ?? undefined,
    }));
}

/** Builds a single global-scoped query with aliased organizationMembers fields. */
function buildMembersBatchQuery(orgNames: string[]): string {
  const fields = orgNames
    .map(
      (orgName, index) =>
        `org_${index}: organizationMembers(orgName: ${JSON.stringify(orgName)}) {
          name
          givenName
          familyName
          email
          avatarUrl
          type
        }`
    )
    .join('\n');

  return `query OrganizationMembersBatch {\n${fields}\n}`;
}

async function fetchMemberAvatarsByOrg(
  orgNames: string[]
): Promise<Map<string, GatewayOrgMember[]>> {
  const result = new Map<string, GatewayOrgMember[]>();
  if (orgNames.length === 0) return result;

  const client = createGqlClient({ type: 'global' });
  const query = buildMembersBatchQuery(orgNames);

  const response = await client.query<Record<string, GatewayOrgMember[]>>(query, {}).toPromise();
  if (response.error) throw mapApiError(response.error);

  orgNames.forEach((orgName, index) => {
    result.set(orgName, response.data?.[`org_${index}`] ?? []);
  });

  return result;
}

export function createOrganizationGatewayService() {
  return {
    /**
     * Lists the caller's organizations (user-scoped memberships) and enriches
     * each row with member avatars via the gateway organizationMembers query.
     */
    async listAll(): Promise<OrganizationList> {
      const startTime = Date.now();
      const userClient = createGqlClient({ type: 'user', userId: 'me' });

      try {
        const membershipResult = await userClient
          .query(membershipListOp.query, membershipListOp.variables)
          .toPromise();

        if (membershipResult.error) throw mapApiError(membershipResult.error);

        const raw =
          membershipResult.data
            ?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces;

        const orgs = sortOrganizations(
          (
            (raw?.items ??
              []) as (ComMiloapisResourcemanagerV1Alpha1OrganizationMembership | null)[]
          )
            .filter(
              (item): item is ComMiloapisResourcemanagerV1Alpha1OrganizationMembership =>
                item !== null
            )
            .map((item) => toOrganizationFromMembership(item))
            .filter((org) => org.status === 'Active')
        );

        const memberAvatarsByOrg = await fetchMemberAvatarsByOrg(orgs.map((org) => org.name));

        const items = orgs.map((org) => ({
          ...org,
          memberAvatars: toMemberAvatars(memberAvatarsByOrg.get(org.name) ?? []),
        }));

        logger.service(SERVICE_NAME, 'listAll', {
          input: { count: items.length },
          duration: Date.now() - startTime,
        });

        return {
          items,
          nextCursor: raw?.metadata?.continue ?? null,
          hasMore: !!raw?.metadata?.continue,
        };
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listAll failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type OrganizationGatewayService = ReturnType<typeof createOrganizationGatewayService>;
