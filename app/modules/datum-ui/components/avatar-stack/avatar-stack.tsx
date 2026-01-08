import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@shadcn/ui/avatar';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const avatarStackVariants = cva('flex', {
  variants: {
    orientation: {
      vertical: 'flex-row',
      horizontal: 'flex-col',
    },
    spacing: {
      sm: '-space-x-5 -space-y-5',
      md: '-space-x-4 -space-y-4',
      lg: '-space-x-3 -space-y-3',
      xl: '-space-x-2 -space-y-2',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
    spacing: 'md',
  },
});

export interface AvatarStackProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarStackVariants> {
  avatars: { name: string; image: string }[];
  maxAvatarsAmount?: number;
  avatarClassName?: string;
}

const AvatarStack = ({
  className,
  orientation,
  avatars,
  spacing,
  maxAvatarsAmount = 3,
  avatarClassName,
  ...props
}: AvatarStackProps) => {
  const shownAvatars = avatars.slice(0, maxAvatarsAmount);
  const hiddenAvatars = avatars.slice(maxAvatarsAmount);

  return (
    <div
      className={cn(
        avatarStackVariants({ orientation, spacing }),
        className,
        orientation === 'horizontal' ? '-space-x-0' : '-space-y-0'
      )}
      {...props}>
      {shownAvatars.map(({ name, image }, index) => (
        <Tooltip key={`${image}-${index + 1}`} message={name} delayDuration={300}>
          <Avatar className={cn(avatarStackVariants(), 'hover:z-10', avatarClassName)}>
            <AvatarImage src={image} />
            <AvatarFallback>
              {name
                ?.split(' ')
                ?.map((word) => word[0])
                ?.join('')
                ?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Tooltip>
      ))}

      {hiddenAvatars.length ? (
        <Tooltip
          message={
            <>
              {hiddenAvatars.map(({ name }, index) => (
                <p key={`${name}-${index + 1}`}>{name}</p>
              ))}
            </>
          }
          delayDuration={300}>
          <Avatar key="Excesive avatars" className={cn(avatarClassName)}>
            <AvatarFallback>+{avatars.length - shownAvatars.length}</AvatarFallback>
          </Avatar>
        </Tooltip>
      ) : null}
    </div>
  );
};

export { AvatarStack, avatarStackVariants };
