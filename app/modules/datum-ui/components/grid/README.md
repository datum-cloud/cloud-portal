# Grid System

A comprehensive 24-column grid system inspired by Semi Design, built with React and Tailwind CSS.

## Features

- **24-column grid system** with responsive breakpoints
- **Flex layout support** with alignment options
- **Responsive gutters** with dynamic spacing
- **Offset, push, pull, and order utilities**
- **TypeScript support** with full type definitions
- **Tailwind CSS integration** for consistent styling

## Installation

The grid system is included in your project. Import it directly:

```tsx
import { Row, Col } from '@/modules/grid';
```

## Basic Usage

### Simple Grid

```tsx
import { Row, Col } from '@/modules/grid';

function MyComponent() {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <div>Left Column</div>
      </Col>
      <Col span={12}>
        <div>Right Column</div>
      </Col>
    </Row>
  );
}
```

### Responsive Grid

```tsx
<Row gutter={{ xs: 8, sm: 16, md: 24 }}>
  <Col xs={24} sm={12} md={8} lg={6}>
    <div>Responsive Column</div>
  </Col>
</Row>
```

### Flex Layout

```tsx
<Row type="flex" justify="center" align="middle">
  <Col span={6}>
    <div>Centered Content</div>
  </Col>
</Row>
```

## API Reference

### Row Props

| Prop        | Type                                                                | Default | Description                      |
| ----------- | ------------------------------------------------------------------- | ------- | -------------------------------- |
| `type`      | `'flex'`                                                            | -       | Layout type                      |
| `align`     | `'top' \| 'middle' \| 'bottom'`                                     | -       | Vertical alignment (flex only)   |
| `justify`   | `'start' \| 'end' \| 'center' \| 'space-around' \| 'space-between'` | -       | Horizontal alignment (flex only) |
| `gutter`    | `number \| [number, number] \| object`                              | `0`     | Grid spacing                     |
| `className` | `string`                                                            | -       | Additional CSS classes           |
| `style`     | `CSSProperties`                                                     | -       | Inline styles                    |
| `children`  | `ReactNode`                                                         | -       | Row content                      |

### Col Props

| Prop     | Type                | Default | Description                   |
| -------- | ------------------- | ------- | ----------------------------- |
| `span`   | `number`            | -       | Column span (1-24)            |
| `offset` | `number`            | -       | Column offset                 |
| `push`   | `number`            | -       | Column push                   |
| `pull`   | `number`            | -       | Column pull                   |
| `order`  | `number`            | -       | Column order (flex only)      |
| `xs`     | `number \| ColSize` | -       | Extra small screen span       |
| `sm`     | `number \| ColSize` | -       | Small screen span             |
| `md`     | `number \| ColSize` | -       | Medium screen span            |
| `lg`     | `number \| ColSize` | -       | Large screen span             |
| `xl`     | `number \| ColSize` | -       | Extra large screen span       |
| `xxl`    | `number \| ColSize` | -       | Extra extra large screen span |

### Breakpoints

| Breakpoint | Min Width | Description               |
| ---------- | --------- | ------------------------- |
| `xs`       | 480px     | Extra small devices       |
| `sm`       | 576px     | Small devices             |
| `md`       | 768px     | Medium devices            |
| `lg`       | 992px     | Large devices             |
| `xl`       | 1200px    | Extra large devices       |
| `xxl`      | 1600px    | Extra extra large devices |

## Examples

### Basic Grid Layout

```tsx
<Row gutter={16}>
  <Col span={8}>
    <div>Column 1</div>
  </Col>
  <Col span={8}>
    <div>Column 2</div>
  </Col>
  <Col span={8}>
    <div>Column 3</div>
  </Col>
</Row>
```

### Responsive Layout

```tsx
<Row gutter={{ xs: 8, sm: 16, md: 24 }}>
  <Col xs={24} sm={12} md={8} lg={6}>
    <div>Full width on mobile, half on tablet, etc.</div>
  </Col>
</Row>
```

### Flex Layout with Alignment

```tsx
<Row type="flex" justify="space-between" align="middle">
  <Col span={6}>
    <div>Left aligned</div>
  </Col>
  <Col span={6}>
    <div>Right aligned</div>
  </Col>
</Row>
```

### Offset and Order

```tsx
<Row type="flex" gutter={16}>
  <Col span={6} offset={6}>
    <div>Offset by 6 columns</div>
  </Col>
  <Col span={6} order={1}>
    <div>Appears first in flex order</div>
  </Col>
</Row>
```

### Complex Responsive Object

```tsx
<Col
  xs={{ span: 24, offset: 0 }}
  sm={{ span: 12, offset: 6 }}
  md={{ span: 8, offset: 8 }}
  lg={{ span: 6, offset: 9 }}>
  <div>Complex responsive behavior</div>
</Col>
```

## Gutter System

### Horizontal Gutter

```tsx
<Row gutter={16}>
  <Col span={12}>Column 1</Col>
  <Col span={12}>Column 2</Col>
</Row>
```

### Vertical Gutter

```tsx
<Row gutter={[16, 24]}>
  <Col span={12}>Column 1</Col>
  <Col span={12}>Column 2</Col>
</Row>
```

### Responsive Gutter

```tsx
<Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
  <Col span={12}>Column 1</Col>
  <Col span={12}>Column 2</Col>
</Row>
```

## CSS Classes

The grid system generates the following CSS classes:

- `.grid-row` - Base row container
- `.grid-row-flex` - Flex row container
- `.grid-col` - Base column
- `.grid-col-{1-24}` - Column spans
- `.grid-col-{breakpoint}-{1-24}` - Responsive column spans
- `.grid-col-offset-{1-24}` - Column offsets
- `.grid-col-push-{1-24}` - Column push
- `.grid-col-pull-{1-24}` - Column pull
- `.grid-col-order-{1-24}` - Column order

## TypeScript Support

Full TypeScript support is included with proper type definitions:

```tsx
import { Row, Col, RowProps, ColProps } from '@/modules/grid';

interface MyComponentProps {
  layout: RowProps;
  columns: ColProps[];
}
```

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Fallback to float-based layout for older browsers
- Responsive design with media queries
