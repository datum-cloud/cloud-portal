/**
 * MetricsFilter - Compound component for filter components
 */
import { MetricsFilterRadio } from './metrics-filter-radio';
import { MetricsFilterSearch } from './metrics-filter-search';
import { MetricsFilterSelect } from './metrics-filter-select';

// Compound component structure
const MetricsFilter = {
  Select: MetricsFilterSelect,
  Radio: MetricsFilterRadio,
  Search: MetricsFilterSearch,
};

export { MetricsFilter };
