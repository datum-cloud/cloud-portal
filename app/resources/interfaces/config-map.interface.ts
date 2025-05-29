export interface IConfigMapControlResponse {
  name?: string;
  namespace?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
}
