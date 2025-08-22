/**
 * MetricsFilter - Compound component for filter components
 */
import { MetricsFilterRadio } from './MetricsFilterRadio';
import { MetricsFilterSearch } from './MetricsFilterSearch';
import { MetricsFilterSelect } from './MetricsFilterSelect';

// Compound component structure
const MetricsFilter = {
  Select: MetricsFilterSelect,
  Radio: MetricsFilterRadio,
  Search: MetricsFilterSearch,
};

export { MetricsFilter };
