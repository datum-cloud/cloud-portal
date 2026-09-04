export const MARKER_ELEVATION = 0.02;
export const GLOBE_RADIUS = 0.8;
export const GLOBE_SCALE = 1.08;
export const THETA_MIN = -1.1;
export const THETA_MAX = 1.1;

export type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type UvRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function latLngToVec3(lat: number, lng: number): [number, number, number] {
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latR);
  return [-cosLat * Math.cos(lngR), Math.sin(latR), cosLat * Math.sin(lngR)];
}

export function projectLocation(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  aspect: number
): { x: number; y: number; visible: boolean; front: boolean } {
  const [vx, vy, vz] = latLngToVec3(lat, lng);
  const r = GLOBE_RADIUS + MARKER_ELEVATION;
  const x0 = vx * r;
  const y0 = vy * r;
  const z0 = vz * r;
  const cosT = Math.cos(theta);
  const cosP = Math.cos(phi);
  const sinT = Math.sin(theta);
  const sinP = Math.sin(phi);
  const c = cosP * x0 + sinP * z0;
  const s = sinP * sinT * x0 + cosT * y0 - cosP * sinT * z0;
  const z = -sinP * cosT * x0 + sinT * y0 + cosP * cosT * z0;
  const front = z >= 0;
  return {
    x: ((c / Math.max(aspect, 1e-6)) * GLOBE_SCALE + 1) / 2,
    y: (-s * GLOBE_SCALE + 1) / 2,
    visible: front || c * c + s * s >= 0.64,
    front,
  };
}

export function isMarkerInView(
  projected: { x: number; y: number; front: boolean },
  crop?: UvRect,
  padding = 0.02
): boolean {
  if (!projected.front) return false;
  const { x, y } = projected;
  if (x < padding || x > 1 - padding || y < padding || y > 1 - padding) return false;
  if (!crop) return true;
  return x >= crop.left && x <= crop.right && y >= crop.top && y <= crop.bottom;
}

export function cropUvFromRects(canvas: Rect, clip: Rect): UvRect {
  const width = canvas.right - canvas.left;
  const height = canvas.bottom - canvas.top;
  if (width <= 0 || height <= 0) {
    return { left: 0, right: 1, top: 0, bottom: 1 };
  }

  const left = Math.max(canvas.left, clip.left);
  const right = Math.min(canvas.right, clip.right);
  const top = Math.max(canvas.top, clip.top);
  const bottom = Math.min(canvas.bottom, clip.bottom);

  if (right - left < 8 || bottom - top < 8) {
    return { left: 0, right: 1, top: 0, bottom: 1 };
  }

  return {
    left: (left - canvas.left) / width,
    right: (right - canvas.left) / width,
    top: (top - canvas.top) / height,
    bottom: (bottom - canvas.top) / height,
  };
}

export function globeFocusUv(crop: UvRect, aspect: number): { x: number; y: number } {
  const radiusX = (GLOBE_RADIUS * GLOBE_SCALE) / (2 * Math.max(aspect, 1e-6));
  const radiusY = (GLOBE_RADIUS * GLOBE_SCALE) / 2;
  const left = Math.max(crop.left, 0.5 - radiusX);
  const right = Math.min(crop.right, 0.5 + radiusX);
  const top = Math.max(crop.top, 0.5 - radiusY);
  const bottom = Math.min(crop.bottom, 0.5 + radiusY);
  if (right <= left || bottom <= top) return { x: 0.5, y: 0.5 };
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
  };
}

function clampTheta(theta: number): number {
  return Math.min(THETA_MAX, Math.max(THETA_MIN, theta));
}

function wrapAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

export function focusPhi(
  lat: number,
  lng: number,
  aspect: number,
  targetX: number,
  theta: number,
  targetY = 0.5
): number {
  const [vx, , vz] = latLngToVec3(lat, lng);
  const r = GLOBE_RADIUS + MARKER_ELEVATION;
  const x0 = vx * r;
  const z0 = vz * r;
  const xz = Math.hypot(x0, z0);
  if (xz < 1e-6) return 0;

  const cTarget = ((2 * targetX - 1) * Math.max(aspect, 1e-6)) / GLOBE_SCALE;
  const ratio = Math.max(-1, Math.min(1, cTarget / xz));
  const alpha = Math.atan2(z0, x0);
  const delta = Math.acos(ratio);
  const candidates = [alpha + delta, alpha - delta];

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const phi of candidates) {
    const projected = projectLocation(lat, lng, phi, theta, aspect);
    const score =
      Math.abs(projected.x - targetX) +
      Math.abs(projected.y - targetY) +
      (projected.front ? 0 : 6) +
      (projected.visible ? 0 : 10);
    if (score < bestScore) {
      bestScore = score;
      best = phi;
    }
  }
  return wrapAngle(best);
}

export function focusAngles(
  lat: number,
  lng: number,
  aspect: number,
  targetX: number,
  targetY = 0.5
): { phi: number; theta: number } {
  // Keep north mostly up: pitch is the location's latitude. Extra pitch to nail
  // an exact Y puts high-latitude cities on their side and other cities miss.
  const theta = clampTheta(Math.asin(Math.max(-1, Math.min(1, latLngToVec3(lat, lng)[1]))));
  const phi = focusPhi(lat, lng, aspect, targetX, theta, targetY);
  return { phi, theta };
}
