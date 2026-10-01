/**
 * DURGA - Test Suite for 0/1 Knapsack Dynamic Programming Resource Optimizer
 * Verifies optimal substructure, backtracking reconstruction, DP vs Greedy comparison,
 * and capacity constraints across emergency vehicles, ambulances, and rescue teams.
 */

import { knapsackResourceOptimizer, getZoneResourceRequirements } from './backend/algorithms/resourceOptimizer.js';
import { URBAN_GRAPH } from './frontend/src/data/urbanGraph.js';

console.log('====================================================');
console.log('  DURGA PART 7: 0/1 KNAPSACK DP VERIFICATION SUITE  ');
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
// TEST 1: Classic Textbook 0/1 Knapsack Instance
// ----------------------------------------------------
console.log('--- TEST 1: Textbook 0/1 Knapsack Benchmark ---');
// Items:
// Item 1: weight 2, value 3
// Item 2: weight 3, value 4
// Item 3: weight 4, value 5
// Item 4: weight 5, value 6
// Capacity = 5 -> Optimal is Item 1 + Item 2: weight 2 + 3 = 5, value = 7
const textbookZones = [
  { id: 'T1', name: 'Item 1' },
  { id: 'T2', name: 'Item 2' },
  { id: 'T3', name: 'Item 3' },
  { id: 'T4', name: 'Item 4' },
];

const textbookCustom = {
  T1: { ambulances: 2, benefit: 3 },
  T2: { ambulances: 3, benefit: 4 },
  T3: { ambulances: 4, benefit: 5 },
  T4: { ambulances: 5, benefit: 6 },
};

const tbResult = knapsackResourceOptimizer({
  zones: textbookZones,
  resourceType: 'ambulances',
  capacity: 5,
  customRequirements: textbookCustom,
});

assert(tbResult.maxBenefit === 7, `Textbook DP max benefit is 7 (got ${tbResult.maxBenefit})`);
assert(tbResult.resourceUsed === 5, `Textbook resource used is 5 (got ${tbResult.resourceUsed})`);
assert(tbResult.selectedZones.length === 2, `Selected 2 items (got ${tbResult.selectedZones.length})`);
assert(
  JSON.stringify(tbResult.selectedZones.map((z) => z.id).sort()) === JSON.stringify(['T1', 'T2']),
  `Selected items are T1 and T2 (got ${tbResult.selectedZones.map((z) => z.id).join(', ')})`
);

// ----------------------------------------------------
// TEST 2: DP Strictly Outperforms Greedy Counterexample
// ----------------------------------------------------
console.log('\n--- TEST 2: Proving DP Superiority Over Greedy ---');
// Classic counterexample:
// Item A: weight 10, value 60 (ratio = 6.0)
// Item B: weight 20, value 100 (ratio = 5.0)
// Item C: weight 30, value 120 (ratio = 4.0)
// Capacity = 50
// Greedy by ratio picks A (10 wt, 60 val), then B (20 wt, 100 val), remaining cap = 20. Cannot fit C (30 wt).
// Greedy total: 60 + 100 = 160.
// DP picks B + C (20 + 30 = 50 wt), value: 100 + 120 = 220!
// Optimality gap = +60 (+37.5%)
const counterZones = [
  { id: 'ZA', name: 'Zone A' },
  { id: 'ZB', name: 'Zone B' },
  { id: 'ZC', name: 'Zone C' },
];

const counterCustom = {
  ZA: { ambulances: 10, benefit: 60 },
  ZB: { ambulances: 20, benefit: 100 },
  ZC: { ambulances: 30, benefit: 120 },
};

const counterResult = knapsackResourceOptimizer({
  zones: counterZones,
  resourceType: 'ambulances',
  capacity: 50,
  customRequirements: counterCustom,
});

assert(counterResult.maxBenefit === 220, `DP finds global optimum of 220 (got ${counterResult.maxBenefit})`);
assert(counterResult.greedyResult.totalBenefit === 160, `Greedy gets stuck at local optimum of 160 (got ${counterResult.greedyResult.totalBenefit})`);
assert(counterResult.comparison.benefitDiff === 60, `DP outperforms Greedy by +60 points (got ${counterResult.comparison.benefitDiff})`);
assert(counterResult.comparison.isDpStrictlySuperior === true, 'DP is strictly superior to Greedy on this problem');
assert(
  JSON.stringify(counterResult.selectedZones.map((z) => z.id).sort()) === JSON.stringify(['ZB', 'ZC']),
  'DP correctly picked ZB and ZC'
);

// ----------------------------------------------------
// TEST 3: Urban Graph Evacuation Zones - Ambulances
// ----------------------------------------------------
console.log('\n--- TEST 3: Urban Graph Evacuation Zones (Ambulances) ---');
const evacZones = URBAN_GRAPH.nodes.filter((n) => n.type === 'evacuation_zone');

const ambResult = knapsackResourceOptimizer({
  zones: evacZones,
  resourceType: 'ambulances',
  capacity: 15,
});

assert(ambResult.resourceUsed <= 15, `Ambulances used (${ambResult.resourceUsed}) <= capacity (15)`);
assert(ambResult.maxBenefit >= ambResult.greedyResult.totalBenefit, 'DP benefit >= Greedy benefit');
assert(ambResult.dpTable.length === evacZones.length + 1, `DP table has ${evacZones.length + 1} rows`);
assert(ambResult.dpTable[0].length === 16, 'DP table has 16 columns (capacity 0..15)');

// Backtracking verification: sum of weights equals resourceUsed
const sumWeights = ambResult.selectedZones.reduce((sum, z) => sum + z.weight, 0);
assert(sumWeights === ambResult.resourceUsed, `Backtracked weights sum (${sumWeights}) === resourceUsed (${ambResult.resourceUsed})`);

// Backtracking verification: sum of values equals maxBenefit
const sumValues = ambResult.selectedZones.reduce((sum, z) => sum + z.value, 0);
assert(sumValues === ambResult.maxBenefit, `Backtracked values sum (${sumValues}) === maxBenefit (${ambResult.maxBenefit})`);

// ----------------------------------------------------
// TEST 4: Rescue Teams and Emergency Vehicles
// ----------------------------------------------------
console.log('\n--- TEST 4: Rescue Teams and Emergency Vehicles ---');
const rescueResult = knapsackResourceOptimizer({
  zones: evacZones,
  resourceType: 'rescueTeams',
  capacity: 8,
});

assert(rescueResult.resourceUsed <= 8, `Rescue teams used (${rescueResult.resourceUsed}) <= capacity (8)`);
assert(rescueResult.maxBenefit > 0, `Rescue teams optimization yielded positive benefit: ${rescueResult.maxBenefit}`);

const vehResult = knapsackResourceOptimizer({
  zones: evacZones,
  resourceType: 'emergencyVehicles',
  capacity: 6,
});

assert(vehResult.resourceUsed <= 6, `Emergency vehicles used (${vehResult.resourceUsed}) <= capacity (6)`);
assert(vehResult.maxBenefit > 0, `Vehicle optimization yielded positive benefit: ${vehResult.maxBenefit}`);

// ----------------------------------------------------
// TEST 5: Edge Cases
// ----------------------------------------------------
console.log('\n--- TEST 5: Edge Cases (Zero Capacity, Huge Capacity, Empty) ---');
const zeroCap = knapsackResourceOptimizer({ zones: evacZones, capacity: 0 });
assert(zeroCap.maxBenefit === 0, 'Zero capacity yields 0 benefit');
assert(zeroCap.selectedZones.length === 0, 'Zero capacity selects 0 zones');

const hugeCap = knapsackResourceOptimizer({ zones: evacZones, capacity: 500 });
assert(hugeCap.selectedZones.length === evacZones.length, 'Huge capacity selects all available zones');

const emptyZones = knapsackResourceOptimizer({ zones: [], capacity: 20 });
assert(emptyZones.maxBenefit === 0 && emptyZones.selectedZones.length === 0, 'Empty zones list handled safely');

console.log(`\n====================================================`);
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log(`====================================================\n`);

if (passedTests === totalTests) {
  console.log('ALL KNAPSACK DP OPTIMIZER TESTS PASSED WITH 100% SUCCESS!');
} else {
  process.exit(1);
}
