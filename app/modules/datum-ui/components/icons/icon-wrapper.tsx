import type { LucideIcon, LucideProps } from 'lucide-react';

type IconProps = LucideProps & {
  icon: LucideIcon;
};

export function Icon({
  icon: IconComponent,
  strokeWidth = 1,
  absoluteStrokeWidth = true,
  size = 16,
  ...props
}: IconProps) {
  return (
    <IconComponent
      {...props}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={absoluteStrokeWidth}
      size={size}
    />
  );
}
