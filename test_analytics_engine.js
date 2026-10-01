/**
 * DURGA - Test Suite for Analytics & Empirical Benchmark Suite
 * Verifies live execution timing, scaling curves, algorithm comparisons,
 * and clear separation of theoretical vs experimental measurements.
 */

import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from './frontend/src/data/urbanGraph.js';
import {
  generateLiveAnalyticsData,
  THEORETICAL_COMPLEXITIES,
  runEmpiricalScalingBenchmark,
} from './backend/analytics/benchmarkSuite.js';

console.log('====================================================');
console.log('  DURGA PART 10: ANALYTICS & BENCHMARK VERIFICATION ');
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

async function runTests() {
  console.log('--- TEST 1: Theoretical Complexities Specification ---');
  assert(THEORETICAL_COMPLEXITIES.dijkstra !== undefined, 'Dijkstra theoretical specs defined');
  assert(THEORETICAL_COMPLEXITIES.dijkstra.timeComplexityWorst === 'O((V + E) log V)', 'Dijkstra complexity matches O((V + E) log V)');
  assert(THEORETICAL_COMPLEXITIES.floydWarshall.timeComplexityWorst === 'O(V³)', 'Floyd-Warshall complexity matches O(V³)');
  assert(THEORETICAL_COMPLEXITIES.knapsackDP.timeComplexityWorst === 'O(N · W)', 'Knapsack DP matches O(N · W)');
  assert(THEORETICAL_COMPLEXITIES.kruskalMST.timeComplexityWorst === 'O(E log E)', 'Kruskal matches O(E log E)');
  assert(THEORETICAL_COMPLEXITIES.primMST.timeComplexityWorst === 'O((V + E) log V)', 'Prim matches O((V + E) log V)');

  console.log('\n--- TEST 2: Empirical Scaling Benchmark (Execution Time vs V & E) ---');
  const scaling = runEmpiricalScalingBenchmark(URBAN_GRAPH, [10, 20, 30, 40, 47]);
  assert(scaling.length === 5, `Generated 5 scaling points (got ${scaling.length})`);
  assert(scaling[0].nodeCount === 10, 'First scaling step has V=10');
  assert(scaling[4].nodeCount === 47, 'Final scaling step has V=47');
  assert(scaling[0].dijkstraTime >= 0, `Dijkstra measured real time: ${scaling[0].dijkstraTime} ms`);
  assert(scaling[4].floydWarshallTime >= 0, `Floyd-Warshall measured real time: ${scaling[4].floydWarshallTime} ms`);
  assert(scaling[4].kruskalTime >= 0, `Kruskal measured real time: ${scaling[4].kruskalTime} ms`);
  assert(scaling[4].primTime >= 0, `Prim measured real time: ${scaling[4].primTime} ms`);
  assert(scaling[4].theoreticalFloydOps === 47 * 47 * 47, 'Theoretical Floyd ops matches 47³');

  console.log('\n--- TEST 3: Comprehensive Live Analytics Profile Generation ---');
  const analytics = await generateLiveAnalyticsData(URBAN_GRAPH, EMERGENCY_SCENARIOS);
  assert(analytics !== null, 'Analytics output generated successfully');
  assert(analytics.totalProfilingTime > 0, `Recorded total profiling time: ${analytics.totalProfilingTime} ms`);
  assert(analytics.algorithmComparison.length === 6, 'Contains all 6 key algorithms in comparison');
  
  // Verify Algorithm Comparison metrics
  const dijComp = analytics.algorithmComparison.find((a) => a.key === 'dijkstra');
  assert(dijComp.nodesProcessed > 0, `Dijkstra visited ${dijComp.nodesProcessed} nodes`);
  assert(dijComp.edgesProcessed > 0, `Dijkstra processed ${dijComp.edgesProcessed} edges`);
  assert(dijComp.executionTimeMs >= 0, `Dijkstra execution time is non-negative: ${dijComp.executionTimeMs} ms`);

  // Verify Evacuation Times
  assert(analytics.zoneEvacMetrics.length === 5, 'Contains metrics for all 5 evacuation zones');
  assert(analytics.zoneEvacMetrics[0].evacuationTravelTime > 0, `Zone EZ01 travel time: ${analytics.zoneEvacMetrics[0].evacuationTravelTime} s`);

  // Verify Resource Utilization
  assert(analytics.resourceUtilization.length >= 7, 'Resource utilization covers all fleets and exits');
  const ambUtil = analytics.resourceUtilization.find((r) => r.resource === 'Ambulances');
  assert(ambUtil.used <= ambUtil.capacity, 'Ambulance usage within capacity constraint');

  // Verify Disaster Comparisons
  assert(analytics.disasterComparisons.length === 4, 'Evaluated all 4 disaster scenarios');
  assert(analytics.disasterComparisons[0].executionTimeMs > 0, `Scenario 1 execution time: ${analytics.disasterComparisons[0].executionTimeMs} ms`);

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('ALL ANALYTICS & BENCHMARK TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`FAILED: ${totalTests - passedTests} tests did not pass.`);
    process.exitCode = 1;
  }
}

runTests();
