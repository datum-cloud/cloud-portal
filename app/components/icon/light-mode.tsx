import * as React from 'react';

interface LightModeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

export const LightModeIcon = React.forwardRef<SVGSVGElement, LightModeIconProps>(
  (
    {
      size = 14,
      strokeWidth = 1,
      absoluteStrokeWidth = false,
      className,
      color = 'currentColor',
      ...props
    },
    ref
  ) => {
    const computedStrokeWidth = absoluteStrokeWidth
      ? (Number(strokeWidth) * 24) / Number(size)
      : strokeWidth;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        stroke={color}
        strokeWidth={computedStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}>
        <path d="M11.667 1.75H2.33366C1.68933 1.75 1.16699 2.27233 1.16699 2.91667V8.75C1.16699 9.39433 1.68933 9.91667 2.33366 9.91667H11.667C12.3113 9.91667 12.8337 9.39433 12.8337 8.75V2.91667C12.8337 2.27233 12.3113 1.75 11.667 1.75Z" />
        <path d="M4.66699 12.25H9.33366" />
        <path d="M7 9.9165V12.2498" />
      </svg>
    );
  }
);

LightModeIcon.displayName = 'LightModeIcon';
