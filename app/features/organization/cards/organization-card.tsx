import { OrganizationAvatar } from '../avatar';
import { DateFormat } from '@/components/date-format/date-format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { cn } from '@/utils/common';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export interface OrganizationCardProps {
  organization: IOrganization;
  variant?: 'selection' | 'compact' | 'row';
  onClick?: (organization: IOrganization) => void;
  className?: string;
  showCreatedDate?: boolean;
}

// Create motion variants for card transitions
const MotionCard = motion(Card);
const MotionCardContent = motion(CardContent);
const MotionCardHeader = motion(CardHeader);

// Animation variants for different card layouts
const cardLayoutVariants = {
  selection: {
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  compact: {
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  row: {
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
} as const;

// Animation variants for content transitions
const contentVariants = {
  selection: {
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
  compact: {
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
  row: {
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
} as const;

export const OrganizationCard = ({
  organization,
  variant = 'selection',
  onClick,
  className,
  showCreatedDate = true,
}: OrganizationCardProps) => {
  const isPersonal = organization.type === OrganizationType.Personal;

  const handleClick = () => {
    onClick?.(organization);
  };

  // Row variant (horizontal layout for lists)
  if (variant === 'row') {
    return (
      <MotionCard
        className={cn('hover:bg-accent/50 cursor-pointer py-4 transition-all', className)}
        onClick={handleClick}
        variants={cardLayoutVariants}
        animate="row"
        layout
        whileHover={{ backgroundColor: 'rgba(var(--accent), 0.7)' }}>
        <MotionCardContent
          className="flex flex-row items-center justify-between gap-4 px-4"
          variants={contentVariants}
          animate="row">
          {/* Left Side */}
          <div className="flex flex-row items-center gap-4">
            {/* Avatar */}
            <motion.div>
              <OrganizationAvatar organization={organization} size="lg" />
            </motion.div>
            {/* Organization Info */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-row items-center gap-2">
                <motion.h3 className="text-foreground text-lg leading-5 font-semibold" layout>
                  {organization?.displayName ?? organization?.name ?? ''}
                </motion.h3>
                {isPersonal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}>
                    <Badge variant="secondary" className="rounded-full text-xs font-normal">
                      Personal
                    </Badge>
                  </motion.div>
                )}
              </div>
              <motion.p className="text-muted-foreground text-sm" layout>
                {organization?.name}
              </motion.p>
              {showCreatedDate && organization?.createdAt && (
                <motion.div
                  className="text-muted-foreground flex items-center gap-1 text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}>
                  <span>Created on</span>{' '}
                  <DateFormat date={organization?.createdAt} format="MMM do, yyyy" />
                </motion.div>
              )}
            </div>
          </div>

          <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
            <ChevronRight size={24} className="text-muted-foreground" />
          </motion.div>
        </MotionCardContent>
      </MotionCard>
    );
  }

  // Compact variant (small horizontal layout)
  if (variant === 'compact') {
    return (
      <MotionCard
        className={cn(
          'hover:border-primary/50 cursor-pointer py-0 transition-all hover:shadow-sm',
          className
        )}
        onClick={handleClick}
        variants={cardLayoutVariants}
        animate="compact"
        layout
        whileHover={{
          borderColor: 'rgba(var(--primary), 0.7)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}>
        <MotionCardContent className="relative p-4" variants={contentVariants} animate="compact">
          <div className="flex items-center gap-3">
            <motion.div>
              <OrganizationAvatar organization={organization} size="sm" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <motion.h3 className="truncate font-medium" layout>
                  {organization.displayName || organization.name}
                </motion.h3>
                {isPersonal && (
                  <motion.div
                    className="absolute top-4 right-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}>
                    <Badge variant="secondary" className="rounded-full text-xs font-normal">
                      Personal
                    </Badge>
                  </motion.div>
                )}
              </div>
              <motion.p className="text-muted-foreground truncate text-sm" layout>
                {organization.name}
              </motion.p>
            </div>
          </div>
        </MotionCardContent>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      className={cn(
        'hover:border-navy border-border group flex h-full cursor-pointer flex-col transition-all hover:shadow-md',
        className
      )}
      onClick={handleClick}
      variants={cardLayoutVariants}
      animate="selection"
      layout
      whileHover={{
        borderColor: 'rgba(var(--navy), 0.8)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      }}>
      <MotionCardHeader
        className="relative flex-shrink-0 pb-3"
        variants={contentVariants}
        animate="selection">
        {isPersonal && (
          <motion.div
            className="absolute top-4 right-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}>
            <Badge variant="secondary" className="rounded-full text-xs font-normal">
              Personal
            </Badge>
          </motion.div>
        )}
        <div className={cn('flex items-center space-x-3', isPersonal && 'pr-16')}>
          <motion.div whileHover={{ rotate: 5 }} transition={{ duration: 0.2 }}>
            <OrganizationAvatar organization={organization} size="md" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <motion.div layout>
              <CardTitle className="truncate text-base font-semibold">
                {organization.displayName || organization.name}
              </CardTitle>
            </motion.div>
            <motion.div layout>
              <CardDescription className="text-muted-foreground truncate text-sm">
                {organization.name}
              </CardDescription>
            </motion.div>
          </div>
        </div>
      </MotionCardHeader>
      <MotionCardContent
        className="flex flex-1 items-end pt-0"
        variants={contentVariants}
        animate="selection">
        <motion.p
          className="text-muted-foreground text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}>
          {isPersonal
            ? 'A persistent entity just for you. Perfect for experimentation and personal projects.'
            : 'Ideal teams and production use cases with features like groups, RBAC, etc. Same free cost!'}
        </motion.p>
      </MotionCardContent>
    </MotionCard>
  );
};
