import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Binoculars, Cloud, GlobeLock, Network } from 'lucide-react'

const ExplorerList = [
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

const ExplorerCard = ({ title, description, icon }: (typeof ExplorerList)[number]) => (
  <Card className="flex h-full flex-col gap-3">
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

export { SectionTitle, SectionDescription, ArrowListItem, ExplorerCard, ExplorerList }
