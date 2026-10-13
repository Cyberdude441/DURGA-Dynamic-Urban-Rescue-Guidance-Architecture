/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Emergency Simulation Engine
 *
 * Coordinates the full multi-algorithm urban disaster response pipeline:
 *  1. Apply emergency parameters & epicenter propagation
 *  2. Update graph state & threat levels
 *  3. Disable blocked roads & compromised buildings
 *  4. Calculate dynamic edge costs & network resistance
 *  5. Run Dijkstra shortest-path from epicenter to safe havens
 *  6. Run Floyd-Warshall all-pairs dynamic programming matrix
 *  7. Run Greedy evacuation matching zones to exits respecting capacities
 *  8. Run DP resource optimization (0/1 Knapsack) across multiple fleets
 *  9. Run Kruskal's MST (Sorting + Disjoint Set Union)
 * 10. Run Prim's MST (Priority-based cut expansion)
 * 11. Generate unified executive evacuation plan & tactical directives
 * 12. Package and return full audit telemetry
 */

import { dijkstra } from '../algorithms/dijkstra.js';
import { floydWarshall } from '../algorithms/floydWarshall.js';
import { greedyEvacuation } from '../algorithms/greedyEvacuation.js';
import { knapsackResourceOptimizer } from '../algorithms/resourceOptimizer.js';
import { kruskalMST } from '../algorithms/kruskal.js';
import { primMST } from '../algorithms/prim.js';

/**
 * Standard hazard radius presets by disaster type
 */
export const HAZARD_PRESETS = {
  Fire: { radiusMeters: 650, dangerFactor: 2.5, congestionFactor: 2.0 },
  Flood: { radiusMeters: 800, dangerFactor: 2.2, congestionFactor: 2.2 },
  Earthquake: { radiusMeters: 1100, dangerFactor: 2.8, congestionFactor: 2.5 },
  'Chemical Leak': { radiusMeters: 750, dangerFactor: 3.0, congestionFactor: 1.8 },
};

/**
 * Execute the 12-stage Emergency Simulation Pipeline
 *
 * @param {Object} baseGraph - { nodes: Array, edges: Array }
 * @param {Object} config - Simulator configuration parameters
 * @param {Function} [onProgress] - Optional stage callback: ({ stage, name, status, timeMs, detail }) => void
 * @returns {Promise<Object>} Full simulation results with real algorithmic calculations
 */
export async function runEmergencySimulation(baseGraph, config, onProgress = null) {
  const simStartTime = performance.now();
  const stages = [];

  const recordStage = (stageNum, name, fn) => {
    const stageStart = performance.now();
    const result = fn();
    const stageEnd = performance.now();
    const stageTime = Number((stageEnd - stageStart).toFixed(2));

    const stageInfo = {
      stage: stageNum,
      name,
      status: 'completed',
      durationMs: stageTime,
    };
    stages.push(stageInfo);

    if (typeof onProgress === 'function') {
      try {
        onProgress(stageInfo);
      } catch {
        // Safe callback handling
      }
    }

    return result;
  };

  const {
    disasterType = 'Fire',
    emergencyLocation = 'B01',
    affectedPeople = 1200,
    riskLevel = 'CRITICAL',
    blockedRoads = [],
    blockedBuildings = [],
    hazardRadiusMeters = null,
    exitAvailability = {
      EX01: { available: true, capacity: 5000 },
      EX02: { available: true, capacity: 5000 },
      EX03: { available: true, capacity: 6000 },
      EX04: { available: true, capacity: 4000 },
    },
    fleetBudget = {
      ambulances: 18,
      rescueTeams: 12,
      emergencyVehicles: 10,
    },
  } = config;

  // ----------------------------------------------------
  // STAGE 1: APPLY EMERGENCY PARAMETERS
  // ----------------------------------------------------
  const stage1Data = recordStage(1, 'Apply Emergency', () => {
    const preset = HAZARD_PRESETS[disasterType] || HAZARD_PRESETS.Fire;
    const epicenterNode = baseGraph.nodes.find((n) => n.id === emergencyLocation) || baseGraph.nodes[0];

    return {
      disasterType,
      epicenterId: epicenterNode.id,
      epicenterName: epicenterNode.name,
      epicenterX: epicenterNode.x,
      epicenterY: epicenterNode.y,
      radiusMeters: Number(hazardRadiusMeters) > 0 ? Number(hazardRadiusMeters) : preset.radiusMeters,
      riskLevel,
      affectedPeople,
      dangerFactor: preset.dangerFactor,
      congestionFactor: preset.congestionFactor,
    };
  });

  // ----------------------------------------------------
  // STAGE 2: UPDATE GRAPH THREAT MULTIPLIERS
  // ----------------------------------------------------
  const simGraph = recordStage(2, 'Update Graph', () => {
    const { epicenterX, epicenterY, radiusMeters, epicenterId } = stage1Data;
    const blockedBuildingSet = new Set(blockedBuildings);

    // Deep clone nodes with danger propagation
    const updatedNodes = baseGraph.nodes.map((node) => {
      const dist = Math.hypot(node.x - epicenterX, node.y - epicenterY);
      const isEpicenter = node.id === epicenterId;
      const isBlockedBuilding = blockedBuildingSet.has(node.id);

      let effectiveRisk = node.riskLevel;
      let effectivePeople = node.people;
      let peopleAtRisk = 0;

      if (isEpicenter) {
        effectiveRisk = riskLevel;
        effectivePeople = affectedPeople;
        peopleAtRisk = affectedPeople;
      } else if (isBlockedBuilding) {
        effectiveRisk = 'CRITICAL';
        peopleAtRisk = node.people;
      } else if (dist <= radiusMeters) {
        if (dist <= radiusMeters * 0.4) {
          effectiveRisk = 'CRITICAL';
          peopleAtRisk = Math.round(node.people * 0.9);
        } else if (dist <= radiusMeters * 0.75) {
          effectiveRisk = 'HIGH';
          peopleAtRisk = Math.round(node.people * 0.6);
        } else {
          effectiveRisk = 'MEDIUM';
          peopleAtRisk = Math.round(node.people * 0.3);
        }
      }

      return {
        ...node,
        riskLevel: effectiveRisk,
        people: effectivePeople,
        peopleAtRisk,
        isEpicenter,
        isCompromised: isBlockedBuilding,
        distToEpicenter: Math.round(dist),
      };
    });

    // Deep clone edges with proximity hazard escalation
    const updatedEdges = baseGraph.edges.map((edge) => {
      const src = updatedNodes.find((n) => n.id === edge.source);
      const tgt = updatedNodes.find((n) => n.id === edge.target);

      const midX = ((src?.x ?? 0) + (tgt?.x ?? 0)) / 2;
      const midY = ((src?.y ?? 0) + (tgt?.y ?? 0)) / 2;
      const dist = Math.hypot(midX - epicenterX, midY - epicenterY);

      let danger = edge.danger || 0;
      let congestion = edge.congestion || 0;

      if (dist <= radiusMeters) {
        const proximity = Math.max(0, 1 - dist / radiusMeters);
        danger = Math.min(1.0, Number((danger + proximity * 0.75).toFixed(2)));
        congestion = Math.min(1.0, Number((congestion + proximity * 0.85).toFixed(2)));
      }

      return {
        ...edge,
        danger,
        congestion,
      };
    });

    return {
      nodes: updatedNodes,
      edges: updatedEdges,
    };
  });

  // ----------------------------------------------------
  // STAGE 3: DISABLE BLOCKED ROADS
  // ----------------------------------------------------
  recordStage(3, 'Disable Blocked Roads', () => {
    const blockedRoadSet = new Set(blockedRoads);
    const blockedBuildingSet = new Set(blockedBuildings);

    simGraph.edges = simGraph.edges.map((edge) => {
      let isBlocked = edge.blocked || blockedRoadSet.has(edge.id);

      // If both endpoints are compromised buildings, sever the connecting link
      if (blockedBuildingSet.has(edge.source) && blockedBuildingSet.has(edge.target)) {
        isBlocked = true;
      }

      return {
        ...edge,
        blocked: isBlocked,
      };
    });

    return {
      totalBlockedEdges: simGraph.edges.filter((e) => e.blocked).length,
      blockedRoadsList: blockedRoads,
      blockedBuildingsList: blockedBuildings,
    };
  });

  // ----------------------------------------------------
  // STAGE 4: CALCULATE EDGE COSTS
  // ----------------------------------------------------
  const networkMetrics = recordStage(4, 'Calculate Edge Costs', () => {
    let totalActiveCost = 0;
    let activeCorridorCount = 0;

    simGraph.edges.forEach((edge) => {
      if (edge.blocked) {
        edge.effectiveCost = Infinity;
      } else {
        const baseTime = typeof edge.travelTime === 'number' ? edge.travelTime : (edge.distance ? edge.distance / 10 : 30);
        const cost = baseTime * (1 + 1.5 * edge.congestion) * (1 + 2.5 * edge.danger);
        edge.effectiveCost = Number(cost.toFixed(2));
        totalActiveCost += edge.effectiveCost;
        activeCorridorCount++;
      }
    });

    const averageCost = activeCorridorCount > 0 ? Number((totalActiveCost / activeCorridorCount).toFixed(2)) : Infinity;

    return {
      activeCorridorCount,
      blockedCorridorCount: simGraph.edges.length - activeCorridorCount,
      averageActiveCost: averageCost,
    };
  });

  // ----------------------------------------------------
  // STAGE 5: RUN DIJKSTRA SHORTEST PATH
  // ----------------------------------------------------
  const dijkstraResults = recordStage(5, 'Run Dijkstra', () => {
    // Find nearest accessible exit from epicenter across all available exits
    const availableExitIds = Object.keys(exitAvailability).filter(
      (id) => exitAvailability[id]?.available !== false && (exitAvailability[id]?.capacity || 0) > 0
    );
    
    let bestExitRoute = { totalCost: Infinity, path: [], distance: 0, nodesVisited: 0, edgesProcessed: 0 };
    let bestExitId = availableExitIds[0] || 'EX01';

    for (const exId of availableExitIds) {
      const route = dijkstra(simGraph, emergencyLocation, exId, { recordSteps: false });
      if (route.totalCost < bestExitRoute.totalCost) {
        bestExitRoute = route;
        bestExitId = exId;
      }
    }

    // Dijkstra to the nearest mapped medical facility. Synthetic graphs retain H01/H02;
    // live graphs may have zero hospitals, which is reported as unavailable.
    const hospitalNodes = simGraph.nodes.filter((node) => node.type === 'hospital');
    const hospitalRoutes = hospitalNodes.map((hospital) => ({
      id: hospital.id,
      route: dijkstra(simGraph, emergencyLocation, hospital.id, { recordSteps: false }),
    }));
    const nearestHospital = hospitalRoutes.reduce(
      (best, candidate) => (candidate.route.totalCost < (best?.route.totalCost ?? Infinity) ? candidate : best),
      null
    );
    const medicalRoute = nearestHospital?.route || {
      path: [],
      totalCost: Infinity,
      distance: 0,
      nodesVisited: 0,
      edgesProcessed: 0,
    };
    const nearestHospitalId = nearestHospital?.id || 'NO_MAPPED_MEDICAL_FACILITY';

    return {
      epicenterToExit: {
        targetExitId: bestExitId,
        path: bestExitRoute.path,
        totalCost: bestExitRoute.totalCost,
        distance: bestExitRoute.distance,
        nodesVisited: bestExitRoute.nodesVisited,
        edgesProcessed: bestExitRoute.edgesProcessed,
        isReachable: isFinite(bestExitRoute.totalCost) && bestExitRoute.path.length > 0,
      },
      epicenterToMedical: {
        targetHospitalId: nearestHospitalId,
        path: medicalRoute.path,
        totalCost: medicalRoute.totalCost,
        distance: medicalRoute.distance,
        isReachable: isFinite(medicalRoute.totalCost) && medicalRoute.path.length > 0,
      },
    };
  });

  // ----------------------------------------------------
  // STAGE 6: RUN FLOYD-WARSHALL ALL-PAIRS MATRIX
  // ----------------------------------------------------
  const fwResult = recordStage(6, 'Run Floyd-Warshall', () => {
    return floydWarshall(simGraph, { bidirectional: true, recordSteps: false });
  });

  // ----------------------------------------------------
  // STAGE 7: RUN GREEDY EVACUATION
  // ----------------------------------------------------
  const greedyResult = recordStage(7, 'Run Greedy Evacuation', () => {
    // Candidate zones: evacuation zones + high risk buildings
    const targetZones = simGraph.nodes.filter(
      (n) => n.type === 'evacuation_zone' || (n.peopleAtRisk && n.peopleAtRisk > 0)
    );

    // Active exits with positive capacity
    const availableExits = simGraph.nodes.filter(
      (n) => n.type === 'exit' && exitAvailability[n.id]?.available !== false
    );

    const caps = {};
    availableExits.forEach((ex) => {
      caps[ex.id] = exitAvailability[ex.id]?.capacity || ex.capacity || 5000;
    });

    const greedyOutput = greedyEvacuation({
      graph: simGraph,
      zones: targetZones,
      exits: availableExits,
      exitCapacities: caps,
      options: {
        strategy: 'urgency_first',
        allowSplitting: true,
      },
    });

    // Normalize exitSummary into a structured map with both array and object compatibility
    const exitSummaryMap = {};
    if (Array.isArray(greedyOutput.exitSummary)) {
      greedyOutput.exitSummary.forEach((item) => {
        exitSummaryMap[item.id] = {
          ...item,
          assigned: item.usedCapacity,
          totalCapacity: item.initialCapacity,
          available: exitAvailability[item.id]?.available !== false,
        };
      });
    } else if (greedyOutput.exitSummary && typeof greedyOutput.exitSummary === 'object') {
      Object.assign(exitSummaryMap, greedyOutput.exitSummary);
    }

    Object.keys(exitAvailability).forEach((exId) => {
      if (!exitSummaryMap[exId]) {
        exitSummaryMap[exId] = {
          id: exId,
          name: exId,
          totalCapacity: exitAvailability[exId]?.capacity || 0,
          initialCapacity: exitAvailability[exId]?.capacity || 0,
          usedCapacity: 0,
          remainingCapacity: exitAvailability[exId]?.capacity || 0,
          assigned: 0,
          assignedPeopleTotal: 0,
          assignedZones: [],
          utilizationPercent: 0,
          available: exitAvailability[exId]?.available !== false,
        };
      }
    });

    greedyOutput.exitSummary = exitSummaryMap;

    return greedyOutput;
  });

  // ----------------------------------------------------
  // STAGE 8: RUN DP RESOURCE OPTIMIZATION (0/1 KNAPSACK)
  // ----------------------------------------------------
  const knapsackResults = recordStage(8, 'Run DP Resource Optimization', () => {
    const targetZones = simGraph.nodes.filter(
      (n) => n.type === 'evacuation_zone' || (n.peopleAtRisk && n.peopleAtRisk > 0)
    );

    const ambulances = knapsackResourceOptimizer({
      zones: targetZones,
      resourceType: 'ambulances',
      capacity: fleetBudget.ambulances || 18,
    });

    const rescueTeams = knapsackResourceOptimizer({
      zones: targetZones,
      resourceType: 'rescueTeams',
      capacity: fleetBudget.rescueTeams || 12,
    });

    const emergencyVehicles = knapsackResourceOptimizer({
      zones: targetZones,
      resourceType: 'emergencyVehicles',
      capacity: fleetBudget.emergencyVehicles || 10,
    });

    return {
      ambulances,
      rescueTeams,
      emergencyVehicles,
    };
  });

  // ----------------------------------------------------
  // STAGE 9: RUN KRUSKAL MST
  // ----------------------------------------------------
  const kruskalResult = recordStage(9, 'Run Kruskal', () => {
    return kruskalMST(simGraph, {
      weightMetric: 'effectiveCost',
      includeBlocked: false,
      recordSteps: true,
    });
  });

  // ----------------------------------------------------
  // STAGE 10: RUN PRIM MST
  // ----------------------------------------------------
  const primResult = recordStage(10, 'Run Prim', () => {
    const startNode = Object.keys(exitAvailability)[0] || 'EX01';
    return primMST(simGraph, {
      startNodeId: startNode,
      weightMetric: 'effectiveCost',
      includeBlocked: false,
      recordSteps: true,
    });
  });

  // ----------------------------------------------------
  // STAGE 11: GENERATE EVACUATION PLAN
  // ----------------------------------------------------
  const evacuationPlan = recordStage(11, 'Generate Evacuation Plan', () => {
    const totalCiviliansAtRisk = simGraph.nodes.reduce((sum, n) => sum + (n.peopleAtRisk || 0), 0);
    const totalAssigned = greedyResult.metrics?.totalAssigned || 0;
    const evacuationRate = totalCiviliansAtRisk > 0 ? Number(((totalAssigned / totalCiviliansAtRisk) * 100).toFixed(1)) : 100;

    const pathAvailable = dijkstraResults.epicenterToExit.isReachable;
    const hospitalAvailable = dijkstraResults.epicenterToMedical.isReachable;

    // Composite Feasibility Score
    const pathScore = pathAvailable ? 35 : 0;
    const hospitalScore = hospitalAvailable ? 15 : 0;
    const rateScore = (Math.min(100, evacuationRate) / 100) * 30;
    const mstScore = kruskalResult.isFullySpanned ? 20 : 10;
    const feasibilityScore = Math.min(100, Math.round(pathScore + hospitalScore + rateScore + mstScore));

    let directiveLevel = 'ROUTINE';
    if (feasibilityScore < 40) directiveLevel = 'CATASTROPHIC_DEFICIT';
    else if (feasibilityScore < 70) directiveLevel = 'ELEVATED_CONTINGENCY';
    else directiveLevel = 'OPTIMAL_COMMAND_CONTROL';

    return {
      planId: 'PLAN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      directiveLevel,
      feasibilityScore,
      totalCiviliansAtRisk,
      totalCiviliansEvacuated: totalAssigned,
      evacuationRate,
      epicenterEscapeRoute: dijkstraResults.epicenterToExit,
      medicalTriageRoute: dijkstraResults.epicenterToMedical,
      primaryExitAssigned: dijkstraResults.epicenterToExit.targetExitId,
      exitCapacitiesUtilized: greedyResult.exitSummary,
      ambulanceUnitsStaged: knapsackResults.ambulances.resourceUsed,
      rescueSquadsStaged: knapsackResults.rescueTeams.resourceUsed,
      utilityVehiclesStaged: knapsackResults.emergencyVehicles.resourceUsed,
      totalLifeBenefitScore:
        knapsackResults.ambulances.maxBenefit +
        knapsackResults.rescueTeams.maxBenefit +
        knapsackResults.emergencyVehicles.maxBenefit,
      backboneCorridorCount: kruskalResult.selectedCount,
      severedArterialsCount: kruskalResult.rejectedCount,
    };
  });

  // ----------------------------------------------------
  // STAGE 12: DISPLAY RESULTS & TELEMETRY MANIFEST
  // ----------------------------------------------------
  const simEndTime = performance.now();
  const totalExecutionTime = Number((simEndTime - simStartTime).toFixed(2));

  recordStage(12, 'Display Results', () => {
    return {
      ready: true,
      totalStagesCompleted: 12,
      totalExecutionTime,
    };
  });

  return {
    simulationId: 'SIM-' + Date.now(),
    timestamp: new Date().toISOString(),
    config,
    stages,
    totalExecutionTime,
    graph: simGraph,
    networkMetrics,
    dijkstraResults,
    fwResult,
    greedyResult,
    knapsackResults,
    kruskalResult,
    primResult,
    evacuationPlan,
  };
}

export default runEmergencySimulation;
