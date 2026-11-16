import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Label } from '@datum-cloud/datum-ui/label';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { Text } from '@datum-cloud/datum-ui/typography';

const SWITCH_ID = 'dns-zone-dnssec';
const DESCRIPTION_ID = 'dns-zone-dnssec-description';

/**
 * DNSSEC for a zone. Signing isn't supported yet, so the switch is always off
 * and disabled, and the description says so.
 */
export const DnssecCard = () => {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor={SWITCH_ID} className="text-sm leading-5 font-medium">
              DNSSEC
            </Label>
            <Text as="p" id={DESCRIPTION_ID} textColor="muted">
              DNSSEC is not available for DNS zones yet.
            </Text>
          </div>
          <Switch
            id={SWITCH_ID}
            checked={false}
            disabled
            aria-describedby={DESCRIPTION_ID}
            data-e2e="dns-zone-dnssec-switch"
          />
        </div>
      </CardContent>
    </Card>
  );
};
