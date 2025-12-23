import type { LucideIcon, LucideProps } from 'lucide-react';

type IconProps = LucideProps & {
  icon: LucideIcon;
};

export function IconWrapper({
  icon: Icon,
  strokeWidth = 1,
  absoluteStrokeWidth = true,
  size = 16,
  ...props
}: IconProps) {
  return (
    <Icon
      {...props}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={absoluteStrokeWidth}
      size={size}
    />
  );
}
