export const AnalyticsAction = {
  CreateProject: 'create_project',
  AddProxy: 'add_proxy',
  CreateExportPolicy: 'create_export_policy',
  AddDomain: 'add_domain',
  VerifyDomain: 'verify_domain',
  TransferDnsToDatum: 'transfer_dns_to_datum',
  AddDnsZone: 'add_dns_zone',
  AddSecret: 'add_secret',
  InviteCollaborator: 'invite_collaborator',
  CreateOrg: 'create_org',
  DownloadDesktopApp: 'download_desktop_app',
} as const;

export type AnalyticsActionName = (typeof AnalyticsAction)[keyof typeof AnalyticsAction];

export interface AnalyticsIdentity {
  sub: string;
  orgId?: string;
  projectId?: string;
}

export interface AnalyticsOverrides {
  orgId?: string;
  projectId?: string;
}
