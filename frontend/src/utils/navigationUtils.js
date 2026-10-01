const EARTH_RADIUS_METERS = 6371000;

export function distanceBetween(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const latDelta = ((b.lat - a.lat) * Math.PI) / 180;
  const lonDelta = ((b.lon - a.lon) * Math.PI) / 180;
  const value = Math.sin(latDelta / 2) ** 2 + Math.sin(lonDelta / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function bearingBetween(a, b) {
  if (!a || !b) return 0;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const lonDelta = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(lonDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function bearingDelta(b1, b2) {
  return ((b2 - b1 + 540) % 360) - 180;
}

export function getHeadingCompass(degrees) {
  if (!Number.isFinite(degrees)) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return directions[index];
}

export function roundDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  if (meters <= 20) return Math.max(5, Math.round(meters / 5) * 5);
  if (meters <= 100) return Math.round(meters / 10) * 10;
  if (meters <= 400) return Math.round(meters / 20) * 20;
  if (meters <= 1000) return Math.round(meters / 50) * 50;
  return Math.round(meters / 100) * 100;
}

function distanceToSegment(point, start, end) {
  const latitudeScale = 111320;
  const longitudeScale = 111320 * Math.cos((point.lat * Math.PI) / 180);
  const px = (point.lon - start.lon) * longitudeScale;
  const py = (point.lat - start.lat) * latitudeScale;
  const ex = (end.lon - start.lon) * longitudeScale;
  const ey = (end.lat - start.lat) * latitudeScale;
  const denominator = ex * ex + ey * ey;
  const ratio = denominator ? Math.max(0, Math.min(1, (px * ex + py * ey) / denominator)) : 0;
  const dx = px - ex * ratio;
  const dy = py - ey * ratio;
  return Math.sqrt(dx * dx + dy * dy);
}

function turnName(incoming, outgoing) {
  const delta = bearingDelta(incoming, outgoing);
  if (Math.abs(delta) < 25) return 'Go straight';
  if (Math.abs(delta) > 145) return 'Make a U-turn';
  return delta < 0 ? 'Turn left' : 'Turn right';
}

export function isMeaningfulName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (/^(OSM|node\/|way\/|relation\/)/i.test(trimmed)) return false;
  if (/^(Unnamed|unnamed road|unnamed path)/i.test(trimmed)) return false;
  if (/^[A-Z]{1,3}\d{1,3}$/.test(trimmed)) return false; // node codes like B01, EZ02, J07, EX01
  if (/^Network boundary/i.test(trimmed)) return false;
  return true;
}

export function getRoadForSegment(graph, sourceId, targetId) {
  return (
    (graph?.edges || []).find(
      (edge) =>
        (edge.source === sourceId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === sourceId)
    ) || null
  );
}

export function getReadableNodeName(node, graph) {
  if (!node) return 'Evacuation waypoint';
  if (isMeaningfulName(node.name)) return node.name;
  if (node.type === 'exit') return 'Evacuation Exit';
  if (node.type === 'hospital') return 'Emergency Trauma Hospital';
  if (node.type === 'resource_center') return 'First Responder Staging Area';
  if (node.type === 'evacuation_zone') return 'Evacuation Assembly Zone';
  const nearbyRoad = (graph?.edges || []).find(
    (edge) => (edge.source === node.id || edge.target === node.id) && isMeaningfulName(edge.name)
  );
  return nearbyRoad ? nearbyRoad.name : 'Evacuation Corridor';
}

function segmentDistance(graph, source, target, edge) {
  if (Number.isFinite(Number(edge?.distance))) return Number(edge.distance);
  return distanceBetween(source, target);
}

function turnAtNode(previous, current, next) {
  if (!previous?.lat || !current?.lat || !next?.lat) return null;
  const incoming = bearingBetween(previous, current);
  const outgoing = bearingBetween(current, next);
  const delta = Math.abs(bearingDelta(incoming, outgoing));
  return { name: turnName(incoming, outgoing), significant: delta >= 35 };
}

export function simplifyRoute(graph, routePath = []) {
  const nodes = routePath.map((nodeId) => graph?.nodes?.find((node) => node.id === nodeId)).filter(Boolean);
  if (nodes.length === 0) return { nodes: [], steps: [], totalDistance: 0 };
  if (nodes.length === 1) {
    const destName = getReadableNodeName(nodes[0], graph);
    return {
      nodes,
      steps: [
        {
          type: 'destination',
          label: destName,
          instruction: `Arrive at ${destName}`,
          distance: 0,
          startIndex: 0,
          endIndex: 0,
        },
      ],
      totalDistance: 0,
    };
  }

  const groups = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const edge = getRoadForSegment(graph, nodes[index].id, nodes[index + 1].id);
    const roadName = isMeaningfulName(edge?.name) ? edge.name : null;
    const previousGroup = groups[groups.length - 1];
    const turn = index > 0 ? turnAtNode(nodes[index - 1], nodes[index], nodes[index + 1]) : null;
    const sameRoad = previousGroup && previousGroup.roadName === roadName;
    if (!previousGroup || !sameRoad || turn?.significant) {
      groups.push({
        startIndex: index,
        endIndex: index + 1,
        roadName,
        distance: segmentDistance(graph, nodes[index], nodes[index + 1], edge),
      });
    } else {
      previousGroup.endIndex = index + 1;
      previousGroup.distance += segmentDistance(graph, nodes[index], nodes[index + 1], edge);
    }
  }

  const steps = [
    {
      type: 'start',
      label: getReadableNodeName(nodes[0], graph),
      instruction: `Start at ${getReadableNodeName(nodes[0], graph)}`,
      distance: 0,
      startIndex: 0,
      endIndex: 0,
    },
  ];

  groups.forEach((group, groupIndex) => {
    const turn =
      groupIndex > 0
        ? turnAtNode(
            nodes[group.startIndex - 1],
            nodes[group.startIndex],
            nodes[Math.min(group.startIndex + 1, nodes.length - 1)]
          )?.name
        : 'Go straight';

    const dist = roundDistance(group.distance);
    let instruction;
    if (groupIndex === 0) {
      instruction = group.roadName
        ? `Continue on ${group.roadName} for ${dist} meters.`
        : dist >= 350
        ? `Continue for ${dist} meters.`
        : `Go straight for ${dist} meters.`;
    } else {
      instruction = group.roadName
        ? `${turn || 'Continue'} onto ${group.roadName}.`
        : `${turn || 'Go straight'} in ${dist} meters.`;
    }

    steps.push({
      type: groupIndex === groups.length - 1 ? 'approach' : 'segment',
      label: group.roadName || instruction,
      instruction,
      distance: Math.round(group.distance),
      startIndex: group.startIndex,
      endIndex: group.endIndex,
      roadName: group.roadName,
    });
  });

  const destination = getReadableNodeName(nodes[nodes.length - 1], graph);
  steps.push({
    type: 'destination',
    label: destination,
    instruction: 'You have reached the evacuation exit.',
    distance: 0,
    startIndex: nodes.length - 1,
    endIndex: nodes.length - 1,
  });

  return {
    nodes,
    steps,
    totalDistance: Math.round(groups.reduce((total, group) => total + group.distance, 0)),
  };
}

export function getHumanRoute(graph, routePath = []) {
  const simplified = simplifyRoute(graph, routePath);
  return {
    ...simplified,
    names: simplified.steps.map((step) => step.label),
    roads: simplified.steps.map((step) => step.roadName).filter(Boolean),
  };
}

export function projectLocationToGraph(location, graph) {
  const nodes = (graph?.nodes || []).filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lon));
  if (!location || nodes.length === 0) return null;
  const bounds = nodes.reduce(
    (result, node) => ({
      minLat: Math.min(result.minLat, node.lat),
      maxLat: Math.max(result.maxLat, node.lat),
      minLon: Math.min(result.minLon, node.lon),
      maxLon: Math.max(result.maxLon, node.lon),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity }
  );
  const width = Math.max(bounds.maxLon - bounds.minLon, 0.00001);
  const height = Math.max(bounds.maxLat - bounds.minLat, 0.00001);
  return {
    x: 60 + ((location.lon - bounds.minLon) / width) * 680,
    y: 600 - ((location.lat - bounds.minLat) / height) * 520,
  };
}

export function getNavigationState(location, graph, routePath, previousLocation = null) {
  const routeNodes = (routePath || []).map((nodeId) => graph?.nodes?.find((node) => node.id === nodeId)).filter(Boolean);
  if (!location || routeNodes.length < 2 || !routeNodes.every((node) => Number.isFinite(node.lat) && Number.isFinite(node.lon))) {
    return { available: false, reason: 'Live GPS and a mapped route are required.' };
  }

  // 1. Distance calculations
  const waypointDistances = routeNodes.map((node) => distanceBetween(location, node));
  const nearestWaypointIndex = waypointDistances.indexOf(Math.min(...waypointDistances));
  const segmentDistances = routeNodes.slice(0, -1).map((node, index) => distanceToSegment(location, node, routeNodes[index + 1]));
  const offRouteDistance = Math.min(...segmentDistances);

  // 2. Next target waypoint & progress
  const nextWaypointIndex = Math.min(nearestWaypointIndex + 1, routeNodes.length - 1);
  const nextWaypoint = routeNodes[nextWaypointIndex];
  const nextEdge = getRoadForSegment(graph, routeNodes[Math.max(0, nextWaypointIndex - 1)]?.id, nextWaypoint?.id);
  const distToNext = distanceBetween(location, nextWaypoint);
  const isFinalExit = nextWaypoint.type === 'exit' || nextWaypointIndex === routeNodes.length - 1;
  const reached = isFinalExit && distToNext <= 25;

  // 3. Remaining total route distance
  const remainingDistance = reached
    ? 0
    : distToNext +
      routeNodes
        .slice(nextWaypointIndex, -1)
        .reduce((total, node, index) => total + distanceBetween(node, routeNodes[nextWaypointIndex + index + 1]), 0);

  // 4. Determine user's active heading and speed
  let userHeading = Number.isFinite(location.heading) ? location.heading : null;
  if (userHeading === null && previousLocation) {
    const distMoved = distanceBetween(previousLocation, location);
    if (distMoved >= 2) {
      userHeading = bearingBetween(previousLocation, location);
    }
  }

  // 5. Bearing of the corridor ahead
  const corridorBearing = bearingBetween(routeNodes[Math.max(0, nextWaypointIndex - 1)] || location, nextWaypoint);
  const nextCorridorBearing =
    nextWaypointIndex < routeNodes.length - 1
      ? bearingBetween(nextWaypoint, routeNodes[nextWaypointIndex + 1])
      : corridorBearing;

  const turn =
    nextWaypointIndex < routeNodes.length - 1
      ? turnName(corridorBearing, nextCorridorBearing)
      : 'Go straight';

  const nextWaypointName = getReadableNodeName(nextWaypoint, graph);
  const nextRoadName = isMeaningfulName(nextEdge?.name) ? nextEdge.name : null;

  // 6. Heading alignment check (U-turn if facing backwards)
  let isWrongWay = false;
  if (userHeading !== null) {
    const headingDiff = Math.abs(bearingDelta(userHeading, corridorBearing));
    if (headingDiff > 135 && (location.speed > 0.6 || distanceBetween(previousLocation || location, location) > 2.5)) {
      isWrongWay = true;
    }
  }

  // 7. Off-Route Evaluation (strictly bounded at 60 meters)
  const isOffRoute = offRouteDistance > 60;

  // 8. Generate Precise, Human-Readable Voice & Text Instructions
  let instruction = '';
  let maneuverType = 'straight'; // 'straight' | 'turn-left' | 'turn-right' | 'u-turn' | 'arrive' | 'recalculate'

  if (reached) {
    instruction = 'You have reached the evacuation exit.';
    maneuverType = 'arrive';
  } else if (isOffRoute) {
    instruction = 'Off route. Recalculating route...';
    maneuverType = 'recalculate';
  } else if (isWrongWay) {
    instruction = 'Make a U-turn and head towards the evacuation route.';
    maneuverType = 'u-turn';
  } else if (isFinalExit && distToNext <= 120) {
    const d = roundDistance(distToNext);
    instruction = `The evacuation exit is ${d} meters ahead.`;
    maneuverType = 'arrive';
  } else if (distToNext <= 35 && turn !== 'Go straight') {
    // Imminent turn
    if (nextRoadName) {
      instruction = `${turn} onto ${nextRoadName}.`;
    } else {
      instruction = `${turn}.`;
    }
    maneuverType = turn.toLowerCase().includes('left') ? 'turn-left' : 'turn-right';
  } else if (distToNext <= 250 && turn !== 'Go straight') {
    // Approaching turn with distance
    const d = roundDistance(distToNext);
    if (nextRoadName) {
      instruction = `${turn} in ${d} meters onto ${nextRoadName}.`;
    } else {
      instruction = `${turn} in ${d} meters.`;
    }
    maneuverType = turn.toLowerCase().includes('left') ? 'turn-left' : 'turn-right';
  } else {
    // Straight or continuing corridor
    const d = roundDistance(distToNext);
    if (d >= 350) {
      instruction = nextRoadName
        ? `Continue on ${nextRoadName} for ${d} meters.`
        : `Continue for ${d} meters.`;
    } else {
      instruction = nextRoadName
        ? `Go straight on ${nextRoadName} for ${d} meters.`
        : `Go straight for ${d} meters.`;
    }
    maneuverType = 'straight';
  }

  const movement = previousLocation ? distanceBetween(previousLocation, location) : 0;
  const previousRouteDistance = previousLocation
    ? Math.min(...routeNodes.slice(0, -1).map((node, index) => distanceToSegment(previousLocation, node, routeNodes[index + 1])))
    : offRouteDistance;
  const movementDirection =
    movement < 1.5
      ? 'stationary'
      : offRouteDistance < previousRouteDistance - 1.5
      ? 'toward route'
      : offRouteDistance > previousRouteDistance + 1.5
      ? 'away from route'
      : 'along route';

  const simplified = simplifyRoute(graph, routePath);

  return {
    available: true,
    nearestWaypointIndex,
    nearestWaypoint: routeNodes[nearestWaypointIndex],
    nextWaypoint,
    nextWaypointDistance: distToNext,
    remainingDistance,
    progress: Math.round((nearestWaypointIndex / (routeNodes.length - 1)) * 100),
    offRouteDistance,
    isOffRoute,
    movementDirection,
    userHeading,
    headingCompass: getHeadingCompass(userHeading),
    nextWaypointName,
    nextRoadName,
    instruction,
    maneuverType,
    turn,
    reached,
    simplifiedSteps: simplified.steps,
    mapPoint: projectLocationToGraph(location, graph),
  };
}