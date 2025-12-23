import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleXIcon } from 'lucide-react';

const noteCardVariants = cva(
  'bg-card-warning text-card-warning-foreground relative overflow-hidden border-none shadow-none',
  {
    variants: {
      size: {
        default: 'gap-2.5 py-6',
        sm: 'gap-2 py-3.5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const noteCardHeaderVariants = cva('', {
  variants: {
    size: {
      default: 'px-8',
      sm: 'px-5.5',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const noteCardContentVariants = cva('', {
  variants: {
    size: {
      default: 'px-8',
      sm: 'px-5.5',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

interface NoteCardProps extends VariantProps<typeof noteCardVariants> {
  title?: string;
  description: string | React.ReactNode;
  icon?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
}

export const NoteCard = ({ title, description, icon, closable, onClose, size }: NoteCardProps) => {
  return (
    <Card className={noteCardVariants({ size })}>
      {title && (
        <CardHeader className={noteCardHeaderVariants({ size })}>
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            {icon}
            {title}
            {closable && onClose && (
              <IconWrapper
                icon={CircleXIcon}
                className="fill-secondary/20 hover:fill-secondary stroke-card-warning absolute top-4 right-4 size-6 cursor-pointer text-transparent transition-all"
                onClick={onClose}
              />
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={noteCardContentVariants({ size })}>
        {description}

        <div className="bg-card-warning-foreground/10 absolute top-0 left-0 h-full w-[4px]"></div>
      </CardContent>
    </Card>
  );
};
