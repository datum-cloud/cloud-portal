import { OWASP_CRS_CATEGORIES } from '@/resources/http-proxies';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { Text } from '@datum-cloud/datum-ui/typography';

/**
 * Per-category switches for the OWASP Core Rule Set. `disabledIds` are the
 * catalog ids currently excluded; toggling a switch off adds the id.
 */
export function WafCategoryList({
  disabledIds,
  onChange,
  disabled,
}: {
  disabledIds: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex w-full flex-col gap-2.5">
      {OWASP_CRS_CATEGORIES.map((category) => {
        const checked = !disabledIds.includes(category.id);
        return (
          <li key={category.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Text as="div">{category.label}</Text>
              <Text as="p" size="xs" textColor="muted">
                {category.description}
              </Text>
            </div>
            <Switch
              checked={checked}
              disabled={disabled}
              aria-label={category.label}
              onCheckedChange={(nextChecked) => {
                const next = new Set(disabledIds);
                if (nextChecked) next.delete(category.id);
                else next.add(category.id);
                onChange([...next]);
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}
