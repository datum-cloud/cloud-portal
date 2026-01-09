import * as React from 'react';

interface DarkModeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

export const DarkModeIcon = React.forwardRef<SVGSVGElement, DarkModeIconProps>(
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
        <mask
          id="mask0_5319_86174"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="1"
          width="14"
          height="10">
          <path
            d="M11.667 1.75H2.33366C1.68933 1.75 1.16699 2.27233 1.16699 2.91667V8.75C1.16699 9.39433 1.68933 9.91667 2.33366 9.91667H11.667C12.3113 9.91667 12.8337 9.39433 12.8337 8.75V2.91667C12.8337 2.27233 12.3113 1.75 11.667 1.75Z"
            fill="white"
            stroke={color}
          />
        </mask>
        <g mask="url(#mask0_5319_86174)">
          <line
            x1="-4.35355"
            y1="4.54586"
            x2="5.54594"
            y2="-5.35363"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="-2.93949"
            y1="5.95992"
            x2="6.96"
            y2="-3.93957"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="-1.52543"
            y1="7.37447"
            x2="8.37407"
            y2="-2.52502"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="-0.111366"
            y1="8.78854"
            x2="9.78813"
            y2="-1.11096"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="1.30367"
            y1="10.2026"
            x2="11.2032"
            y2="0.303104"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="2.71774"
            y1="11.6171"
            x2="12.6172"
            y2="1.71765"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="4.1318"
            y1="13.0312"
            x2="14.0313"
            y2="3.13172"
            stroke={color}
            strokeDasharray="1 1"
          />
          <line
            x1="5.54586"
            y1="14.4453"
            x2="15.4454"
            y2="4.54578"
            stroke={color}
            strokeDasharray="1 1"
          />
        </g>
        <path d="M11.667 1.75H2.33366C1.68933 1.75 1.16699 2.27233 1.16699 2.91667V8.75C1.16699 9.39433 1.68933 9.91667 2.33366 9.91667H11.667C12.3113 9.91667 12.8337 9.39433 12.8337 8.75V2.91667C12.8337 2.27233 12.3113 1.75 11.667 1.75Z" />
        <path d="M4.66699 12.25H9.33366" />
        <path d="M7 9.9165V12.2498" />
      </svg>
    );
  }
);

DarkModeIcon.displayName = 'DarkModeIcon';
