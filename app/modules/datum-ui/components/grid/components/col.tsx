import { GRID_PREFIX, RESPONSIVE_ARRAY } from '../constants/grid.constants';
import { ColProps, ColSize } from '../types/grid.types';
import { RowContext } from './row';
import { cn } from '@shadcn/lib/utils';
import React, { useContext } from 'react';

const Col: React.FC<ColProps> = ({
  span,
  order,
  offset,
  push,
  pull,
  className,
  prefixCls = GRID_PREFIX,
  style,
  children,
  ...rest
}) => {
  const context = useContext(RowContext);
  const prefix = `${prefixCls}-col`;

  let sizeClassObj: Record<string, boolean> = {};

  // Handle responsive props
  RESPONSIVE_ARRAY.forEach((size) => {
    let sizeProps: ColSize = {};
    const sizeValue = rest[size as keyof typeof rest];

    if (typeof sizeValue === 'number') {
      sizeProps.span = sizeValue;
    } else if (typeof sizeValue === 'object') {
      sizeProps = sizeValue || {};
    }

    delete rest[size as keyof typeof rest];

    sizeClassObj = {
      ...sizeClassObj,
      [`${prefix}-${size}-${sizeProps.span}`]: sizeProps.span !== undefined,
      [`${prefix}-${size}-order-${sizeProps.order}`]: sizeProps.order !== undefined,
      [`${prefix}-${size}-offset-${sizeProps.offset}`]: sizeProps.offset !== undefined,
      [`${prefix}-${size}-push-${sizeProps.push}`]: sizeProps.push !== undefined,
      [`${prefix}-${size}-pull-${sizeProps.pull}`]: sizeProps.pull !== undefined,
    };
  });

  const classes = cn(
    prefix,
    {
      [`${prefix}-${span}`]: span !== undefined,
      [`${prefix}-order-${order}`]: order !== undefined,
      [`${prefix}-offset-${offset}`]: offset !== undefined,
      [`${prefix}-push-${push}`]: push !== undefined,
      [`${prefix}-pull-${pull}`]: pull !== undefined,
      ...sizeClassObj,
    },
    className
  );

  let colStyle: React.CSSProperties = { ...style };

  // Apply gutters from context
  if (context && context.gutters) {
    const [horizontalGutter, verticalGutter] = context.gutters;

    if (horizontalGutter > 0) {
      colStyle.paddingLeft = horizontalGutter / 2;
      colStyle.paddingRight = horizontalGutter / 2;
    }

    if (verticalGutter > 0) {
      colStyle.paddingTop = verticalGutter / 2;
      colStyle.paddingBottom = verticalGutter / 2;
    }
  }

  return (
    <div {...rest} style={colStyle} className={classes}>
      {children}
    </div>
  );
};

export default Col;
