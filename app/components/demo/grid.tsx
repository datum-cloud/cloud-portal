import { Row, Col } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';

export const gridDemoSections = [
  { id: 'basic-usage', label: 'Basic Usage' },
  { id: 'responsive', label: 'Responsive' },
  { id: 'flex-layout', label: 'Flex Layout' },
  { id: 'offset', label: 'Offset' },
  { id: 'order', label: 'Order' },
  { id: 'push-pull', label: 'Push/Pull' },
  { id: 'vertical-gutter', label: 'Vertical Gutter' },
];

export default function GridDemo() {
  return (
    <div className="space-y-8 p-6">
      {/* Basic Usage */}
      <Card id="basic-usage">
        <CardHeader>
          <CardTitle>Basic Usage</CardTitle>
          <CardDescription>Basic grid layout with different column spans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row gutter={16}>
            <Col span={24}>
              <div className="border bg-blue-100 p-4 text-center">col-24</div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div className="border bg-blue-100 p-4 text-center">col-12</div>
            </Col>
            <Col span={12}>
              <div className="border bg-blue-100 p-4 text-center">col-12</div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <div className="border bg-blue-100 p-4 text-center">col-8</div>
            </Col>
            <Col span={8}>
              <div className="border bg-blue-100 p-4 text-center">col-8</div>
            </Col>
            <Col span={8}>
              <div className="border bg-blue-100 p-4 text-center">col-8</div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* Responsive */}
      <Card id="responsive">
        <CardHeader>
          <CardTitle>Responsive</CardTitle>
          <CardDescription>Responsive grid that adapts to different screen sizes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row gutter={{ xs: 8, sm: 16, md: 24 }}>
            <Col xs={24} sm={12} md={8} lg={6} xl={4}>
              <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={4}>
              <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={4}>
              <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={4}>
              <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* Flex Layout */}
      <Card id="flex-layout">
        <CardHeader>
          <CardTitle>Flex Layout</CardTitle>
          <CardDescription>Flex-based layouts with justify and align options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row type="flex" justify="center" align="middle" className="h-20 bg-gray-100">
            <Col span={6}>
              <div className="border bg-purple-100 p-4 text-center">Centered</div>
            </Col>
            <Col span={6}>
              <div className="border bg-purple-100 p-4 text-center">Centered</div>
            </Col>
          </Row>
          <Row type="flex" justify="space-between" className="h-20 bg-gray-100">
            <Col span={6}>
              <div className="border bg-purple-100 p-4 text-center">Space Between</div>
            </Col>
            <Col span={6}>
              <div className="border bg-purple-100 p-4 text-center">Space Between</div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* Offset */}
      <Card id="offset">
        <CardHeader>
          <CardTitle>Offset</CardTitle>
          <CardDescription>Offset columns to create spacing before them</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row gutter={16}>
            <Col span={8} offset={8}>
              <div className="border bg-yellow-100 p-4 text-center">col-8 offset-8</div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6} offset={6}>
              <div className="border bg-yellow-100 p-4 text-center">col-6 offset-6</div>
            </Col>
            <Col span={6} offset={6}>
              <div className="border bg-yellow-100 p-4 text-center">col-6 offset-6</div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* Order */}
      <Card id="order">
        <CardHeader>
          <CardTitle>Order</CardTitle>
          <CardDescription>Change the visual order of columns using flex order</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row type="flex" gutter={16}>
            <Col span={6} order={4}>
              <div className="border bg-red-100 p-4 text-center">Order 4</div>
            </Col>
            <Col span={6} order={3}>
              <div className="border bg-red-100 p-4 text-center">Order 3</div>
            </Col>
            <Col span={6} order={2}>
              <div className="border bg-red-100 p-4 text-center">Order 2</div>
            </Col>
            <Col span={6} order={1}>
              <div className="border bg-red-100 p-4 text-center">Order 1</div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* Push/Pull */}
      <Card id="push-pull">
        <CardHeader>
          <CardTitle>Push/Pull</CardTitle>
          <CardDescription>Push and pull columns to reorder them in the layout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row gutter={16}>
            <Col span={8} push={16}>
              <div className="border bg-orange-100 p-4 text-center">col-8 push-16</div>
            </Col>
            <Col span={16} pull={8}>
              <div className="border bg-orange-100 p-4 text-center">col-16 pull-8</div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* Vertical Gutter */}
      <Card id="vertical-gutter">
        <CardHeader>
          <CardTitle>Vertical Gutter</CardTitle>
          <CardDescription>Grid with both horizontal and vertical gutters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row gutter={[16, 24]}>
            <Col span={12}>
              <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
            </Col>
            <Col span={12}>
              <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
            </Col>
            <Col span={12}>
              <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
            </Col>
            <Col span={12}>
              <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
            </Col>
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}
