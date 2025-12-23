import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';

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
  /** Callback when form should close */
  onSuccess?: (data: {
    exportPolicy: IExportPolicyControlResponse;
    secret: ISecretControlResponse;
  }) => void;
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
    exportPolicy: IExportPolicyControlResponse;
    secret: ISecretControlResponse;
  };
}
