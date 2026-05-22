export interface ServiceOptions {
  dryRun?: boolean;
  /**
   * Explicit control-plane base URL override. When provided, it takes
   * precedence over the service's default scoped base. Used by callers that
   * need scope-aware routing (e.g. user-scoped vs org-scoped resources).
   */
  baseURL?: string;
}
