import { EmptyContent } from '@/components/empty-content/empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { CreateOrganizationCard, OrganizationCard } from '@/features/organization';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api/organizations';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-ui/components';
import { PlusIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { useLoaderData, LoaderFunctionArgs, data, Link, useNavigate } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  });

  const res = await req.json();
  if (!res.success) {
    return data([]);
  }

  return data(res.data);
};

// Animation variants for the page container
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
} as const;

// Animation variants for the header section
const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
} as const;

// Animation variants for the grid container
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
} as const;

// Animation variants for individual cards
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
} as const;

export default function AccountOrganizations() {
  const orgs: IOrganization[] = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const hasStandardOrg = useMemo(() => {
    return orgs.some((org) => org.type === OrganizationType.Standard);
  }, [orgs]);

  // Empty state with animation
  if (orgs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}>
        <EmptyContent
          variant="dashed"
          title="No organizations found"
          subtitle="You don't have any organizations"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 pt-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible">
      <motion.div variants={headerVariants}>
        <PageTitle
          title="Your Organizations"
          actions={
            hasStandardOrg ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}>
                <Button>
                  <Link
                    className="flex items-center gap-2"
                    to={getPathWithParams(paths.account.organizations.new)}>
                    <PlusIcon className="size-4" />
                    New Organization
                  </Link>
                </Button>
              </motion.div>
            ) : null
          }
        />
      </motion.div>

      <motion.div
        className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2"
        variants={gridVariants}
        layout>
        <AnimatePresence mode="popLayout">
          {orgs.map((org, index) => (
            <motion.div
              key={org.name}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              layout
              layoutId={`org-card-${org.name}`}
              custom={index}>
              <OrganizationCard
                organization={org}
                variant={hasStandardOrg ? 'compact' : 'selection'}
                onClick={() => {
                  navigate(getPathWithParams(paths.org.detail.root, { orgId: org.name }));
                }}
              />
            </motion.div>
          ))}

          {!hasStandardOrg && (
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              layout
              layoutId="create-org-card">
              <CreateOrganizationCard
                onClick={() => {
                  navigate(getPathWithParams(paths.account.organizations.new));
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
