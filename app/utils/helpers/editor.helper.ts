import { dump, load } from 'js-yaml';

/**
 * Converts JSON string to YAML string
 */
export function jsonToYaml(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    return dump(parsed, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true, // Don't output YAML references
    });
  } catch (error) {
    console.error('JSON to YAML conversion error:', error);
    throw new Error('Invalid JSON format');
  }
}

/**
 * Converts YAML string to JSON string
 */
export function yamlToJson(yamlStr: string): string {
  try {
    const parsed = load(yamlStr);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error('YAML to JSON conversion error:', error);
    throw new Error('Invalid YAML format');
  }
}

/**
 * Formats JSON string
 */
export function formatJson(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(parsed, null, 2);
  } catch {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Formats YAML string
 */
export function formatYaml(yamlStr: string): string {
  try {
    const parsed = load(yamlStr);
    return dump(parsed, { indent: 2 });
  } catch {
    throw new Error('Invalid YAML format');
  }
}

/**
 * Validates JSON string
 */
export function isValidJson(jsonStr: string): boolean {
  try {
    JSON.parse(jsonStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates YAML string
 */
export function isValidYaml(yamlStr: string): boolean {
  try {
    load(yamlStr);
    return true;
  } catch {
    return false;
  }
}
