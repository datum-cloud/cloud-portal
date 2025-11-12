import { Breakpoint } from '../constants/grid.constants';

export type Gutter = number | Partial<Record<Breakpoint, number>>;

export interface ColSize {
  span?: number;
  order?: number;
  offset?: number;
  push?: number;
  pull?: number;
}

export interface RowProps {
  type?: 'flex';
  align?: 'top' | 'middle' | 'bottom';
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  gutter?: Gutter | [Gutter, Gutter];
  prefixCls?: string;
}

export interface ColProps {
  span?: number;
  order?: number;
  offset?: number;
  push?: number;
  pull?: number;
  className?: string;
  prefixCls?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  xs?: number | ColSize;
  sm?: number | ColSize;
  md?: number | ColSize;
  lg?: number | ColSize;
  xl?: number | ColSize;
  xxl?: number | ColSize;
}

export interface RowContextType {
  gutters?: [number, number];
}

export interface RowState {
  screens: Partial<Record<Breakpoint, boolean>>;
}
