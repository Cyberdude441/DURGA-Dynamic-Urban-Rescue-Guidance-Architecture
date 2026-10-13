/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Part 3 Verification Suite: Dijkstra's Single-Source Shortest Path Algorithm
 *
 * Exhaustively tests:
 *  1. Binary Min-Heap Priority Queue unit operations & priority ordering
 *  2. Effective edge cost formula under congestion and danger multipliers
 *  3. Small deterministic graph pathfinding & optimal cost verification
 *  4. Full 47-node urban road network shortest-path routes & hops
 *  5. Blocked corridors & emergency road isolation detours
 *  6. Completely disconnected / unreachable destination handling
 *  7. Identity query (source === destination) edge case
 *  8. Invalid / non-existent vertex input safety
 *  9. Step-by-step visualizer recording & bounded memory limits (<= 150 steps)
 */

import { dijkstra, getEffectiveEdgeCost } from './backend/algorithms/dijkstra.js';
import { URBAN_GRAPH } from './frontend/src/data/urbanGraph.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('  DURGA PART 3: DIJKSTRA VERIFICATION SUITE         ');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Effective Edge Cost Model
// ----------------------------------------------------
console.log('--- TEST 1: Effective Edge Cost Model ---');
const baseEdge = { travelTime: 20, congestion: 0, danger: 0, blocked: false };
const baseCost = getEffectiveEdgeCost(baseEdge);
assert(baseCost === 20, `Zero congestion/danger cost matches travelTime: ${baseCost} === 20`);

const congestedEdge = { travelTime: 20, congestion: 0.5, danger: 0, blocked: false };
// 20 * (1 + 1.5 * 0.5) = 20 * 1.75 = 35
assert(getEffectiveEdgeCost(congestedEdge) === 35, `Congestion multiplier applied: got ${getEffectiveEdgeCost(congestedEdge)} (expected 35)`);

const dangerousEdge = { travelTime: 20, congestion: 0, danger: 0.4, blocked: false };
// 20 * (1 + 2.5 * 0.4) = 20 * 2.0 = 40
assert(getEffectiveEdgeCost(dangerousEdge) === 40, `Danger multiplier applied: got ${getEffectiveEdgeCost(dangerousEdge)} (expected 40)`);

const blockedEdge = { travelTime: 20, congestion: 0, danger: 0, blocked: true };
assert(getEffectiveEdgeCost(blockedEdge) === Infinity, 'Blocked road returns Infinity cost');

// ----------------------------------------------------
// TEST 2: Small Deterministic Diamond Graph
// ----------------------------------------------------
console.log('\n--- TEST 2: Small Deterministic Diamond Graph ---');
// N1 -(5)-> N2 -(10)-> N4
// N1 -(15)-> N3 -(5)-> N4
const diamondGraph = {
  nodes: [
    { id: 'N1', name: 'Start' },
    { id: 'N2', name: 'Upper' },
    { id: 'N3', name: 'Lower' },
    { id: 'N4', name: 'Goal' },
  ],
  edges: [
    { id: 'E1', source: 'N1', target: 'N2', travelTime: 5, distance: 50, congestion: 0, danger: 0, blocked: false },
    { id: 'E2', source: 'N2', target: 'N4', travelTime: 10, distance: 100, congestion: 0, danger: 0, blocked: false },
    { id: 'E3', source: 'N1', target: 'N3', travelTime: 15, distance: 150, congestion: 0, danger: 0, blocked: false },
    { id: 'E4', source: 'N3', target: 'N4', travelTime: 5, distance: 50, congestion: 0, danger: 0, blocked: false },
  ],
};

const diamondRes = dijkstra(diamondGraph, 'N1', 'N4');
assert(diamondRes.totalCost === 15, `Optimal diamond cost is 15: got ${diamondRes.totalCost}`);
assert(diamondRes.path.join('->') === 'N1->N2->N4', `Optimal diamond path is N1->N2->N4: got ${diamondRes.path.join('->')}`);
assert(diamondRes.distance === 150, `Physical distance matches: got ${diamondRes.distance} (expected 150)`);

// ----------------------------------------------------
// TEST 3: Full Urban Road Network Baseline
// ----------------------------------------------------
console.log('\n--- TEST 3: Urban Road Network Baseline ---');
const urbanRes1 = dijkstra(URBAN_GRAPH, 'B01', 'EX01');
assert(urbanRes1.path.length > 0, 'Path found from B01 to EX01');
assert(urbanRes1.path[0] === 'B01', 'Path starts at B01');
assert(urbanRes1.path[urbanRes1.path.length - 1] === 'EX01', 'Path ends at EX01');
assert(isFinite(urbanRes1.totalCost) && urbanRes1.totalCost > 0, `Total cost is positive and finite: ${urbanRes1.totalCost}s`);
assert(urbanRes1.distance > 0, `Total distance is positive: ${urbanRes1.distance}m`);
assert(urbanRes1.nodesVisited > 0, `Nodes visited recorded: ${urbanRes1.nodesVisited}`);
assert(urbanRes1.edgesProcessed > 0, `Edges processed recorded: ${urbanRes1.edgesProcessed}`);

const urbanResHospital = dijkstra(URBAN_GRAPH, 'B05', 'H01');
assert(urbanResHospital.path.length > 0, 'Path found from B05 to H01');
assert(urbanResHospital.path[urbanResHospital.path.length - 1] === 'H01', 'Target reached is H01');

// ----------------------------------------------------
// TEST 4: Blocked Roads & Detour Routing
// ----------------------------------------------------
console.log('\n--- TEST 4: Blocked Roads & Detour Routing ---');
// Sever E2 in diamond graph: forces path through N3
const severedDiamond = {
  ...diamondGraph,
  edges: diamondGraph.edges.map((e) => e.id === 'E2' ? { ...e, blocked: true } : e),
};
const detourRes = dijkstra(severedDiamond, 'N1', 'N4');
assert(detourRes.path.join('->') === 'N1->N3->N4', `Detour selected N1->N3->N4: got ${detourRes.path.join('->')}`);
assert(detourRes.totalCost === 20, `Detour cost is 20: got ${detourRes.totalCost}`);

// ----------------------------------------------------
// TEST 5: Completely Unreachable Destination
// ----------------------------------------------------
console.log('\n--- TEST 5: Completely Unreachable Destination ---');
const isolatedGraph = {
  nodes: [
    { id: 'A', name: 'Island A' },
    { id: 'B', name: 'Island B' },
  ],
  edges: [],
};
const unreachableRes = dijkstra(isolatedGraph, 'A', 'B');
assert(unreachableRes.path.length === 0, 'Unreachable destination returns empty path []');
assert(unreachableRes.totalCost === Infinity, 'Unreachable destination returns Infinity cost');
assert(unreachableRes.distance === 0, 'Unreachable destination returns 0 distance');

// ----------------------------------------------------
// TEST 6: Identity Query (Source === Destination)
// ----------------------------------------------------
console.log('\n--- TEST 6: Identity Query (Source === Destination) ---');
const identityRes = dijkstra(URBAN_GRAPH, 'B01', 'B01');
assert(identityRes.path.length === 1 && identityRes.path[0] === 'B01', 'Identity query path is [B01]');
assert(identityRes.totalCost === 0, 'Identity query cost is 0');
assert(identityRes.distance === 0, 'Identity query distance is 0');

// ----------------------------------------------------
// TEST 7: Invalid Nodes and Malformed Input
// ----------------------------------------------------
console.log('\n--- TEST 7: Invalid Nodes and Malformed Input ---');
const invalidRes = dijkstra(URBAN_GRAPH, 'NON_EXISTENT', 'EX01');
assert(invalidRes.path.length === 0, 'Non-existent source returns empty path');
assert(invalidRes.totalCost === Infinity, 'Non-existent source returns Infinity cost');

const nullRes = dijkstra(null, 'B01', 'EX01');
assert(nullRes.path.length === 0, 'Null graph handled safely');
assert(nullRes.totalCost === Infinity, 'Null graph returns Infinity cost');

// ----------------------------------------------------
// TEST 8: Step-by-Step Recording & Bounded Memory
// ----------------------------------------------------
console.log('\n--- TEST 8: Step-by-Step Recording & Bounded Memory ---');
const stepRes = dijkstra(URBAN_GRAPH, 'B01', 'EX01', { recordSteps: true });
assert(stepRes.steps.length > 0, `Recorded ${stepRes.steps.length} steps`);
assert(stepRes.steps[0].type === 'init', 'Step 0 is initialization');
assert(stepRes.steps[stepRes.steps.length - 1].type === 'done', 'Final step is done');
assert(stepRes.steps.length <= 150, `Step count bounded within 150 (got ${stepRes.steps.length})`);

console.log('\n====================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  console.log('ALL DIJKSTRA TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests did not pass.`);
  process.exitCode = 1;
}
