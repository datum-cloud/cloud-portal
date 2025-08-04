import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { paths } from '@/config/paths';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { HttpProxyHostnamesCard } from '@/features/edge/httpproxy/overview/hostnames-card';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXY_DETAIL_PATH } from '@/routes/api/httpproxy/$id';
import { getPathWithParams } from '@/utils/path';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { ExternalLinkIcon, InfoIcon, Loader2, SignalHighIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useFetcher, useNavigate } from 'react-router';

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
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Setting up your proxy...</p>
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
                  Your HTTPProxy is now configured to securely route external traffic to your
                  backend service.
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <motion.div variants={itemVariants}>
                <HttpProxyHostnamesCard
                  endpoint={proxy?.endpoint}
                  hostnames={proxy?.status?.hostnames ?? []}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Alert variant="secondary">
                  <InfoIcon className="text-secondary-500 size-4" />
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
                <Alert variant="info">
                  <SignalHighIcon className="text-info-500 size-4" />
                  <AlertTitle className="dark:text-info-300">
                    Want to see some metrics in Grafana?
                  </AlertTitle>
                  <AlertDescription className="dark:text-info-500">
                    <p>
                      Learn how to export metrics from your Datum project to Grafana Cloud using
                      Prometheus remote write. This tutorial walks you through generating
                      credentials, configuring secrets, and setting up an ExportPolicy.
                    </p>
                    <Link
                      to="https://docs.datum.net/docs/tutorials/grafana/"
                      target="_blank"
                      className="mt-4 flex items-center gap-1 underline">
                      <ExternalLinkIcon className="size-4" />
                      Follow the tutorial
                    </Link>
                  </AlertDescription>
                </Alert>
              </motion.div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button
                variant="default"
                type="button"
                onClick={() =>
                  navigate(getPathWithParams(paths.project.detail.httpProxy.root, { projectId }))
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
