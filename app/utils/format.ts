/**
 * Data formatting and conversion utilities
 * JSON/YAML conversion, validation, and formatting
 */
import { dump, load } from 'js-yaml';

/**
 * Converts JSON string to YAML string
 * @param jsonStr - The JSON string to convert
 * @returns YAML formatted string
 * @throws Error if JSON format is invalid
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
 * @param yamlStr - The YAML string to convert
 * @returns JSON formatted string
 * @throws Error if YAML format is invalid
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
 * Formats JSON string with proper indentation
 * @param jsonStr - The JSON string to format
 * @returns Formatted JSON string
 * @throws Error if JSON format is invalid
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
 * Formats YAML string with proper indentation
 * @param yamlStr - The YAML string to format
 * @returns Formatted YAML string
 * @throws Error if YAML format is invalid
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
 * Validates if a string is valid JSON
 * @param jsonStr - The string to validate
 * @returns Boolean indicating if the string is valid JSON
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
 * Validates if a string is valid YAML
 * @param yamlStr - The string to validate
 * @returns Boolean indicating if the string is valid YAML
 */
export function isValidYaml(yamlStr: string): boolean {
  try {
    load(yamlStr);
    return true;
  } catch {
    return false;
  }
}
