import { Field } from '@/components/field/field';
import { GuideStep, GuideStepItem } from '@/features/edge/httpproxy/grafana/step-item';
import { InstanceFormValues } from '@/features/edge/httpproxy/grafana/stepper.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import { Input } from '@shadcn/ui/input';
import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';

export const GrafanaAccessCard = ({
  defaultValue,
  fields,
}: {
  defaultValue?: InstanceFormValues;
  fields: ReturnType<typeof useForm<InstanceFormValues>>[1];
}) => {
  const instanceUrlControl = useInputControl(fields.instanceUrl);

  const steps: GuideStep[] = useMemo(() => {
    return [
      {
        id: 'signup',
        title: 'Sign Up for Grafana Cloud',
        description: "If you don't have an account, create one to get started.",
        body: (
          <Button type="quaternary" theme="outline" size="small" className="w-fit">
            <Link
              to="https://grafana.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2">
              <ExternalLink className="size-4" />
              Create Grafana Account
            </Link>
          </Button>
        ),
      },
      {
        id: 'access',
        title: 'Access Your Grafana Instance',
        description:
          'Sign in to your Grafana Cloud account and navigate to the instance you want to integrate.',
      },
      {
        id: 'enter-instance-url',
        title: 'Enter Grafana Instance URL',
        description: 'Enter your Grafana Cloud instance URL to generate a connection link.',
        body: (
          <div className="flex max-w-sm flex-col space-y-2">
            <Field isRequired label="Grafana Cloud Instance URL" errors={fields.instanceUrl.errors}>
              <Input
                {...getInputProps(fields.instanceUrl, { type: 'text' })}
                placeholder="https://your-instance.grafana.net"
              />
            </Field>
          </div>
        ),
      },
    ];
  }, [fields.instanceUrl]);

  useEffect(() => {
    if (defaultValue) {
      instanceUrlControl.change(defaultValue.instanceUrl);
    }
  }, [defaultValue]);

  return (
    <Card className="gap-6">
      <CardHeader className="border-b pb-6">
        <CardTitle>Access your Grafana Cloud instance</CardTitle>
        <CardDescription>
          Get started by setting up your Grafana Cloud account and accessing your instance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8">
          {steps.map((step, index) => (
            <GuideStepItem key={step.id} stepNumber={index + 1} {...step} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
