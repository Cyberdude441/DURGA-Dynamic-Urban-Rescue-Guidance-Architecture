/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Floyd-Warshall All-Pairs Shortest Path Algorithm
 *
 * Implemented from scratch using Dynamic Programming.
 * Computes all-pairs shortest paths between every pair of vertices in the urban network.
 *
 * Generates:
 *   1. Distance Matrix D[i][j]: minimum effective travel impedance between vertices i and j
 *   2. Next / Predecessor Matrix next[i][j]: index of next vertex to traverse from i to j
 *   3. Physical Distance Matrix distPhysical[i][j]: physical road distance in meters
 *
 * Uses the project's effective edge cost model:
 *   cost = travelTime * (1 + 1.5 * congestion) * (1 + 2.5 * danger)
 * Blocked roads (edge.blocked === true) have infinite resistance and are NOT traversed.
 *
 * Dynamic Programming Recurrence:
 *   D^(k)[i][j] = min( D^(k-1)[i][j], D^(k-1)[i][k] + D^(k-1)[k][j] )
 *   next[i][j] = next[i][k] (when relaxation strictly improves the path)
 *
 * Theoretical Complexity:
 *   Time:  O(V³)
 *   Space: O(V²)
 *   Path Reconstruction Query: O(L) where L is the number of hops
 */

/**
 * Calculate effective edge cost based on project specification:
 *   Base Cost = travelTime (s)
 *   Congestion Multiplier = 1 + (1.5 * congestion)
 *   Danger Multiplier = 1 + (2.5 * danger)
 *   If edge is blocked, returns Infinity (unpassable)
 *
 * @param {Object} edge
 * @returns {number}
 */
export function getEffectiveEdgeCost(edge) {
  if (!edge || edge.blocked) {
    return Infinity;
  }

  const travelTime = Number(edge.travelTime) || 1;
  const congestion = Math.max(0, Math.min(1, Number(edge.congestion) || 0));
  const danger = Math.max(0, Math.min(1, Number(edge.danger) || 0));

  const congestionFactor = 1 + congestion * 1.5;
  const dangerFactor = 1 + danger * 2.5;

  return travelTime * congestionFactor * dangerFactor;
}

/**
 * Floyd-Warshall All-Pairs Shortest Path Algorithm from scratch
 *
 * @param {Object} graph - { nodes: Array, edges: Array }
 * @param {Object} [options]
 * @param {boolean} [options.bidirectional=true] - Roads allow bidirectional transit
 * @param {boolean} [options.recordSteps=false] - Record intermediate state at each k-th pivot
 * @returns {Object} {
 *   distMatrix,
 *   nextMatrix,
 *   distPhysical,
 *   nodeIds,
 *   nodeIndexMap,
 *   nodesCount,
 *   edgesProcessed,
 *   executionTime,
 *   reconstructPath,
 *   steps,
 *   hasNegativeCycle
 * }
 */
export function floydWarshall(graph, options = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { bidirectional = true, recordSteps = false } = options;

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return {
      distMatrix: [],
      nextMatrix: [],
      distPhysical: [],
      nodeIds: [],
      nodeIndexMap: {},
      nodesCount: 0,
      edgesProcessed: 0,
      executionTime: 0,
      reconstructPath: () => ({ path: [], totalCost: Infinity, distance: 0, hops: 0, pathEdges: [] }),
      steps: [],
      hasNegativeCycle: false,
    };
  }

  const nodes = graph.nodes;
  const n = nodes.length;
  const nodeIds = nodes.map((node) => node.id);
  const nodeIndexMap = {};
  const nodeIndexMapObj = new Map();

  nodeIds.forEach((id, idx) => {
    nodeIndexMap[id] = idx;
    nodeIndexMapObj.set(id, idx);
  });

  // 1. Initialize Distance, Physical Distance, and Next-Hop Matrices
  // D[i][j]: shortest travel cost from i to j
  // next[i][j]: next vertex index on path from i to j
  // distPhysical[i][j]: physical road distance (meters)
  const distMatrix = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const distPhysical = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const nextMatrix = Array.from({ length: n }, () => Array(n).fill(null));

  // Base cases: distance from a vertex to itself is 0
  for (let i = 0; i < n; i++) {
    distMatrix[i][i] = 0;
    distPhysical[i][i] = 0;
    nextMatrix[i][i] = i;
  }

  // Map edge IDs for path edge reconstruction
  // key: `${sourceIdx}_${targetIdx}` -> edgeId
  const edgeIdMap = new Map();

  // Populate direct edges
  graph.edges.forEach((edge) => {
    if (edge.blocked) return; // Strictly ignore blocked roads

    const cost = getEffectiveEdgeCost(edge);
    if (!isFinite(cost)) return;

    const u = nodeIndexMap[edge.source];
    const v = nodeIndexMap[edge.target];

    if (u !== undefined && v !== undefined) {
      const distance = Number(edge.distance) || 0;

      // In case of multiple edges between same pair, pick the lowest cost
      if (cost < distMatrix[u][v]) {
        distMatrix[u][v] = cost;
        distPhysical[u][v] = distance;
        nextMatrix[u][v] = v;
        edgeIdMap.set(`${u}_${v}`, edge.id);
      }

      if (bidirectional) {
        if (cost < distMatrix[v][u]) {
          distMatrix[v][u] = cost;
          distPhysical[v][u] = distance;
          nextMatrix[v][u] = u;
          edgeIdMap.set(`${v}_${u}`, edge.id);
        }
      }
    }
  });

  const steps = [];
  let edgesProcessed = 0;
  const shouldSaveSnapshots = recordSteps && n <= 50;
  const stepSamplingInterval = recordSteps && n > 60 ? Math.ceil(n / 50) : 1;

  // Record initial state snapshot before relaxation
  if (recordSteps) {
    steps.push({
      stepIndex: 0,
      k: -1,
      pivotNodeId: 'INIT',
      pivotNode: null,
      improvementsCount: 0,
      sampleImprovements: [],
      matrixSnapshot: shouldSaveSnapshots ? distMatrix.map((row) => [...row]) : null,
      description: `Initialized ${n}x${n} base distance and next-hop matrix with direct corridor adjacencies.`,
    });
  }

  // 2. Triple Nested Dynamic Programming Loops
  // k is the intermediate pivot vertex candidate
  for (let k = 0; k < n; k++) {
    let stepImprovements = 0;
    const sampleImprovements = [];
    const pivotId = nodeIds[k];
    const pivotNode = nodes[k];

    for (let i = 0; i < n; i++) {
      // Branch pruning: if vertex i cannot reach pivot k, routing through k is impossible
      if (distMatrix[i][k] === Infinity) continue;

      for (let j = 0; j < n; j++) {
        edgesProcessed++;

        // Branch pruning: if pivot k cannot reach vertex j, routing through k is impossible
        if (distMatrix[k][j] === Infinity) continue;

        const candidateCost = distMatrix[i][k] + distMatrix[k][j];

        // Strict improvement check
        if (candidateCost < distMatrix[i][j]) {
          if (recordSteps && sampleImprovements.length < 5) {
            sampleImprovements.push({
              from: nodeIds[i],
              to: nodeIds[j],
              oldCost: isFinite(distMatrix[i][j]) ? Math.round(distMatrix[i][j] * 10) / 10 : '∞',
              newCost: Math.round(candidateCost * 10) / 10,
              saved: isFinite(distMatrix[i][j])
                ? Math.round((distMatrix[i][j] - candidateCost) * 10) / 10
                : 'NEW_PATH',
            });
          }

          distMatrix[i][j] = candidateCost;
          nextMatrix[i][j] = nextMatrix[i][k];
          distPhysical[i][j] = distPhysical[i][k] + distPhysical[k][j];
          stepImprovements++;
        }
      }
    }

    if (recordSteps && (k % stepSamplingInterval === 0 || k === n - 1 || stepImprovements > 0)) {
      steps.push({
        stepIndex: steps.length,
        k,
        pivotNodeId: pivotId,
        pivotNode,
        improvementsCount: stepImprovements,
        sampleImprovements,
        matrixSnapshot: shouldSaveSnapshots ? distMatrix.map((row) => [...row]) : null,
        description:
          stepImprovements > 0
            ? `Iteration k=${k} (Pivot: ${pivotId} - ${pivotNode.name}): Optimized ${stepImprovements} path pairs via ${pivotId}.`
            : `Iteration k=${k} (Pivot: ${pivotId} - ${pivotNode.name}): No routes improved through this vertex.`,
      });
    }
  }

  // 3. Detect Negative Cycles
  // In urban routing with positive costs w >= 0 this is false, but verified mathematically
  let hasNegativeCycle = false;
  for (let i = 0; i < n; i++) {
    if (distMatrix[i][i] < 0) {
      hasNegativeCycle = true;
      break;
    }
  }

  // 4. Constant-Time / O(L) Path Reconstruction Helper
  /**
   * Reconstruct shortest path between source and destination using precomputed nextMatrix
   *
   * @param {string} sourceId
   * @param {string} destinationId
   * @returns {Object} { path, totalCost, distance, hops, pathEdges }
   */
  const reconstructPath = (sourceId, destinationId) => {
    const u = nodeIndexMap[sourceId];
    const v = nodeIndexMap[destinationId];

    if (u === undefined || v === undefined) {
      return { path: [], totalCost: Infinity, distance: 0, hops: 0, pathEdges: [] };
    }

    if (u === v) {
      return { path: [sourceId], totalCost: 0, distance: 0, hops: 0, pathEdges: [] };
    }

    if (distMatrix[u][v] === Infinity || nextMatrix[u][v] === null) {
      return { path: [], totalCost: Infinity, distance: 0, hops: 0, pathEdges: [] };
    }

    const path = [sourceId];
    const pathEdges = [];
    let curr = u;
    const visitedIndices = new Set([u]);

    while (curr !== v) {
      const nextHop = nextMatrix[curr][v];
      if (nextHop === null || nextHop === undefined || visitedIndices.has(nextHop)) {
        // Protection against infinite loops / malformed graph state
        return { path: [], totalCost: Infinity, distance: 0, hops: 0, pathEdges: [] };
      }

      const edgeKey = `${curr}_${nextHop}`;
      const edgeId = edgeIdMap.get(edgeKey);
      if (edgeId) {
        pathEdges.push(edgeId);
      }

      visitedIndices.add(nextHop);
      curr = nextHop;
      path.push(nodeIds[curr]);
    }

    return {
      path,
      totalCost: Math.round(distMatrix[u][v] * 100) / 100,
      distance: Math.round(distPhysical[u][v] * 100) / 100,
      hops: path.length - 1,
      pathEdges,
    };
  };

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTime = Math.max(0.01, Math.round((endTime - startTime) * 100) / 100);

  return {
    distMatrix,
    nextMatrix,
    distPhysical,
    nodeIds,
    nodeIndexMap,
    nodesCount: n,
    edgesProcessed,
    executionTime,
    reconstructPath,
    steps,
    hasNegativeCycle,
  };
}

export default floydWarshall;
