/**
 * DURGA - Test Suite for Floyd-Warshall Algorithm Implementation
 * Verifies all-pairs shortest path calculations, matrix generation, path reconstruction,
 * equivalence with Dijkstra, and resilience against blocked roads in disaster scenarios.
 */

import { floydWarshall, getEffectiveEdgeCost } from './backend/algorithms/floydWarshall.js';
import { dijkstra } from './backend/algorithms/dijkstra.js';
import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from './frontend/src/data/urbanGraph.js';
import { applyScenarioToGraph } from './frontend/src/utils/graphUtils.js';

console.log('====================================================');
console.log('  DURGA PART 5: FLOYD-WARSHALL VERIFICATION SUITE   ');
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
// TEST 1: Small Deterministic Graph (Diamond topology)
// ----------------------------------------------------
console.log('--- TEST 1: Small Deterministic Diamond Graph ---');
const diamondGraph = {
  nodes: [
    { id: 'N1', name: 'Node 1', type: 'building' },
    { id: 'N2', name: 'Node 2', type: 'junction' },
    { id: 'N3', name: 'Node 3', type: 'junction' },
    { id: 'N4', name: 'Node 4', type: 'exit' },
  ],
  edges: [
    // N1 -> N2: travelTime 10, congestion 0, danger 0 => cost 10
    { id: 'e1', source: 'N1', target: 'N2', travelTime: 10, congestion: 0, danger: 0, distance: 100 },
    // N1 -> N3: travelTime 25, congestion 0, danger 0 => cost 25
    { id: 'e2', source: 'N1', target: 'N3', travelTime: 25, congestion: 0, danger: 0, distance: 250 },
    // N2 -> N4: travelTime 30, congestion 0, danger 0 => cost 30
    { id: 'e3', source: 'N2', target: 'N4', travelTime: 30, congestion: 0, danger: 0, distance: 300 },
    // N3 -> N4: travelTime 10, congestion 0, danger 0 => cost 10
    { id: 'e4', source: 'N3', target: 'N4', travelTime: 10, congestion: 0, danger: 0, distance: 100 },
    // N2 <-> N3 shortcut: travelTime 5
    { id: 'e5', source: 'N2', target: 'N3', travelTime: 5, congestion: 0, danger: 0, distance: 50 },
  ],
};

const diamondFW = floydWarshall(diamondGraph, { bidirectional: true, recordSteps: true });

assert(diamondFW.nodesCount === 4, 'Graph node count is 4');
assert(diamondFW.distMatrix.length === 4 && diamondFW.distMatrix[0].length === 4, 'Distance matrix is 4x4');
assert(diamondFW.nextMatrix.length === 4 && diamondFW.nextMatrix[0].length === 4, 'Next matrix is 4x4');

// Diagonal is 0
assert(diamondFW.distMatrix[0][0] === 0, 'Self distance D[0][0] === 0');
assert(diamondFW.distMatrix[3][3] === 0, 'Self distance D[3][3] === 0');

// Route N1 -> N4:
// Option A: N1 -> N2 -> N4 = 10 + 30 = 40
// Option B: N1 -> N3 -> N4 = 25 + 10 = 35
// Option C: N1 -> N2 -> N3 -> N4 = 10 + 5 + 10 = 25 (Optimal!)
const path1to4 = diamondFW.reconstructPath('N1', 'N4');
assert(path1to4.totalCost === 25, `Optimal cost N1->N4 is 25 (got ${path1to4.totalCost})`);
assert(JSON.stringify(path1to4.path) === JSON.stringify(['N1', 'N2', 'N3', 'N4']), `Optimal route is N1->N2->N3->N4 (got ${path1to4.path.join('->')})`);
assert(path1to4.hops === 3, 'Hops count is 3');
assert(path1to4.distance === 250, `Physical distance is 250m (got ${path1to4.distance})`);

// ----------------------------------------------------
// TEST 2: Equivalence with Dijkstra on URBAN_GRAPH
// ----------------------------------------------------
console.log('\n--- TEST 2: Comparing Floyd-Warshall with Dijkstra on Urban Baseline ---');
const urbanFW = floydWarshall(URBAN_GRAPH, { bidirectional: true, recordSteps: true });

assert(urbanFW.nodesCount === 47, `Urban graph has 47 nodes (got ${urbanFW.nodesCount})`);
assert(urbanFW.distMatrix.length === 47, 'Urban distance matrix is 47x47');
assert(urbanFW.executionTime >= 0, `Execution time recorded: ${urbanFW.executionTime} ms`);

const testPairs = [
  ['B01', 'EX01'],
  ['B01', 'EX02'],
  ['B05', 'H01'],
  ['B12', 'EX04'],
  ['EZ01', 'EX03'],
  ['RC01', 'EZ04'],
  ['B18', 'H02'],
  ['J01', 'J12'],
];

for (const [src, dst] of testPairs) {
  const fwRes = urbanFW.reconstructPath(src, dst);
  const dijRes = dijkstra(URBAN_GRAPH, src, dst);

  const costMatch = Math.abs(fwRes.totalCost - dijRes.totalCost) < 0.01;
  assert(
    costMatch,
    `Floyd-Warshall vs Dijkstra cost identical for ${src} -> ${dst}: FW=${fwRes.totalCost}, DIJ=${dijRes.totalCost}`,
    `FW path: ${fwRes.path.join('->')} vs DIJ path: ${dijRes.path.join('->')}`
  );
}

// ----------------------------------------------------
// TEST 3: Blocked Roads & Disaster Scenarios
// ----------------------------------------------------
console.log('\n--- TEST 3: Blocked Roads & Fire Scenario Resilience ---');
const fireScenario = EMERGENCY_SCENARIOS.find((s) => s.id === 'scenario_fire');
const fireGraph = applyScenarioToGraph(URBAN_GRAPH, fireScenario);

const fireFW = floydWarshall(fireGraph, { bidirectional: true });
const fireDij = dijkstra(fireGraph, 'B01', 'EX01');
const fireFWPath = fireFW.reconstructPath('B01', 'EX01');

assert(
  Math.abs(fireFWPath.totalCost - fireDij.totalCost) < 0.01,
  `Fire scenario rerouted cost matches Dijkstra: FW=${fireFWPath.totalCost}, DIJ=${fireDij.totalCost}`
);
assert(
  JSON.stringify(fireFWPath.path) === JSON.stringify(fireDij.path),
  `Fire scenario route matches Dijkstra: ${fireFWPath.path.join('->')}`
);

// ----------------------------------------------------
// TEST 4: Disconnected Vertices and Identity Handling
// ----------------------------------------------------
console.log('\n--- TEST 4: Disconnected Nodes & Identity Queries ---');
const disconnectedGraph = {
  nodes: [
    { id: 'A', name: 'Alpha', type: 'building' },
    { id: 'B', name: 'Beta', type: 'building' },
    { id: 'C_ISOLATED', name: 'Island', type: 'building' },
  ],
  edges: [
    { id: 'e1', source: 'A', target: 'B', travelTime: 12, congestion: 0, danger: 0, distance: 100 },
  ],
};

const discFW = floydWarshall(disconnectedGraph, { bidirectional: true });
const isolatedQuery = discFW.reconstructPath('A', 'C_ISOLATED');
assert(isolatedQuery.path.length === 0, 'Unreachable node produces empty path []');
assert(isolatedQuery.totalCost === Infinity, 'Unreachable node has Infinity cost');

const identityQuery = discFW.reconstructPath('A', 'A');
assert(identityQuery.totalCost === 0, 'Identity query A->A has cost 0');
assert(JSON.stringify(identityQuery.path) === JSON.stringify(['A']), 'Identity query A->A path is [A]');
assert(identityQuery.hops === 0, 'Identity query A->A has 0 hops');

const invalidQuery = discFW.reconstructPath('NON_EXISTENT', 'A');
assert(invalidQuery.totalCost === Infinity && invalidQuery.path.length === 0, 'Invalid node returns empty result');

// ----------------------------------------------------
// TEST 5: Step-by-Step Recording Inspection
// ----------------------------------------------------
console.log('\n--- TEST 5: Step-by-Step Recording (k intermediate iterations) ---');
assert(urbanFW.steps.length === 48, `Urban graph recorded 48 steps (1 init + 47 pivots, got ${urbanFW.steps.length})`);
assert(urbanFW.steps[0].k === -1, 'Step 0 is initial adjacency snapshot');
assert(urbanFW.steps[1].k === 0, 'Step 1 is k=0 relaxation');
assert(urbanFW.steps[47].k === 46, 'Final step is k=46 relaxation');

console.log(`\n====================================================`);
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log(`====================================================\n`);

if (passedTests === totalTests) {
  console.log('ALL FLOYD-WARSHALL TESTS PASSED WITH 100% SUCCESS!');
} else {
  process.exit(1);
}
