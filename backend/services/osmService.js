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
 * Simplifies and contracts degree-2 road geometry chains while preserving
 * critical facilities, source node, and connected egress components.
 * Bounding to maxNodes ensures real-time performance and prevents heap bloat.
 */
function contractAndBoundGraph(nodes, edges, sourceNodeId, maxNodes = 48) {
  if (!nodes || nodes.length <= maxNodes) {
    return { nodes: nodes || [], edges: edges || [] };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.source)?.push(e);
    adj.get(e.target)?.push({ ...e, source: e.target, target: e.source });
  });

  const isEssential = (id) => {
    const n = nodeMap.get(id);
    if (!n) return false;
    if (id === sourceNodeId) return true;
    if (['exit', 'hospital', 'police', 'resource_center'].includes(n.type)) return true;
    const deg = adj.get(id)?.length || 0;
    return deg !== 2;
  };

  const contractedEdges = [];
  const seenPairs = new Set();

  nodes.forEach((startNode) => {
    if (!isEssential(startNode.id)) return;

    const neighbors = adj.get(startNode.id) || [];
    neighbors.forEach((firstEdge) => {
      let prevId = startNode.id;
      let currId = firstEdge.target;
      let totalDistance = firstEdge.distance;
      let totalTravelTime = firstEdge.travelTime;
      let highwayType = firstEdge.highway;
      let roadName = firstEdge.name;
      const visitedInWalk = new Set([prevId, currId]);

      while (!isEssential(currId) && (adj.get(currId)?.length || 0) === 2) {
        const nextEdges = (adj.get(currId) || []).filter((e) => e.target !== prevId);
        if (nextEdges.length === 0) break;
        const nextEdge = nextEdges[0];
        if (visitedInWalk.has(nextEdge.target)) break;
        prevId = currId;
        currId = nextEdge.target;
        totalDistance += nextEdge.distance;
        totalTravelTime += nextEdge.travelTime;
        visitedInWalk.add(currId);
      }

      if (isEssential(currId) && currId !== startNode.id) {
        const pairKey = [startNode.id, currId].sort().join('--');
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          contractedEdges.push({
            id: `osm-corridor-${startNode.id}-${currId}`,
            source: startNode.id,
            target: currId,
            distance: Math.round(totalDistance),
            travelTime: Number(totalTravelTime.toFixed(1)),
            highway: highwayType,
            name: roadName,
            congestion: 0,
            danger: 0,
            blocked: false,
            dataSource: 'OpenStreetMap contracted corridor',
          });
        }
      }
    });
  });

  const essentialNodes = nodes.filter((n) => isEssential(n.id));

  // Build adjacency of contracted graph for BFS connected component retention
  const contractedAdj = new Map();
  essentialNodes.forEach((n) => contractedAdj.set(n.id, []));
  contractedEdges.forEach((e) => {
    contractedAdj.get(e.source)?.push({ target: e.target, edge: e });
    contractedAdj.get(e.target)?.push({ target: e.source, edge: e });
  });

  const src = sourceNodeId || essentialNodes[0]?.id;
  const queue = [src];
  const retainedNodesSet = new Set([src]);
  const retainedEdgesSet = new Set();

  while (queue.length > 0 && retainedNodesSet.size < maxNodes) {
    const current = queue.shift();
    const neighbors = contractedAdj.get(current) || [];
    for (const { target, edge } of neighbors) {
      if (!retainedNodesSet.has(target)) {
        if (retainedNodesSet.size >= maxNodes) break;
        retainedNodesSet.add(target);
        queue.push(target);
      }
      if (retainedNodesSet.has(edge.source) && retainedNodesSet.has(edge.target)) {
        retainedEdgesSet.add(edge.id);
      }
    }
  }

  // Include any remaining edges between retained vertices
  contractedEdges.forEach((e) => {
    if (retainedNodesSet.has(e.source) && retainedNodesSet.has(e.target)) {
      retainedEdgesSet.add(e.id);
    }
  });

  let finalNodes = essentialNodes.filter((n) => retainedNodesSet.has(n.id));
  let finalEdges = contractedEdges.filter((e) => retainedEdgesSet.has(e.id));

  // Ensure at least 3-4 exits are available in the retained component
  const exitsInGraph = finalNodes.filter((n) => n.type === 'exit');
  if (exitsInGraph.length < 2) {
    const candidates = finalNodes
      .filter((n) => n.id !== src && n.type !== 'hospital' && n.type !== 'police')
      .sort((a, b) => (b.distanceFromSource || 0) - (a.distanceFromSource || 0))
      .slice(0, 4);

    const candidateIds = new Set(candidates.map((c) => c.id));
    finalNodes = finalNodes.map((n) => {
      if (candidateIds.has(n.id)) {
        return {
          ...n,
          type: 'exit',
          name: `Evacuation Exit (Boundary Corridor)`,
          capacity: 4000,
        };
      }
      return n;
    });
  }

  return { nodes: finalNodes, edges: finalEdges };
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
  const sourceNodeId = sourceNode?.id || normalizedNodes[0]?.id || null;

  // 7. Topological Road Simplification & Connected Component Bounding
  const simplified = contractAndBoundGraph(normalizedNodes, edgeList, sourceNodeId, 48);

  return {
    nodes: simplified.nodes,
    edges: simplified.edges,
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
    sourceNodeId: sourceNodeId,
    dataSource: 'OpenStreetMap via Overpass API (topologically simplified)',
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
