export interface ICreateSelfSubjectAccessReviewResponse {
  allowed: boolean;
  denied: boolean;
  namespace?: string;
  verb?: string;
  group?: string;
  resource?: string;
}
