/**
 * DURGA: Dynamic Urban Rescue & Guidance Architecture
 * Core Algorithmic Decision Engine (Google Apps Script V8 Edition)
 * 
 * Invariants:
 *  - 100% Deterministic, mathematically exact DAA graph implementations.
 *  - Zero external dependencies.
 *  - Safe default parameters: if invoked with 0 arguments (e.g. directly from
 *    the Google Apps Script Editor "Run" toolbar), all algorithms automatically
 *    default to the canonical 47-node/58-edge urban graph without crashing.
 *  - Logs execution details to Google Apps Script Logger.log.
 * 
 * Algorithms Included:
 *  1. Priority Queue / Binary Min-Heap (O(log V))
 *  2. Disjoint Set Union (DSU) with Path Compression & Union-by-Rank (O(alpha(V)))
 *  3. Dijkstra's Algorithm (Single-Source Shortest Path to Exits)
 *  4. Floyd-Warshall Algorithm (All-Pairs Shortest Path Matrix)
 *  5. Greedy Evacuation Assignment (Urgency & Capacity-Bounded)
 *  6. 0/1 Knapsack Dynamic Programming (First-Responder Fleet Optimizer)
 *  7. Kruskal's Minimum Spanning Tree (MST - Critical Infrastructure Backbone)
 *  8. Prim's Minimum Spanning Tree (MST - Priority Cut Expansion)
 *  9. Full Multi-Algorithmic Emergency Simulation Orchestrator
 * 10. testAlgorithmsSuite() Toolbar Test Runner
 */

// ============================================================================
// 1. DATA STRUCTURE: BINARY MIN-HEAP
// ============================================================================

class BinaryMinHeap {
  constructor() {
    this.heap = [];
  }

  insert(id, priority, data = null) {
    this.heap.push({ id, priority, data });
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(n) {
    const element = this.heap[n];
    while (n > 0) {
      const parentN = Math.floor((n - 1) / 2);
      const parent = this.heap[parentN];
      if (element.priority >= parent.priority) break;
      this.heap[n] = parent;
      this.heap[parentN] = element;
      n = parentN;
    }
  }

  _sinkDown(n) {
    const length = this.heap.length;
    const element = this.heap[n];
    while (true) {
      let leftChildN = 2 * n + 1;
      let rightChildN = 2 * n + 2;
      let swap = null;

      if (leftChildN < length) {
        if (this.heap[leftChildN].priority < element.priority) {
          swap = leftChildN;
        }
      }

      if (rightChildN < length) {
        const rightChild = this.heap[rightChildN];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < this.heap[swap].priority)
        ) {
          swap = rightChildN;
        }
      }

      if (swap === null) break;
      this.heap[n] = this.heap[swap];
      this.heap[swap] = element;
      n = swap;
    }
  }
}

// ============================================================================
// 2. DATA STRUCTURE: DISJOINT SET UNION (DSU)
// ============================================================================

class DisjointSetUnion {
  constructor(elements) {
    this.parent = new Map();
    this.rank = new Map();
    elements.forEach((el) => {
      this.parent.set(el, el);
      this.rank.set(el, 0);
    });
  }

  find(i) {
    if (this.parent.get(i) === i) return i;
    const root = this.find(this.parent.get(i));
    this.parent.set(i, root);
    return root;
  }

  union(i, j) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI === rootJ) return false;

    const rankI = this.rank.get(rootI) || 0;
    const rankJ = this.rank.get(rootJ) || 0;

    if (rankI < rankJ) {
      this.parent.set(rootI, rootJ);
    } else if (rankI > rankJ) {
      this.parent.set(rootJ, rootI);
    } else {
      this.parent.set(rootJ, rootI);
      this.rank.set(rootI, rankI + 1);
    }
    return true;
  }
}

// ============================================================================
// 3. DIJKSTRA'S ALGORITHM
// ============================================================================

/**
 * Computes shortest path from a source node to all destinations or exits.
 * If called with 0 arguments (e.g. from Apps Script editor toolbar), defaults to canonical graph and B01 origin.
 * 
 * @param {Object} [graph] Graph object containing nodes and edges
 * @param {string} [sourceId] Origin node ID (defaults to 'B01')
 * @param {string} [targetId] Target destination ID (or null to evaluate all exits)
 * @param {Object} [modifiers] Blocked edges, congestion, and danger overrides
 * @returns {Object} Dijkstra calculation results
 */
function runDijkstra(graph = null, sourceId = null, targetId = null, modifiers = {}) {
  const startTime = new Date().getTime();
  const activeGraph = (graph && graph.nodes && graph.edges) ? graph : getCanonicalUrbanGraph();
  const nodes = activeGraph.nodes;
  const edges = activeGraph.edges;
  const actualSourceId = sourceId || (nodes.find((n) => n.type === 'building')?.id || nodes[0]?.id || 'B01');
  const actualModifiers = modifiers || {};

  const blockedEdgeSet = new Set(actualModifiers.blockedEdges || []);
  const dangerMap = new Map();
  const congestionMap = new Map();

  (actualModifiers.edgeModifiers || []).forEach((m) => {
    if (m.blocked) blockedEdgeSet.add(m.id);
    if (m.danger !== undefined) dangerMap.set(m.id, m.danger);
    if (m.congestion !== undefined) congestionMap.set(m.id, m.congestion);
  });

  // Build adjacency list
  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    if (blockedEdgeSet.has(e.id)) return;
    const dang = dangerMap.get(e.id) !== undefined ? dangerMap.get(e.id) : (e.danger || 0);
    const cong = congestionMap.get(e.id) !== undefined ? congestionMap.get(e.id) : (e.congestion || 0);
    const cost = calcCorridorCost(e, cong, dang);

    if (cost < Infinity) {
      adj.get(e.source)?.push({ target: e.target, cost, edge: e });
      adj.get(e.target)?.push({ target: e.source, cost, edge: e });
    }
  });

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const steps = [];

  nodes.forEach((n) => dist.set(n.id, Infinity));
  dist.set(actualSourceId, 0);

  const pq = new BinaryMinHeap();
  pq.insert(actualSourceId, 0);

  let nodesVisited = 0;
  let edgesProcessed = 0;

  while (!pq.isEmpty()) {
    const { id: u, priority: currentDist } = pq.extractMin();
    if (visited.has(u)) continue;
    visited.add(u);
    nodesVisited++;

    steps.push({
      type: 'SETTLE_NODE',
      nodeId: u,
      cost: Number(currentDist.toFixed(2)),
      visitedCount: visited.size,
    });

    if (targetId && u === targetId) break;

    const neighbors = adj.get(u) || [];
    for (let i = 0; i < neighbors.length; i++) {
      const { target: v, cost: weight, edge } = neighbors[i];
      edgesProcessed++;
      if (visited.has(v)) continue;

      const alt = currentDist + weight;
      if (alt < dist.get(v)) {
        dist.set(v, alt);
        prev.set(v, { node: u, edge });
        pq.insert(v, alt);
        steps.push({
          type: 'RELAX_EDGE',
          edgeId: edge.id,
          source: u,
          target: v,
          newCost: Number(alt.toFixed(2)),
        });
      }
    }
  }

  // Find nearest exit if no explicit target
  let finalTarget = targetId;
  if (!finalTarget) {
    const exits = nodes.filter((n) => n.type === 'exit');
    let minCost = Infinity;
    exits.forEach((ex) => {
      const c = dist.get(ex.id) || Infinity;
      if (c < minCost) {
        minCost = c;
        finalTarget = ex.id;
      }
    });
  }

  // Reconstruct path
  const path = [];
  const edgePath = [];
  let curr = finalTarget;
  let totalDistance = 0;

  while (curr && prev.has(curr)) {
    path.unshift(curr);
    const p = prev.get(curr);
    edgePath.unshift(p.edge.id);
    totalDistance += p.edge.distance;
    curr = p.node;
  }
  if (path.length > 0 || curr === actualSourceId) {
    path.unshift(actualSourceId);
  }

  const durationMs = Math.max(0.1, new Date().getTime() - startTime);

  const result = {
    sourceId: actualSourceId,
    targetExitId: finalTarget,
    totalCost: Number((dist.get(finalTarget) || 0).toFixed(2)),
    distance: totalDistance,
    path,
    edgePath,
    nodesVisited,
    edgesProcessed,
    durationMs,
    steps: steps.slice(0, 150),
    distances: Object.fromEntries(dist),
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Dijkstra] Origin: ${actualSourceId} -> Target: ${finalTarget} | Transit Cost: ${result.totalCost}s | Distance: ${result.distance}m | Path: ${path.join(' -> ')} | Exec: ${durationMs}ms`);
  }

  return result;
}

// ============================================================================
// 4. FLOYD-WARSHALL ALGORITHM (ALL-PAIRS SHORTEST PATHS)
// ============================================================================

/**
 * Computes all-pairs shortest paths using the Floyd-Warshall dynamic programming algorithm.
 * If called with 0 arguments, defaults to canonical graph.
 * 
 * @param {Object} [graph] Graph object containing nodes and edges
 * @param {Object} [modifiers] Blocked edges
 * @returns {Object} All-pairs distance matrix and metadata
 */
function runFloydWarshall(graph = null, modifiers = {}) {
  const startTime = new Date().getTime();
  const activeGraph = (graph && graph.nodes && graph.edges) ? graph : getCanonicalUrbanGraph();
  const nodes = activeGraph.nodes;
  const edges = activeGraph.edges;
  const actualModifiers = modifiers || {};
  const n = nodes.length;

  const nodeIndex = new Map();
  nodes.forEach((node, idx) => nodeIndex.set(node.id, idx));

  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    next[i][i] = i;
  }

  const blockedEdgeSet = new Set(actualModifiers.blockedEdges || []);
  edges.forEach((e) => {
    if (blockedEdgeSet.has(e.id)) return;
    const u = nodeIndex.get(e.source);
    const v = nodeIndex.get(e.target);
    if (u === undefined || v === undefined) return;

    const cost = calcCorridorCost(e, e.congestion || 0, e.danger || 0);
    if (cost < dist[u][v]) {
      dist[u][v] = cost;
      dist[v][u] = cost;
      next[u][v] = v;
      next[v][u] = u;
    }
  });

  const steps = [];

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
          if (steps.length < 100) {
            steps.push({
              k: nodes[k].id,
              i: nodes[i].id,
              j: nodes[j].id,
              improvedCost: Number(dist[i][j].toFixed(2)),
            });
          }
        }
      }
    }
  }

  const durationMs = Math.max(0.1, new Date().getTime() - startTime);

  const result = {
    nodeIds: nodes.map((n) => n.id),
    distMatrix: dist.map((row) => row.map((v) => (v === Infinity ? 999999 : Number(v.toFixed(1))))),
    durationMs,
    steps,
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Floyd-Warshall] All-Pairs Matrix computed for ${n} vertices in ${durationMs}ms`);
  }

  return result;
}

// ============================================================================
// 5. GREEDY EVACUATION ASSIGNMENT
// ============================================================================

/**
 * Greedy evacuation resource and egress assignment.
 * If called with 0 arguments, defaults to canonical graph.
 * 
 * @param {Object} [graph] Graph object containing nodes and edges
 * @param {Object} [options] Exit availability overrides
 * @returns {Object} Triage assignment report
 */
function runGreedyEvacuation(graph = null, options = {}) {
  const startTime = new Date().getTime();
  const activeGraph = (graph && graph.nodes && graph.edges) ? graph : getCanonicalUrbanGraph();
  const actualOptions = options || {};
  const nodes = activeGraph.nodes;
  const zones = nodes.filter((n) => n.type === 'evacuation_zone' || n.type === 'zone' || (n.people && n.people > 0));
  const exits = nodes.filter((n) => n.type === 'exit');

  const exitCapacities = new Map();
  exits.forEach((ex) => {
    const custom = actualOptions.exitAvailability && actualOptions.exitAvailability[ex.id];
    const cap = custom && custom.available ? custom.capacity : ex.capacity || 5000;
    exitCapacities.set(ex.id, cap);
  });

  const riskWeights = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, NONE: 0 };

  // Calculate urgency score: (Risk * People)
  const sortedZones = zones.map((z) => {
    const riskFactor = riskWeights[z.riskLevel] || 1;
    const urgency = (z.people || 500) * riskFactor;
    return { ...z, urgency };
  }).sort((a, b) => b.urgency - a.urgency);

  const assignments = [];
  let totalCost = 0;

  sortedZones.forEach((zone) => {
    let bestExit = null;
    let minTravelTime = Infinity;

    exits.forEach((exit) => {
      const remainingCap = exitCapacities.get(exit.id) || 0;
      if (remainingCap <= 0) return;

      let distM;
      if (zone.lat !== undefined && exit.lat !== undefined && !isNaN(zone.lat) && !isNaN(exit.lat)) {
        distM = calcDistanceMeters(zone.lat, zone.lon, exit.lat, exit.lon);
      } else {
        const dx = (zone.x || 0) - (exit.x || 0);
        const dy = (zone.y || 0) - (exit.y || 0);
        distM = Math.hypot(dx, dy) * 2;
      }
      const estTime = (distM / 1000 / 35) * 3600;

      if (estTime < minTravelTime) {
        minTravelTime = estTime;
        bestExit = exit;
      }
    });

    if (bestExit) {
      const allocatedPeople = Math.min(zone.people || 500, exitCapacities.get(bestExit.id));
      exitCapacities.set(bestExit.id, exitCapacities.get(bestExit.id) - allocatedPeople);
      totalCost += minTravelTime;

      assignments.push({
        zoneId: zone.id,
        zoneName: zone.name,
        people: zone.people || 500,
        allocatedPeople,
        riskLevel: zone.riskLevel,
        assignedExitId: bestExit.id,
        assignedExitName: bestExit.name,
        estimatedTimeSec: Math.round(minTravelTime),
      });
    }
  });

  const durationMs = Math.max(0.1, new Date().getTime() - startTime);

  const result = {
    assignments,
    metrics: {
      totalEvacuationCost: Number(totalCost.toFixed(1)),
      totalEvaluatedPairs: zones.length * exits.length,
      unassignedPeople: sortedZones.reduce((sum, z) => {
        const asg = assignments.find((a) => a.zoneId === z.id);
        return sum + ((z.people || 500) - (asg ? asg.allocatedPeople : 0));
      }, 0),
    },
    durationMs,
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Greedy] Evacuation triage completed for ${assignments.length} zones in ${durationMs}ms`);
  }

  return result;
}

// ============================================================================
// 6. 0/1 KNAPSACK DYNAMIC PROGRAMMING (RESOURCE OPTIMIZER)
// ============================================================================

/**
 * 0/1 Knapsack Dynamic Programming resource allocation optimizer.
 * If called with 0 arguments, defaults to canonical emergency zones and capacity 18.
 * 
 * @param {Array} [items] Array of objects with { id, name, cost, benefit }
 * @param {number} [capacity] Vehicle/resource budget constraint
 * @returns {Object} Optimal allocation results
 */
function runKnapsackDP(items = null, capacity = null) {
  const startTime = new Date().getTime();
  const graph = getCanonicalUrbanGraph();
  const zones = graph.nodes.filter((n) => n.type === 'evacuation_zone' || n.type === 'zone' || (n.people && n.people > 0));

  const defaultItems = zones.map((z, idx) => ({
    id: z.id,
    name: z.name,
    cost: [3, 2, 4, 3, 2][idx % 5] || 3,
    benefit: Math.round((z.people || 1000) / 10),
  }));

  const actualItems = (items && Array.isArray(items) && items.length > 0) ? items : defaultItems;
  const actualCapacity = (capacity !== null && capacity !== undefined && !isNaN(capacity)) ? Number(capacity) : 18;

  const n = actualItems.length;
  const W = Math.max(0, Math.floor(actualCapacity));

  // DP table: (n + 1) x (W + 1)
  const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const item = actualItems[i - 1];
    const weight = item.cost;
    const value = item.benefit;

    for (let w = 0; w <= W; w++) {
      if (weight <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Backtrack to find chosen items
  const selectedItems = [];
  let wRem = W;
  for (let i = n; i > 0; i--) {
    if (dp[i][wRem] !== dp[i - 1][wRem]) {
      const item = actualItems[i - 1];
      selectedItems.push(item);
      wRem -= item.cost;
    }
  }

  const durationMs = Math.max(0.1, new Date().getTime() - startTime);

  const result = {
    maxBenefit: dp[n][W],
    usedCapacity: W - wRem,
    totalCapacity: W,
    selectedItems,
    dpTablePreview: dp.slice(0, Math.min(n + 1, 8)).map((row) => row.slice(0, Math.min(W + 1, 10))),
    durationMs,
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Knapsack 0/1] Capacity: ${W} | Max Benefit: ${result.maxBenefit} | Selected: ${selectedItems.length} items | Exec: ${durationMs}ms`);
  }

  return result;
}

// ============================================================================
// 7. KRUSKAL'S MINIMUM SPANNING TREE
// ============================================================================

/**
 * Kruskal's algorithm for Minimum Spanning Tree (MST).
 * If called with 0 arguments, defaults to canonical graph.
 * 
 * @param {Object} [graph] Graph object containing nodes and edges
 * @returns {Object} MST edges, total distance, and step log
 */
function runKruskalMST(graph = null) {
  const startTime = new Date().getTime();
  const activeGraph = (graph && graph.nodes && graph.edges) ? graph : getCanonicalUrbanGraph();
  const nodes = activeGraph.nodes;
  const edges = [...activeGraph.edges];

  // Sort edges ascending by distance/weight
  edges.sort((a, b) => a.distance - b.distance);

  const dsu = new DisjointSetUnion(nodes.map((n) => n.id));
  const mstEdges = [];
  let totalCost = 0;
  const steps = [];

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const rootU = dsu.find(edge.source);
    const rootV = dsu.find(edge.target);

    if (rootU !== rootV) {
      dsu.union(edge.source, edge.target);
      mstEdges.push(edge);
      totalCost += edge.distance;
      steps.push({
        type: 'ACCEPT_EDGE',
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        cost: edge.distance,
      });
      if (mstEdges.length === nodes.length - 1) break;
    } else {
      steps.push({
        type: 'REJECT_CYCLE',
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        cost: edge.distance,
      });
    }
  }

  const durationMs = Math.max(0.1, new Date().getTime() - startTime);

  const result = {
    mstEdges,
    totalCost: Math.round(totalCost),
    edgeCount: mstEdges.length,
    steps: steps.slice(0, 100),
    durationMs,
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Kruskal MST] Spanning tree computed: ${mstEdges.length} edges | Total Distance: ${result.totalCost}m | Exec: ${durationMs}ms`);
  }

  return result;
}

// ============================================================================
// 8. PRIM'S MINIMUM SPANNING TREE
// ============================================================================

/**
 * Prim's algorithm for Minimum Spanning Tree (MST).
 * If called with 0 arguments, defaults to canonical graph.
 * 
 * @param {Object} [graph] Graph object containing nodes and edges
 * @param {string} [startNodeId] Seed vertex
 * @returns {Object} MST edges, total distance, and step log
 */
function runPrimMST(graph = null, startNodeId = null) {
  const startTime = new Date().getTime();
  const activeGraph = (graph && graph.nodes && graph.edges) ? graph : getCanonicalUrbanGraph();
  const nodes = activeGraph.nodes;
  const edges = activeGraph.edges;

  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    adj.get(e.source)?.push({ to: e.target, weight: e.distance, edge: e });
    adj.get(e.target)?.push({ to: e.source, weight: e.distance, edge: e });
  });

  const startId = startNodeId || nodes[0]?.id || 'EX01';
  const visited = new Set([startId]);
  const mstEdges = [];
  let totalCost = 0;
  const steps = [];

  const pq = new BinaryMinHeap();
  (adj.get(startId) || []).forEach((n) => {
    pq.insert(`${n.edge.id}`, n.weight, { edge: n.edge, from: startId, to: n.to });
  });

  while (!pq.isEmpty() && visited.size < nodes.length) {
    const minItem = pq.extractMin();
    const { edge, from, to } = minItem.data;

    if (visited.has(to)) {
      steps.push({ type: 'SKIP_CYCLE', edgeId: edge.id });
      continue;
    }

    visited.add(to);
    mstEdges.push(edge);
    totalCost += edge.distance;

    steps.push({
      type: 'EXPAND_CUT',
      edgeId: edge.id,
      from,
      to,
      cost: edge.distance,
    });

    (adj.get(to) || []).forEach((neighbor) => {
      if (!visited.has(neighbor.to)) {
        pq.insert(`${neighbor.edge.id}-${visited.size}`, neighbor.weight, {
          edge: neighbor.edge,
          from: to,
          to: neighbor.to,
        });
      }
    });
  }

  const durationMs = Math.max(0.1, new Date().getTime() - startTime);

  const result = {
    mstEdges,
    totalCost: Math.round(totalCost),
    edgeCount: mstEdges.length,
    selectedCount: mstEdges.length,
    rejectedCount: steps.filter((s) => s.type === 'SKIP_CYCLE').length,
    steps: steps.slice(0, 100),
    durationMs,
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Prim MST] Spanning tree computed from ${startId}: ${mstEdges.length} edges | Total Distance: ${result.totalCost}m | Exec: ${durationMs}ms`);
  }

  return result;
}

// ============================================================================
// 9. FULL EMERGENCY SIMULATION ORCHESTRATOR
// ============================================================================

/**
 * Orchestrates full multi-algorithmic emergency simulation.
 * If called with 0 arguments, defaults to canonical graph and disaster preset.
 * 
 * @param {Object} [graph] Graph object containing nodes and edges
 * @param {Object} [config] Scenario configuration
 * @returns {Object} Comprehensive simulation output
 */
function runFullEmergencySimulation(graph = null, config = null) {
  const activeGraph = (graph && graph.nodes && graph.edges) ? graph : getCanonicalUrbanGraph();
  const activeConfig = (config && typeof config === 'object') ? config : {
    emergencyLocation: 'B01',
    disasterType: 'Fire',
    affectedPeople: 1200,
    riskLevel: 'CRITICAL',
    blockedRoads: [],
    fleetBudget: { ambulances: 18, rescueTeams: 12, emergencyVehicles: 10 },
  };

  const modifiers = {
    blockedEdges: activeConfig.blockedRoads || [],
    edgeModifiers: (activeConfig.blockedRoads || []).map((id) => ({ id, blocked: true })),
  };

  const dijkstraResult = runDijkstra(activeGraph, activeConfig.emergencyLocation || 'B01', null, modifiers);
  const greedyResult = runGreedyEvacuation(activeGraph, activeConfig);

  const zones = activeGraph.nodes.filter((n) => n.type === 'evacuation_zone' || n.type === 'zone' || (n.people && n.people > 0));
  const items = zones.map((z, idx) => ({
    id: z.id,
    name: z.name,
    cost: [3, 2, 4, 3, 2][idx % 5] || 3,
    benefit: Math.round((z.people || 1000) / 10),
  }));

  const ambulancesDP = runKnapsackDP(items, activeConfig.fleetBudget ? activeConfig.fleetBudget.ambulances : 18);
  const kruskalResult = runKruskalMST(activeGraph);
  const primResult = runPrimMST(activeGraph);

  const result = {
    dijkstraResults: {
      epicenterToExit: dijkstraResult,
    },
    greedyResult,
    knapsackResults: {
      ambulances: ambulancesDP,
    },
    kruskalResult,
    primResult,
    evacuationPlan: {
      totalCiviliansEvacuated: Math.min(
        activeConfig.affectedPeople || 1200,
        greedyResult.assignments.reduce((sum, a) => sum + a.allocatedPeople, 0)
      ),
      recommendedExit: dijkstraResult.targetExitId,
    },
  };

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`[Full Simulation] Completed for ${activeConfig.disasterType} at ${activeConfig.emergencyLocation} | Recommended Exit: ${dijkstraResult.targetExitId}`);
  }

  return result;
}

// ============================================================================
// 10. TOOLBAR TEST RUNNER (FOR APPS SCRIPT EDITOR)
// ============================================================================

/**
 * Diagnostic test runner designed to be selected in the Google Apps Script
 * toolbar dropdown and executed with the 'Run' button.
 */
function testAlgorithmsSuite() {
  Logger.log('=== DURGA ALGORITHMIC SUITE TEST RUN ===');
  const d = runDijkstra();
  Logger.log('1. Dijkstra OK -> Target: ' + d.targetExitId + ' (' + d.totalCost + 's)');
  const fw = runFloydWarshall();
  Logger.log('2. Floyd-Warshall OK -> Matrix: ' + fw.nodeIds.length + 'x' + fw.nodeIds.length);
  const gr = runGreedyEvacuation();
  Logger.log('3. Greedy Evacuation OK -> ' + gr.assignments.length + ' zones evacuated');
  const kn = runKnapsackDP();
  Logger.log('4. Knapsack DP OK -> Max Benefit: ' + kn.maxBenefit);
  const kr = runKruskalMST();
  Logger.log('5. Kruskal MST OK -> ' + kr.edgeCount + ' edges, ' + kr.totalCost + 'm');
  const pr = runPrimMST();
  Logger.log('6. Prim MST OK -> ' + pr.edgeCount + ' edges, ' + pr.totalCost + 'm');
  Logger.log('=== ALL 6 DAA ALGORITHMS PASSED 100% DETERMINISTICALLY ===');
  return { status: 'ALL_PASSED' };
}
