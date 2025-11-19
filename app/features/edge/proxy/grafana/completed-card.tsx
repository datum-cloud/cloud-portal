import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { CheckCircle2, Shield, Settings, Activity } from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { useNavigate } from 'react-router';

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
};

const pulseVariants: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const featureVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.3 + i * 0.1,
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

export const GrafanaCompletedCard = ({
  projectId,
  proxyId,
}: {
  projectId?: string;
  proxyId?: string;
}) => {
  const navigate = useNavigate();

  const handleDone = (): void => {
    navigate(getPathWithParams(paths.project.detail.proxy.detail.overview, { projectId, proxyId }));
  };

  return (
    <Card className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden border-0 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" />
      <AnimatePresence mode="wait">
        <motion.div
          key="completed"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative">
          <CardHeader className="pb-4">
            <motion.div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg"
              variants={iconVariants}>
              <motion.div variants={pulseVariants} initial="initial" animate="animate">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </motion.div>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <motion.div variants={itemVariants} className="space-y-3">
              <CardTitle className="text-3xl font-semibold text-gray-900">
                Integration Ready!
              </CardTitle>
              <CardDescription className="mx-auto max-w-xl text-lg leading-relaxed text-gray-600">
                Your Proxy is now connected to Grafana Cloud. Metrics will start flowing
                automatically.
              </CardDescription>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3">
              <h4 className="text-sm font-medium tracking-wide text-gray-700 uppercase">
                Resources Deployed
              </h4>
              <div className="grid gap-3">
                {[
                  {
                    icon: Shield,
                    title: 'Secure Credentials',
                    description: 'Kubernetes Secret created with Grafana credentials',
                  },
                  {
                    icon: Settings,
                    title: 'Export Configuration',
                    description: 'ExportPolicy configured to route metrics',
                  },
                  {
                    icon: Activity,
                    title: 'Active Streaming',
                    description: 'Proxy now sending metrics to Grafana Cloud',
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    custom={index}
                    variants={featureVariants}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white/60 p-3 backdrop-blur-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <feature.icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                      <p className="text-xs text-gray-600">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </CardContent>

          <CardFooter className="flex justify-center pt-6">
            <motion.div variants={itemVariants}>
              <Button size="large" onClick={handleDone} className="text-base">
                Done
              </Button>
            </motion.div>
          </CardFooter>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
};
