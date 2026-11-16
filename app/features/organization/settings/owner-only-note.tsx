import { Text } from '@datum-cloud/datum-ui/typography';

/**
 * Shown in a settings card's footer, beside its disabled buttons, when the
 * signed-in user isn't an owner of the organization.
 */
export function OwnerOnlyNote() {
  return (
    <Text as="p" size="xs" textColor="muted" className="self-center">
      Only organization owners can make changes.
    </Text>
  );
}
