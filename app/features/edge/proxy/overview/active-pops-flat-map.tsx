import { geoMercator } from 'd3-geo';
import { useMemo, useState } from 'react';

interface RegionWithCoords {
  value: string;
  label: string;
  coords: [number, number]; // [lat, lng]
}

interface Props {
  regionsWithCoords: RegionWithCoords[];
  hoveredRegion?: string | null;
}

const SVG_WIDTH = 1038;
const SVG_HEIGHT = 591;

const METRO_BY_CODE: Record<string, string> = {
  'ae-north-1': 'Dubai',
  'au-east-1': 'Sydney',
  'br-east-1': 'São Paulo',
  'ca-east-1': 'Toronto',
  'cl-central-1': 'Chile',
  'de-central-1': 'Frankfurt',
  'gb-south-1': 'London',
  'in-west-1': 'Mumbai',
  'jp-east-1': 'Tokyo',
  'nl-west-1': 'Amsterdam',
  'sg-central-1': 'Singapore',
  'us-central-1': 'Dallas',
  'us-east-1': 'Ashburn',
  'us-east-2': 'New York City',
  // Staging region
  'us-east4': 'Staging',
  'us-west-1': 'San Jose, CA',
  'za-central-1': 'Johannesburg',
};

const projection = geoMercator().fitExtent(
  [
    [0, 0],
    [SVG_WIDTH, SVG_HEIGHT],
  ],
  {
    type: 'Feature',
    geometry: {
      type: 'MultiPoint',
      coordinates: [
        [-180, -60],
        [180, 75],
      ],
    },
    properties: null,
  }
);

export function ActivePopsFlatMap({ regionsWithCoords, hoveredRegion }: Props) {
  const [tooltip, setTooltip] = useState<{ value: string; x: number; y: number } | null>(null);

  const markers = useMemo(() => {
    return regionsWithCoords
      .map(({ value, coords }) => {
        const projected = projection([coords[1], coords[0]]);
        if (!projected) return null;
        return { value, x: projected[0], y: projected[1] };
      })
      .filter((m): m is { value: string; x: number; y: number } => m !== null);
  }, [regionsWithCoords]);

  const tooltipLeft = tooltip ? (tooltip.x / SVG_WIDTH) * 100 : 0;
  const tooltipTop = tooltip ? (tooltip.y / SVG_HEIGHT) * 100 : 0;
  const flipX = tooltipLeft > 70;
  const flipY = tooltipTop > 70;

  return (
    <div className="bg-background relative aspect-2/1 w-full overflow-hidden rounded-lg border">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none">
        <image
          href="/images/world-map-dots.svg"
          x={0}
          y={0}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
        />
        {markers.map(({ value, x, y }) => {
          const isHovered = value === hoveredRegion || value === tooltip?.value;
          const outerR = isHovered ? 10 : 8;
          const innerR = isHovered ? 4.5 : 3.5;
          const pingR = isHovered ? 18 : 14;
          return (
            <g
              key={value}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ value, x, y })}
              onMouseLeave={() => setTooltip(null)}>
              {/* Animated ring pulse */}
              <circle
                cx={x}
                cy={y}
                r={pingR}
                className="animate-ping"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  fill: 'none',
                  stroke: '#B3D56F',
                  strokeWidth: 2,
                  opacity: 0.5,
                }}
              />
              {/* Lime-green body */}
              <circle cx={x} cy={y} r={outerR} style={{ fill: '#B3D56F' }} />
              {/* Dark center dot */}
              <circle cx={x} cy={y} r={innerR} style={{ fill: '#4D6356' }} />
              {/* Invisible hit area */}
              <circle cx={x} cy={y} r={16} fill="transparent" />
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-10 flex flex-col gap-1 rounded-lg border px-3 py-2 shadow"
          style={{
            left: `${tooltipLeft}%`,
            top: `${tooltipTop}%`,
            transform: `translate(${flipX ? 'calc(-100% - 10px)' : '10px'}, ${flipY ? 'calc(-100% - 10px)' : '10px'})`,
          }}>
          <p className="text-xs font-medium">{METRO_BY_CODE[tooltip.value] ?? tooltip.value}</p>
          <p className="text-muted-foreground text-xs">{tooltip.value}</p>
        </div>
      )}
    </div>
  );
}
