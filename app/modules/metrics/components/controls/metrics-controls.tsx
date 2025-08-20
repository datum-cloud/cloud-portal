import { RefreshControl } from './refresh-control';
import { StepControl } from './step-control';
import { TimeRangeControl } from './time-range-control';

export function MetricsControls() {
  return (
    <div className="flex items-center gap-2">
      <TimeRangeControl />
      <StepControl />
      <RefreshControl />
    </div>
  );
}
