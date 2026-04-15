import { createActivityTools } from './activity-tools';
import { createMetricsTools } from './metrics-tools';
import { createResourceTools } from './resource-tools';
import { createUtilityTools } from './utility-tools';

interface ToolDeps {
  accessToken?: string;
}

export function createAssistantTools({ accessToken }: ToolDeps) {
  return {
    ...createResourceTools(),
    ...createMetricsTools({ accessToken }),
    ...createActivityTools(),
    ...createUtilityTools(),
  };
}
