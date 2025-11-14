import { CodeEditor } from './code-editor';
import { EditorLanguage, CodeEditorTabsProps } from './code-editor.types';
import { isValidJson, isValidYaml, jsonToYaml, yamlToJson } from '@/utils/helpers/format.helper';
import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@datum-ui/components';
import { useEffect, useState } from 'react';

export function CodeEditorTabs({
  value,
  onChange,
  format = 'yaml',
  onFormatChange,
  error,
  id,
  name = 'code-editor',
  minHeight = '300px',
}: CodeEditorTabsProps) {
  const [activeTab, setActiveTab] = useState<EditorLanguage>(format);

  // Initialize JSON value - if the input is in JSON, use it directly, otherwise convert from YAML
  const [jsonValue, setJsonValue] = useState(() => {
    if (format === 'json') return value;

    try {
      return value ? yamlToJson(value) : '{}';
    } catch {
      toast.error('Initial YAML to JSON conversion failed');
      return '{}';
    }
  });

  // Initialize YAML value - if the input is in YAML, use it directly, otherwise convert from JSON
  const [yamlValue, setYamlValue] = useState(() => {
    if (format === 'yaml') return value;

    try {
      return value ? jsonToYaml(value) : '';
    } catch {
      toast.error('Initial JSON to YAML conversion failed');
      return '';
    }
  });

  // Sync with external value changes
  useEffect(() => {
    if (format === 'json' && value !== jsonValue) {
      setJsonValue(value || '{}');
      try {
        setYamlValue(jsonToYaml(value || '{}'));
      } catch (e) {
        console.error('Failed to update YAML from external JSON value:', e);
      }
    } else if (format === 'yaml' && value !== yamlValue) {
      setYamlValue(value || '');
      try {
        setJsonValue(yamlToJson(value || ''));
      } catch (e) {
        console.error('Failed to update JSON from external YAML value:', e);
      }
    }
  }, [value, format]);

  // Sync active tab with format
  useEffect(() => {
    if (format !== activeTab) {
      setActiveTab(format);
    }
  }, [format]);

  // Handle tab changes with format conversion
  const handleTabChange = (newTab: EditorLanguage) => {
    // If the tab hasn't changed, do nothing
    if (newTab === activeTab) return;

    try {
      // Convert content based on which tab we're switching from
      if (activeTab === 'json' && newTab === 'yaml') {
        // JSON to YAML conversion
        if (!isValidJson(jsonValue)) {
          throw new Error('Cannot convert: Invalid JSON');
        }

        // Convert and update state
        const newYaml = jsonToYaml(jsonValue);
        setYamlValue(newYaml);
        setActiveTab('yaml');

        // Notify parent components
        onChange?.(newYaml, 'yaml');
        onFormatChange?.('yaml');
      } else if (activeTab === 'yaml' && newTab === 'json') {
        // YAML to JSON conversion
        if (!isValidYaml(yamlValue)) {
          throw new Error('Cannot convert: Invalid YAML');
        }

        // Convert and update state
        const newJson = yamlToJson(yamlValue);
        setJsonValue(newJson);
        setActiveTab('json');

        // Notify parent components
        onChange?.(newJson, 'json');
        onFormatChange?.('json');
      }
    } catch (error) {
      // Show error message and stay on current tab
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      toast.error(errorMessage, {
        id: 'conversion-error', // Use an ID to prevent duplicate toasts
      });
    }
  };

  // Handle value changes from editor
  const handleJsonChange = (newJson: string) => {
    setJsonValue(newJson);
    try {
      // Update YAML version too
      if (isValidJson(newJson)) {
        const newYaml = jsonToYaml(newJson);
        setYamlValue(newYaml);
      }
      // Only update the external value if this is the active format
      if (activeTab === 'json') {
        onChange?.(newJson, 'json');
      }
    } catch {
      toast.error('Failed to update YAML from JSON value', {
        id: 'json-to-yaml-error',
      });
      // Invalid JSON, don't update YAML
    }
  };

  const handleYamlChange = (newYaml: string) => {
    setYamlValue(newYaml);
    try {
      // Update JSON version too
      if (isValidYaml(newYaml)) {
        const newJson = yamlToJson(newYaml);
        setJsonValue(newJson);
      }
      // Only update the external value if this is the active format
      if (activeTab === 'yaml') {
        onChange?.(newYaml, 'yaml');
      }
    } catch {
      toast.error('Failed to update JSON from YAML value', {
        id: 'yaml-to-json-error',
      });
      // Invalid YAML, don't update JSON
    }
  };

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={(val: string) => handleTabChange(val as EditorLanguage)}
        className="w-full">
        <TabsList className="grid w-[200px] grid-cols-2">
          <TabsTrigger value="yaml">YAML</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="yaml">
          <CodeEditor
            language="yaml"
            value={yamlValue}
            onChange={handleYamlChange}
            name={name}
            id={id}
            error={activeTab === 'yaml' ? error : undefined}
            minHeight={minHeight}
          />
        </TabsContent>
        <TabsContent value="json">
          <CodeEditor
            language="json"
            value={jsonValue}
            onChange={handleJsonChange}
            name={name}
            id={id}
            error={activeTab === 'json' ? error : undefined}
            minHeight={minHeight}
          />
        </TabsContent>
      </Tabs>
      {/* Hidden field to capture the current format */}
      <input type="hidden" name="format" value={activeTab} />
    </>
  );
}
