/**
 * DURGA Reusable Graph Utilities
 * Provides pure query, traversal inspection, and edge cost computation functions.
 * Note: Dijkstra and pathfinding algorithms are deliberately omitted (reserved for Part 3).
 */

/**
 * Find a node by ID in a graph
 * @param {Object} graph - { nodes: Array, edges: Array }
 * @param {string} id - Node ID (e.g. 'B01', 'EX01')
 * @returns {Object|null}
 */
export function findNode(graph, id) {
  if (!graph || !Array.isArray(graph.nodes)) return null;
  return graph.nodes.find((node) => node.id === id) || null;
}

/**
 * Filter nodes in a graph using a predicate function
 * @param {Object} graph
 * @param {Function} predicate - (node) => boolean
 * @returns {Array}
 */
export function findNodes(graph, predicate) {
  if (!graph || !Array.isArray(graph.nodes)) return [];
  if (typeof predicate !== 'function') return [...graph.nodes];
  return graph.nodes.filter(predicate);
}

/**
 * Find all nodes of a specific type (e.g. 'building', 'exit', 'hospital', 'junction', 'evacuation_zone')
 * @param {Object} graph
 * @param {string} type
 * @returns {Array}
 */
export function findNodesByType(graph, type) {
  return findNodes(graph, (node) => node.type === type);
}

/**
 * Find an edge by its unique ID
 * @param {Object} graph
 * @param {string} id - Edge ID (e.g. 'E01')
 * @returns {Object|null}
 */
export function findEdge(graph, id) {
  if (!graph || !Array.isArray(graph.edges)) return null;
  return graph.edges.find((edge) => edge.id === id) || null;
}

/**
 * Find an edge between two specific nodes
 * @param {Object} graph
 * @param {string} sourceId
 * @param {string} targetId
 * @param {boolean} [bidirectional=true] - Whether to consider edge valid in reverse
 * @returns {Object|null}
 */
export function findEdgeBetween(graph, sourceId, targetId, bidirectional = true) {
  if (!graph || !Array.isArray(graph.edges)) return null;
  return (
    graph.edges.find((edge) => {
      const forward = edge.source === sourceId && edge.target === targetId;
      const reverse = bidirectional && edge.source === targetId && edge.target === sourceId;
      return forward || reverse;
    }) || null
  );
}

/**
 * Filter edges in a graph using a predicate function
 * @param {Object} graph
 * @param {Function} predicate - (edge) => boolean
 * @returns {Array}
 */
export function findEdges(graph, predicate) {
  if (!graph || !Array.isArray(graph.edges)) return [];
  if (typeof predicate !== 'function') return [...graph.edges];
  return graph.edges.filter(predicate);
}

/**
 * Get all edges connected to a given node
 * @param {Object} graph
 * @param {string} nodeId
 * @returns {Array}
 */
export function getConnectedEdges(graph, nodeId) {
  return findEdges(graph, (edge) => edge.source === nodeId || edge.target === nodeId);
}

/**
 * Get all adjacent neighbor nodes for a given node
 * @param {Object} graph
 * @param {string} nodeId
 * @param {boolean} [onlyUnblocked=false] - If true, only traverse edges where blocked is false
 * @returns {Array}
 */
export function getAdjacentNodes(graph, nodeId, onlyUnblocked = false) {
  if (!graph || !Array.isArray(graph.edges)) return [];

  const connectedEdges = getConnectedEdges(graph, nodeId);
  const neighborIds = new Set();

  connectedEdges.forEach((edge) => {
    if (onlyUnblocked && edge.blocked) return;
    if (edge.source === nodeId) neighborIds.add(edge.target);
    if (edge.target === nodeId) neighborIds.add(edge.source);
  });

  return graph.nodes.filter((node) => neighborIds.has(node.id));
}

/**
 * Calculate effective edge cost based on distance, travelTime, congestion, and hazard danger.
 * If the edge is blocked, returns Infinity.
 *
 * Cost model:
 *   Base Cost = travelTime (seconds)
 *   Congestion Factor = 1 + (congestion * congestionWeight)
 *   Hazard Danger Factor = 1 + (danger * dangerWeight)
 *   Effective Cost = Base Cost * Congestion Factor * Hazard Danger Factor
 *
 * @param {Object} edge - Edge data object
 * @param {Object} [options]
 * @param {number} [options.congestionWeight=1.5] - Impact of vehicular/pedestrian density
 * @param {number} [options.dangerWeight=2.5] - Impact of hazard proximity
 * @param {boolean} [options.detailed=false] - If true, returns an object with breakdown
 * @returns {number|Object} - Effective cost (number) or detailed breakdown
 */
export function calculateEffectiveEdgeCost(edge, options = {}) {
  if (!edge) return Infinity;

  const {
    congestionWeight = 1.5,
    dangerWeight = 2.5,
    detailed = false,
  } = options;

  // Blocked roads have infinite resistance / cannot be traversed
  if (edge.blocked) {
    if (detailed) {
      return {
        effectiveCost: Infinity,
        isBlocked: true,
        baseTravelTime: edge.travelTime || 0,
        congestionMultiplier: 1,
        dangerMultiplier: 1,
      };
    }
    return Infinity;
  }

  const baseTravelTime = Number(edge.travelTime) || 1;
  const congestion = Math.max(0, Math.min(1, Number(edge.congestion) || 0));
  const danger = Math.max(0, Math.min(1, Number(edge.danger) || 0));

  const congestionMultiplier = 1 + congestion * congestionWeight;
  const dangerMultiplier = 1 + danger * dangerWeight;

  const effectiveCost = Math.round(baseTravelTime * congestionMultiplier * dangerMultiplier * 100) / 100;

  if (detailed) {
    return {
      effectiveCost,
      isBlocked: false,
      baseTravelTime,
      congestion,
      danger,
      congestionMultiplier: Math.round(congestionMultiplier * 100) / 100,
      dangerMultiplier: Math.round(dangerMultiplier * 100) / 100,
    };
  }

  return effectiveCost;
}

/**
 * Set an edge's blocked status and return an immutably updated graph clone
 * @param {Object} graph - { nodes: Array, edges: Array }
 * @param {string} edgeId - Edge to block/unblock
 * @param {boolean} isBlocked - New blocked status
 * @returns {Object} - New graph object
 */
export function setEdgeBlockedStatus(graph, edgeId, isBlocked) {
  if (!graph || !Array.isArray(graph.edges)) return graph;

  const updatedEdges = graph.edges.map((edge) => {
    if (edge.id === edgeId) {
      return { ...edge, blocked: Boolean(isBlocked) };
    }
    return edge;
  });

  return {
    ...graph,
    edges: updatedEdges,
  };
}

/**
 * Block a road / edge in the graph
 * @param {Object} graph
 * @param {string} edgeId
 * @returns {Object} - Updated graph clone
 */
export function blockEdge(graph, edgeId) {
  return setEdgeBlockedStatus(graph, edgeId, true);
}

/**
 * Unblock a road / edge in the graph
 * @param {Object} graph
 * @param {string} edgeId
 * @returns {Object} - Updated graph clone
 */
export function unblockEdge(graph, edgeId) {
  return setEdgeBlockedStatus(graph, edgeId, false);
}

/**
 * Toggle an edge's blocked status
 * @param {Object} graph
 * @param {string} edgeId
 * @returns {Object} - Updated graph clone
 */
export function toggleEdgeBlocked(graph, edgeId) {
  const edge = findEdge(graph, edgeId);
  if (!edge) return graph;
  return setEdgeBlockedStatus(graph, edgeId, !edge.blocked);
}

/**
 * Computes statistical summary of the graph topology and current hazard telemetry
 * @param {Object} graph
 * @returns {Object}
 */
export function getGraphSummary(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      totalPeople: 0,
      totalCapacity: 0,
      peopleAtRisk: 0,
      blockedEdgesCount: 0,
      activeZonesCount: 0,
      exitsCount: 0,
      hospitalsCount: 0,
      resourceCentersCount: 0,
    };
  }

  let totalPeople = 0;
  let totalCapacity = 0;
  let peopleAtRisk = 0;
  let activeZonesCount = 0;
  let exitsCount = 0;
  let hospitalsCount = 0;
  let resourceCentersCount = 0;

  graph.nodes.forEach((node) => {
    totalPeople += node.people || 0;
    totalCapacity += node.capacity || 0;

    if (node.riskLevel === 'HIGH' || node.riskLevel === 'CRITICAL') {
      peopleAtRisk += node.people || 0;
    }

    if (node.type === 'evacuation_zone') activeZonesCount += 1;
    if (node.type === 'exit') exitsCount += 1;
    if (node.type === 'hospital') hospitalsCount += 1;
    if (node.type === 'resource_center') resourceCentersCount += 1;
  });

  const blockedEdgesCount = graph.edges.filter((e) => e.blocked).length;

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    totalPeople,
    totalCapacity,
    peopleAtRisk,
    blockedEdgesCount,
    activeZonesCount,
    exitsCount,
    hospitalsCount,
    resourceCentersCount,
  };
}

/**
 * Apply a synthetic emergency scenario to a base graph and return a cloned graph
 * @param {Object} baseGraph - Original urban graph
 * @param {Object} scenario - Scenario object from EMERGENCY_SCENARIOS
 * @returns {Object} - Graph with scenario threat modifiers and blocked roads applied
 */
export function applyScenarioToGraph(baseGraph, scenario) {
  if (!baseGraph || !scenario) return baseGraph;

  const nodeModMap = new Map();
  if (Array.isArray(scenario.affectedNodeModifiers)) {
    scenario.affectedNodeModifiers.forEach((mod) => nodeModMap.set(mod.id, mod));
  }

  const edgeModMap = new Map();
  if (Array.isArray(scenario.edgeModifiers)) {
    scenario.edgeModifiers.forEach((mod) => edgeModMap.set(mod.id, mod));
  }

  const updatedNodes = baseGraph.nodes.map((node) => {
    const mod = nodeModMap.get(node.id);
    if (mod) {
      return {
        ...node,
        riskLevel: mod.riskLevel || node.riskLevel,
        peopleAtRisk: mod.peopleAtRisk !== undefined ? mod.peopleAtRisk : node.people,
      };
    }
    return { ...node, peopleAtRisk: 0 };
  });

  const updatedEdges = baseGraph.edges.map((edge) => {
    const mod = edgeModMap.get(edge.id);
    if (mod) {
      return {
        ...edge,
        blocked: mod.blocked !== undefined ? mod.blocked : edge.blocked,
        danger: mod.danger !== undefined ? mod.danger : edge.danger,
        congestion: mod.congestion !== undefined ? mod.congestion : edge.congestion,
      };
    }
    return { ...edge };
  });

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    activeScenario: scenario,
  };
}
