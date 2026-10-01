/**
 * DURGA Frontend Analytics Bridge
 * Connects the Analytics Dashboard with the live empirical benchmark suite.
 */

export {
  THEORETICAL_COMPLEXITIES,
  runEmpiricalScalingBenchmark,
  runDisasterComparisonBenchmark,
  runZoneEvacuationMetrics,
  generateLiveAnalyticsData,
  default,
} from '../../../backend/analytics/benchmarkSuite.js';
