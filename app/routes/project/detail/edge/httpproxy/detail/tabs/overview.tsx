import { HttpProxyGeneralCard } from '@/features/edge/httpproxy/overview/general-card';
import { GrafanaTutorialCard } from '@/features/edge/httpproxy/overview/grafana-tutorial-card';
import { HttpProxyHostnamesCard } from '@/features/edge/httpproxy/overview/hostnames-card';
import { motion } from 'motion/react';
import { useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export default function HttpProxyOverviewPage() {
  const httpProxy = useRouteLoaderData('httpproxy-detail');

  const { projectId } = useParams();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}>
          <HttpProxyGeneralCard httpProxy={httpProxy} />
        </motion.div>
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}>
            <HttpProxyHostnamesCard
              customHostnames={httpProxy?.hostnames ?? []}
              status={httpProxy?.status}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}>
            <GrafanaTutorialCard projectId={projectId ?? ''} proxy={httpProxy ?? {}} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
