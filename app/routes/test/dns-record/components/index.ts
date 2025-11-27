/**
 * DNS Record Form Testing Module
 *
 * Exports test utilities, scenarios, and components for DNS record validation testing
 */

export { DnsRecordTestCard } from './dns-record-test-card';
export {
  DEFAULT_TEST_SCENARIOS,
  getAllTestScenarios,
  getTestScenariosForType,
  type TestScenario,
} from './default-test-scenarios';
export { getPreviewFields, type PreviewField } from './preview-fields.helper';
