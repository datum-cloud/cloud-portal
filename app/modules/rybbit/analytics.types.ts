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
  ContactDetailsSaved: 'contact_details_saved',
  PaymentDetailsSaved: 'payment_details_saved',
  FirstProjectView: 'first_project_view',
} as const;

export type AnalyticsActionName = (typeof AnalyticsAction)[keyof typeof AnalyticsAction];

export interface AnalyticsIdentity {
  sub: string;
  orgId?: string;
  projectId?: string;
  /** Special-cased in Rybbit's dashboard — see rybbit.com/docs/identify-users. */
  email?: string;
  name?: string;
}

export interface AnalyticsOverrides {
  orgId?: string;
  projectId?: string;
}

declare global {
  interface Window {
    rybbit?: {
      event: (name: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      clearUserId: () => void;
      pageview: () => void;
    };
  }
}
