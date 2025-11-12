import { GRID_PREFIX, RESPONSIVE_MAP, RESPONSIVE_ARRAY } from '../constants/grid.constants';
import { RowProps, RowState, RowContextType } from '../types/grid.types';
import { registerMediaQuery, getGutter } from '../utils/responsive';
import { cn } from '@shadcn/lib/utils';
import React, { useEffect, useState } from 'react';

export const RowContext = React.createContext<RowContextType | null>(null);

const Row: React.FC<RowProps> = ({
  type,
  align,
  justify,
  className,
  style,
  children,
  gutter = 0,
  prefixCls = GRID_PREFIX,
  ...rest
}) => {
  const [screens, setScreens] = useState<RowState['screens']>({
    xs: true,
    sm: true,
    md: true,
    lg: true,
    xl: true,
    xxl: true,
  });

  const [unRegisters, setUnRegisters] = useState<Array<() => void>>([]);

  useEffect(() => {
    if (typeof gutter === 'object' && !Array.isArray(gutter)) {
      const newUnRegisters = Object.keys(RESPONSIVE_MAP).map((screen) =>
        registerMediaQuery(RESPONSIVE_MAP[screen as keyof typeof RESPONSIVE_MAP], {
          match: () => {
            setScreens((prevState) => ({
              ...prevState,
              [screen]: true,
            }));
          },
          unmatch: () => {
            setScreens((prevState) => ({
              ...prevState,
              [screen]: false,
            }));
          },
        })
      );
      setUnRegisters(newUnRegisters);
    }

    return () => {
      unRegisters.forEach((unRegister) => unRegister());
    };
  }, [gutter]);

  const gutters = getGutter(gutter, screens);
  const prefix = `${prefixCls}-row`;

  const classes = cn(
    {
      [prefix]: type !== 'flex',
      [`${prefix}-${type}`]: type,
      [`${prefix}-${type}-${justify}`]: type && justify,
      [`${prefix}-${type}-${align}`]: type && align,
    },
    className
  );

  const rowStyle: React.CSSProperties = {
    ...(gutters[0] > 0
      ? {
          marginLeft: gutters[0] / -2,
          marginRight: gutters[0] / -2,
        }
      : {}),
    ...(gutters[1] > 0
      ? {
          marginTop: gutters[1] / -2,
          marginBottom: gutters[1] / -2,
        }
      : {}),
    ...style,
  };

  const contextValue: RowContextType = {
    gutters,
  };

  return (
    <RowContext.Provider value={contextValue}>
      <div {...rest} className={classes} style={rowStyle}>
        {children}
      </div>
    </RowContext.Provider>
  );
};

export default Row;
