import { BackendRefDefaultValues, BackendRefsForm } from './backend-ref/backend-refs-form';
import { FilterDefaultValues, FiltersForm } from './filter/filters-form';
import { MatchDefaultValues, MatchesForm } from './match/matches-form';
import { FieldLabel } from '@/components/field/field-label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HttpRouteRuleSchema, HttpRouteSchema } from '@/resources/schemas/http-route.schema';
import { cn } from '@/utils/common';
import { useForm, useFormMetadata } from '@conform-to/react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

const defaultRuleValue: HttpRouteRuleSchema = {
  matches: [MatchDefaultValues],
  backendRefs: [BackendRefDefaultValues],
  filters: [FilterDefaultValues],
};

export const RulesForm = ({
  fields,
  defaultValue,
  projectId,
}: {
  fields: ReturnType<typeof useForm<HttpRouteSchema>>[1];
  defaultValue?: HttpRouteRuleSchema[];
  projectId?: string;
}) => {
  const form = useFormMetadata('http-route-form');
  const ruleList = fields.rules.getFieldList();

  useEffect(() => {
    if (defaultValue && defaultValue.length > 0) {
      form.update({
        name: fields.rules.name,
        value: defaultValue,
      });
    } else if (ruleList.length === 0) {
      form.insert({
        name: fields.rules.name,
        defaultValue: defaultRuleValue,
      });
    }
  }, [defaultValue]);

  // Enable this when you don't want to implement same endpoint slice for all backend refs
  /* const selectedEndpointSlice = useMemo(() => {
    // Extract all selected network names from the form fields
    return ruleList
      .map((rule) => {
        const fieldset = rule.getFieldset()
        return fieldset.backendRefs.getFieldList().map((backendRef) => {
          const backendRefFieldset = backendRef.getFieldset()
          return backendRefFieldset.name.value
        })
      })
      .flat()
      .filter(Boolean)
  }, [ruleList]) */

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Rules" isRequired />

      <div className="space-y-4">
        {ruleList.map((field, index) => {
          const ruleFields = field.getFieldset();
          return (
            <div className="relative flex items-center gap-2 rounded-md border p-4" key={field.key}>
              <div className="w-full space-y-4">
                <MatchesForm
                  key={ruleFields.matches.id}
                  fields={
                    ruleFields as unknown as ReturnType<typeof useForm<HttpRouteRuleSchema>>[1]
                  }
                  defaultValue={defaultValue?.[index]?.matches}
                />

                <Separator />

                <BackendRefsForm
                  key={ruleFields.backendRefs.id}
                  selectedEndpointSlice={[]}
                  fields={
                    ruleFields as unknown as ReturnType<typeof useForm<HttpRouteRuleSchema>>[1]
                  }
                  defaultValue={defaultValue?.[index]?.backendRefs}
                  projectId={projectId}
                />

                <Separator />

                <FiltersForm
                  key={ruleFields.filters.id}
                  fields={
                    ruleFields as unknown as ReturnType<typeof useForm<HttpRouteRuleSchema>>[1]
                  }
                  defaultValue={defaultValue?.[index]?.filters}
                />
              </div>

              {ruleList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => {
                    defaultValue?.splice(index, 1);
                    form.remove({ name: fields.rules.name, index });
                  }}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.rules.name,
            defaultValue: defaultRuleValue,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
};
