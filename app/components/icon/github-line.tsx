import * as React from 'react';

interface GitHubLineIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

export const GitHubLineIcon = React.forwardRef<SVGSVGElement, GitHubLineIconProps>(
  (
    {
      size = 16,
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
        viewBox="0 0 16 16"
        fill="none"
        stroke={color}
        strokeWidth={computedStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}>
        <path d="M9.99726 14.6668V12.0002C10.09 11.165 9.85054 10.3269 9.33059 9.66683C11.3306 9.66683 13.3306 8.3335 13.3306 6.00016C13.3839 5.16683 13.1506 4.34683 12.6639 3.66683C12.8506 2.90016 12.8506 2.10016 12.6639 1.3335C12.6639 1.3335 11.9973 1.3335 10.6639 2.3335C8.90392 2.00016 7.09059 2.00016 5.33059 2.3335C3.99726 1.3335 3.33059 1.3335 3.33059 1.3335C3.13059 2.10016 3.13059 2.90016 3.33059 3.66683C2.84517 4.34408 2.60957 5.16869 2.66392 6.00016C2.66392 8.3335 4.66392 9.66683 6.66392 9.66683C6.40392 9.9935 6.21059 10.3668 6.09726 10.7668C5.98392 11.1668 5.95059 11.5868 5.99726 12.0002V14.6668" />
        <path d="M5.99797 11.9998C2.9913 13.3332 2.66463 10.6665 1.3313 10.6665" />
      </svg>
    );
  }
);

GitHubLineIcon.displayName = 'GitHubLineIcon';
