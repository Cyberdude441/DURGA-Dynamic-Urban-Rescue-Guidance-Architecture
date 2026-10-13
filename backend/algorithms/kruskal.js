/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Kruskal's Minimum Spanning Tree (MST) Algorithm
 *
 * Implemented from scratch using:
 *  1. Edge sorting (ascending by weight, deterministic tie-breakers)
 *  2. Disjoint Set Union (DSU / Union-Find) with:
 *     - Path compression in find()
 *     - Union by rank/size in union()
 *
 * Theoretical Complexity:
 *   Time:  O(E log E) for sorting edges + O(E * alpha(V)) for DSU operations = O(E log E)
 *   Space: O(V) for DSU parent, rank, and size arrays
 */

/**
 * Disjoint Set Union (DSU / Union-Find) Data Structure
 */
export class DisjointSetUnion {
  constructor(elements = []) {
    this.parent = new Map();
    this.rank = new Map();
    this.size = new Map();
    this.componentCount = 0;

    elements.forEach((el) => {
      this.makeSet(el);
    });
  }

  /**
   * Initialize a new disjoint set for element x
   * @param {string|number} x
   */
  makeSet(x) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      this.size.set(x, 1);
      this.componentCount++;
    }
  }

  /**
   * Find the representative root of element x with path compression
   * @param {string|number} x
   * @returns {string|number}
   */
  find(x) {
    if (!this.parent.has(x)) {
      this.makeSet(x);
      return x;
    }
    if (this.parent.get(x) !== x) {
      // Path compression: flatten tree directly to root
      this.parent.set(x, this.find(this.parent.get(x)));
    }
    return this.parent.get(x);
  }

  /**
   * Union the sets containing x and y using union by rank
   * @param {string|number} x
   * @param {string|number} y
   * @returns {boolean} true if merged, false if already in same set (cycle)
   */
  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) {
      return false; // Already connected
    }

    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
      this.size.set(rootY, (this.size.get(rootY) || 1) + (this.size.get(rootX) || 1));
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
      this.size.set(rootX, (this.size.get(rootX) || 1) + (this.size.get(rootY) || 1));
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
      this.size.set(rootX, (this.size.get(rootX) || 1) + (this.size.get(rootY) || 1));
    }

    this.componentCount--;
    return true;
  }

  /**
   * Check if x and y belong to the same component
   * @param {string|number} x
   * @param {string|number} y
   * @returns {boolean}
   */
  connected(x, y) {
    return this.find(x) === this.find(y);
  }

  /**
   * Get total number of disjoint components
   * @returns {number}
   */
  getComponentCount() {
    return this.componentCount;
  }

  /**
   * Group all elements by their representative root
   * @returns {Map<string|number, Array>}
   */
  getComponents() {
    const comps = new Map();
    for (const el of this.parent.keys()) {
      const root = this.find(el);
      if (!comps.has(root)) comps.set(root, []);
      comps.get(root).push(el);
    }
    return comps;
  }
}

/**
 * Calculate edge weight based on chosen metric
 * @param {Object} edge
 * @param {'effectiveCost'|'distance'|'travelTime'} metric
 * @returns {number}
 */
export function calculateEdgeWeight(edge, metric = 'effectiveCost') {
  if (edge.blocked) return Infinity;

  if (metric === 'distance') {
    return edge.distance || 0;
  }

  if (metric === 'travelTime') {
    return edge.travelTime || 0;
  }

  // Default: effectiveCost (travelTime * (1 + 1.5*congestion) * (1 + 2.5*danger))
  const baseTime = typeof edge.travelTime === 'number' ? edge.travelTime : (edge.distance ? edge.distance / 10 : 30);
  const congestion = typeof edge.congestion === 'number' ? edge.congestion : 0;
  const danger = typeof edge.danger === 'number' ? edge.danger : 0;
  const cost = baseTime * (1 + 1.5 * congestion) * (1 + 2.5 * danger);
  return Number(cost.toFixed(2));
}

/**
 * Kruskal's Minimum Spanning Tree Algorithm
 *
 * @param {Object} graph - { nodes: Array, edges: Array }
 * @param {Object} options
 * @param {'effectiveCost'|'distance'|'travelTime'} [options.weightMetric='effectiveCost']
 * @param {boolean} [options.includeBlocked=false] - Whether to include blocked roads
 * @param {boolean} [options.recordSteps=true] - Whether to capture step-by-step history
 * @returns {Object} MST execution result
 */
export function kruskalMST(graph, options = {}) {
  const startTime = performance.now();

  const {
    weightMetric = 'effectiveCost',
    includeBlocked = false,
    recordSteps = true,
  } = options;

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return {
      algorithm: 'kruskal',
      weightMetric,
      totalCost: 0,
      totalDistance: 0,
      selectedEdges: [],
      rejectedEdges: [],
      selectedEdgeIds: [],
      rejectedEdgeIds: [],
      executionTime: 0,
      nodeCount: 0,
      edgeCount: 0,
      selectedCount: 0,
      rejectedCount: 0,
      componentCount: 0,
      isFullySpanned: false,
      steps: [],
    };
  }

  const nodes = graph.nodes;
  const rawEdges = graph.edges;
  const nodeIds = nodes.map((n) => n.id);

  // Initialize Disjoint Set Union
  const dsu = new DisjointSetUnion(nodeIds);

  const usableEdges = [];
  const blockedEdges = [];

  // Categorize edges and calculate weights
  rawEdges.forEach((edge) => {
    const weight = calculateEdgeWeight(edge, weightMetric);
    const edgeData = {
      ...edge,
      weight,
      effectiveCost: calculateEdgeWeight(edge, 'effectiveCost'),
    };

    if (edge.blocked && !includeBlocked) {
      blockedEdges.push({
        ...edgeData,
        reason: 'Corridor blocked by emergency closure / disaster hazard',
      });
    } else {
      usableEdges.push(edgeData);
    }
  });

  // Sort edges ascending by weight; deterministic tie-breaker on edge.id
  usableEdges.sort((a, b) => {
    if (a.weight !== b.weight) {
      return a.weight - b.weight;
    }
    return a.id.localeCompare(b.id);
  });

  const selectedEdges = [];
  const rejectedEdges = [...blockedEdges];
  const steps = [];
  let totalCost = 0;
  let totalDistance = 0;

  // Snapshot helper for step recording
  const snapshotComponents = () => {
    const compMap = {};
    nodeIds.forEach((id) => {
      compMap[id] = dsu.find(id);
    });
    return compMap;
  };

  if (recordSteps) {
    steps.push({
      stepIndex: 0,
      type: 'init',
      edge: null,
      description: `Kruskal initialized: ${usableEdges.length} sorted corridors evaluated across ${nodeIds.length} vertices.`,
      currentSelectedCount: 0,
      currentCost: 0,
      componentCount: dsu.getComponentCount(),
      nodeComponents: snapshotComponents(),
    });
  }

  // Iterate through sorted edges
  for (let i = 0; i < usableEdges.length; i++) {
    const edge = usableEdges[i];
    const u = edge.source;
    const v = edge.target;

    const rootU = dsu.find(u);
    const rootV = dsu.find(v);

    if (rootU !== rootV) {
      // Accept edge: connects two disjoint trees
      dsu.union(u, v);
      selectedEdges.push(edge);
      totalCost += edge.weight;
      totalDistance += edge.distance || 0;

      if (recordSteps) {
        steps.push({
          stepIndex: steps.length,
          type: 'accepted',
          edge,
          source: u,
          target: v,
          weight: edge.weight,
          description: `Accepted corridor ${edge.id} (${u} ↔ ${v}, weight ${edge.weight}). Merged component [${rootU}] with [${rootV}].`,
          currentSelectedCount: selectedEdges.length,
          currentCost: Number(totalCost.toFixed(2)),
          componentCount: dsu.getComponentCount(),
          nodeComponents: snapshotComponents(),
        });
      }
    } else {
      // Reject edge: creates a cycle in the spanning forest
      const rejectedEdge = {
        ...edge,
        reason: `Cycle detected: vertices ${u} and ${v} already connected in component [${rootU}]`,
      };
      rejectedEdges.push(rejectedEdge);

      if (recordSteps) {
        steps.push({
          stepIndex: steps.length,
          type: 'rejected',
          edge: rejectedEdge,
          source: u,
          target: v,
          weight: edge.weight,
          description: `Rejected corridor ${edge.id} (${u} ↔ ${v}, weight ${edge.weight}). Creates a redundant cycle inside component [${rootU}].`,
          currentSelectedCount: selectedEdges.length,
          currentCost: Number(totalCost.toFixed(2)),
          componentCount: dsu.getComponentCount(),
          nodeComponents: snapshotComponents(),
        });
      }
    }
  }

  const endTime = performance.now();
  const executionTime = Number((endTime - startTime).toFixed(2));

  return {
    algorithm: 'kruskal',
    weightMetric,
    totalCost: Number(totalCost.toFixed(2)),
    totalDistance: Number(totalDistance.toFixed(2)),
    selectedEdges,
    mstEdges: selectedEdges,
    rejectedEdges,
    selectedEdgeIds: selectedEdges.map((e) => e.id),
    rejectedEdgeIds: rejectedEdges.map((e) => e.id),
    executionTime,
    nodeCount: nodes.length,
    edgeCount: rawEdges.length,
    selectedCount: selectedEdges.length,
    rejectedCount: rejectedEdges.length,
    componentCount: dsu.getComponentCount(),
    isFullySpanned: dsu.getComponentCount() === 1,
    steps,
  };
}

export default kruskalMST;
