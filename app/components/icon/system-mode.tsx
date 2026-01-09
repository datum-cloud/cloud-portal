import * as React from 'react';

interface SystemModeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

export const SystemModeIcon = React.forwardRef<SVGSVGElement, SystemModeIconProps>(
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
        <path d="M5 6.76097L5.48781 6.55908" />
        <path d="M5.48781 5.34597L5 5.14355" />
        <path d="M6.34597 4.48781L6.14355 4" />
        <path d="M6.34597 7.41797L6.14355 7.9063" />
        <path d="M7.55957 4.48781L7.76199 4" />
        <path d="M7.76146 7.9063L7.55957 7.41797" />
        <path d="M8.41797 5.34597L8.9063 5.14355" />
        <path d="M8.41797 6.55908L8.9063 6.7615" />
        <path d="M6.95269 7.53819C7.82834 7.53819 8.53819 6.82834 8.53819 5.95269C8.53819 5.07704 7.82834 4.36719 6.95269 4.36719C6.07704 4.36719 5.36719 5.07704 5.36719 5.95269C5.36719 6.82834 6.07704 7.53819 6.95269 7.53819Z" />
        <path d="M4.66699 12.25H9.33366" />
        <path d="M7 9.9165V12.2498" />
      </svg>
    );
  }
);

SystemModeIcon.displayName = 'SystemModeIcon';
