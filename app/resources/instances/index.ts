export {
  instanceResourceSchema,
  instanceListSchema,
  instanceStatusToBadgeStatus,
  type Instance,
  type InstanceList,
  type InstanceStatusValue,
  type InstanceCondition,
} from './instance.schema';

export { toInstance, toInstanceList, INSTANCE_LABELS } from './instance.adapter';

export {
  createInstanceService,
  instanceKeys,
  workloadInstancesSelector,
  type InstanceService,
} from './instance.service';

export { useWorkloadInstances, useInstance } from './instance.queries';

export { useWorkloadInstancesWatch } from './instance.watch';
