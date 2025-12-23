import { GrafanaTutorialCard } from '@/features/edge/proxy/overview/grafana-tutorial-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXY_DETAIL_PATH } from '@/routes/api/proxy/$id';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle, SpinnerIcon } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { InfoIcon } from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher, useNavigate } from 'react-router';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      ease: 'easeOut',
    },
  },
  exit: { opacity: 0, transition: { ease: 'easeIn' } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

interface HttpProxyPreviewProps {
  data?: IHttpProxyControlResponse;
  projectId?: string;
}

export const HttpProxyPreview = ({ data, projectId }: HttpProxyPreviewProps) => {
  const fetcher = useFetcher<IHttpProxyControlResponse>();
  const navigate = useNavigate();
  const [proxy, setProxy] = useState<IHttpProxyControlResponse | undefined>(data);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const proxyStatus = useMemo(() => {
    if (!proxy) {
      return {
        status: ControlPlaneStatus.Pending,
        message: 'Proxy is being created',
      };
    }
    return transformControlPlaneStatus(proxy.status);
  }, [proxy]);

  const cleanUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (proxyStatus.status === ControlPlaneStatus.Pending && proxy?.name) {
      intervalRef.current = setInterval(() => {
        fetcher.load(
          `${getPathWithParams(HTTP_PROXY_DETAIL_PATH, { id: proxy.name })}?projectId=${projectId}`
        );
      }, 2000);
    } else {
      cleanUp();
    }

    return cleanUp;
  }, [proxyStatus.status, proxy?.name, projectId, fetcher]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      setProxy(fetcher.data);
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <Card>
      <AnimatePresence mode="wait">
        {proxyStatus.status === ControlPlaneStatus.Pending ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <CardContent className="flex min-h-[346px] flex-col items-center justify-center gap-4">
              <SpinnerIcon size="xl" aria-hidden="true" />
              <p className="text-sm font-semibold">Setting up your proxy...</p>
            </CardContent>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit">
            <CardHeader>
              <motion.div variants={itemVariants}>
                <CardTitle className="text-center text-2xl">Your Proxy is Ready!</CardTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <CardDescription className="text-center">
                  Your Proxy is now configured to securely route external traffic to your backend
                  service.
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <motion.div variants={itemVariants}>
                <HttpProxyHostnamesCard
                  endpoint={proxy?.endpoint}
                  customHostnames={proxy?.hostnames ?? []}
                  status={proxy?.status}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Alert variant="secondary">
                  <IconWrapper icon={InfoIcon} className="text-secondary-500 size-4" />
                  <AlertTitle>How to use your proxy</AlertTitle>
                  <AlertDescription>
                    <p>
                      Make HTTP/HTTPS requests to any of the endpoints above. All requests will be
                      automatically forwarded to your backend endpoint with:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Automatic HTTPS termination.</li>
                      <li>Request/response headers preserved.</li>
                      <li>Load balancing and failover.</li>
                      <li>Built-in monitoring and logging.</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </motion.div>
              <motion.div variants={itemVariants}>
                <GrafanaTutorialCard projectId={projectId ?? ''} />
              </motion.div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button
                htmlType="button"
                onClick={() =>
                  navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }))
                }>
                Done
              </Button>
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
