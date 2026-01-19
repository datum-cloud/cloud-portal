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
