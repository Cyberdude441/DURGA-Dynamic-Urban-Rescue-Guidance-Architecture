/**
 * DURGA - Test Suite for Minimum Spanning Tree (MST) Algorithms
 * Verifies Kruskal's MST (Sorting + DSU) and Prim's MST (Priority Queue Cut Expansion)
 * against synthetic urban graphs, mathematical benchmarks, disaster scenarios, and comparative metrics.
 */

import { kruskalMST, DisjointSetUnion } from './backend/algorithms/kruskal.js';
import { primMST, PrimPriorityQueue } from './backend/algorithms/prim.js';
import { compareMST } from './backend/algorithms/mst.js';
import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from './frontend/src/data/urbanGraph.js';
import { applyScenarioToGraph } from './frontend/src/utils/graphUtils.js';

console.log('====================================================');
console.log('  DURGA PART 8: KRUSKAL & PRIM MST VERIFICATION     ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       Details: ${details}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TEST 1: Disjoint Set Union (DSU) Data Structure Unit Tests
// ----------------------------------------------------
console.log('--- TEST 1: Disjoint Set Union (DSU) Unit Verification ---');
const dsu = new DisjointSetUnion(['A', 'B', 'C', 'D', 'E']);
assert(dsu.getComponentCount() === 5, 'Initial DSU has 5 disjoint components');
assert(!dsu.connected('A', 'B'), 'A and B initially not connected');

assert(dsu.union('A', 'B') === true, 'Union A and B succeeds');
assert(dsu.connected('A', 'B'), 'A and B now connected');
assert(dsu.getComponentCount() === 4, 'Component count reduced to 4');

assert(dsu.union('B', 'C') === true, 'Union B and C succeeds');
assert(dsu.connected('A', 'C'), 'A and C connected transitively');
assert(dsu.getComponentCount() === 3, 'Component count reduced to 3');

assert(dsu.union('A', 'C') === false, 'Union A and C returns false (cycle detection)');
assert(dsu.getComponentCount() === 3, 'Component count remains 3 after redundant union');

// ----------------------------------------------------
// TEST 2: Textbook 4-Node Diamond Benchmark
// ----------------------------------------------------
console.log('\n--- TEST 2: Deterministic 4-Node Diamond Graph ---');
//   (N1) --- 10 --- (N2)
//    |   \           |
//    6     15        5
//    |        \      |
//   (N3) --- 4 --- (N4)
//
// Minimum Spanning Tree should pick:
//   (N3-N4): 4
//   (N2-N4): 5
//   (N1-N3): 6
// Total cost = 4 + 5 + 6 = 15.
// Rejected edges: (N1-N2: 10), (N1-N4: 15).
const diamondGraph = {
  nodes: [
    { id: 'N1', name: 'Node 1' },
    { id: 'N2', name: 'Node 2' },
    { id: 'N3', name: 'Node 3' },
    { id: 'N4', name: 'Node 4' },
  ],
  edges: [
    { id: 'E1', source: 'N1', target: 'N2', distance: 10, travelTime: 10, congestion: 0, danger: 0, blocked: false },
    { id: 'E2', source: 'N2', target: 'N4', distance: 5, travelTime: 5, congestion: 0, danger: 0, blocked: false },
    { id: 'E3', source: 'N3', target: 'N4', distance: 4, travelTime: 4, congestion: 0, danger: 0, blocked: false },
    { id: 'E4', source: 'N1', target: 'N3', distance: 6, travelTime: 6, congestion: 0, danger: 0, blocked: false },
    { id: 'E5', source: 'N1', target: 'N4', distance: 15, travelTime: 15, congestion: 0, danger: 0, blocked: false },
  ],
};

const kruskalDiamond = kruskalMST(diamondGraph, { weightMetric: 'distance' });
assert(kruskalDiamond.totalCost === 15, 'Kruskal diamond MST total cost is exactly 15', `got ${kruskalDiamond.totalCost}`);
assert(kruskalDiamond.selectedEdges.length === 3, 'Kruskal diamond selected exactly 3 edges (V - 1)', `got ${kruskalDiamond.selectedEdges.length}`);
assert(kruskalDiamond.rejectedEdges.length === 2, 'Kruskal diamond rejected exactly 2 edges (E - (V - 1))', `got ${kruskalDiamond.rejectedEdges.length}`);

const primDiamond = primMST(diamondGraph, { startNodeId: 'N1', weightMetric: 'distance' });
assert(primDiamond.totalCost === 15, 'Prim diamond MST total cost is exactly 15', `got ${primDiamond.totalCost}`);
assert(primDiamond.selectedEdges.length === 3, 'Prim diamond selected exactly 3 edges', `got ${primDiamond.selectedEdges.length}`);
assert(primDiamond.rejectedEdges.length === 2, 'Prim diamond rejected exactly 2 edges', `got ${primDiamond.rejectedEdges.length}`);

const diamondCompare = compareMST(kruskalDiamond, primDiamond);
assert(diamondCompare.areCostsIdentical, 'Diamond comparison confirms identical costs');
assert(diamondCompare.edgeOverlapPercent === 100, 'Diamond MST edge overlap is 100%');

// ----------------------------------------------------
// TEST 3: Urban Road Graph Baseline (47 Nodes, 58 Edges)
// ----------------------------------------------------
console.log('\n--- TEST 3: Urban Road Graph Baseline (47 Nodes, 58 Edges) ---');
const kruskalUrban = kruskalMST(URBAN_GRAPH, { weightMetric: 'effectiveCost' });
const primUrban = primMST(URBAN_GRAPH, { startNodeId: 'EX01', weightMetric: 'effectiveCost' });

assert(kruskalUrban.nodeCount === 47, 'Kruskal processed 47 urban nodes');
assert(kruskalUrban.selectedEdges.length === 46, 'Kruskal selected exactly 46 edges (V - 1 = 47 - 1 = 46)', `got ${kruskalUrban.selectedEdges.length}`);
assert(kruskalUrban.rejectedEdges.length === 12, 'Kruskal rejected exactly 12 cycle edges (58 - 46 = 12)', `got ${kruskalUrban.rejectedEdges.length}`);
assert(kruskalUrban.selectedEdges.length + kruskalUrban.rejectedEdges.length === 58, 'Kruskal selected + rejected === total edges (58)');
assert(kruskalUrban.isFullySpanned === true, 'Kruskal graph is 100% fully spanned');
assert(kruskalUrban.componentCount === 1, 'Kruskal ended with 1 connected component');

assert(primUrban.nodeCount === 47, 'Prim processed 47 urban nodes');
assert(primUrban.selectedEdges.length === 46, 'Prim selected exactly 46 edges (V - 1)', `got ${primUrban.selectedEdges.length}`);
assert(primUrban.rejectedEdges.length === 12, 'Prim rejected exactly 12 cycle edges', `got ${primUrban.rejectedEdges.length}`);
assert(primUrban.selectedEdges.length + primUrban.rejectedEdges.length === 58, 'Prim selected + rejected === total edges (58)');
assert(primUrban.visitedCount === 47, 'Prim visited all 47 nodes in tree cut');

// ----------------------------------------------------
// TEST 4: Direct Kruskal vs Prim Comparison on Urban Graph
// ----------------------------------------------------
console.log('\n--- TEST 4: Kruskal vs Prim Comparative Analysis ---');
const urbanCompare = compareMST(kruskalUrban, primUrban);

console.log(`   Kruskal MST Cost: ${kruskalUrban.totalCost.toFixed(2)}s`);
console.log(`   Prim MST Cost:    ${primUrban.totalCost.toFixed(2)}s`);
console.log(`   Cost Difference:  ${urbanCompare.costDifference.toFixed(2)}s`);
console.log(`   Edge Overlap:     ${urbanCompare.edgeOverlapPercent}%`);
console.log(`   Kruskal Time:     ${kruskalUrban.executionTime} ms`);
console.log(`   Prim Time:        ${primUrban.executionTime} ms`);

assert(urbanCompare.areCostsIdentical, 'Kruskal and Prim produce identical total MST cost within numerical tolerance', `diff: ${urbanCompare.costDifference}`);
assert(urbanCompare.selectedEdgeCountMatch, 'Kruskal and Prim select the exact same number of edges (46)');
assert(urbanCompare.edgeOverlapPercent >= 90, 'High edge overlap between Kruskal and Prim (>= 90%)', `got ${urbanCompare.edgeOverlapPercent}%`);

// ----------------------------------------------------
// TEST 5: Alternate Weight Metrics (Distance & Travel Time)
// ----------------------------------------------------
console.log('\n--- TEST 5: Alternate Weight Metrics (Distance & Travel Time) ---');
const kruskalDist = kruskalMST(URBAN_GRAPH, { weightMetric: 'distance' });
const primDist = primMST(URBAN_GRAPH, { weightMetric: 'distance' });
const distCompare = compareMST(kruskalDist, primDist);
assert(distCompare.areCostsIdentical, 'Distance metric: Kruskal and Prim cost match', `K=${kruskalDist.totalCost}, P=${primDist.totalCost}`);

const kruskalTime = kruskalMST(URBAN_GRAPH, { weightMetric: 'travelTime' });
const primTime = primMST(URBAN_GRAPH, { weightMetric: 'travelTime' });
const timeCompare = compareMST(kruskalTime, primTime);
assert(timeCompare.areCostsIdentical, 'TravelTime metric: Kruskal and Prim cost match', `K=${kruskalTime.totalCost}, P=${primTime.totalCost}`);

// ----------------------------------------------------
// TEST 6: Emergency Disaster Scenario (Road Closures & Spanning Forest)
// ----------------------------------------------------
console.log('\n--- TEST 6: Emergency Disaster Scenario (Fire with Blocked Roads) ---');
const fireScenario = EMERGENCY_SCENARIOS.find((s) => s.id === 'scenario_fire');
const fireGraph = applyScenarioToGraph(URBAN_GRAPH, fireScenario);

const kruskalFire = kruskalMST(fireGraph, { weightMetric: 'effectiveCost' });
const primFire = primMST(fireGraph, { weightMetric: 'effectiveCost' });

const blockedRoadCount = fireGraph.edges.filter((e) => e.blocked).length;
assert(blockedRoadCount > 0, `Fire scenario contains ${blockedRoadCount} blocked roads`);

const kruskalBlockedFound = kruskalFire.rejectedEdges.filter((e) => e.blocked);
assert(kruskalBlockedFound.length === blockedRoadCount, `Kruskal identified all ${blockedRoadCount} blocked roads in rejectedEdges`);

const fireCompare = compareMST(kruskalFire, primFire);
assert(fireCompare.areCostsIdentical, 'Disaster network: Kruskal and Prim costs match on fire network', `diff: ${fireCompare.costDifference}`);

// ----------------------------------------------------
// TEST 7: Step-by-Step Recording Verification
// ----------------------------------------------------
console.log('\n--- TEST 7: Step-by-Step Traversal Recording ---');
assert(kruskalUrban.steps.length > 50, `Kruskal recorded complete step history (${kruskalUrban.steps.length} steps)`);
assert(kruskalUrban.steps[0].type === 'init', 'Kruskal step 0 is initialization');
const kruskalAcceptCount = kruskalUrban.steps.filter((s) => s.type === 'accepted').length;
const kruskalRejectCount = kruskalUrban.steps.filter((s) => s.type === 'rejected').length;
assert(kruskalAcceptCount === 46, `Kruskal recorded exactly 46 accepted steps (got ${kruskalAcceptCount})`);
assert(kruskalRejectCount === 12, `Kruskal recorded exactly 12 rejected steps (got ${kruskalRejectCount})`);

assert(primUrban.steps.length > 50, `Prim recorded complete step history (${primUrban.steps.length} steps)`);
assert(primUrban.steps[0].type === 'init', 'Prim step 0 is initialization');
const primAcceptCount = primUrban.steps.filter((s) => s.type === 'accepted').length;
assert(primAcceptCount === 46, `Prim recorded exactly 46 accepted steps (got ${primAcceptCount})`);

// ----------------------------------------------------
// TEST 8: Robust Edge Cases
// ----------------------------------------------------
console.log('\n--- TEST 8: Edge Cases (Single Node, Empty Graph) ---');
const singleNodeGraph = { nodes: [{ id: 'S1', name: 'Single' }], edges: [] };
const kruskalSingle = kruskalMST(singleNodeGraph);
assert(kruskalSingle.selectedEdges.length === 0, 'Single node graph selects 0 edges');
assert(kruskalSingle.totalCost === 0, 'Single node graph cost is 0');

const emptyGraphResult = kruskalMST(null);
assert(emptyGraphResult.nodeCount === 0, 'Null graph handled safely without exception');

console.log('\n====================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  console.log('ALL KRUSKAL & PRIM MST TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests did not pass.`);
  process.exitCode = 1;
}
