import { DnsRecordForm } from '../../../../features/edge/dns-zone/form/dns-record-form';
import { TestScenario } from './default-test-scenarios';
import { getPreviewFields } from './preview-fields.helper';
import { CreateDnsRecordSchema, DNSRecordType } from '@/resources/dns-records';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Badge } from '@shadcn/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';

interface DnsRecordTestCardProps {
  recordType: DNSRecordType;
  scenario?: TestScenario;
  scenarios: TestScenario[];
  validationResult?: any;
  onSwitchScenario: (scenarioId: string) => void;
  onValidate: (data?: CreateDnsRecordSchema) => void;
}

export function DnsRecordTestCard({
  recordType,
  scenario,
  scenarios,
  validationResult,
  onSwitchScenario,
  onValidate,
}: DnsRecordTestCardProps) {
  const handleValidateClick = () => {
    if (!scenario) return;

    // Get current form values from the DOM using the record type specific ID
    const formElement = document.getElementById(`dns-record-form-${recordType}`) as HTMLFormElement;
    if (formElement) {
      const formData = new FormData(formElement);
      const data = Object.fromEntries(formData.entries());

      // Get the actual record type from the form (in case it was changed)
      const actualRecordType = (data.recordType as DNSRecordType) || recordType;

      // Parse the form data to match the schema structure
      const parsedData: any = {
        recordType: actualRecordType,
        name: data.name || '',
        ttl: data.ttl === 'auto' || data.ttl === '' ? null : Number(data.ttl),
      };

      // Add ONLY the type-specific fields that match the current record type
      switch (actualRecordType) {
        case 'A':
          parsedData.a = { content: data['a.content'] || '' };
          break;
        case 'AAAA':
          parsedData.aaaa = { content: data['aaaa.content'] || '' };
          break;
        case 'CNAME':
          parsedData.cname = { content: data['cname.content'] || '' };
          break;
        case 'TXT':
          parsedData.txt = { content: data['txt.content'] || '' };
          break;
        case 'MX':
          parsedData.mx = {
            exchange: data['mx.exchange'] || '',
            preference: Number(data['mx.preference']) || 10,
          };
          break;
        case 'SRV':
          parsedData.srv = {
            target: data['srv.target'] || '',
            port: Number(data['srv.port']) || 443,
            priority: Number(data['srv.priority']) || 10,
            weight: Number(data['srv.weight']) || 5,
          };
          break;
        case 'CAA':
          parsedData.caa = {
            flag: Number(data['caa.flag']) || 0,
            tag: data['caa.tag'] || 'issue',
            value: data['caa.value'] || '',
          };
          break;
        case 'NS':
          parsedData.ns = { content: data['ns.content'] || '' };
          break;
        case 'SOA':
          parsedData.soa = {
            mname: data['soa.mname'] || '',
            rname: data['soa.rname'] || '',
            serial: Number(data['soa.serial']) || 1,
            refresh: Number(data['soa.refresh']) || 3600,
            retry: Number(data['soa.retry']) || 600,
            expire: Number(data['soa.expire']) || 86400,
            minimum: Number(data['soa.minimum']) || 3600,
          };
          break;
        case 'PTR':
          parsedData.ptr = { content: data['ptr.content'] || '' };
          break;
        case 'TLSA':
          parsedData.tlsa = {
            usage: Number(data['tlsa.usage']) || 3,
            selector: Number(data['tlsa.selector']) || 1,
            matchingType: Number(data['tlsa.matchingType']) || 1,
            certData: data['tlsa.certData'] || '',
          };
          break;
        case 'HTTPS':
          parsedData.https = {
            priority: Number(data['https.priority']) || 1,
            target: data['https.target'] || '',
            params: data['https.params'] || {},
          };
          break;
        case 'SVCB':
          parsedData.svcb = {
            priority: Number(data['svcb.priority']) || 1,
            target: data['svcb.target'] || '',
            params: data['svcb.params'] || {},
          };
          break;
      }

      onValidate(parsedData);
    } else {
      // Fallback to scenario data if form not found
      onValidate();
    }
  };

  if (!scenario) return null;

  const previewFields = getPreviewFields(recordType, scenario.data);
  const isValid = validationResult?.status === 'success';
  const errors = validationResult?.error
    ? Object.entries(validationResult.error).flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((msg) => `${field}: ${msg}`) : [`${field}: ${msgs}`]
      )
    : [];

  const hasBeenValidated = validationResult !== undefined;

  const getStatusBadge = () => {
    if (!hasBeenValidated) {
      return (
        <Badge variant="secondary" className="text-xs">
          Not tested
        </Badge>
      );
    }
    if (isValid) {
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          ✓ Valid
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="text-xs">
        ❌ {errors.length} {errors.length === 1 ? 'error' : 'errors'}
      </Badge>
    );
  };

  return (
    <Card data-testid={`dns-test-card-${recordType}`} className="transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{recordType}</CardTitle>
            <CardDescription className="text-xs">{scenario.name}</CardDescription>
          </div>
          <div data-testid={`dns-test-status-${recordType}`}>{getStatusBadge()}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Always Expanded View - Form */}
        <>
          {/* Scenario Selector */}
          <div className="flex items-center gap-2">
            <Select value={scenario.id} onValueChange={onSwitchScenario}>
              <SelectTrigger
                className="flex-1"
                data-testid={`dns-test-scenario-select-${recordType}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Form Container */}
          <div
            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            data-testid={`dns-test-form-${recordType}`}>
            <div className="text-muted-foreground mb-2 text-xs font-medium">
              Test Mode - No API calls will be made
            </div>
            <DnsRecordForm
              key={scenario.id}
              style="inline"
              mode="create"
              defaultValue={scenario.data}
              projectId="test-project-123"
              dnsZoneId="test-zone-456"
              dnsZoneName="example.com"
              onClose={() => {}}
              onSuccess={() => {}}
              isPending={false}
              testMode={true}
            />
          </div>

          {/* Validation Display */}
          {hasBeenValidated && (
            <div
              className={cn(
                'rounded-lg border p-3 text-sm',
                isValid
                  ? 'border-green-200 bg-green-50 text-green-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              )}
              data-testid={`dns-test-validation-result-${recordType}`}>
              <div className="mb-2 flex items-center gap-2 font-semibold">
                {isValid
                  ? '✓ Valid'
                  : `❌ ${errors.length} Validation ${errors.length === 1 ? 'Error' : 'Errors'}`}
              </div>
              {!isValid && errors.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-xs">
                  {errors.map((err, i) => (
                    <li key={i} className="wrap-break-word">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="small"
              onClick={handleValidateClick}
              data-testid={`dns-test-validate-${recordType}`}>
              Validate Now
            </Button>
          </div>
        </>
      </CardContent>
    </Card>
  );
}
