import {
  createDnsRecordSchema,
  CreateDnsRecordSchema,
  DNS_RECORD_TYPES,
  DNSRecordType,
} from '@/resources/dns-records';
import {
  getAllTestScenarios,
  TestScenario,
} from '@/routes/test/dns-record/components/default-test-scenarios';
import { DnsRecordTestCard } from '@/routes/test/dns-record/components/dns-record-test-card';
import { Button, toast } from '@datum-ui/components';
import { Badge } from '@shadcn/ui/badge';
import { useState } from 'react';

/**
 * DNS Record Type Validation Testing Page
 *
 * This page provides a testing environment for all DNS record types.
 * Features:
 * - Test all 13 DNS record types with default scenarios
 * - Import custom scenarios for testing
 * - Real-time validation using Zod schemas
 * - No API calls - pure client-side validation
 */
export default function DnsRecordTestPage() {
  const [scenarios, setScenarios] = useState<TestScenario[]>(getAllTestScenarios());
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [activeScenarios, setActiveScenarios] = useState<Partial<Record<DNSRecordType, string>>>(
    () => {
      // Initialize active scenario for each type (first scenario)
      const initial = {} as Record<DNSRecordType, string>;
      const defaultScenarios = getAllTestScenarios();
      DNS_RECORD_TYPES.forEach((type) => {
        const typeScenarios = defaultScenarios.filter((s) => s.recordType === type);
        if (typeScenarios.length > 0) {
          initial[type] = typeScenarios[0].id;
        }
      });
      return initial;
    }
  );

  const handleValidate = (recordType: DNSRecordType, customData?: CreateDnsRecordSchema) => {
    const scenarioId = activeScenarios[recordType];
    const scenario = scenarios.find((s) => s.id === scenarioId);

    // Use custom data if provided, otherwise fall back to scenario data
    const dataToValidate = customData || scenario?.data;
    if (!dataToValidate) return;

    try {
      // Validate using Zod directly
      createDnsRecordSchema.parse(dataToValidate);
      setValidationResults((prev) => ({ ...prev, [recordType]: { status: 'success' } }));
    } catch (error: any) {
      setValidationResults((prev) => ({
        ...prev,
        [recordType]: { status: 'error', error: error.errors || [error.message] },
      }));
    }
  };

  const handleValidateAll = () => {
    const results: Record<string, any> = {};
    let validCount = 0;
    let invalidCount = 0;

    DNS_RECORD_TYPES.forEach((type) => {
      const scenarioId = activeScenarios[type];
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (scenario) {
        try {
          createDnsRecordSchema.parse(scenario.data);
          results[type] = { status: 'success' };
          validCount++;
        } catch (error: any) {
          results[type] = { status: 'error', error: error.errors || [error.message] };
          invalidCount++;
        }
      }
    });

    setValidationResults(results);
    toast.success(
      `Validation complete: ${validCount} valid, ${invalidCount} invalid (${DNS_RECORD_TYPES.length} total)`
    );
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as TestScenario[];
        if (!Array.isArray(imported)) {
          throw new Error('Invalid file format');
        }

        // Validate that imported scenarios have the correct structure
        const validImported = imported.filter((s) => s.id && s.name && s.recordType && s.data);

        if (validImported.length === 0) {
          throw new Error('No valid scenarios found in file');
        }

        // Replace all scenarios with imported ones
        setScenarios(validImported);

        // Update active scenarios to first scenario of each type
        const newActiveScenarios = {} as Record<DNSRecordType, string>;
        DNS_RECORD_TYPES.forEach((type) => {
          const typeScenarios = validImported.filter((s) => s.recordType === type);
          if (typeScenarios.length > 0) {
            newActiveScenarios[type] = typeScenarios[0].id;
          }
        });
        setActiveScenarios(newActiveScenarios);

        // Clear validation results
        setValidationResults({});

        toast.success(`Imported ${validImported.length} scenarios`);
      } catch (error) {
        toast.error(
          `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be imported again
    event.target.value = '';
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all scenarios to defaults?')) {
      const defaultScenarios = getAllTestScenarios();
      setScenarios(defaultScenarios);
      setValidationResults({});

      // Reset active scenarios to first of each type
      const initial = {} as Record<DNSRecordType, string>;
      DNS_RECORD_TYPES.forEach((type) => {
        const typeScenarios = defaultScenarios.filter((s) => s.recordType === type);
        if (typeScenarios.length > 0) {
          initial[type] = typeScenarios[0].id;
        }
      });
      setActiveScenarios(initial);

      toast.success('Reset to default scenarios');
    }
  };

  const handleDownloadSample = () => {
    // Download all current scenarios
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dns-scenarios-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Scenarios downloaded - customize and import them back!');
  };

  const validCount = Object.values(validationResults).filter((r) => r?.status === 'success').length;
  const totalTested = Object.keys(validationResults).length;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DNS Record Type Validation Testing</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Test validation for all 13 DNS record types with customizable scenarios
            </p>
          </div>
          <Badge variant="outline" className="h-fit">
            Test Mode
          </Badge>
        </div>

        {/* How to Use - Moved to top */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          <h3 className="mb-2 font-semibold">How to Use:</h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>Each card shows a form with all fields for that DNS record type</li>
            <li>Switch between scenarios using the dropdown to test different configurations</li>
            <li>Click &quot;Validate Now&quot; to test the current scenario against the schema</li>
            <li>Download scenarios as JSON, customize them, and import to replace all scenarios</li>
            <li>All validation happens client-side - no API calls are made</li>
          </ul>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            onClick={handleValidateAll}
            data-testid="dns-test-validate-all"
            className="font-semibold">
            ✓ Validate All Types
          </Button>

          {totalTested > 0 && (
            <Badge variant="secondary" className="ml-2">
              {validCount}/{totalTested} Valid
            </Badge>
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="secondary"
              onClick={handleDownloadSample}
              data-testid="dns-test-download-sample">
              Download Scenarios
            </Button>

            <Button
              type="secondary"
              onClick={() => document.getElementById('import-file')?.click()}>
              Import Scenarios
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              data-testid="dns-test-import-input"
            />

            <Button type="secondary" onClick={handleResetAll} data-testid="dns-test-reset-all">
              Reset to Default
            </Button>
          </div>
        </div>
      </div>

      {/* Grid - Changed to max 2 columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DNS_RECORD_TYPES.map((type) => {
          const scenarioId = activeScenarios[type];
          const scenario = scenarios.find((s) => s.id === scenarioId);
          const typeScenarios = scenarios.filter((s) => s.recordType === type);
          const result = validationResults[type];

          if (!scenario) return null;

          return (
            <DnsRecordTestCard
              key={type}
              recordType={type}
              scenario={scenario}
              scenarios={typeScenarios}
              validationResult={result}
              onSwitchScenario={(id) => setActiveScenarios((prev) => ({ ...prev, [type]: id }))}
              onValidate={(data) => handleValidate(type, data)}
            />
          );
        })}
      </div>
    </div>
  );
}
