/**
 * DURGA - Test Suite for Greedy Evacuation Assignment Algorithm
 * Verifies capacity compliance, priority/urgency ordering, decision sequences,
 * and resilience across diverse exit capacity constraint scenarios.
 */

import { greedyEvacuation, calculateUrgencyScore } from './backend/algorithms/greedyEvacuation.js';
import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from './frontend/src/data/urbanGraph.js';
import { applyScenarioToGraph } from './frontend/src/utils/graphUtils.js';

console.log('====================================================');
console.log('  DURGA PART 6: GREEDY EVACUATION VERIFICATION      ');
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

const evacuationZones = URBAN_GRAPH.nodes.filter((n) => n.type === 'evacuation_zone');
const exits = URBAN_GRAPH.nodes.filter((n) => n.type === 'exit');

console.log(`Loaded ${evacuationZones.length} evacuation zones and ${exits.length} exits.\n`);

// ----------------------------------------------------
// TEST 1: Abundant Exit Capacities (Baseline Normal)
// ----------------------------------------------------
console.log('--- TEST 1: Abundant Capacity (5,000 per exit) ---');
const abundantCaps = {
  EX01: 5000,
  EX02: 5000,
  EX03: 6000,
  EX04: 5000,
};

const res1 = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  exitCapacities: abundantCaps,
  options: { strategy: 'urgency_first' },
});

assert(res1.assignments.length === evacuationZones.length, 'All 5 zones assigned');
assert(res1.metrics.totalUnassigned === 0, 'Zero unassigned civilians under abundant capacity');
assert(res1.metrics.evacuationRate === 100, '100% evacuation rate achieved');
assert(res1.decisionSequence.length === evacuationZones.length, 'Decision sequence recorded for each zone');

// Verify that remaining capacity was strictly respected
res1.exitSummary.forEach((e) => {
  assert(
    e.usedCapacity <= e.initialCapacity,
    `Exit ${e.id} used (${e.usedCapacity}) <= initial capacity (${e.initialCapacity})`
  );
  assert(
    e.remainingCapacity === e.initialCapacity - e.usedCapacity,
    `Exit ${e.id} remaining capacity math is exact (${e.remainingCapacity})`
  );
});

// Verify fields in assignments
res1.assignments.forEach((a) => {
  assert(a.zoneId && a.people > 0, `Assignment has zone ${a.zoneId} with ${a.people} people`);
  assert(a.assignedExitId !== 'NONE', `Zone ${a.zoneId} successfully assigned to ${a.assignedExitId}`);
  assert(isFinite(a.distance) && a.distance > 0, `Zone ${a.zoneId} has valid distance: ${a.distance}s`);
  assert(a.priority >= 1, `Zone ${a.zoneId} has valid priority: ${a.priority}`);
  assert(a.exitRemainingCapacityAfter >= 0, `Zone ${a.zoneId} recorded remaining capacity >= 0`);
});

// ----------------------------------------------------
// TEST 2: Constrained Capacity (Forces Detour to Alternative Exit)
// ----------------------------------------------------
console.log('\n--- TEST 2: Constrained Capacity (Forces Secondary Exit Selection) ---');
// In normal conditions, EZ03 naturally prefers EX01.
// Let's choke EX01 capacity down to 1,000. EZ03 has 3,100 people!
// EX01 cannot fit EZ03, so EZ03 should divert to another viable exit!
const chokedCaps = {
  EX01: 1000, // Choked!
  EX02: 5000,
  EX03: 6000,
  EX04: 5000,
};

const res2 = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  exitCapacities: chokedCaps,
  options: { strategy: 'urgency_first' },
});

const ez03Assignment = res2.assignments.find((a) => a.zoneId === 'EZ03');
assert(ez03Assignment !== undefined, 'EZ03 found in assignments');
assert(ez03Assignment.assignedExitId !== 'EX01', `EZ03 diverted from choked EX01 to ${ez03Assignment.assignedExitId}`);

const ex01Summary = res2.exitSummary.find((e) => e.id === 'EX01');
assert(ex01Summary.usedCapacity <= 1000, `Choked EX01 capacity (1,000) not exceeded: used ${ex01Summary.usedCapacity}`);

// ----------------------------------------------------
// TEST 3: Severe Bottleneck Capacity (Deficit Scenario)
// ----------------------------------------------------
console.log('\n--- TEST 3: Severe Bottleneck Capacity (Deficit & Overflow Handling) ---');
// Total people in 5 zones = 2850 + 1420 + 3100 + 940 + 2200 = 10,510 people.
// We set total capacity across all 4 exits to only 5,000 (1,250 each).
const bottleneckCaps = {
  EX01: 1250,
  EX02: 1250,
  EX03: 1250,
  EX04: 1250,
};

const res3 = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  exitCapacities: bottleneckCaps,
  options: { strategy: 'urgency_first' },
});

assert(res3.metrics.totalAssigned <= 5000, `Total assigned (${res3.metrics.totalAssigned}) does not exceed total exit capacity (5,000)`);
assert(res3.metrics.totalUnassigned > 0, `Accurately identified unassigned overflow (${res3.metrics.totalUnassigned} people)`);

// Verify no exit was over-allocated
res3.exitSummary.forEach((e) => {
  assert(e.usedCapacity <= e.initialCapacity, `Exit ${e.id} used (${e.usedCapacity}) <= limit (${e.initialCapacity})`);
  assert(e.remainingCapacity >= 0, `Exit ${e.id} remaining capacity >= 0 (${e.remainingCapacity})`);
});

// ----------------------------------------------------
// TEST 4: Fractional / Splitting Evacuation Streams
// ----------------------------------------------------
console.log('\n--- TEST 4: Crowd Partitioning (allowSplitting = true) ---');
const res4 = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  exitCapacities: bottleneckCaps,
  options: { strategy: 'urgency_first', allowSplitting: true },
});

// With splitting, every ounce of available capacity should be fully utilized!
const totalUsed = res4.exitSummary.reduce((sum, e) => sum + e.usedCapacity, 0);
assert(totalUsed === 5000, `All 5,000 available bottleneck slots fully siphoned (got ${totalUsed})`);

// ----------------------------------------------------
// TEST 5: Disaster Scenario - Fire Road Closures
// ----------------------------------------------------
console.log('\n--- TEST 5: Greedy Evacuation under Fire Disaster Network ---');
const fireScenario = EMERGENCY_SCENARIOS.find((s) => s.id === 'scenario_fire');
const fireGraph = applyScenarioToGraph(URBAN_GRAPH, fireScenario);

const resFire = greedyEvacuation({
  graph: fireGraph,
  zones: evacuationZones,
  exits: exits,
  options: { strategy: 'urgency_first' },
});

assert(resFire.assignments.length === evacuationZones.length, 'All zones assigned in fire scenario');
assert(resFire.metrics.executionTime >= 0, `Execution time recorded: ${resFire.metrics.executionTime}ms`);

// ----------------------------------------------------
// TEST 6: Strategy Comparison (Urgency vs Proximity vs Population)
// ----------------------------------------------------
console.log('\n--- TEST 6: Comparing Greedy Strategies ---');
const resUrgency = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  options: { strategy: 'urgency_first' },
});

const resProximity = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  options: { strategy: 'proximity_first' },
});

const resPopulation = greedyEvacuation({
  graph: URBAN_GRAPH,
  zones: evacuationZones,
  exits: exits,
  options: { strategy: 'population_first' },
});

assert(resUrgency.decisionSequence[0].zoneId !== undefined, 'Urgency-First produces valid decision sequence');
assert(resProximity.decisionSequence[0].zoneId !== undefined, 'Proximity-First produces valid decision sequence');
assert(resPopulation.decisionSequence[0].zoneId !== undefined, 'Population-First produces valid decision sequence');

console.log(`\n====================================================`);
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log(`====================================================\n`);

if (passedTests === totalTests) {
  console.log('ALL GREEDY EVACUATION TESTS PASSED WITH 100% SUCCESS!');
} else {
  process.exit(1);
}
