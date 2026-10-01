/**
 * DURGA - Backend OpenStreetMap (OSM) Service
 * Real-world geographic road network and emergency facility extraction via Overpass API.
 * 
 * Features:
 * - Multi-mirror redundancy with automatic retry on timeout or failure
 * - AbortController timeout of 20 seconds per attempt
 * - Deterministic graph construction with road-class speeds & travel times
 * - Sanitized human-readable naming (strictly no raw OSM node IDs in UI names)
 * - Extraction of hospitals, police stations, fire stations, and shelters
 * - Dynamic network boundary exits when explicit shelters are absent
 * - Zero hardcoded locations (always queries live GPS coordinates)
 */

const DEFAULT_MIRRORS = [
  process.env.OVERPASS_API_URL,
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
].filter(Boolean);

const BASE_SPEED_KMH = {
  motorway: 90,
  trunk: 70,
  primary: 50,
  secondary: 40,
  tertiary: 35,
  unclassified: 30,
  residential: 25,
  living_street: 15,
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
    x: Math.round(60 + ((point.lon - bounds.minLon) / width) * 680),
    y: Math.round(600 - ((point.lat - bounds.minLat) / height) * 520),
  };
}

function getFacilityType(tags = {}) {
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital' || tags.amenity === 'clinic') {
    return 'hospital';
  }
  if (tags.amenity === 'fire_station') {
    return 'resource_center';
  }
  if (tags.amenity === 'police') {
    return 'police';
  }
  if (
    ['shelter', 'refuge', 'assembly_point'].includes(tags.amenity) ||
    tags.emergency === 'assembly_point'
  ) {
    return 'exit';
  }
  return null;
}

function getFacilityHumanName(tags = {}, type) {
  if (tags.name && typeof tags.name === 'string' && tags.name.trim()) {
    return tags.name.trim();
  }
  if (tags.official_name && typeof tags.official_name === 'string') {
    return tags.official_name.trim();
  }
  if (type === 'hospital') return 'Emergency Trauma Hospital';
  if (type === 'police') return 'Police & Rescue Station';
  if (type === 'resource_center') return 'Fire & Rescue Staging Area';
  if (type === 'exit') return 'Civilian Evacuation Shelter';
  return 'Emergency Facility';
}

function nearestRoadNode(point, roadNodes) {
  return roadNodes.reduce((closest, node) => {
    if (!closest) return node;
    return getDistanceMeters(point, node) < getDistanceMeters(point, closest) ? node : closest;
  }, null);
}

function isMeaningfulName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (/^(OSM|node\/|way\/|relation\/)/i.test(trimmed)) return false;
  if (/^(Unnamed|unnamed road|unnamed path)/i.test(trimmed)) return false;
  if (/^[A-Z]{1,3}\d{1,3}$/.test(trimmed)) return false;
  return true;
}

/**
 * Builds normalized graph from Overpass elements.
 * Generates natural human-readable names without exposing raw node IDs.
 */
function buildNormalizedGraph(elements, sourcePoint, radiusMeters) {
  const nodeElements = elements.filter((el) => el.type === 'node' && el.lat && el.lon);
  const wayElements = elements.filter((el) => el.type === 'way' && Array.isArray(el.nodes));
  const nodeMap = new Map(nodeElements.map((node) => [`osm-${node.id}`, node]));
  const degreeMap = new Map();
  const roadNamesByNode = new Map();
  const edgeList = [];
  const roadNodeIds = new Set();
  const seenEdgePairs = new Set();

  // 1. Process Ways into Edges
  wayElements.forEach((way) => {
    if (!way.tags?.highway) return;
    const roadName = isMeaningfulName(way.tags.name)
      ? way.tags.name.trim()
      : isMeaningfulName(way.tags.ref)
      ? way.tags.ref.trim()
      : null;

    for (let i = 0; i < way.nodes.length - 1; i++) {
      const sourceId = `osm-${way.nodes[i]}`;
      const targetId = `osm-${way.nodes[i + 1]}`;
      const source = nodeMap.get(sourceId);
      const target = nodeMap.get(targetId);
      if (!source || !target || sourceId === targetId) continue;

      roadNodeIds.add(sourceId);
      roadNodeIds.add(targetId);
      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);

      if (roadName) {
        if (!roadNamesByNode.has(sourceId)) roadNamesByNode.set(sourceId, new Set());
        if (!roadNamesByNode.has(targetId)) roadNamesByNode.set(targetId, new Set());
        roadNamesByNode.get(sourceId).add(roadName);
        roadNamesByNode.get(targetId).add(roadName);
      }

      const pairKey = [sourceId, targetId].sort().join('--');
      if (seenEdgePairs.has(pairKey)) continue;
      seenEdgePairs.add(pairKey);

      const distance = Math.round(getDistanceMeters(source, target));
      const speedKmh = BASE_SPEED_KMH[way.tags.highway] || 30;
      const travelTime = Number(Math.max(1, (distance / 1000 / speedKmh) * 3600).toFixed(1));

      edgeList.push({
        id: `osm-edge-${way.id}-${i}`,
        source: sourceId,
        target: targetId,
        distance,
        travelTime,
        highway: way.tags.highway,
        name: roadName || 'Connecting Urban Corridor',
        congestion: 0,
        danger: 0,
        blocked: false,
        dataSource: 'OpenStreetMap road geometry',
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

  if (roadNodes.length === 0) {
    throw new Error('No navigable roads found within this radius on OpenStreetMap. Try a larger radius.');
  }

  // 2. Process Facilities
  const facilities = elements
    .filter((el) => (el.type === 'node' || el.type === 'way') && getFacilityType(el.tags))
    .map((el) => {
      let lat = el.lat;
      let lon = el.lon;
      if (el.type === 'way') {
        const coords = el.nodes.map((id) => nodeMap.get(`osm-${id}`)).filter(Boolean);
        if (!coords.length) return null;
        lat = coords.reduce((sum, n) => sum + n.lat, 0) / coords.length;
        lon = coords.reduce((sum, n) => sum + n.lon, 0) / coords.length;
      }
      const type = getFacilityType(el.tags);
      return {
        id: `facility-${el.id}`,
        lat,
        lon,
        type,
        facilityKind: el.tags.amenity || el.tags.healthcare || 'emergency facility',
        name: getFacilityHumanName(el.tags, type),
        capacity: type === 'hospital' ? 800 : type === 'exit' ? 4000 : 0,
      };
    })
    .filter(Boolean);

  // 3. Map Facilities to nearest road node
  const bounds = roadNodes.reduce(
    (acc, node) => ({
      minLat: Math.min(acc.minLat, node.lat),
      maxLat: Math.max(acc.maxLat, node.lat),
      minLon: Math.min(acc.minLon, node.lon),
      maxLon: Math.max(acc.maxLon, node.lon),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity }
  );

  const facilityByRoadId = new Map();
  facilities.forEach((facility) => {
    const roadNode = nearestRoadNode(facility, roadNodes);
    if (!roadNode || getDistanceMeters(facility, roadNode) > Math.max(120, radiusMeters * 0.25)) return;
    if (!facilityByRoadId.has(roadNode.id)) {
      facilityByRoadId.set(roadNode.id, facility);
    }
  });

  // 4. Build normalized nodes with strictly human-readable names
  let normalizedNodes = roadNodes.map((node) => {
    const facility = facilityByRoadId.get(node.id);
    const projected = projectPoint(node, bounds);
    const distFromSource = Math.round(getDistanceMeters(sourcePoint, node));
    const roadNames = Array.from(roadNamesByNode.get(node.id) || []);

    let nodeName = '';
    let nodeType = 'building';

    if (facility) {
      nodeName = facility.name;
      nodeType = facility.type;
    } else if (node.degree > 2) {
      nodeType = 'junction';
      if (roadNames.length >= 2) {
        nodeName = `Junction of ${roadNames.slice(0, 2).join(' & ')}`;
      } else if (roadNames.length === 1) {
        nodeName = `Intersection on ${roadNames[0]}`;
      } else {
        nodeName = 'Arterial Road Intersection';
      }
    } else {
      nodeType = 'building';
      if (roadNames.length >= 1) {
        nodeName = `Corridor on ${roadNames[0]}`;
      } else {
        nodeName = 'Urban Corridor Waypoint';
      }
    }

    return {
      id: node.id,
      name: nodeName,
      type: nodeType,
      facilityKind: facility?.facilityKind || null,
      people: 0,
      capacity: facility?.capacity || 0,
      riskLevel: 'NONE',
      priority: facility ? 3 : 1,
      x: projected.x,
      y: projected.y,
      lat: node.lat,
      lon: node.lon,
      distanceFromSource: distFromSource,
      degree: node.degree,
      dataSource: facility ? 'OpenStreetMap verified facility' : 'OpenStreetMap road geometry',
    };
  });

  // 5. Ensure at least 3-4 Exits exist (Dynamic Network Boundary Exits)
  const existingExits = normalizedNodes.filter((n) => n.type === 'exit');
  if (existingExits.length < 2) {
    const boundaryCandidates = [...normalizedNodes]
      .filter((n) => n.type !== 'hospital' && n.type !== 'resource_center' && n.type !== 'police')
      .sort((a, b) => b.distanceFromSource - a.distanceFromSource)
      .slice(0, 4);

    const boundaryIds = new Set(boundaryCandidates.map((c) => c.id));
    normalizedNodes = normalizedNodes.map((node) => {
      if (!boundaryIds.has(node.id)) return node;
      const roadNames = Array.from(roadNamesByNode.get(node.id) || []);
      const roadLabel = roadNames.length > 0 ? roadNames[0] : 'Perimeter Gateway';
      return {
        ...node,
        type: 'exit',
        name: `Evacuation Exit (${roadLabel})`,
        capacity: 4000,
        dataSource: 'OpenStreetMap network boundary egress corridor',
      };
    });
  }

  // 6. Identify Source Node (closest road node to user's live GPS)
  const sourceNode = nearestRoadNode(sourcePoint, normalizedNodes);

  return {
    nodes: normalizedNodes,
    edges: edgeList,
    facilities: facilities.map((f) => ({
      name: f.name,
      type: f.type,
      facilityKind: f.facilityKind,
      lat: f.lat,
      lon: f.lon,
    })),
    userLocation: {
      lat: sourcePoint.lat,
      lon: sourcePoint.lon,
      x: sourceNode?.x || 400,
      y: sourceNode?.y || 340,
    },
    sourceNodeId: sourceNode?.id || normalizedNodes[0]?.id || null,
    dataSource: 'OpenStreetMap via Overpass API',
    dataFreshness: new Date().toISOString(),
    radiusMeters,
    trafficDataAvailable: false,
    dangerDataAvailable: false,
  };
}

/**
 * Fetch Overpass data with automatic retry on a different mirror.
 */
async function fetchOverpassWithRetry(query, timeoutMs = 20000) {
  let lastError = null;

  for (let index = 0; index < DEFAULT_MIRRORS.length; index++) {
    const mirror = DEFAULT_MIRRORS[index];
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'DURGA-Emergency-Rescue-Architecture/2.0 (contact@durga-rescue.local)',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Mirror returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) {
        throw new Error('Invalid JSON received from Overpass mirror.');
      }

      return data;
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted');
      const reason = isTimeout
        ? `Request timed out after ${Math.round(timeoutMs / 1000)}s`
        : err.message || 'Connection failed';
      console.warn(`[OSM Service] Mirror ${mirror} failed (${reason}). Trying next mirror...`);
      lastError = new Error(`Overpass (${mirror}): ${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('All configured OpenStreetMap Overpass mirrors failed or timed out.');
}

/**
 * Main export: Retrieves and normalizes OpenStreetMap live road & facility graph.
 */
export async function getLiveOsmGraph({ lat, lon, radiusMeters = 750 }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Valid GPS latitude and longitude are required.');
  }

  const boundedRadius = Math.max(300, Math.min(3000, Math.round(radiusMeters)));

  // Overpass QL query: highways + emergency facilities
  const query = `[out:json][timeout:25];(way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service"](around:${boundedRadius},${lat},${lon});nwr["amenity"~"hospital|police|fire_station|shelter|refuge|assembly_point"](around:${boundedRadius},${lat},${lon});nwr["healthcare"="hospital"](around:${boundedRadius},${lat},${lon}););out body;>;out skel qt;`;

  const rawData = await fetchOverpassWithRetry(query, 20000);
  const graph = buildNormalizedGraph(rawData.elements || [], { lat, lon }, boundedRadius);

  return graph;
}
