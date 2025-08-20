import { RefreshControl } from './RefreshControl';
import { StepControl } from './StepControl';
import { TimeRangeControl } from './TimeRangeControl';
import React from 'react';

/**
 * MetricsControls groups the time range, step, and auto-refresh controls.
 */
export function MetricsControls(): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <TimeRangeControl />
      <StepControl />
      <RefreshControl />
    </div>
  );
}
