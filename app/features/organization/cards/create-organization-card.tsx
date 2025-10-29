import { cn } from '@shadcn/lib/utils';
import { Card, CardContent, CardDescription, CardTitle } from '@shadcn/ui/card';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

export interface CreateOrganizationCardProps {
  onClick?: () => void;
  className?: string;
}

// Create motion components
const MotionCard = motion.create(Card);
const MotionCardContent = motion.create(CardContent);

export const CreateOrganizationCard = ({ onClick, className }: CreateOrganizationCardProps) => {
  return (
    <MotionCard
      className={cn(
        'border-muted-foreground/50 hover:border-navy group flex h-full cursor-pointer flex-col border-2 border-dashed transition-all hover:shadow-md',
        className
      )}
      onClick={onClick}
      layout
      whileHover={{
        borderColor: 'rgba(var(--navy), 0.8)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        y: -4,
      }}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      <MotionCardContent
        className="flex flex-1 items-center justify-center px-6 py-4"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}>
        <div className="flex flex-col items-center space-y-4 text-center">
          <motion.div
            className="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex size-12 items-center justify-center rounded-full transition-colors"
            whileHover={{
              rotate: 90,
              backgroundColor: 'rgba(var(--primary), 0.1)',
              color: 'rgba(var(--primary), 1)',
            }}
            transition={{ duration: 0.2 }}>
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 3,
              }}>
              <Plus className="size-6" />
            </motion.div>
          </motion.div>
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}>
            <CardTitle className="text-lg">Create new organization</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Set up a standard organization for team collaboration and production workloads
            </CardDescription>
          </motion.div>
        </div>
      </MotionCardContent>
    </MotionCard>
  );
};
