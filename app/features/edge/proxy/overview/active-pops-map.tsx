import {
  Map,
  MapFullscreenControl,
  MapMarker,
  MapTileLayer,
  MapTooltip,
  MapZoomControl,
} from '@shadcn/ui/map';

interface RegionWithCoords {
  value: string;
  label: string;
  coords: [number, number];
}

const GreenPulseDot = () => (
  <div className="relative flex size-6 items-center justify-center">
    <span className="size-2.5 rounded-full shadow-[0_0_0_3px_rgba(34,197,94,0.4)]" />
    <span className="absolute size-2.5 animate-pulse rounded-full bg-green-500" />
  </div>
);

export const ActivePopsMap = ({ regionsWithCoords }: { regionsWithCoords: RegionWithCoords[] }) => {
  return (
    <div className="h-64 min-h-64 w-full overflow-hidden rounded-lg border">
      <Map center={[20, 0]} zoom={2} minZoom={2} maxZoom={10} className="h-full w-full">
        <MapTileLayer />
        <MapZoomControl />
        <MapFullscreenControl />
        {regionsWithCoords.map(({ value, label, coords }) => (
          <MapMarker key={value} position={coords} icon={<GreenPulseDot />} iconAnchor={[12, 12]}>
            <MapTooltip permanent={false}>{label}</MapTooltip>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
};
