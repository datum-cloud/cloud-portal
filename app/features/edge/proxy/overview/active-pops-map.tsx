import { StatusPulseDot } from '@/components/status-pulse-dot';
import { Map, MapMarker, MapTileLayer, MapTooltip, MapZoomControl } from '@shadcn/ui/map';
import type { LatLngExpression } from 'leaflet';

interface RegionWithCoords {
  value: string;
  label: string;
  coords: LatLngExpression;
}

export const ActivePopsMap = ({ regionsWithCoords }: { regionsWithCoords: RegionWithCoords[] }) => {
  return (
    <div className="h-64 min-h-64 w-full overflow-hidden rounded-lg border">
      <Map center={[20, 0]} zoom={2} minZoom={2} maxZoom={10} className="h-full w-full">
        <MapTileLayer />
        <MapZoomControl />
        {regionsWithCoords.map(({ value, label, coords }) => (
          <MapMarker
            key={value}
            position={coords}
            icon={<StatusPulseDot variant="active" />}
            iconAnchor={[12, 12]}>
            <MapTooltip permanent={false}>{label}</MapTooltip>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
};
