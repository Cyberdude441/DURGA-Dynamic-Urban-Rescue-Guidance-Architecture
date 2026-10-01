/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * 0/1 Knapsack Dynamic Programming Emergency Resource Optimizer
 *
 * Implemented from scratch using Dynamic Programming with full backtracking.
 * Maximizes humanitarian rescue benefit under scarce emergency vehicle / team capacities.
 *
 * Problem Formulation:
 * ----------------------------------------------------
 * Given N disaster sectors / evacuation zones and total resource capacity W:
 * Each zone i has:
 *   - Resource requirement (weight w_i > 0): ambulances, rescue teams, or emergency vehicles
 *   - Humanitarian benefit (value v_i > 0): based on priority, risk level, and civilians
 *
 * 0/1 Decision Variable:
 *   x_i in {0, 1} (1 if zone i is allocated full rescue contingent, 0 otherwise)
 *
 * Objective:
 *   Maximize sum_{i=1}^N (v_i * x_i)
 *   Subject to: sum_{i=1}^N (w_i * x_i) <= W
 *
 * DP Recurrence Relation:
 *   dp[i][w] = dp[i-1][w]                                    if w_i > w
 *   dp[i][w] = max( dp[i-1][w], dp[i-1][w - w_i] + v_i )    if w_i <= w
 *
 * Backtracking:
 *   Tracing backwards from dp[N][W] to recover the exact set of selected zones.
 *
 * Greedy Comparison:
 *   Sorts zones by benefit-to-cost ratio (v_i / w_i) and greedily packs until full.
 *   Evaluates the optimality gap: DP (global optimum) vs Greedy (local heuristic).
 *
 * Theoretical Complexity:
 *   DP Time:     O(N * W)
 *   DP Space:    O(N * W) for table and backtracking
 *   Greedy Time: O(N log N)
 */

export const DEFAULT_RISK_WEIGHTS = {
  CRITICAL: 4.0,
  HIGH: 2.5,
  MEDIUM: 1.5,
  LOW: 1.0,
  NONE: 0.5,
};

/**
 * Generate standard synthetic resource requirements and benefit score for a zone.
 *
 * @param {Object} zone
 * @returns {Object} { ambulances, rescueTeams, emergencyVehicles, benefit }
 */
export function getZoneResourceRequirements(zone) {
  const people = Math.max(0, Number(zone.people) || 0);
  const priority = Math.max(1, Math.min(5, Number(zone.priority) || 1));
  const riskKey = String(zone.riskLevel || 'NONE').toUpperCase();

  // Ambulances needed: crowd size scaled (1 per ~350 civilians, min 1, max 8)
  const ambBase = Math.ceil(people / 350);
  const ambulances = Math.max(1, Math.min(8, ambBase || 1));

  // Rescue teams needed: hazard & risk scaled
  let rescueTeams = 1;
  if (riskKey === 'CRITICAL') rescueTeams = 4;
  else if (riskKey === 'HIGH') rescueTeams = 3;
  else if (riskKey === 'MEDIUM') rescueTeams = 2;
  else rescueTeams = 1;

  // Emergency vehicles needed (utility, pumpers, command vans)
  let emergencyVehicles = 1;
  if (people > 2500) emergencyVehicles = 4;
  else if (people > 1500) emergencyVehicles = 3;
  else if (people > 600) emergencyVehicles = 2;
  else emergencyVehicles = 1;

  // Composite tactical units (weighted sum: 1.0 * amb + 1.5 * rescue + 1.0 * veh)
  const compositeUnits = Math.round((ambulances * 1.0 + rescueTeams * 1.5 + emergencyVehicles * 1.0) * 10) / 10;

  // Humanitarian benefit score:
  // Weighted combination of priority (1-5), risk multiplier (0.5 - 4.0), and lives saved
  const rw = DEFAULT_RISK_WEIGHTS[riskKey] !== undefined ? DEFAULT_RISK_WEIGHTS[riskKey] : 1.0;
  const benefit = Math.round((priority * 25 + rw * 35 + people / 35) * 10) / 10;

  return {
    ambulances,
    rescueTeams,
    emergencyVehicles,
    compositeUnits,
    benefit,
  };
}

/**
 * 0/1 Knapsack Dynamic Programming Optimizer
 *
 * @param {Object} params
 * @param {Array} params.zones - Array of populated zone or building objects
 * @param {string} [params.resourceType='ambulances'] - 'ambulances' | 'rescueTeams' | 'emergencyVehicles' | 'compositeUnits'
 * @param {number} [params.capacity=24] - Available capacity limit of the chosen resource
 * @param {Object} [params.customRequirements] - Optional overrides { [zoneId]: { ambulances, rescueTeams, ... } }
 * @param {Object} [params.options]
 * @returns {Object} DP results, Backtracking, Table, Greedy Comparison, and Metrics
 */
export function knapsackResourceOptimizer(params = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const {
    zones = [],
    resourceType = 'ambulances',
    capacity = 24,
    customRequirements = {},
    options = {},
  } = params;

  const W = Math.max(0, Math.floor(Number(capacity) || 0));

  // 1. Prepare Items
  const items = zones.map((zone) => {
    const defaultReq = getZoneResourceRequirements(zone);
    const custom = customRequirements[zone.id] || {};

    const reqs = {
      ambulances: custom.ambulances !== undefined ? Number(custom.ambulances) : defaultReq.ambulances,
      rescueTeams: custom.rescueTeams !== undefined ? Number(custom.rescueTeams) : defaultReq.rescueTeams,
      emergencyVehicles: custom.emergencyVehicles !== undefined ? Number(custom.emergencyVehicles) : defaultReq.emergencyVehicles,
      compositeUnits: custom.compositeUnits !== undefined ? Number(custom.compositeUnits) : defaultReq.compositeUnits,
      benefit: custom.benefit !== undefined ? Number(custom.benefit) : defaultReq.benefit,
    };

    // Determine weight for this knapsack run based on resourceType
    let rawWeight = reqs[resourceType];
    if (rawWeight === undefined) rawWeight = reqs.ambulances;
    const weight = Math.max(1, Math.round(Number(rawWeight) || 1));
    const value = Math.max(0, Math.round(Number(reqs.benefit) || 0));

    return {
      id: zone.id,
      name: zone.name || zone.id,
      type: zone.type,
      people: Number(zone.people) || 0,
      priority: Number(zone.priority) || 1,
      riskLevel: String(zone.riskLevel || 'NONE').toUpperCase(),
      weight,
      value,
      requirements: reqs,
      ratio: Math.round((value / weight) * 100) / 100,
    };
  });

  const N = items.length;

  // Handle empty or zero capacity edge cases
  if (N === 0 || W === 0) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      selectedZones: [],
      maxBenefit: 0,
      resourceUsed: 0,
      capacity: W,
      resourceType,
      dpTable: [[0]],
      backtrackPath: [],
      items,
      greedyResult: { selectedZones: [], totalBenefit: 0, resourceUsed: 0, sortedByRatio: [] },
      comparison: { benefitDiff: 0, benefitGainPercent: 0, resourceDiff: 0, dpExclusive: [], greedyExclusive: [], isDpStrictlySuperior: false },
      executionTime: Math.max(0.01, Math.round((endTime - startTime) * 100) / 100),
    };
  }

  // 2. Build DP Table: dp[i][w]
  // Dimensions: (N + 1) rows x (W + 1) columns
  // dp[i][w] represents max benefit using a subset of items 0..i-1 with max weight w
  const dpTable = Array.from({ length: N + 1 }, () => Array(W + 1).fill(0));

  for (let i = 1; i <= N; i++) {
    const item = items[i - 1];
    const wi = item.weight;
    const vi = item.value;

    for (let w = 0; w <= W; w++) {
      if (wi > w) {
        // Item i cannot fit in capacity w
        dpTable[i][w] = dpTable[i - 1][w];
      } else {
        // Max between not taking item i and taking item i
        const withoutItem = dpTable[i - 1][w];
        const withItem = dpTable[i - 1][w - wi] + vi;
        dpTable[i][w] = Math.max(withoutItem, withItem);
      }
    }
  }

  const maxBenefit = dpTable[N][W];

  // 3. Backtracking to Recover Optimal Selected Zones
  let currW = W;
  const selectedZones = [];
  const backtrackPath = [];

  for (let i = N; i > 0; i--) {
    const item = items[i - 1];
    const wasIncluded = dpTable[i][currW] !== dpTable[i - 1][currW];

    backtrackPath.push({
      itemIndex: i,
      zoneId: item.id,
      capacityAtStep: currW,
      valueAtStep: dpTable[i][currW],
      action: wasIncluded ? 'INCLUDE' : 'SKIP',
      weight: item.weight,
      value: item.value,
    });

    if (wasIncluded) {
      selectedZones.push(item);
      currW -= item.weight;
    }
  }

  selectedZones.reverse();
  backtrackPath.reverse();

  const resourceUsed = W - currW;

  // 4. Greedy Allocation Implementation for Comparison
  // Standard Greedy Knapsack: sort by density ratio (value / weight) descending
  const sortedByRatio = [...items].sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    return b.value - a.value; // Tie breaker: larger total benefit
  });

  let greedyW = W;
  let greedyBenefit = 0;
  const greedySelected = [];

  for (const item of sortedByRatio) {
    if (item.weight <= greedyW) {
      greedySelected.push(item);
      greedyW -= item.weight;
      greedyBenefit += item.value;
    }
  }

  const greedyResourceUsed = W - greedyW;

  // 5. Compare DP vs Greedy Performance
  const dpIds = new Set(selectedZones.map((z) => z.id));
  const greedyIds = new Set(greedySelected.map((z) => z.id));

  const dpExclusive = selectedZones.filter((z) => !greedyIds.has(z.id));
  const greedyExclusive = greedySelected.filter((z) => !dpIds.has(z.id));

  const benefitDiff = Math.round((maxBenefit - greedyBenefit) * 10) / 10;
  const benefitGainPercent = greedyBenefit > 0
    ? Math.round(((maxBenefit - greedyBenefit) / greedyBenefit) * 1000) / 10
    : maxBenefit > 0 ? 100 : 0;
  const resourceDiff = resourceUsed - greedyResourceUsed;

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTime = Math.max(0.01, Math.round((endTime - startTime) * 100) / 100);

  return {
    selectedZones,
    maxBenefit,
    resourceUsed,
    remainingResource: W - resourceUsed,
    capacity: W,
    resourceType,
    dpTable,
    backtrackPath,
    items,
    greedyResult: {
      selectedZones: greedySelected,
      totalBenefit: greedyBenefit,
      resourceUsed: greedyResourceUsed,
      remainingResource: W - greedyResourceUsed,
      sortedByRatio,
    },
    comparison: {
      benefitDiff,
      benefitGainPercent,
      resourceDiff,
      dpExclusive,
      greedyExclusive,
      isDpStrictlySuperior: benefitDiff > 0,
      efficiencyRatioDP: resourceUsed > 0 ? Math.round((maxBenefit / resourceUsed) * 10) / 10 : 0,
      efficiencyRatioGreedy: greedyResourceUsed > 0 ? Math.round((greedyBenefit / greedyResourceUsed) * 10) / 10 : 0,
    },
    executionTime,
  };
}

export default knapsackResourceOptimizer;
