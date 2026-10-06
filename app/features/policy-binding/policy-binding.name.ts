import { PENDING_NAME_PREFIX } from '@/modules/watch/sync-state';

/** Shown in place of the temporary name a create carries until the server names it. */
export const PENDING_BINDING_NAME = 'New binding';

export const displayBindingName = (name: string): string =>
  name.startsWith(PENDING_NAME_PREFIX) ? PENDING_BINDING_NAME : name;
