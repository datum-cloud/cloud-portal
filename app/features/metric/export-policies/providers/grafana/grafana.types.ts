import type { NewExportPolicySchema } from '@/resources/schemas/export-policy.schema';
import type { SecretNewSchema } from '@/resources/schemas/secret.schema';

export interface GrafanaDialogProps {
  /** Project ID for the export policy */
  projectId: string;
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
}

export interface GrafanaFormProps {
  /** Project ID for the export policy */
  projectId: string;
  /** Callback when dialog should close */
  onClose: () => void;
}

export interface GrafanaFormData {
  instanceUrl: string;
  prometheusConfig: string;
  secretName: string;
  exportPolicyName: string;
}

export interface GrafanaSubmitResponse {
  success: boolean;
  error?: string;
  data?: {
    exportPolicy: NewExportPolicySchema;
    secret: SecretNewSchema;
  };
}
