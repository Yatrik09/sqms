export interface GeoArea {
  name: string;
  city: string;
  lat: number;
  lon: number;
  tag?: string;
}

export const POPULAR_AREAS: GeoArea[] = [
  { name: 'Science City', city: 'Ahmedabad', lat: 23.0784, lon: 72.5074, tag: 'West Hub' },
  { name: 'Thaltej', city: 'Ahmedabad', lat: 23.0500, lon: 72.5167, tag: 'Near SG Hwy' },
  { name: 'SG Highway', city: 'Ahmedabad', lat: 23.0380, lon: 72.5120, tag: 'Commercial Belt' },
  { name: 'Bodakdev', city: 'Ahmedabad', lat: 23.0350, lon: 72.5150, tag: 'Prime West' },
  { name: 'Vastrapur', city: 'Ahmedabad', lat: 23.0350, lon: 72.5290, tag: 'Central West' },
  { name: 'Navrangpura', city: 'Ahmedabad', lat: 23.0360, lon: 72.5580, tag: 'University Area' },
  { name: 'Prahlad Nagar', city: 'Ahmedabad', lat: 23.0120, lon: 72.5050, tag: 'South West' },
  { name: 'Bopal', city: 'Ahmedabad', lat: 23.0320, lon: 72.4680, tag: 'Outer West' },
  { name: 'Gota', city: 'Ahmedabad', lat: 23.1020, lon: 72.5350, tag: 'North West' },
  { name: 'Chandkheda', city: 'Ahmedabad', lat: 23.1080, lon: 72.5850, tag: 'North Hub' },
  { name: 'Maninagar', city: 'Ahmedabad', lat: 22.9970, lon: 72.6030, tag: 'South East' },
  { name: 'Nikol', city: 'Ahmedabad', lat: 23.0520, lon: 72.6710, tag: 'East Zone' },
];

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Returns user-friendly badge styling based on distance
 */
export function getDistanceBadge(distKm: number): {
  label: string;
  badgeClass: string;
  isNearby: boolean;
  isFar: boolean;
} {
  if (distKm <= 4.0) {
    return {
      label: 'Nearby (~Immediate)',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30',
      isNearby: true,
      isFar: false,
    };
  }
  if (distKm <= 10.0) {
    return {
      label: 'Moderate (~15-20 min)',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      isNearby: false,
      isFar: false,
    };
  }
  return {
    label: 'Long Distance (~30+ min)',
    badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600/50',
    isNearby: false,
    isFar: true,
  };
}

/**
 * Find closest registered area from GPS coordinates
 */
export function findClosestArea(lat: number, lon: number): GeoArea {
  let closest = POPULAR_AREAS[0];
  let minDistance = Infinity;

  for (const area of POPULAR_AREAS) {
    const dist = calculateDistanceKm(lat, lon, area.lat, area.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = area;
    }
  }

  return closest;
}
