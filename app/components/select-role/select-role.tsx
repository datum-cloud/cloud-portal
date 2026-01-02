import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { useRoles } from '@/resources/roles';
import { toast } from '@datum-ui/components';
import { useEffect, useMemo } from 'react';

export const SelectRole = ({
  defaultValue,
  className,
  onSelect,
  name,
  id,
  disabled,
  modal = false,
}: {
  defaultValue?: string;
  className?: string;
  onSelect: (value: SelectBoxOption) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  modal?: boolean;
}) => {
  const { data: roles = [], isLoading, error } = useRoles();

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load roles');
    }
  }, [error]);

  const groups = useMemo(() => {
    // Create options from API-fetched roles
    const apiRoleOptions = roles.map((role) => {
      const displayName =
        role.annotations?.['kubernetes.io/display-name'] ?? role.displayName ?? role.name;
      const description = role.annotations?.['kubernetes.io/description'] ?? role.description ?? '';

      return {
        value: role.name,
        label: displayName,
        description,
        product: role.annotations?.['taxonomy.miloapis.com/product'] ?? 'Other',
        sortOrder: parseInt(role.annotations?.['taxonomy.miloapis.com/sort-order'] ?? '999', 10),
        ...role,
      };
    });

    // Group roles by product
    const groupedRoles = new Map<string, typeof apiRoleOptions>();
    apiRoleOptions.forEach((role) => {
      if (!groupedRoles.has(role.product)) {
        groupedRoles.set(role.product, []);
      }
      groupedRoles.get(role.product)!.push(role);
    });

    // Sort roles within each group by sort-order, then by label
    groupedRoles.forEach((groupRoles) => {
      groupRoles.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.label.localeCompare(b.label);
      });
    });

    // Sort groups by minimum sort-order within each group, then by product name
    const sortedGroups = Array.from(groupedRoles.entries())
      .sort(([productA, optionsA], [productB, optionsB]) => {
        const minSortOrderA = Math.min(...optionsA.map((opt) => opt.sortOrder));
        const minSortOrderB = Math.min(...optionsB.map((opt) => opt.sortOrder));
        if (minSortOrderA !== minSortOrderB) {
          return minSortOrderA - minSortOrderB;
        }
        return productA.localeCompare(productB);
      })
      .map(([product, options]) => ({
        label: product,
        options: options as SelectBoxOption[],
      }));

    return sortedGroups;
  }, [roles]);

  return (
    <SelectBox
      disabled={disabled}
      name={name}
      id={id}
      value={defaultValue}
      className={className}
      onChange={(value: SelectBoxOption) => {
        if (value) {
          onSelect(value);
        }
      }}
      groups={groups}
      placeholder="Select a Role"
      searchable={false}
      isLoading={isLoading}
      modal={modal}
    />
  );
};
