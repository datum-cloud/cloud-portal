// Scope exports
export {
  DEFAULT_NOTIFICATION_NAMESPACE,
  getNotificationScopedBase,
  notificationScopeKey,
  type NotificationScope,
} from './notification-scope';

// Contact schema exports
export {
  contactProviderSchema,
  contactResourceSchema,
  contactListSchema,
  createContactInputSchema,
  updateContactInputSchema,
  type Contact,
  type ContactList,
  type CreateContactInput,
  type UpdateContactInput,
} from './contact.schema';

// Contact adapter exports
export {
  toContact,
  toContactList,
  toCreateContactPayload,
  toUpdateContactPayload,
} from './contact.adapter';

// Contact service exports
export {
  createNotificationContactService,
  notificationContactKeys,
  type NotificationContactService,
} from './contact.service';

// Contact query hooks exports
export {
  useNotificationContacts,
  useNotificationContact,
  useCreateNotificationContact,
  useUpdateNotificationContact,
  useDeleteNotificationContact,
} from './contact.queries';

// Contact group schema exports
export {
  contactGroupProviderSchema,
  contactGroupResourceSchema,
  contactGroupListSchema,
  createContactGroupInputSchema,
  updateContactGroupInputSchema,
  type ContactGroup,
  type ContactGroupList,
  type CreateContactGroupInput,
  type UpdateContactGroupInput,
} from './contact-group.schema';

// Contact group adapter exports
export {
  toContactGroup,
  toContactGroupList,
  toCreateContactGroupPayload,
  toUpdateContactGroupPayload,
} from './contact-group.adapter';

// Contact group service exports
export {
  createNotificationContactGroupService,
  notificationContactGroupKeys,
  type NotificationContactGroupService,
} from './contact-group.service';

// Contact group query hooks exports
export {
  useNotificationContactGroups,
  useNotificationContactGroup,
  useCreateNotificationContactGroup,
  useUpdateNotificationContactGroup,
  useDeleteNotificationContactGroup,
} from './contact-group.queries';

// Contact group membership schema exports
export {
  contactGroupMembershipResourceSchema,
  contactGroupMembershipListSchema,
  createContactGroupMembershipInputSchema,
  type ContactGroupMembership,
  type ContactGroupMembershipList,
  type CreateContactGroupMembershipInput,
} from './contact-group-membership.schema';

// Contact group membership adapter exports
export {
  toContactGroupMembership,
  toContactGroupMembershipList,
  toCreateContactGroupMembershipPayload,
} from './contact-group-membership.adapter';

// Contact group membership service exports
export {
  createNotificationContactGroupMembershipService,
  notificationContactGroupMembershipKeys,
  type NotificationContactGroupMembershipService,
} from './contact-group-membership.service';

// Contact group membership query hooks exports
export {
  useNotificationContactGroupMemberships,
  useNotificationContactGroupMembership,
  useCreateNotificationContactGroupMembership,
  useDeleteNotificationContactGroupMembership,
} from './contact-group-membership.queries';

// Contact group membership removal schema exports
export {
  contactGroupMembershipRemovalResourceSchema,
  contactGroupMembershipRemovalListSchema,
  createContactGroupMembershipRemovalInputSchema,
  type ContactGroupMembershipRemoval,
  type ContactGroupMembershipRemovalList,
  type CreateContactGroupMembershipRemovalInput,
} from './contact-group-membership-removal.schema';

// Contact group membership removal adapter exports
export {
  toContactGroupMembershipRemoval,
  toContactGroupMembershipRemovalList,
  toCreateContactGroupMembershipRemovalPayload,
} from './contact-group-membership-removal.adapter';

// Contact group membership removal service exports
export {
  createNotificationContactGroupMembershipRemovalService,
  notificationContactGroupMembershipRemovalKeys,
  type NotificationContactGroupMembershipRemovalService,
} from './contact-group-membership-removal.service';

// Contact group membership removal query hooks exports
export {
  useNotificationContactGroupMembershipRemovals,
  useNotificationContactGroupMembershipRemoval,
  useCreateNotificationContactGroupMembershipRemoval,
  useDeleteNotificationContactGroupMembershipRemoval,
} from './contact-group-membership-removal.queries';
