/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Greedy Evacuation Assignment Algorithm
 *
 * Implemented from scratch using a principled Greedy heuristic.
 * Assigns populated metropolitan evacuation zones to perimeter exits
 * while strictly respecting physical exit throughput capacities.
 *
 * Greedy Strategy:
 * ----------------------------------------------------
 * 1. Urgency Prioritization (Primary Sorting):
 *    Civilian zones in immediate hazard zones (high risk, critical priority)
 *    face imminent casualties and cannot afford evacuation delays.
 *    We calculate an Urgency Score for each zone:
 *      Urgency(z) = (priority * 12) + (RiskWeight * 18) + (people / 150)
 *    Zones are sorted in descending order of Urgency.
 *
 * 2. Greedy Exit Selection (Local Optimal Choice):
 *    For each zone z in urgency order:
 *      - Evaluate all reachable exits that retain remaining capacity > 0.
 *      - Calculate effective impedance / travel cost to each exit.
 *      - Select the nearest exit e* that has sufficient capacity:
 *          remCap(e*) >= people(z)
 *      - If no single exit fits the entire population:
 *          - If allowSplitting: allocate up to remCap(e*) to e*, then assign
 *            the remainder to the next closest viable exit.
 *          - If single-exit: allocate up to remCap(e*) and record overflow.
 *      - Deduct assigned population from exit remaining capacity:
 *          remCap(e*) -= assignedPeople
 *
 * 3. Decision Sequence Tracking:
 *    Records the full step-by-step decision audit trail:
 *      - Step number, zone, evaluated exits, chosen exit, rationale,
 *        and updated remaining capacity snapshots.
 *
 * Theoretical Complexity:
 *   Time:  O(Z log Z + Z * E) where Z is zones count and E is exits count.
 *   Space: O(Z + E) for assignment records and exit capacity tables.
 */

import { dijkstra } from './dijkstra.js';

// Weight mapping for risk categories
export const RISK_WEIGHTS = {
  CRITICAL: 4.0,
  HIGH: 2.5,
  MEDIUM: 1.5,
  LOW: 1.0,
  NONE: 0.5,
};

/**
 * Calculate urgency score for a zone based on priority, risk level, and crowd size.
 *
 * @param {Object} zone
 * @returns {number}
 */
export function calculateUrgencyScore(zone) {
  const priority = Number(zone.priority) || 1;
  const riskKey = String(zone.riskLevel || 'NONE').toUpperCase();
  const riskWeight = RISK_WEIGHTS[riskKey] !== undefined ? RISK_WEIGHTS[riskKey] : 1.0;
  const people = Number(zone.people) || 0;

  // Urgency formula: heavily weights critical risk and high priority
  return Math.round((priority * 12 + riskWeight * 18 + people / 150) * 100) / 100;
}

/**
 * Compute effective travel distances from all zones to all exits using Dijkstra
 *
 * @param {Object} graph - { nodes, edges }
 * @param {Array} zones - Array of zone nodes
 * @param {Array} exits - Array of exit nodes
 * @returns {Object} distanceMatrix[zoneId][exitId] = { cost, distance, path, pathEdges }
 */
export function computeZoneToExitDistances(graph, zones, exits) {
  const distMatrix = {};

  zones.forEach((zone) => {
    distMatrix[zone.id] = {};
    exits.forEach((exit) => {
      const res = dijkstra(graph, zone.id, exit.id, { recordSteps: false });
      distMatrix[zone.id][exit.id] = {
        cost: res.totalCost,
        distance: res.distance,
        path: res.path,
        pathEdges: res.pathEdges || [],
        reachable: isFinite(res.totalCost) && res.path.length > 0,
      };
    });
  });

  return distMatrix;
}

/**
 * Greedy Evacuation Assignment Algorithm
 *
 * @param {Object} params
 * @param {Array} params.zones - Array of populated zone/building nodes
 * @param {Array} params.exits - Array of available exit nodes
 * @param {Object} [params.exitCapacities] - Optional map { [exitId]: number } overriding default capacities
 * @param {Object} [params.effectiveDistances] - Optional precomputed distance matrix { [zoneId]: { [exitId]: { cost, distance } } }
 * @param {Object} [params.graph] - Optional graph used to compute distances if effectiveDistances not provided
 * @param {Object} [params.options]
 * @param {string} [params.options.strategy='urgency_first'] - 'urgency_first' | 'proximity_first' | 'population_first'
 * @param {boolean} [params.options.allowSplitting=false] - Whether a zone crowd can be partitioned across multiple exits
 * @returns {Object} { assignments, exitSummary, decisionSequence, metrics }
 */
export function greedyEvacuation(params = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const {
    zones = [],
    exits = [],
    exitCapacities = {},
    effectiveDistances = null,
    graph = null,
    options = {},
  } = params;

  const {
    strategy = 'urgency_first',
    allowSplitting = false,
  } = options;

  // 1. Prepare and Clone Available Exits with Capacities
  const exitState = {};
  exits.forEach((exit) => {
    const customCap = exitCapacities[exit.id];
    const initialCap = customCap !== undefined ? Number(customCap) : Number(exit.capacity) || 3000;
    exitState[exit.id] = {
      id: exit.id,
      name: exit.name || exit.id,
      initialCapacity: Math.max(0, initialCap),
      remainingCapacity: Math.max(0, initialCap),
      usedCapacity: 0,
      assignedZones: [],
      assignedPeopleTotal: 0,
    };
  });

  // 2. Prepare Distance Lookups
  let distances = effectiveDistances;
  if (!distances && graph) {
    distances = computeZoneToExitDistances(graph, zones, exits);
  }

  // Fallback distance helper if matrix or graph distance not available
  const getDistanceInfo = (zoneId, exitId) => {
    if (distances && distances[zoneId] && distances[zoneId][exitId]) {
      return distances[zoneId][exitId];
    }
    return { cost: 100, distance: 1000, path: [zoneId, exitId], pathEdges: [], reachable: true };
  };

  // 3. Annotate Zones with Metrics
  const annotatedZones = zones.map((z) => {
    const people = Math.max(0, Number(z.people) || 0);
    const priority = Number(z.priority) || 1;
    const riskLevel = String(z.riskLevel || 'NONE').toUpperCase();
    const urgencyScore = calculateUrgencyScore(z);

    // Find closest exit distance for proximity sorting
    let minDistance = Infinity;
    exits.forEach((e) => {
      const d = getDistanceInfo(z.id, e.id);
      if (d.reachable && d.cost < minDistance) {
        minDistance = d.cost;
      }
    });

    return {
      ...z,
      people,
      priority,
      riskLevel,
      urgencyScore,
      minDistance: isFinite(minDistance) ? minDistance : 999999,
    };
  });

  // 4. Sort Zones According to Selected Greedy Strategy
  const sortedZones = [...annotatedZones];
  if (strategy === 'urgency_first') {
    // Primary: Urgency descending (highest priority & critical risk first)
    // Tie-breaker: Distance ascending (closer zones break ties)
    sortedZones.sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) {
        return b.urgencyScore - a.urgencyScore;
      }
      return a.minDistance - b.minDistance;
    });
  } else if (strategy === 'proximity_first') {
    // Primary: Min travel distance ascending (clear fast-clearing zones first)
    // Tie-breaker: Urgency descending
    sortedZones.sort((a, b) => {
      if (a.minDistance !== b.minDistance) {
        return a.minDistance - b.minDistance;
      }
      return b.urgencyScore - a.urgencyScore;
    });
  } else if (strategy === 'population_first') {
    // Primary: Population descending (heaviest bottlenecks first)
    sortedZones.sort((a, b) => b.people - a.people);
  }

  // 5. Greedy Assignment Loop
  const assignments = [];
  const decisionSequence = [];

  let stepCounter = 1;

  for (const zone of sortedZones) {
    if (zone.people <= 0) continue; // Skip unpopulated areas

    let remainingPeopleToAssign = zone.people;

    while (remainingPeopleToAssign > 0) {
      // Evaluate all reachable exits with positive capacity
      const candidates = [];

      for (const exit of exits) {
        const state = exitState[exit.id];
        const distInfo = getDistanceInfo(zone.id, exit.id);

        candidates.push({
          exitId: exit.id,
          exitName: exit.name,
          cost: distInfo.cost,
          distance: distInfo.distance,
          path: distInfo.path,
          pathEdges: distInfo.pathEdges,
          reachable: distInfo.reachable,
          remainingCapacity: state.remainingCapacity,
          canFitAll: state.remainingCapacity >= remainingPeopleToAssign,
        });
      }

      // Filter viable exits (reachable with remaining capacity > 0)
      const viableExits = candidates.filter((c) => c.reachable && c.remainingCapacity > 0);

      // If no viable exit exists at all, mark remaining people as unassigned overflow
      if (viableExits.length === 0) {
        assignments.push({
          zoneId: zone.id,
          zoneName: zone.name,
          people: remainingPeopleToAssign,
          assignedPeople: 0,
          unassignedPeople: remainingPeopleToAssign,
          assignedExitId: 'NONE',
          assignedExitName: 'Capacity Depleted / Unreachable',
          distance: Infinity,
          physicalDistance: 0,
          path: [],
          pathEdges: [],
          priority: zone.priority,
          riskLevel: zone.riskLevel,
          urgencyScore: zone.urgencyScore,
          status: 'DEFICIT',
          exitRemainingCapacityAfter: 0,
        });

        decisionSequence.push({
          step: stepCounter++,
          zoneId: zone.id,
          zoneName: zone.name,
          priority: zone.priority,
          riskLevel: zone.riskLevel,
          people: remainingPeopleToAssign,
          urgencyScore: zone.urgencyScore,
          consideredExits: candidates,
          chosenExitId: 'NONE',
          chosenExitName: 'None (Capacity Saturated)',
          peopleAssigned: 0,
          peopleUnassigned: remainingPeopleToAssign,
          rationale: `All perimeter exits reached 100% capacity or are unreachable. ${remainingPeopleToAssign} civilians stranded without exit allocation.`,
          remainingCapacityAfter: Object.fromEntries(
            Object.entries(exitState).map(([k, v]) => [k, v.remainingCapacity])
          ),
        });

        break;
      }

      // Greedy Selection Strategy:
      // Prefer exits that can fit the entire crowd, ranked by lowest impedance cost.
      // If none can fit the entire crowd:
      //   - If allowSplitting: pick the closest viable exit to take as many as possible.
      //   - If single-exit: pick the exit with the greatest remaining capacity (or closest with capacity).
      let chosenCandidate = null;

      const fullFitExits = viableExits.filter((c) => c.canFitAll);
      if (fullFitExits.length > 0) {
        // Sort by minimum effective distance/cost
        fullFitExits.sort((a, b) => a.cost - b.cost);
        chosenCandidate = fullFitExits[0];
      } else {
        if (allowSplitting) {
          // Sort viable exits by minimum cost to siphon crowd into closest exit
          viableExits.sort((a, b) => a.cost - b.cost);
          chosenCandidate = viableExits[0];
        } else {
          // Single exit: pick closest exit with capacity, or exit with max capacity
          viableExits.sort((a, b) => a.cost - b.cost);
          chosenCandidate = viableExits[0];
        }
      }

      const targetExitState = exitState[chosenCandidate.exitId];
      const allocatable = Math.min(remainingPeopleToAssign, targetExitState.remainingCapacity);
      const isPartial = allocatable < remainingPeopleToAssign;

      // Update exit state
      targetExitState.remainingCapacity -= allocatable;
      targetExitState.usedCapacity += allocatable;
      targetExitState.assignedPeopleTotal += allocatable;
      if (!targetExitState.assignedZones.includes(zone.id)) {
        targetExitState.assignedZones.push(zone.id);
      }

      const remainingAfterAllocation = targetExitState.remainingCapacity;

      assignments.push({
        zoneId: zone.id,
        zoneName: zone.name,
        people: zone.people,
        assignedPeople: allocatable,
        unassignedPeople: isPartial && !allowSplitting ? remainingPeopleToAssign - allocatable : 0,
        assignedExitId: chosenCandidate.exitId,
        assignedExitName: chosenCandidate.exitName,
        distance: Math.round(chosenCandidate.cost * 10) / 10,
        physicalDistance: chosenCandidate.distance,
        path: chosenCandidate.path,
        pathEdges: chosenCandidate.pathEdges,
        priority: zone.priority,
        riskLevel: zone.riskLevel,
        urgencyScore: zone.urgencyScore,
        status: isPartial ? (allowSplitting ? 'PARTITIONED' : 'CAPACITY_LIMITED') : 'OPTIMAL',
        exitRemainingCapacityAfter: remainingAfterAllocation,
      });

      // Construct rationale
      let rationaleText = '';
      if (fullFitExits.length > 0) {
        rationaleText = `Selected ${chosenCandidate.exitId} (${chosenCandidate.exitName}): closest viable exit with full capacity (${Math.round(chosenCandidate.cost)}s, ${allocatable} people allocated, ${remainingAfterAllocation} remaining capacity).`;
      } else if (allowSplitting) {
        rationaleText = `Split allocation: assigned ${allocatable} people to closest exit ${chosenCandidate.exitId} (exhausting remaining capacity to ${remainingAfterAllocation}).`;
      } else {
        rationaleText = `Capacity constraint: ${chosenCandidate.exitId} could only accommodate ${allocatable} of ${remainingPeopleToAssign} people (${remainingPeopleToAssign - allocatable} overflow).`;
      }

      decisionSequence.push({
        step: stepCounter++,
        zoneId: zone.id,
        zoneName: zone.name,
        priority: zone.priority,
        riskLevel: zone.riskLevel,
        people: remainingPeopleToAssign,
        urgencyScore: zone.urgencyScore,
        consideredExits: candidates,
        chosenExitId: chosenCandidate.exitId,
        chosenExitName: chosenCandidate.exitName,
        peopleAssigned: allocatable,
        peopleUnassigned: isPartial && !allowSplitting ? remainingPeopleToAssign - allocatable : 0,
        rationale: rationaleText,
        remainingCapacityAfter: Object.fromEntries(
          Object.entries(exitState).map(([k, v]) => [k, v.remainingCapacity])
        ),
      });

      if (allowSplitting) {
        remainingPeopleToAssign -= allocatable;
      } else {
        // Single-exit mode finishes zone processing
        remainingPeopleToAssign = 0;
      }
    }
  }

  // 6. Aggregate Exit Summary & Metrics
  const exitSummary = Object.values(exitState).map((e) => {
    const utilization = e.initialCapacity > 0
      ? Math.round((e.usedCapacity / e.initialCapacity) * 1000) / 10
      : 0;
    return {
      ...e,
      utilizationPercent: utilization,
      assignedZonesCount: e.assignedZones.length,
    };
  });

  const totalPeople = sortedZones.reduce((sum, z) => sum + z.people, 0);
  const totalAssigned = assignments.reduce((sum, a) => sum + a.assignedPeople, 0);
  const totalUnassigned = totalPeople - totalAssigned;

  const validAssignmentsWithDist = assignments.filter((a) => isFinite(a.distance) && a.assignedPeople > 0);
  const weightedDistanceSum = validAssignmentsWithDist.reduce(
    (sum, a) => sum + a.distance * a.assignedPeople,
    0
  );
  const averageDistance = totalAssigned > 0
    ? Math.round((weightedDistanceSum / totalAssigned) * 10) / 10
    : 0;

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTime = Math.max(0.01, Math.round((endTime - startTime) * 100) / 100);

  return {
    assignments,
    exitSummary,
    decisionSequence,
    metrics: {
      totalPeople,
      totalAssigned,
      totalUnassigned,
      evacuationRate: totalPeople > 0 ? Math.round((totalAssigned / totalPeople) * 1000) / 10 : 0,
      averageDistance,
      executionTime,
      strategyUsed: strategy,
      totalZonesCount: sortedZones.length,
      assignedZonesCount: assignments.filter((a) => a.assignedPeople > 0).length,
    },
  };
}

export default greedyEvacuation;
