/**
 * DURGA - Test Suite for Emergency Simulator Pipeline
 * Verifies the 12-stage disaster propagation and multi-algorithm execution engine
 * across Fire, Flood, Earthquake, and Chemical Leak hazards with real algorithmic outputs.
 */

import { runEmergencySimulation } from './backend/simulation/emergencySimulator.js';
import { URBAN_GRAPH } from './frontend/src/data/urbanGraph.js';

console.log('====================================================');
console.log('  DURGA PART 9: EMERGENCY SIMULATOR VERIFICATION    ');
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

async function runAllTests() {
  // ----------------------------------------------------
  // TEST 1: Chemical Leak Disaster Simulation Run
  // ----------------------------------------------------
  console.log('--- TEST 1: Chemical Leak Simulation Run ---');
  const stageEvents = [];

  const chemicalConfig = {
    disasterType: 'Chemical Leak',
    emergencyLocation: 'B16',
    affectedPeople: 1800,
    riskLevel: 'CRITICAL',
    blockedRoads: ['E57', 'E58'],
    blockedBuildings: ['B16'],
    exitAvailability: {
      EX01: { available: true, capacity: 5000 },
      EX02: { available: true, capacity: 5000 },
      EX03: { available: false, capacity: 0 },
      EX04: { available: true, capacity: 3000 },
    },
    fleetBudget: {
      ambulances: 20,
      rescueTeams: 15,
      emergencyVehicles: 12,
    },
  };

  const simResult = await runEmergencySimulation(URBAN_GRAPH, chemicalConfig, (evt) => {
    stageEvents.push(evt);
  });

  assert(simResult !== null, 'Simulation returned non-null output');
  assert(simResult.stages.length === 12, `All 12 stages recorded (got ${simResult.stages.length})`);
  assert(stageEvents.length === 12, `All 12 stage progress events fired (got ${stageEvents.length})`);
  assert(simResult.totalExecutionTime > 0, `Recorded total execution time (${simResult.totalExecutionTime} ms)`);

  // Verify Graph Updates
  const epicenterNode = simResult.graph.nodes.find((n) => n.id === 'B16');
  assert(epicenterNode.riskLevel === 'CRITICAL', 'Epicenter B16 risk escalated to CRITICAL');
  assert(epicenterNode.people === 1800, `Epicenter B16 people adjusted to affected count (${epicenterNode.people})`);

  // Verify Blocked Roads
  const e57 = simResult.graph.edges.find((e) => e.id === 'E57');
  assert(e57.blocked === true, 'Corridor E57 disabled as blocked');

  // Verify Dijkstra
  assert(simResult.dijkstraResults !== undefined, 'Dijkstra results present');
  assert(simResult.dijkstraResults.epicenterToExit.path.length > 0, 'Dijkstra generated epicenter escape route');
  assert(isFinite(simResult.dijkstraResults.epicenterToExit.totalCost), 'Dijkstra total cost is finite');

  // Verify Floyd-Warshall
  assert(simResult.fwResult !== undefined, 'Floyd-Warshall matrix present');
  assert(simResult.fwResult.distMatrix.length === 47, 'Floyd-Warshall 47x47 matrix generated');

  // Verify Greedy Evacuation
  assert(simResult.greedyResult !== undefined, 'Greedy evacuation results present');
  assert(simResult.greedyResult.assignments.length > 0, `Greedy generated ${simResult.greedyResult.assignments.length} zone assignments`);
  assert(simResult.greedyResult.exitSummary.EX03.assigned === 0, 'Unavailable exit EX03 received 0 evacuees');

  // Verify DP Resource Optimizer (0/1 Knapsack)
  assert(simResult.knapsackResults !== undefined, 'DP Knapsack results present');
  assert(simResult.knapsackResults.ambulances.resourceUsed <= 20, 'Ambulance usage within 20 unit cap');
  assert(simResult.knapsackResults.ambulances.maxBenefit > 0, `Ambulance optimization positive benefit (${simResult.knapsackResults.ambulances.maxBenefit})`);
  assert(simResult.knapsackResults.rescueTeams.resourceUsed <= 15, 'Rescue squads within 15 unit cap');
  assert(simResult.knapsackResults.emergencyVehicles.resourceUsed <= 12, 'Emergency vehicles within 12 unit cap');

  // Verify Kruskal & Prim MST
  assert(simResult.kruskalResult !== undefined, 'Kruskal MST result present');
  assert(simResult.primResult !== undefined, 'Prim MST result present');
  assert(simResult.kruskalResult.selectedCount > 0, `Kruskal spanned backbone (${simResult.kruskalResult.selectedCount} edges)`);
  assert(simResult.primResult.selectedCount > 0, `Prim spanned backbone (${simResult.primResult.selectedCount} edges)`);

  // Verify Evacuation Plan
  assert(simResult.evacuationPlan !== undefined, 'Evacuation Plan directive present');
  assert(simResult.evacuationPlan.feasibilityScore > 0, `Calculated feasibility score: ${simResult.evacuationPlan.feasibilityScore}%`);
  assert(typeof simResult.evacuationPlan.directiveLevel === 'string', `Directive level assigned: ${simResult.evacuationPlan.directiveLevel}`);

  // ----------------------------------------------------
  // TEST 2: Firestorm Disaster Simulation Run
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Firestorm Disaster Simulation Run ---');
  const fireConfig = {
    disasterType: 'Fire',
    emergencyLocation: 'B01',
    affectedPeople: 850,
    riskLevel: 'CRITICAL',
    blockedRoads: ['E10', 'E12', 'E14', 'E26'],
    blockedBuildings: ['B01'],
    exitAvailability: {
      EX01: { available: true, capacity: 5000 },
      EX02: { available: true, capacity: 5000 },
      EX03: { available: true, capacity: 6000 },
      EX04: { available: true, capacity: 4000 },
    },
    fleetBudget: { ambulances: 14, rescueTeams: 8, emergencyVehicles: 6 },
  };

  const fireResult = await runEmergencySimulation(URBAN_GRAPH, fireConfig);
  assert(fireResult.stages.length === 12, 'Fire simulation ran all 12 stages');
  assert(fireResult.evacuationPlan.evacuationRate >= 90, `Fire evacuation rate high (${fireResult.evacuationPlan.evacuationRate}%)`);

  // ----------------------------------------------------
  // TEST 3: Flood Basin Inundation Run
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Flood Inundation Simulation Run ---');
  const floodConfig = {
    disasterType: 'Flood',
    emergencyLocation: 'EZ02',
    affectedPeople: 1420,
    riskLevel: 'HIGH',
    blockedRoads: ['E41', 'E43', 'E45'],
    blockedBuildings: ['B22'],
    exitAvailability: {
      EX01: { available: true, capacity: 3000 },
      EX02: { available: true, capacity: 3000 },
      EX03: { available: true, capacity: 3000 },
      EX04: { available: false, capacity: 0 },
    },
    fleetBudget: { ambulances: 16, rescueTeams: 14, emergencyVehicles: 8 },
  };

  const floodResult = await runEmergencySimulation(URBAN_GRAPH, floodConfig);
  assert(floodResult.stages.length === 12, 'Flood simulation completed 12 stages');
  assert(floodResult.dijkstraResults.epicenterToExit.isReachable, 'Flood epicenter found escape path to active exit');

  // ----------------------------------------------------
  // TEST 4: Earthquake Fault Rupture Run
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Earthquake Simulation Run ---');
  const earthquakeConfig = {
    disasterType: 'Earthquake',
    emergencyLocation: 'J07',
    affectedPeople: 2100,
    riskLevel: 'CRITICAL',
    blockedRoads: ['E26', 'E28', 'E29', 'E30', 'E51'],
    blockedBuildings: ['B14', 'B15'],
    exitAvailability: {
      EX01: { available: true, capacity: 2000 },
      EX02: { available: true, capacity: 2000 },
      EX03: { available: true, capacity: 2000 },
      EX04: { available: true, capacity: 2000 },
    },
    fleetBudget: { ambulances: 24, rescueTeams: 18, emergencyVehicles: 16 },
  };

  const earthquakeResult = await runEmergencySimulation(URBAN_GRAPH, earthquakeConfig);
  assert(earthquakeResult.stages.length === 12, 'Earthquake simulation completed 12 stages');
  assert(earthquakeResult.networkMetrics.blockedCorridorCount >= 5, `Earthquake severed ${earthquakeResult.networkMetrics.blockedCorridorCount} road corridors`);

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('ALL EMERGENCY SIMULATION TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`FAILED: ${totalTests - passedTests} tests did not pass.`);
    process.exitCode = 1;
  }
}

runAllTests();
