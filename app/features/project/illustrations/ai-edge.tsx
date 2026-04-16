import { ClientOnly, useTheme } from '@datum-cloud/datum-ui/theme';
import * as React from 'react';

type Theme = 'light' | 'dark';
type IllustrationVariant = 'default' | 'completed';

interface IllustrationColors {
  connector: string;
  containerFill: string;
  containerFillOpacity: number;
  containerStroke: string;
  containerStrokeOpacity: number;
  iconStroke: string;
  logoFill: string;
}

const baseColors: Record<Theme, IllustrationColors> = {
  light: {
    connector: '#4D6356',
    containerFill: 'white',
    containerFillOpacity: 0.4,
    containerStroke: '#D7E2AE',
    containerStrokeOpacity: 1,
    iconStroke: '#4D6356',
    logoFill: '#0C1D31',
  },
  dark: {
    connector: '#E6F59F',
    containerFill: 'white',
    containerFillOpacity: 0.1,
    containerStroke: 'white',
    containerStrokeOpacity: 0.1,
    iconStroke: 'white',
    logoFill: '#E6F59F',
  },
};

const variantOverrides: Record<IllustrationVariant, Record<Theme, Partial<IllustrationColors>>> = {
  default: { light: {}, dark: {} },
  completed: {
    light: { containerStroke: '#a46969', containerStrokeOpacity: 1 },
    dark: { containerStroke: '#e6f59e', containerStrokeOpacity: 0.6 },
  },
};

const resolveColors = (theme: Theme, variant: IllustrationVariant): IllustrationColors => ({
  ...baseColors[theme],
  ...variantOverrides[variant][theme],
});

const AIEdgeIllustrationSVG = ({
  theme,
  variant = 'default',
  ...props
}: React.SVGProps<SVGSVGElement> & { theme: Theme; variant?: IllustrationVariant }) => {
  const c = resolveColors(theme, variant);

  return (
    <svg
      width={234}
      height={60}
      viewBox="0 0 234 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      {/* Connector dots */}
      <path
        d="M64.875 30.75C64.875 32.4069 63.5319 33.75 61.875 33.75C61.875 33.75 61.8831 32.4069 61.8831 30.75C61.8831 29.0931 61.875 27.75 61.875 27.75C63.5319 27.75 64.875 29.0931 64.875 30.75Z"
        fill={c.connector}
      />
      <path
        d="M84.8745 30.75C84.8745 29.0931 86.2177 27.75 87.8745 27.75C87.8745 27.75 87.8664 29.0931 87.8664 30.75C87.8664 32.4069 87.8745 33.75 87.8745 33.75C86.2177 33.75 84.8745 32.4069 84.8745 30.75Z"
        fill={c.connector}
      />
      <path
        d="M149.875 30.75C149.875 32.4069 148.532 33.75 146.875 33.75C146.875 33.75 146.884 32.4069 146.884 30.75C146.884 29.0931 146.875 27.75 146.875 27.75C148.532 27.75 149.875 29.0931 149.875 30.75Z"
        fill={c.connector}
      />
      <path
        d="M168.875 30.75C168.875 29.0931 170.218 27.75 171.875 27.75C171.875 27.75 171.866 29.0931 171.866 30.75C171.866 32.4069 171.875 33.75 171.875 33.75C170.218 33.75 168.875 32.4069 168.875 30.75Z"
        fill={c.connector}
      />

      {/* Dashed lines */}
      <line
        x1={64.375}
        y1={31.25}
        x2={85.375}
        y2={31.25}
        stroke={c.connector}
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
      <line
        x1={148.375}
        y1={31.25}
        x2={169.375}
        y2={31.25}
        stroke={c.connector}
        strokeLinecap="round"
        strokeDasharray="2 2"
      />

      {/* Left pill (calendar icon) */}
      <rect
        x={29.875}
        y={19.75}
        width={32}
        height={22}
        rx={11}
        fill={c.containerFill}
        fillOpacity={c.containerFillOpacity}
      />
      <rect
        x={30.375}
        y={20.25}
        width={31}
        height={21}
        rx={10.5}
        stroke={c.containerStroke}
        strokeOpacity={c.containerStrokeOpacity}
      />
      <g opacity={0.8}>
        <path
          d="M44.5416 25.417V28.0837M39.2083 28.0837H52.5416M41.8749 25.417V28.0837M40.5416 25.417H51.2083C51.9446 25.417 52.5416 26.0139 52.5416 26.7503V34.7503C52.5416 35.4867 51.9446 36.0837 51.2083 36.0837H40.5416C39.8052 36.0837 39.2083 35.4867 39.2083 34.7503V26.7503C39.2083 26.0139 39.8052 25.417 40.5416 25.417Z"
          stroke={c.iconStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Center circle (Datum logo) */}
      <rect
        x={87}
        width={60}
        height={60}
        rx={30}
        fill={c.containerFill}
        fillOpacity={c.containerFillOpacity}
      />
      <rect
        x={87.5}
        y={0.5}
        width={59}
        height={59}
        rx={29.5}
        stroke={c.containerStroke}
        strokeOpacity={c.containerStrokeOpacity}
      />
      <path
        d="M113.479 16C113.077 16 112.75 16.3256 112.75 16.7272C112.75 17.1289 112.75 23.8332 112.75 23.8332C112.75 24.2338 113.076 24.5424 113.479 24.5424L116.937 24.5604C118.366 24.5604 119.727 25.1172 120.77 26.1269C121.819 27.1438 122.404 28.4863 122.421 29.9089C122.437 31.3665 121.88 32.7388 120.854 33.7742C119.828 34.8096 118.459 35.3796 116.999 35.3796H116.937C115.511 35.3632 114.166 34.7787 113.147 33.7321C112.135 32.6926 111.561 31.3336 111.561 29.9079V26.4165C111.561 26.0159 111.251 25.7288 110.848 25.7288H103.729C103.327 25.7288 103 26.0149 103 26.4165V33.5225C103 33.9231 103.326 34.2712 103.729 34.2712H109.348C110.104 34.2712 110.591 34.26 110.992 34.3145C111.526 34.3864 111.883 34.5384 112.153 34.8065C112.422 35.0746 112.574 35.432 112.646 35.9641C112.7 36.3657 112.75 36.8505 112.75 37.6055V43.2118C112.75 43.6124 113.037 44 113.439 44H117C118.599 44 120.169 43.671 121.666 43.143C127.249 41.1739 131 35.8799 131 29.9695C131 24.0592 127.249 18.7651 121.666 16.7961C120.169 16.2681 118.599 16 117 16H113.48H113.479Z"
        fill={c.logoFill}
      />

      {/* Right pill (people icon) */}
      <rect
        x={170.875}
        y={19.75}
        width={32}
        height={22}
        rx={11}
        fill={c.containerFill}
        fillOpacity={c.containerFillOpacity}
      />
      <rect
        x={171.375}
        y={20.25}
        width={31}
        height={21}
        rx={10.5}
        stroke={c.containerStroke}
        strokeOpacity={c.containerStrokeOpacity}
      />
      <g opacity={0.8}>
        <path
          d="M190.875 36.75C190.875 35.3355 190.313 33.979 189.313 32.9788C188.313 31.9786 186.956 31.4167 185.542 31.4167M185.542 31.4167C184.127 31.4167 182.771 31.9786 181.77 32.9788C180.77 33.979 180.208 35.3355 180.208 36.75M185.542 31.4167C187.383 31.4167 188.875 29.9243 188.875 28.0833C188.875 26.2424 187.383 24.75 185.542 24.75C183.701 24.75 182.208 26.2424 182.208 28.0833C182.208 29.9243 183.701 31.4167 185.542 31.4167ZM193.542 36.0833C193.542 33.8367 192.208 31.75 190.875 30.75C191.313 30.4212 191.664 29.9894 191.895 29.4928C192.127 28.9963 192.233 28.4503 192.203 27.9032C192.173 27.3561 192.009 26.8247 191.725 26.3561C191.441 25.8875 191.046 25.4962 190.575 25.2167"
          stroke={c.iconStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const AIEdgeIllustration = ({
  variant = 'default',
  ...props
}: React.SVGProps<SVGSVGElement> & { variant?: IllustrationVariant }) => {
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as Theme) ?? 'light';

  return (
    <ClientOnly fallback={<AIEdgeIllustrationSVG theme="light" variant={variant} {...props} />}>
      <AIEdgeIllustrationSVG theme={theme} variant={variant} {...props} />
    </ClientOnly>
  );
};
