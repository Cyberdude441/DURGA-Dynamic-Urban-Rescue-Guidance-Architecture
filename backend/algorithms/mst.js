/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Minimum Spanning Tree (MST) Algorithmic Suite
 *
 * Exposes Kruskal's MST, Prim's MST, and direct Kruskal vs Prim comparative benchmarking.
 */

import { kruskalMST, DisjointSetUnion, calculateEdgeWeight } from './kruskal.js';
import { primMST, PrimPriorityQueue } from './prim.js';

/**
 * Compare Kruskal and Prim execution results
 *
 * @param {Object} kruskalResult
 * @param {Object} primResult
 * @returns {Object} Comparative metrics & diagnostic diff
 */
export function compareMST(kruskalResult, primResult) {
  if (!kruskalResult || !primResult) {
    return {
      areCostsIdentical: false,
      costDifference: 0,
      kruskalCost: 0,
      primCost: 0,
      selectedEdgeCountMatch: false,
      kruskalSelectedCount: 0,
      primSelectedCount: 0,
      sharedEdges: [],
      kruskalExclusive: [],
      primExclusive: [],
      edgeOverlapPercent: 0,
      kruskalTime: 0,
      primTime: 0,
      fasterAlgorithm: 'N/A',
      speedRatio: 1,
      summary: 'Missing result data for comparison.',
    };
  }

  const kruskalEdgeSet = new Set(kruskalResult.selectedEdges.map((e) => e.id));
  const primEdgeSet = new Set(primResult.selectedEdges.map((e) => e.id));

  const sharedEdges = kruskalResult.selectedEdges.filter((e) => primEdgeSet.has(e.id));
  const kruskalExclusive = kruskalResult.selectedEdges.filter((e) => !primEdgeSet.has(e.id));
  const primExclusive = primResult.selectedEdges.filter((e) => !kruskalEdgeSet.has(e.id));

  const costDifference = Math.abs(kruskalResult.totalCost - primResult.totalCost);
  const areCostsIdentical = costDifference < 0.05;

  const maxSelected = Math.max(kruskalResult.selectedEdges.length, primResult.selectedEdges.length, 1);
  const edgeOverlapPercent = Number(((sharedEdges.length / maxSelected) * 100).toFixed(1));

  const kTime = Math.max(0.001, kruskalResult.executionTime);
  const pTime = Math.max(0.001, primResult.executionTime);
  const fasterAlgorithm = kruskalResult.executionTime < primResult.executionTime ? 'Kruskal' : 'Prim';
  const speedRatio = Number((Math.max(kTime, pTime) / Math.min(kTime, pTime)).toFixed(2));

  let summary = '';
  if (areCostsIdentical) {
    if (kruskalExclusive.length === 0 && primExclusive.length === 0) {
      summary = `Identical Optimum: Both Kruskal and Prim produced the exact same Minimum Spanning Tree with identical cost (${kruskalResult.totalCost} units) across all ${kruskalResult.selectedEdges.length} road corridors.`;
    } else {
      summary = `Equivalent Optimum: Both algorithms achieved identical minimum cost (${kruskalResult.totalCost} units) with ${edgeOverlapPercent}% edge overlap. Tie-breaking produced ${kruskalExclusive.length} equal-weight alternate corridors.`;
    }
  } else {
    summary = `Cost Differential: Kruskal produced total cost ${kruskalResult.totalCost} vs Prim ${primResult.totalCost} (diff: ${costDifference.toFixed(2)}).`;
  }

  return {
    areCostsIdentical,
    costDifference: Number(costDifference.toFixed(2)),
    kruskalCost: kruskalResult.totalCost,
    primCost: primResult.totalCost,
    selectedEdgeCountMatch: kruskalResult.selectedEdges.length === primResult.selectedEdges.length,
    kruskalSelectedCount: kruskalResult.selectedEdges.length,
    primSelectedCount: primResult.selectedEdges.length,
    sharedEdges,
    kruskalExclusive,
    primExclusive,
    edgeOverlapPercent,
    kruskalTime: kruskalResult.executionTime,
    primTime: primResult.executionTime,
    fasterAlgorithm,
    speedRatio,
    summary,
  };
}

export {
  kruskalMST,
  primMST,
  DisjointSetUnion,
  PrimPriorityQueue,
  calculateEdgeWeight,
};

export default {
  kruskalMST,
  primMST,
  compareMST,
  DisjointSetUnion,
  PrimPriorityQueue,
  calculateEdgeWeight,
};
