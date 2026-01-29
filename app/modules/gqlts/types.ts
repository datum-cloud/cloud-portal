export type GqlScope =
  | { type: 'user'; userId: string }
  | { type: 'org'; orgId: string }
  | { type: 'project'; projectId: string }
  | { type: 'global' };
