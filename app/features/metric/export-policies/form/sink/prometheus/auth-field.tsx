import { SelectSecret } from '@/components/select-secret/select-secret';
import { SINK_AUTH_TYPES } from '@/features/metric/constants';
import { ExportPolicyAuthenticationType } from '@/resources/export-policies';
import { SecretType } from '@/resources/secrets';
import { Autocomplete } from '@datum-cloud/datum-ui/autocomplete';
import { Form } from '@datum-cloud/datum-ui/form';
import { Label } from '@datum-cloud/datum-ui/label';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { cn } from '@datum-cloud/datum-ui/utils';

export const AuthField = ({ baseName, projectId }: { baseName: string; projectId?: string }) => {
  return (
    <div className="flex w-full flex-col gap-2">
      <Form.Field name={`${baseName}.authentication.authType`}>
        {({ control: authTypeControl }) => (
          <Form.Field name={`${baseName}.authentication.secretName`}>
            {({ control: secretNameControl }) => {
              // Derive toggle state from form value — single source of truth
              const isAuthenticationEnabled = !!authTypeControl.value;

              return (
                <>
                  <div className="mb-2 flex items-center space-x-2">
                    <Switch
                      id="authentication"
                      checked={isAuthenticationEnabled}
                      onCheckedChange={(value) => {
                        if (value) {
                          authTypeControl.change(ExportPolicyAuthenticationType.BASIC_AUTH);
                        } else {
                          authTypeControl.change(undefined);
                          secretNameControl.change(undefined);
                        }
                      }}
                    />
                    <Label htmlFor="authentication">Enable Authentication</Label>
                  </div>
                  <div
                    className={cn('flex flex-col gap-2 sm:flex-row', {
                      hidden: !isAuthenticationEnabled,
                    })}>
                    <Form.Field
                      name={`${baseName}.authentication.authType`}
                      label="Authentication Type"
                      required={isAuthenticationEnabled}
                      className="w-full sm:w-1/3">
                      {({ control, meta }) => (
                        <Autocomplete
                          name={meta.name}
                          id={meta.id}
                          options={Object.values(ExportPolicyAuthenticationType).map((type) => ({
                            value: type,
                            label: SINK_AUTH_TYPES[type as keyof typeof SINK_AUTH_TYPES].label,
                          }))}
                          onValueChange={(value) => {
                            control.change(value);
                            secretNameControl.change(undefined);
                          }}
                          value={(control.value as string) ?? undefined}
                        />
                      )}
                    </Form.Field>
                    <Form.Field
                      name={`${baseName}.authentication.secretName`}
                      label="Secret"
                      required={isAuthenticationEnabled}
                      className="w-full sm:w-1/2">
                      {({ control, meta }) => (
                        <SelectSecret
                          name={meta.name}
                          id={meta.id}
                          defaultValue={control.value as string}
                          projectId={projectId}
                          onValueChange={(value) => {
                            control.change(value?.value as string);
                          }}
                          filter={{ type: SecretType.BASIC_AUTH }}
                        />
                      )}
                    </Form.Field>
                  </div>
                </>
              );
            }}
          </Form.Field>
        )}
      </Form.Field>
    </div>
  );
};
