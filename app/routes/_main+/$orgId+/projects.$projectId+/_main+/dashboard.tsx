import { useRouteLoaderData, useRevalidator } from 'react-router'
import { useEffect, useMemo } from 'react'
import {
  Loader2,
  ArrowRight,
  Mail,
  Network,
  Cloud,
  GlobeLock,
  Binoculars,
  CircleIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'

const EXPLORER_CARDS = [
  {
    title: 'Deploy a global workload',
    description:
      'Easily deploy and scale your applications across regions, ensuring high availability and performance worldwide.',
    icon: <Cloud />,
  },
  {
    title: 'Connect multiple networks',
    description:
      'Establish secure and reliable connectivity between multiple networks, enabling seamless communication across your infrastructure.',
    icon: <Network />,
  },
  {
    title: 'Secure project access',
    description:
      'Protect your cloud resources with robust access controls, ensuring only authorized users and services can interact with your project.',
    icon: <GlobeLock />,
  },
  {
    title: 'Observe network traffic',
    description:
      'Monitor, analyze, and troubleshoot network activity in real time to enhance security and optimize performance.',
    icon: <Binoculars />,
  },
] as const

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-xl font-semibold">{children}</h1>
)

const SectionDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-base font-thin text-muted-foreground">{children}</p>
)

const ArrowListItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center">
    <ArrowRight className="mr-2 size-4" />
    {children}
  </div>
)

const ExplorerCard = ({ title, description, icon }: (typeof EXPLORER_CARDS)[number]) => (
  <Card className="flex flex-col gap-3">
    <CardHeader className="!pb-0">
      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <SectionDescription>{description}</SectionDescription>
    </CardContent>
  </Card>
)

export default function ProjectPage() {
  const project = useRouteLoaderData(
    'routes/_main+/$orgId+/projects.$projectId+/_main+/_layout',
  )

  const { revalidate } = useRevalidator()
  const REVALIDATE_INTERVAL = 5000

  const status = useMemo(() => {
    if (project) {
      const condition = project.status.conditions[0]
      return {
        isReady: condition.status === 'True',
        message: condition.message,
      }
    }

    return {
      isReady: false,
      message: 'Project is being provisioned...',
    }
  }, [project])

  useEffect(() => {
    if (!status.isReady) {
      const id = setInterval(revalidate, REVALIDATE_INTERVAL)
      return () => clearInterval(id)
    }
  }, [revalidate, status])

  return (
    <div className="mx-auto my-4 w-full max-w-7xl md:my-6">
      <div className="mx-6 flex flex-col gap-12 space-y-4">
        {/* Project Information */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold leading-none">{project.name}</h1>
            <div className="mt-1 flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm font-bold">
              {status.isReady ? (
                <CircleIcon className="size-3 fill-green-500 text-green-500" />
              ) : (
                <Loader2 className="size-4 animate-spin" />
              )}
              {status.isReady ? 'Ready' : 'Setting up project...'}
            </div>
          </div>
          {!status.isReady && (
            <SectionDescription>
              {status.message}
              <span className="ml-1 inline-flex after:animate-[ellipsis_1s_steps(4,end)_infinite] after:content-['.']"></span>
            </SectionDescription>
          )}
        </div>

        {status.isReady ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-12 space-y-4">
            <div className="flex flex-col items-center gap-12 md:flex-row md:justify-between">
              <div className="flex flex-col gap-12 space-y-4">
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

                <motion.div
                  className="flex flex-col gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}>
                  <SectionTitle>
                    Get started by configuring your first location
                  </SectionTitle>
                  <SectionDescription>
                    Setup a Datum managed Location backed by{' '}
                    <strong className="font-bold">Google Cloud Platform</strong>.
                  </SectionDescription>

                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="h-7 w-fit">
                      Explore Locations
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-fit">
                      <a
                        href="https://docs.datum.net/docs/tutorials/infra-provider-gcp/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2">
                        About Locations
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
                src="/images/google-cloud-platform.webp"
                alt="Google Cloud Platform"
                className="mx-auto h-auto max-w-[300px]"
              />
            </div>

            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}>
              <SectionTitle>Explore</SectionTitle>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {EXPLORER_CARDS.map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}>
                    <ExplorerCard {...card} />
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <ArrowRight className="mr-2 mt-1 size-4" />
                    <div className="flex flex-col gap-2">
                      <SectionDescription>
                        If the problem persists, please contact support.
                      </SectionDescription>
                      <Button variant="outline" size="sm" className="h-7 w-fit">
                        <Mail className="size-4" />
                        Contact Support
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
  )
}
