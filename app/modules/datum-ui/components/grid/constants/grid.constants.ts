export const GRID_BREAKPOINTS = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

export const GRID_COLUMNS = 24;

export const GRID_PREFIX = 'grid';

export const RESPONSIVE_ARRAY = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'] as const;

export const RESPONSIVE_MAP = {
  xs: '(max-width: 575px)',
  sm: '(min-width: 576px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 992px)',
  xl: '(min-width: 1200px)',
  xxl: '(min-width: 1600px)',
} as const;

export type Breakpoint = keyof typeof GRID_BREAKPOINTS;
export type ResponsiveArray = typeof RESPONSIVE_ARRAY;
