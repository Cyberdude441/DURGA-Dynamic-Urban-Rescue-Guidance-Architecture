/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Dijkstra's Single-Source Shortest Path Algorithm
 *
 * Implemented from scratch using a Binary Min-Heap Priority Queue.
 * Uses the project's effective edge cost model:
 *   cost = travelTime * (1 + 1.5 * congestion) * (1 + 2.5 * danger)
 * Blocked roads (edge.blocked === true) have infinite resistance and are NOT traversed.
 *
 * Theoretical Complexity:
 *   Time:  O((V + E) log V) with Min-Heap
 *   Space: O(V) for distance table, previous pointers, and visited sets
 */

/**
 * Binary Min-Heap Priority Queue
 */
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(element, priority) {
    this.heap.push({ element, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
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

  _bubbleUp(index) {
    const item = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (item.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIdx] = item;
      index = parentIdx;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const item = this.heap[index];

    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let swapIdx = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < item.priority) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        if (
          (swapIdx === null && this.heap[rightChildIdx].priority < item.priority) ||
          (swapIdx !== null && this.heap[rightChildIdx].priority < this.heap[leftChildIdx].priority)
        ) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = item;
      index = swapIdx;
    }
  }
}

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
 * Dijkstra's Shortest Path Algorithm from scratch
 *
 * @param {Object} graph - { nodes: Array, edges: Array }
 * @param {string} source - Source node ID (e.g. 'B01')
 * @param {string} destination - Destination node ID (e.g. 'EX01')
 * @param {Object} [options]
 * @param {boolean} [options.bidirectional=true] - Roads allow travel in both directions
 * @param {boolean} [options.recordSteps=false] - Record step-by-step state for visualizer
 * @returns {Object} { path, totalCost, distance, nodesVisited, edgesProcessed, executionTime, steps }
 */
export function dijkstra(graph, source, destination, options = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { bidirectional = true, recordSteps = false } = options;

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return {
      path: [],
      totalCost: Infinity,
      distance: 0,
      nodesVisited: 0,
      edgesProcessed: 0,
      executionTime: 0,
      steps: [],
    };
  }

  // 1. Build Adjacency List (filtering out permanently impassable / blocked roads)
  const adjList = new Map();
  const nodeIds = new Set();

  graph.nodes.forEach((node) => {
    adjList.set(node.id, []);
    nodeIds.add(node.id);
  });

  graph.edges.forEach((edge) => {
    // Strictly skip blocked roads
    if (edge.blocked) return;

    const cost = getEffectiveEdgeCost(edge);
    if (!isFinite(cost)) return;

    const distance = Number(edge.distance) || 0;

    if (adjList.has(edge.source)) {
      adjList.get(edge.source).push({
        target: edge.target,
        cost,
        distance,
        edgeId: edge.id,
        edgeData: edge,
      });
    }

    if (bidirectional && adjList.has(edge.target)) {
      adjList.get(edge.target).push({
        target: edge.source,
        cost,
        distance,
        edgeId: edge.id,
        edgeData: edge,
      });
    }
  });

  // Verify source and destination exist
  if (!nodeIds.has(source) || !nodeIds.has(destination)) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      path: [],
      totalCost: Infinity,
      distance: 0,
      nodesVisited: 0,
      edgesProcessed: 0,
      executionTime: Math.max(0.01, endTime - startTime),
      steps: [],
    };
  }

  // 2. Initialize Distance and Predecessor Tables
  const distances = {};
  const physicalDistances = {};
  const previous = {};
  const previousEdge = {};
  const visitedSet = new Set();
  const unvisitedSet = new Set(nodeIds);

  nodeIds.forEach((id) => {
    distances[id] = Infinity;
    physicalDistances[id] = 0;
    previous[id] = null;
    previousEdge[id] = null;
  });

  distances[source] = 0;

  const pq = new PriorityQueue();
  pq.push(source, 0);

  let edgesProcessed = 0;
  const steps = [];

  // Initial step snapshot
  if (recordSteps) {
    steps.push({
      stepIndex: 0,
      type: 'init',
      current: source,
      visited: [],
      unvisited: Array.from(unvisitedSet),
      distances: { ...distances },
      description: `Initialized Dijkstra at source vertex ${source}. Distance set to 0.`,
    });
  }

  // 3. Main Dijkstra Loop
  while (!pq.isEmpty()) {
    const { element: current, priority: currentDist } = pq.pop();

    // Skip if we already finalized this vertex
    if (visitedSet.has(current)) continue;

    visitedSet.add(current);
    unvisitedSet.delete(current);

    if (recordSteps && steps.length < 150) {
      steps.push({
        stepIndex: steps.length,
        type: 'visit',
        current,
        visited: Array.from(visitedSet),
        unvisited: Array.from(unvisitedSet),
        distances: { ...distances },
        description: `Settled vertex ${current} with minimum cost ${currentDist.toFixed(1)}s.`,
      });
    }

    // Early termination if we reached destination
    if (current === destination) {
      break;
    }

    // If remaining smallest distance is infinity, remaining nodes are unreachable
    if (currentDist === Infinity) break;

    // Relax all outgoing edges
    const neighbors = adjList.get(current) || [];
    for (const neighbor of neighbors) {
      edgesProcessed += 1;
      const { target, cost, distance: edgeDistance, edgeId } = neighbor;

      if (visitedSet.has(target)) continue;

      const candidateDist = currentDist + cost;

      if (candidateDist < distances[target]) {
        distances[target] = candidateDist;
        physicalDistances[target] = physicalDistances[current] + edgeDistance;
        previous[target] = current;
        previousEdge[target] = edgeId;
        pq.push(target, candidateDist);

        if (recordSteps && steps.length < 150) {
          steps.push({
            stepIndex: steps.length,
            type: 'relax',
            current,
            neighbor: target,
            edgeId,
            cost: candidateDist,
            visited: Array.from(visitedSet),
            unvisited: Array.from(unvisitedSet),
            distances: { ...distances },
            description: `Relaxed edge ${edgeId} (${current} → ${target}): updated cost to ${candidateDist.toFixed(1)}s.`,
          });
        }
      }
    }
  }

  // 4. Reconstruct Shortest Path from Destination back to Source
  const path = [];
  const pathEdges = [];
  let curr = destination;

  if (distances[destination] !== Infinity) {
    while (curr) {
      path.unshift(curr);
      if (previousEdge[curr]) {
        pathEdges.unshift(previousEdge[curr]);
      }
      curr = previous[curr];
    }
  }

  // If path exists but does not start at source, destination was unreachable
  const finalPath = path.length > 0 && path[0] === source ? path : [];
  const totalCost = finalPath.length > 0 ? Math.round(distances[destination] * 100) / 100 : Infinity;
  const totalDistance = finalPath.length > 0 ? physicalDistances[destination] : 0;

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTime = Math.max(0.01, Math.round((endTime - startTime) * 100) / 100);

  if (recordSteps) {
    steps.push({
      stepIndex: steps.length,
      type: 'done',
      current: destination,
      finalPath,
      pathEdges,
      visited: Array.from(visitedSet),
      unvisited: Array.from(unvisitedSet),
      distances: { ...distances },
      description:
        finalPath.length > 0
          ? `Path found! Optimal route: ${finalPath.join(' → ')} with total cost ${totalCost}s (${totalDistance}m).`
          : `No valid route found. Destination ${destination} is cut off by road closures.`,
    });
  }

  return {
    path: finalPath,
    pathEdges,
    totalCost,
    distance: totalDistance,
    nodesVisited: visitedSet.size,
    edgesProcessed,
    executionTime,
    steps,
  };
}

export default dijkstra;
