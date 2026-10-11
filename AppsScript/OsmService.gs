/**
 * DURGA: Dynamic Urban Rescue & Guidance Architecture
 * Server-Side OpenStreetMap (OSM) Live Provider via Overpass API
 * 
 * Uses Google Apps Script UrlFetchApp with multi-mirror failover and
 * strict human-readable label sanitization (strictly no raw OSM node IDs in UI).
 */

const OVERPASS_MIRRORS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OSM_SPEEDS = {
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

function getOsmFacilityType(tags = {}) {
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital' || tags.amenity === 'clinic') return 'hospital';
  if (tags.amenity === 'fire_station') return 'resource_center';
  if (tags.amenity === 'police') return 'police';
  if (['shelter', 'refuge', 'assembly_point'].includes(tags.amenity) || tags.emergency === 'assembly_point') return 'exit';
  return null;
}

function getOsmFacilityHumanName(tags = {}, type) {
  if (tags.name && typeof tags.name === 'string' && tags.name.trim()) return tags.name.trim();
  if (tags.official_name && typeof tags.official_name === 'string') return tags.official_name.trim();
  if (type === 'hospital') return 'Emergency Trauma Hospital';
  if (type === 'police') return 'Police & Rescue Station';
  if (type === 'resource_center') return 'Fire & Rescue Staging Area';
  if (type === 'exit') return 'Civilian Evacuation Shelter';
  return 'Emergency Facility';
}

function isCleanRoadName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (/^(OSM|node\/|way\/|relation\/)/i.test(trimmed)) return false;
  if (/^(Unnamed|unnamed road|unnamed path)/i.test(trimmed)) return false;
  if (/^[A-Z]{1,3}\d{1,3}$/.test(trimmed)) return false;
  return true;
}

/**
 * Fetches real OpenStreetMap roads and facilities around live GPS coordinates.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {number} radiusMeters Query radius in meters
 * @returns {Object} Normalized graph topology
 */
function fetchOverpassLiveGraph(lat, lon, radiusMeters = 750) {
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    throw new Error('Valid GPS latitude and longitude are required.');
  }

  const boundedRadius = Math.max(300, Math.min(3000, Math.round(radiusMeters)));
  const query = `[out:json][timeout:25];(way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service"](around:${boundedRadius},${lat},${lon});nwr["amenity"~"hospital|police|fire_station|shelter|refuge|assembly_point"](around:${boundedRadius},${lat},${lon});nwr["healthcare"="hospital"](around:${boundedRadius},${lat},${lon}););out body;>;out skel qt;`;

  const props = PropertiesService.getScriptProperties();
  const customMirror = props.getProperty('OVERPASS_API_URL');
  const mirrors = customMirror ? [customMirror, ...OVERPASS_MIRRORS] : OVERPASS_MIRRORS;

  let rawData = null;
  let lastError = null;

  for (let i = 0; i < mirrors.length; i++) {
    const mirror = mirrors[i];
    try {
      const response = UrlFetchApp.fetch(mirror, {
        method: 'post',
        payload: { data: query },
        headers: {
          'User-Agent': 'DURGA-Emergency-Rescue-Architecture/2.0 (contact@durga-rescue.local)',
          'Accept': 'application/json',
        },
        muteHttpExceptions: true,
      });

      if (response.getResponseCode() === 200) {
        const text = response.getContentText();
        const json = JSON.parse(text);
        if (json && Array.isArray(json.elements) && json.elements.length > 0) {
          rawData = json;
          break;
        }
      } else {
        lastError = new Error(`Mirror ${mirror} returned HTTP ${response.getResponseCode()}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawData || !rawData.elements) {
    throw new Error('All OpenStreetMap Overpass mirrors failed or timed out: ' + (lastError ? lastError.message : 'Unknown error'));
  }

  return normalizeOverpassElements(rawData.elements, { lat: Number(lat), lon: Number(lon) }, boundedRadius);
}

/**
 * Transforms raw Overpass elements into normalized graph with sanitized human names.
 */
function normalizeOverpassElements(elements, sourcePoint, radiusMeters) {
  const nodeElements = elements.filter((el) => el.type === 'node' && el.lat && el.lon);
  const wayElements = elements.filter((el) => el.type === 'way' && Array.isArray(el.nodes));
  const nodeMap = new Map(nodeElements.map((node) => [`osm-${node.id}`, node]));
  const degreeMap = new Map();
  const roadNamesByNode = new Map();
  const edgeList = [];
  const roadNodeIds = new Set();
  const seenEdgePairs = new Set();

  wayElements.forEach((way) => {
    if (!way.tags || !way.tags.highway) return;
    const roadName = isCleanRoadName(way.tags.name)
      ? way.tags.name.trim()
      : isCleanRoadName(way.tags.ref)
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

      const distance = Math.round(calcDistanceMeters(source.lat, source.lon, target.lat, target.lon));
      const speedKmh = OSM_SPEEDS[way.tags.highway] || 30;
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

  const roadNodes = Array.from(roadNodeIds).map((id) => {
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

  // Process Facilities
  const facilities = elements
    .filter((el) => (el.type === 'node' || el.type === 'way') && getOsmFacilityType(el.tags))
    .map((el) => {
      let fLat = el.lat;
      let fLon = el.lon;
      if (el.type === 'way') {
        const coords = el.nodes.map((id) => nodeMap.get(`osm-${id}`)).filter(Boolean);
        if (!coords.length) return null;
        fLat = coords.reduce((sum, n) => sum + n.lat, 0) / coords.length;
        fLon = coords.reduce((sum, n) => sum + n.lon, 0) / coords.length;
      }
      const type = getOsmFacilityType(el.tags);
      return {
        id: `facility-${el.id}`,
        lat: fLat,
        lon: fLon,
        type,
        facilityKind: el.tags.amenity || el.tags.healthcare || 'emergency facility',
        name: getOsmFacilityHumanName(el.tags, type),
        capacity: type === 'hospital' ? 800 : type === 'exit' ? 4000 : 0,
      };
    })
    .filter(Boolean);

  // Bounds for 2D visual projection
  const bounds = roadNodes.reduce(
    (acc, node) => ({
      minLat: Math.min(acc.minLat, node.lat),
      maxLat: Math.max(acc.maxLat, node.lat),
      minLon: Math.min(acc.minLon, node.lon),
      maxLon: Math.max(acc.maxLon, node.lon),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity }
  );

  // Map facilities to nearest road node
  const facilityByRoadId = new Map();
  facilities.forEach((facility) => {
    let closestNode = null;
    let minD = Infinity;
    roadNodes.forEach((rn) => {
      const d = calcDistanceMeters(facility.lat, facility.lon, rn.lat, rn.lon);
      if (d < minD) {
        minD = d;
        closestNode = rn;
      }
    });

    if (closestNode && minD <= Math.max(120, radiusMeters * 0.25)) {
      if (!facilityByRoadId.has(closestNode.id)) {
        facilityByRoadId.set(closestNode.id, facility);
      }
    }
  });

  // Build normalized nodes with natural human-readable names
  let normalizedNodes = roadNodes.map((node) => {
    const facility = facilityByRoadId.get(node.id);
    const projected = projectPoint(node, bounds);
    const distFromSource = Math.round(calcDistanceMeters(sourcePoint.lat, sourcePoint.lon, node.lat, node.lon));
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
      facilityKind: facility ? facility.facilityKind : null,
      people: 0,
      capacity: facility ? facility.capacity : 0,
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

  // Ensure at least 3-4 exits exist (Dynamic network boundary egress corridors)
  const existingExits = normalizedNodes.filter((n) => n.type === 'exit');
  if (existingExits.length < 2) {
    const candidates = [...normalizedNodes]
      .filter((n) => n.type !== 'hospital' && n.type !== 'resource_center' && n.type !== 'police')
      .sort((a, b) => b.distanceFromSource - a.distanceFromSource)
      .slice(0, 4);

    const candidateIds = new Set(candidates.map((c) => c.id));
    normalizedNodes = normalizedNodes.map((node) => {
      if (!candidateIds.has(node.id)) return node;
      const roadNames = Array.from(roadNamesByNode.get(node.id) || []);
      const label = roadNames.length > 0 ? roadNames[0] : 'Perimeter Gateway';
      return {
        ...node,
        type: 'exit',
        name: `Evacuation Exit (${label})`,
        capacity: 4000,
        dataSource: 'OpenStreetMap network boundary egress corridor',
      };
    });
  }

  // Find source road node closest to GPS
  let sourceNode = null;
  let minSourceDist = Infinity;
  normalizedNodes.forEach((node) => {
    if (node.distanceFromSource < minSourceDist) {
      minSourceDist = node.distanceFromSource;
      sourceNode = node;
    }
  });

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
      x: sourceNode ? sourceNode.x : 400,
      y: sourceNode ? sourceNode.y : 340,
    },
    sourceNodeId: sourceNode ? sourceNode.id : normalizedNodes[0].id,
    dataSource: 'OpenStreetMap via Overpass API',
    dataFreshness: new Date().toISOString(),
    radiusMeters,
    trafficDataAvailable: false,
    dangerDataAvailable: false,
  };
}
