/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Prim's Minimum Spanning Tree (MST) Algorithm
 *
 * Implemented from scratch using:
 *  1. Priority-based edge selection via Binary Min-Heap
 *  2. Frontier cut relaxation and visited vertex tracking
 *  3. Spanning Forest fallback for disconnected network partitions
 *
 * Theoretical Complexity:
 *   Time:  O(E log V) with Binary Min-Heap
 *   Space: O(V + E) for adjacency list, visited set, and heap
 */

import { calculateEdgeWeight } from './kruskal.js';

/**
 * Binary Min-Heap Priority Queue for Prim's Algorithm
 */
export class PrimPriorityQueue {
  constructor() {
    this.heap = [];
  }

  /**
   * Push an item into the min-heap with a given priority
   * @param {Object} item - { edge, from, to, weight }
   * @param {number} priority - edge weight
   */
  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Extract and return minimum priority item
   * @returns {Object|null}
   */
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

  size() {
    return this.heap.length;
  }

  _bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];

      // Min-heap ordering; tie-breaker on edge id for determinism
      if (
        element.priority > parent.priority ||
        (element.priority === parent.priority &&
          element.item?.edge?.id >= parent.item?.edge?.id)
      ) {
        break;
      }

      this.heap[index] = parent;
      this.heap[parentIdx] = element;
      index = parentIdx;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];

    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swapIdx = null;

      if (leftChildIdx < length) {
        const leftChild = this.heap[leftChildIdx];
        if (
          leftChild.priority < element.priority ||
          (leftChild.priority === element.priority &&
            leftChild.item?.edge?.id < element.item?.edge?.id)
        ) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const rightChild = this.heap[rightChildIdx];
        const compareWith = swapIdx === null ? element : this.heap[swapIdx];

        if (
          rightChild.priority < compareWith.priority ||
          (rightChild.priority === compareWith.priority &&
            rightChild.item?.edge?.id < compareWith.item?.edge?.id)
        ) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      index = swapIdx;
    }
  }
}

/**
 * Prim's Minimum Spanning Tree Algorithm
 *
 * @param {Object} graph - { nodes: Array, edges: Array }
 * @param {Object} options
 * @param {string} [options.startNodeId] - Root vertex to start expansion from (default: 'EX01' or nodes[0].id)
 * @param {'effectiveCost'|'distance'|'travelTime'} [options.weightMetric='effectiveCost']
 * @param {boolean} [options.includeBlocked=false] - Whether to include blocked roads
 * @param {boolean} [options.recordSteps=true] - Whether to capture step-by-step history
 * @returns {Object} MST execution result
 */
export function primMST(graph, options = {}) {
  const startTime = performance.now();

  const {
    startNodeId = null,
    weightMetric = 'effectiveCost',
    includeBlocked = false,
    recordSteps = true,
  } = options;

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return {
      algorithm: 'prim',
      startNode: null,
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
      visitedCount: 0,
      isFullySpanned: false,
      steps: [],
    };
  }

  const nodes = graph.nodes;
  const rawEdges = graph.edges;
  const nodeIds = nodes.map((n) => n.id);

  // Determine starting root vertex
  let activeStartNode = startNodeId;
  if (!activeStartNode || !nodeIds.includes(activeStartNode)) {
    const exitNode = nodes.find((n) => n.type === 'exit');
    activeStartNode = exitNode ? exitNode.id : (nodeIds[0] || 'B01');
  }

  // Build undirected adjacency list with weight calculations
  const adj = new Map();
  nodeIds.forEach((id) => adj.set(id, []));

  const blockedEdges = [];
  const edgeById = new Map();

  rawEdges.forEach((edge) => {
    const weight = calculateEdgeWeight(edge, weightMetric);
    const edgeData = {
      ...edge,
      weight,
      effectiveCost: calculateEdgeWeight(edge, 'effectiveCost'),
    };
    edgeById.set(edge.id, edgeData);

    if (edge.blocked && !includeBlocked) {
      blockedEdges.push({
        ...edgeData,
        reason: 'Corridor blocked by emergency closure / disaster hazard',
      });
    } else {
      if (adj.has(edge.source) && adj.has(edge.target)) {
        adj.get(edge.source).push({ neighbor: edge.target, edge: edgeData, weight });
        adj.get(edge.target).push({ neighbor: edge.source, edge: edgeData, weight });
      }
    }
  });

  const visited = new Set();
  const selectedEdges = [];
  const rejectedEdges = [...blockedEdges];
  const rejectedEdgeIds = new Set(blockedEdges.map((e) => e.id));
  const selectedEdgeIds = new Set();
  const steps = [];
  let totalCost = 0;
  let totalDistance = 0;

  const pq = new PrimPriorityQueue();

  // Helper to push all incident unblocked edges from a vertex to unvisited neighbors
  const pushIncidentEdges = (vertexId) => {
    const neighbors = adj.get(vertexId) || [];
    // Sort incident edges by weight & id for deterministic insertion
    const sortedNeighbors = [...neighbors].sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.edge.id.localeCompare(b.edge.id);
    });

    sortedNeighbors.forEach(({ neighbor, edge, weight }) => {
      if (!visited.has(neighbor)) {
        pq.push(
          {
            edge,
            from: vertexId,
            to: neighbor,
            weight,
          },
          weight
        );
      }
    });
  };

  if (recordSteps) {
    steps.push({
      stepIndex: 0,
      type: 'init',
      edge: null,
      currentVertex: activeStartNode,
      description: `Prim initialized at root vertex ${activeStartNode}. Priority Queue armed with incident cut edges.`,
      visitedCount: 0,
      currentSelectedCount: 0,
      currentCost: 0,
      visitedNodes: [],
    });
  }

  // Spanning Forest loop: ensures all disconnected components are spanned
  const remainingNodes = new Set(nodeIds);

  while (remainingNodes.size > 0) {
    // Pick the next root vertex (initial start node first, then any unvisited node)
    let currentRoot = null;
    if (remainingNodes.has(activeStartNode)) {
      currentRoot = activeStartNode;
    } else {
      currentRoot = remainingNodes.values().next().value;
    }

    if (!currentRoot) break;

    // Span root vertex
    visited.add(currentRoot);
    remainingNodes.delete(currentRoot);
    pushIncidentEdges(currentRoot);

    if (recordSteps && currentRoot !== activeStartNode) {
      steps.push({
        stepIndex: steps.length,
        type: 'new_component',
        edge: null,
        currentVertex: currentRoot,
        description: `Disconnected partition detected: Starting new tree component rooted at ${currentRoot}.`,
        visitedCount: visited.size,
        currentSelectedCount: selectedEdges.length,
        currentCost: Number(totalCost.toFixed(2)),
        visitedNodes: Array.from(visited),
      });
    }

    // Process priority queue for this component
    while (!pq.isEmpty()) {
      const minEntry = pq.pop();
      if (!minEntry) break;

      const { edge, from, to, weight } = minEntry.item;

      // Case 1: Target vertex already in the spanned tree (cut cycle)
      if (visited.has(to)) {
        if (!selectedEdgeIds.has(edge.id) && !rejectedEdgeIds.has(edge.id)) {
          const rejectedEdge = {
            ...edge,
            reason: `Cycle in cut: target vertex ${to} already spanned in tree`,
          };
          rejectedEdges.push(rejectedEdge);
          rejectedEdgeIds.add(edge.id);

          if (recordSteps) {
            steps.push({
              stepIndex: steps.length,
              type: 'rejected',
              edge: rejectedEdge,
              source: from,
              target: to,
              weight,
              description: `Rejected corridor ${edge.id} (${from} ↔ ${to}, weight ${weight}). Vertex ${to} is already in the spanned tree.`,
              visitedCount: visited.size,
              currentSelectedCount: selectedEdges.length,
              currentCost: Number(totalCost.toFixed(2)),
              visitedNodes: Array.from(visited),
            });
          }
        }
        continue;
      }

      // Case 2: Target vertex unvisited - accept edge!
      visited.add(to);
      remainingNodes.delete(to);
      selectedEdges.push(edge);
      selectedEdgeIds.add(edge.id);
      totalCost += weight;
      totalDistance += edge.distance || 0;

      if (recordSteps) {
        steps.push({
          stepIndex: steps.length,
          type: 'accepted',
          edge,
          source: from,
          target: to,
          weight,
          description: `Accepted corridor ${edge.id} (${from} ↔ ${to}, weight ${weight}). Spanned new vertex ${to} into tree.`,
          visitedCount: visited.size,
          currentSelectedCount: selectedEdges.length,
          currentCost: Number(totalCost.toFixed(2)),
          visitedNodes: Array.from(visited),
        });
      }

      // Expand frontier by pushing incident edges from newly spanned vertex
      pushIncidentEdges(to);
    }
  }

  // Account for any remaining graph edges that were neither selected nor rejected
  rawEdges.forEach((edge) => {
    if (!selectedEdgeIds.has(edge.id) && !rejectedEdgeIds.has(edge.id)) {
      const edgeData = edgeById.get(edge.id) || edge;
      const rejectedEdge = {
        ...edgeData,
        reason: 'Redundant corridor: endpoints already connected via alternative tree routes',
      };
      rejectedEdges.push(rejectedEdge);
      rejectedEdgeIds.add(edge.id);
    }
  });

  const endTime = performance.now();
  const executionTime = Number((endTime - startTime).toFixed(2));

  return {
    algorithm: 'prim',
    startNode: activeStartNode,
    weightMetric,
    totalCost: Number(totalCost.toFixed(2)),
    totalDistance: Number(totalDistance.toFixed(2)),
    selectedEdges,
    mstEdges: selectedEdges,
    rejectedEdges,
    selectedEdgeIds: Array.from(selectedEdgeIds),
    rejectedEdgeIds: Array.from(rejectedEdgeIds),
    executionTime,
    nodeCount: nodes.length,
    edgeCount: rawEdges.length,
    selectedCount: selectedEdges.length,
    rejectedCount: rejectedEdges.length,
    visitedCount: visited.size,
    isFullySpanned: visited.size === nodes.length,
    steps,
  };
}

export default primMST;
