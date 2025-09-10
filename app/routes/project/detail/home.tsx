import { StatusBadge } from '@/components/status-badge/status-badge';
import { Button } from '@/components/ui/button';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import {
  ArrowListItem,
  ExplorerCard,
  SectionDescription,
  SectionTitle,
} from '@/features/project/dashboard';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { differenceInMinutes } from 'date-fns';
import { ArrowRight, Binoculars, Mail, Waypoints } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useRevalidator, useRouteLoaderData } from 'react-router';

export default function ProjectDashboardPage() {
  const { project } = useRouteLoaderData('project-detail');
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  const { revalidate } = useRevalidator();
  const REVALIDATE_INTERVAL = 5000;

  const status = useMemo(() => {
    if (project) {
      return transformControlPlaneStatus(project.status);
    }
  }, [project]);

  const explorerList = useMemo(() => {
    return [
      {
        title: 'Configure HTTPProxy',
        description:
          'Set up and manage HTTPProxy to control and secure your web traffic at the edge.',
        icon: <Waypoints />,
        link: getPathWithParams(paths.project.detail.httpProxy.root, {
          projectId: project.name,
        }),
      },
      {
        title: 'Define Log Export Policies',
        description:
          'Define policies to export logs and metrics for analysis, troubleshooting, and compliance purposes.',
        icon: <Binoculars />,
        link: getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
          projectId: project.name,
        }),
      },
    ];
  }, [project]);

  useEffect(() => {
    // Clear any existing interval first
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }

    // Only start new interval if status is Pending
    if (status?.status === ControlPlaneStatus.Pending) {
      intervalId.current = setInterval(revalidate, REVALIDATE_INTERVAL);
    }

    // Cleanup on unmount or status change
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [revalidate, status]);

  const isNewProject = useMemo(() => {
    return (
      status?.status === ControlPlaneStatus.Success &&
      project?.createdAt &&
      differenceInMinutes(new Date(), new Date(project.createdAt)) < 5
    );
  }, [project, status]);

  return (
    <div className="mx-auto my-4 w-full max-w-7xl md:my-6">
      <div className="mx-6 flex flex-col gap-8">
        {/* Project Information */}
        <motion.div
          className="flex flex-col gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-4">
              <p className="text-4xl leading-none font-semibold">{project.description}</p>
              {status?.status === ControlPlaneStatus.Pending && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                  <StatusBadge
                    status={status}
                    type="badge"
                    showTooltip={false}
                    readyText="Active"
                    badgeClassName="bg-secondary text-secondary-foreground font-medium border border-input"
                  />
                </motion.div>
              )}
            </div>
            <motion.p
              className="text-muted-foreground text-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}>
              {project.name}
            </motion.p>
          </motion.div>
          {status?.status === ControlPlaneStatus.Pending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}>
              <SectionDescription>
                {status.message}
                <span className="ml-1 inline-flex after:animate-[ellipsis_1s_steps(4,end)_infinite] after:content-['.']"></span>
              </SectionDescription>
            </motion.div>
          )}
        </motion.div>

        {status?.status === ControlPlaneStatus.Success ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-12 md:flex-row md:justify-between">
              <div className="flex w-1/2 flex-col gap-12 space-y-4">
                {isNewProject && (
                  <motion.div
                    className="flex flex-col gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}>
                    <SectionTitle>Welcome to your project</SectionTitle>
                    <SectionDescription>
                      Your project is now ready! Start configuring and managing resources now.
                    </SectionDescription>
                  </motion.div>
                )}

                <motion.div
                  className="flex flex-col gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}>
                  <SectionTitle>Get started with HTTPProxy configuration</SectionTitle>
                  <SectionDescription>
                    Set up and manage your first HTTPProxy resource to route traffic to your
                    services with{' '}
                    <strong className="font-bold">Datum&apos;s powerful proxy capabilities</strong>.
                  </SectionDescription>

                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="h-7 w-fit">
                      <Link
                        to={getPathWithParams(paths.project.detail.httpProxy.root, {
                          projectId: project.name,
                        })}>
                        Explore HTTPProxy
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-fit">
                      <a
                        href="https://docs.datum.net/docs/tutorials/httpproxy/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2">
                        About HTTPProxy
                        <ArrowRight className="size-4" />
                      </a>
                    </Button>
                  </div>
                </motion.div>
              </div>

              <motion.img
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                src="/images/project-placeholder.png"
                alt={project.name}
                className="mx-auto h-auto max-w-[350px]"
              />
            </div>

            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}>
              <SectionTitle>Explore</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {explorerList.map((exp, index) => (
                  <motion.div
                    key={exp.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}>
                    <ExplorerCard {...exp} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <motion.div
                className="flex flex-col gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}>
                <SectionTitle>While you wait</SectionTitle>
                <ArrowListItem>
                  <SectionDescription>
                    Check out the Datum{' '}
                    <a
                      href="https://docs.datum.net/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sunglow underline">
                      Documentation
                    </a>
                  </SectionDescription>
                </ArrowListItem>
              </motion.div>

              <motion.div
                className="flex flex-col gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}>
                <SectionTitle>Not Working?</SectionTitle>
                <div className="flex flex-col gap-4">
                  <ArrowListItem>
                    <SectionDescription>
                      Try refreshing the page after a few minutes.
                    </SectionDescription>
                  </ArrowListItem>
                  <div className="flex items-start">
                    <ArrowRight className="mt-1 mr-2 size-4" />
                    <div className="flex flex-col gap-2">
                      <SectionDescription>
                        If the problem persists, please contact support.
                      </SectionDescription>
                      <Button variant="outline" size="sm" className="h-7 w-fit">
                        <Link to="mailto:support@datum.net" className="flex items-center gap-2">
                          <Mail className="size-4" />
                          Contact Support
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
