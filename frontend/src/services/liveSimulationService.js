const DEFAULT_API_BASE = 'http://localhost:5000';
const DEFAULT_GEOCODING_URL = 'https://nominatim.openstreetmap.org/reverse';

const BASE_SPEED_KMH = {
  motorway: 90,
  trunk: 70,
  primary: 50,
  secondary: 40,
  tertiary: 35,
  residential: 25,
  living_street: 10,
  service: 15,
};

function getDistanceMeters(a, b) {
  const earthRadius = 6371000;
  const latDelta = ((b.lat - a.lat) * Math.PI) / 180;
  const lonDelta = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.sin(lonDelta / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function projectPoint(point, bounds) {
  const width = Math.max(bounds.maxLon - bounds.minLon, 0.00001);
  const height = Math.max(bounds.maxLat - bounds.minLat, 0.00001);
  return {
    x: 60 + ((point.lon - bounds.minLon) / width) * 680,
    y: 600 - ((point.lat - bounds.minLat) / height) * 520,
  };
}

function getFacilityType(tags = {}) {
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'hospital';
  if (tags.amenity === 'fire_station' || tags.amenity === 'police') return 'resource_center';
  if (['shelter', 'refuge', 'assembly_point'].includes(tags.amenity)) return 'exit';
  return null;
}

function getFacilityName(tags = {}) {
  return tags.name || tags['official_name'] || (tags.amenity ? `${tags.amenity.replace('_', ' ').toUpperCase()} Facility` : 'Emergency Facility');
}

function nearestRoadNode(point, roadNodes) {
  return roadNodes.reduce((closest, node) => {
    if (!closest) return node;
    return getDistanceMeters(point, node) < getDistanceMeters(point, closest) ? node : closest;
  }, null);
}

function normalizeNodes(roadNodes, facilities, sourcePoint, radiusMeters) {
  const bounds = roadNodes.reduce(
    (result, node) => ({
      minLat: Math.min(result.minLat, node.lat),
      maxLat: Math.max(result.maxLat, node.lat),
      minLon: Math.min(result.minLon, node.lon),
      maxLon: Math.max(result.maxLon, node.lon),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity }
  );

  const facilityByRoadId = new Map();
  facilities.forEach((facility) => {
    const roadNode = nearestRoadNode(facility, roadNodes);
    if (!roadNode || getDistanceMeters(facility, roadNode) > Math.max(100, radiusMeters * 0.15)) return;
    const type = getFacilityType(facility.tags);
    if (type && !facilityByRoadId.has(roadNode.id)) {
      facilityByRoadId.set(roadNode.id, {
        type,
        facilityKind: facility.tags.amenity || facility.tags.healthcare || 'emergency facility',
        name: getFacilityName(facility.tags, facility.id),
        source: 'OpenStreetMap mapped facility',
      });
    }
  });

  return roadNodes.map((node) => {
    const facility = facilityByRoadId.get(node.id);
    const projected = projectPoint(node, bounds);
    const distanceFromSource = getDistanceMeters(sourcePoint, node);
    return {
      id: node.id,
      name: facility?.name || (node.degree > 2 ? 'Arterial Road Intersection' : 'Urban Road Waypoint'),
      type: facility?.type || (node.degree > 2 ? 'junction' : 'building'),
      facilityKind: facility?.facilityKind || null,
      people: 0,
      capacity: facility?.type === 'exit' ? 0 : 0,
      riskLevel: 'NONE',
      priority: facility?.type ? 3 : 1,
      x: projected.x,
      y: projected.y,
      lat: node.lat,
      lon: node.lon,
      distanceFromSource: Math.round(distanceFromSource),
      degree: node.degree,
      dataSource: facility?.source || 'OpenStreetMap road geometry',
      populationDataAvailable: false,
      dangerDataAvailable: false,
      congestionDataAvailable: false,
    };
  });
}

function addNetworkBoundaryExits(nodes, sourcePoint, radiusMeters) {
  const exitNodes = nodes.filter((node) => node.type === 'exit');
  if (exitNodes.length > 0) return nodes;

  const candidates = [...nodes]
    .filter((node) => getDistanceMeters(sourcePoint, node) >= radiusMeters * 0.65)
    .sort((a, b) => b.distanceFromSource - a.distanceFromSource)
    .slice(0, 4);

  return nodes.map((node) => {
    if (!candidates.some((candidate) => candidate.id === node.id)) return node;
    return {
      ...node,
      type: 'exit',
      name: 'Evacuation Exit (Perimeter Corridor)',
      capacity: 4000,
      dataSource: 'OpenStreetMap-derived network boundary corridor',
    };
  });
}

function buildGraph(elements, sourcePoint, radiusMeters) {
  const nodeElements = elements.filter((element) => element.type === 'node' && element.lat && element.lon);
  const wayElements = elements.filter((element) => element.type === 'way' && Array.isArray(element.nodes));
  const nodeMap = new Map(nodeElements.map((node) => [`osm-${node.id}`, node]));
  const degreeMap = new Map();
  const edgeMap = new Map();
  const roadNodeIds = new Set();

  wayElements.forEach((way) => {
    if (!way.tags?.highway) return;
    for (let index = 0; index < way.nodes.length - 1; index += 1) {
      const sourceId = `osm-${way.nodes[index]}`;
      const targetId = `osm-${way.nodes[index + 1]}`;
      const source = nodeMap.get(sourceId);
      const target = nodeMap.get(targetId);
      if (!source || !target || sourceId === targetId) continue;
      roadNodeIds.add(sourceId);
      roadNodeIds.add(targetId);
      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);

      const edgeId = `OSM-${way.id}-${index}`;
      if (edgeMap.has(edgeId)) continue;
      const distance = getDistanceMeters(source, target);
      const speedKmh = BASE_SPEED_KMH[way.tags.highway] || 30;
      const travelTime = Math.max(1, (distance / 1000 / speedKmh) * 3600);
      edgeMap.set(edgeId, {
        id: edgeId,
        source: sourceId,
        target: targetId,
        distance: Math.round(distance),
        travelTime: Number(travelTime.toFixed(2)),
        highway: way.tags.highway,
        name: way.tags.name || way.tags.ref || 'Unnamed OSM road',
        congestion: 0,
        danger: 0,
        blocked: false,
        dataSource: 'OpenStreetMap road geometry; baseline travel time only',
        trafficDataAvailable: false,
        dangerDataAvailable: false,
      });
    }
  });

  const roadNodes = [...roadNodeIds].map((id) => {
    const source = nodeMap.get(id);
    return {
      id,
      lat: source.lat,
      lon: source.lon,
      degree: degreeMap.get(id) || 0,
    };
  });
  const facilities = elements
    .filter((element) => (element.type === 'node' || element.type === 'way') && getFacilityType(element.tags))
    .map((element) => {
      if (element.type === 'node') return { ...element, lat: element.lat, lon: element.lon };
      const coordinates = element.nodes.map((id) => nodeMap.get(`osm-${id}`)).filter(Boolean);
      if (!coordinates.length) return null;
      return {
        ...element,
        lat: coordinates.reduce((sum, node) => sum + node.lat, 0) / coordinates.length,
        lon: coordinates.reduce((sum, node) => sum + node.lon, 0) / coordinates.length,
      };
    })
    .filter(Boolean);

  const normalizedNodes = addNetworkBoundaryExits(
    normalizeNodes(roadNodes, facilities, sourcePoint, radiusMeters),
    sourcePoint,
    radiusMeters
  );
  const sourceNode = nearestRoadNode(sourcePoint, normalizedNodes);
  const sourceProjection = sourceNode || { x: 400, y: 340 };

  return {
    nodes: normalizedNodes,
    edges: [...edgeMap.values()],
    userLocation: { ...sourcePoint, x: sourceProjection.x, y: sourceProjection.y },
    sourceNodeId: sourceNode?.id || normalizedNodes[0]?.id || null,
    dataSource: 'OpenStreetMap via Overpass API',
    dataFreshness: new Date().toISOString(),
    trafficDataAvailable: false,
    populationDataAvailable: false,
    dangerDataAvailable: false,
    baselineTravelTimeNote: 'Travel time uses road-class baseline speed; no live traffic data was used.',
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 30000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Live data request failed (${response.status})`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

export function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not provide geolocation.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
          speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
          accuracy: position.coords.accuracy || null,
          timestamp: position.timestamp || Date.now(),
        }),
      (error) => {
        const messages = {
          1: 'Location permission was denied. Allow location access to use Live Simulation.',
          2: 'Your current location could not be determined.',
          3: 'Location request timed out. Try again.',
        };
        reject(new Error(messages[error.code] || 'Unable to read your current location.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export async function reverseGeocodeLocation({ lat, lon }) {
  const url = new URL(import.meta.env.VITE_GEOCODING_URL || DEFAULT_GEOCODING_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lon);
  url.searchParams.set('zoom', '18');
  const data = await fetchJson(url.toString(), { headers: { Accept: 'application/json' } });
  return {
    displayName: data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    address: data.address || {},
  };
}

export async function loadLiveRoadGraph({ lat, lon, radiusMeters = 750 }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Valid GPS coordinates are required to query OpenStreetMap.');
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutMs = 28000;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiBase}/api/osm/live-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        lat,
        lon,
        radiusMeters: Math.round(radiusMeters || 750),
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const reason = data?.reason || data?.error || `OpenStreetMap provider responded with HTTP ${response.status}`;
      throw new Error(reason);
    }

    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      throw new Error('OpenStreetMap returned no connected roads in this radius. Try increasing the search radius.');
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError' || err.message?.toLowerCase().includes('aborted')) {
      throw new Error('OpenStreetMap live query timed out after 28 seconds. Upstream Overpass mirrors may be congested; please retry.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getLiveDataConfiguration() {
  return {
    trafficConfigured: Boolean(import.meta.env.VITE_TRAFFIC_API_URL),
    trafficMessage: import.meta.env.VITE_TRAFFIC_API_URL
      ? 'Traffic provider configured but not queried by this adapter.'
      : 'No traffic API configured. Congestion remains 0 and is never inferred.',
  };
}
