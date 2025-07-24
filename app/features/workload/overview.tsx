import { DeploymentsTable } from './deployments-table';
import { WorkloadGeneralCard } from './general-card';
import { InstancesTable } from './instances-table';
import {
  IInstanceControlResponse,
  IWorkloadControlResponse,
  IWorkloadDeploymentControlResponse,
} from '@/resources/interfaces/workload.interface';
import { motion } from 'motion/react';

export const WorkloadOverview = ({
  workload,
  deployments,
  instances,
}: {
  workload: IWorkloadControlResponse;
  deployments: IWorkloadDeploymentControlResponse[];
  instances: IInstanceControlResponse[];
}) => {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-1/2">
        <WorkloadGeneralCard workload={workload} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}>
        <DeploymentsTable data={deployments} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}>
        <InstancesTable data={instances} />
      </motion.div>
    </div>
  );
};
