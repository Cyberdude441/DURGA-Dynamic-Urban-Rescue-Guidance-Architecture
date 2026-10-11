import React, { startTransition, useState, useEffect, useRef, useMemo } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Flame,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Grid,
  Sparkles,
  Users,
  Award,
  ShieldCheck,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import AlgorithmVisualizerCanvas from '../components/graph/AlgorithmVisualizerCanvas';
import FloydWarshallMatrixView from '../components/graph/FloydWarshallMatrixView';
import GreedyEvacuationView from '../components/graph/GreedyEvacuationView';
import KnapsackResourceOptimizerView from '../components/graph/KnapsackResourceOptimizerView';
import MstVisualizerView from '../components/graph/MstVisualizerView';
import { dijkstra } from '../algorithms/dijkstra';
import { floydWarshall } from '../algorithms/floydWarshall';
import { greedyEvacuation } from '../algorithms/greedyEvacuation';
import { knapsackResourceOptimizer } from '../algorithms/resourceOptimizer';
import { kruskalMST } from '../algorithms/mst';
import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from '../data';
import { applyScenarioToGraph } from '../utils/graphUtils';
import { useLocationContext } from '../context/LocationContext.jsx';

export default function AlgorithmLab() {
  const [selectedAlgo, setSelectedAlgo] = useState('dijkstra'); // 'dijkstra' | 'floyd-warshall' | 'greedy' | 'knapsack' | 'mst'
  const [selectedScenarioId, setSelectedScenarioId] = useState('baseline');
  const [sourceId, setSourceId] = useState('B01');
  const [destinationId, setDestinationId] = useState('EX01');
  const { nearbyGraph, address } = useLocationContext();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x = 300ms, 2x = 150ms, 4x = 75ms
  const timerRef = useRef(null);

  // Active graph (baseline or disaster scenario)
  const currentGraph = useMemo(() => {
    if (selectedScenarioId === 'live_location' && nearbyGraph) {
      return nearbyGraph;
    }
    if (selectedScenarioId === 'baseline') {
      return URBAN_GRAPH;
    }
    const sc = EMERGENCY_SCENARIOS.find((s) => s.id === selectedScenarioId);
    return sc ? applyScenarioToGraph(URBAN_GRAPH, sc) : URBAN_GRAPH;
  }, [selectedScenarioId, nearbyGraph]);

  // ----------------------------------------------------
  // DIJKSTRA STATE & EXECUTION
  // ----------------------------------------------------
  const [dijkstraResult, setDijkstraResult] = useState(() =>
    dijkstra(URBAN_GRAPH, 'B01', 'EX01', { recordSteps: true })
  );
  const [dijkstraStepIndex, setDijkstraStepIndex] = useState(0);

  const handleRunDijkstra = (src = sourceId, dst = destinationId, graphToUse = currentGraph, record = selectedAlgo === 'dijkstra') => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const res = dijkstra(graphToUse, src, dst, { recordSteps: record });
    setDijkstraResult(res);
    setDijkstraStepIndex(res.steps?.length > 0 ? res.steps.length - 1 : 0);
  };

  // ----------------------------------------------------
  // FLOYD-WARSHALL STATE & EXECUTION
  // ----------------------------------------------------
  const [fwResult, setFwResult] = useState(() =>
    floydWarshall(URBAN_GRAPH, { bidirectional: true, recordSteps: false })
  );
  const [fwStepIndex, setFwStepIndex] = useState(0);

  const handleRunFloydWarshall = (graphToUse = currentGraph, record = selectedAlgo === 'floyd-warshall') => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const res = floydWarshall(graphToUse, { bidirectional: true, recordSteps: record });
    setFwResult(res);
    setFwStepIndex(res.steps?.length > 0 ? res.steps.length - 1 : 0);
  };

  // ----------------------------------------------------
  // GREEDY EVACUATION STATE & EXECUTION
  // ----------------------------------------------------
  const [greedyStrategy, setGreedyStrategy] = useState('urgency_first');
  const [greedyZoneScope, setGreedyZoneScope] = useState('zones_only');
  const [greedyAllowSplitting, setGreedyAllowSplitting] = useState(false);
  const [exitCapacities, setExitCapacities] = useState({
    EX01: 5000,
    EX02: 5000,
    EX03: 6000,
    EX04: 4000,
  });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [activeDecisionStep, setActiveDecisionStep] = useState(0);

  const computeGreedy = (
    graphToUse = currentGraph,
    caps = exitCapacities,
    strat = greedyStrategy,
    scope = greedyZoneScope,
    split = greedyAllowSplitting
  ) => {
    const targetZones =
      scope === 'zones_only'
        ? graphToUse.nodes.filter((n) => n.type === 'evacuation_zone')
        : graphToUse.nodes.filter(
            (n) => n.type === 'evacuation_zone' || (n.type === 'building' && n.people > 0)
          );
    const availableExits = graphToUse.nodes.filter((n) => n.type === 'exit');

    return greedyEvacuation({
      graph: graphToUse,
      zones: targetZones,
      exits: availableExits,
      exitCapacities: caps,
      options: {
        strategy: strat,
        allowSplitting: split,
      },
    });
  };

  const [greedyResult, setGreedyResult] = useState(() => computeGreedy(URBAN_GRAPH));

  const handleRunGreedy = (
    graphToUse = currentGraph,
    caps = exitCapacities,
    strat = greedyStrategy,
    scope = greedyZoneScope,
    split = greedyAllowSplitting
  ) => {
    const res = computeGreedy(graphToUse, caps, strat, scope, split);
    setGreedyResult(res);
    setActiveDecisionStep(0);
    if (res.assignments.length > 0) {
      setSelectedAssignment(res.assignments[0]);
    }
  };

  // ----------------------------------------------------
  // 0/1 KNAPSACK DP RESOURCE OPTIMIZER STATE & EXECUTION
  // ----------------------------------------------------
  const [knapsackResourceType, setKnapsackResourceType] = useState('ambulances');
  const [knapsackCapacity, setKnapsackCapacity] = useState(18);
  const [knapsackZoneScope, setKnapsackZoneScope] = useState('zones_only');

  const computeKnapsack = (
    graphToUse = currentGraph,
    rType = knapsackResourceType,
    cap = knapsackCapacity,
    scope = knapsackZoneScope
  ) => {
    const targetZones =
      scope === 'zones_only'
        ? graphToUse.nodes.filter((n) => n.type === 'evacuation_zone')
        : graphToUse.nodes.filter(
            (n) => n.type === 'evacuation_zone' || (n.type === 'building' && n.people > 0)
          );

    return knapsackResourceOptimizer({
      zones: targetZones,
      resourceType: rType,
      capacity: cap,
    });
  };

  const [knapsackResult, setKnapsackResult] = useState(() =>
    computeKnapsack(URBAN_GRAPH, 'ambulances', 18, 'zones_only')
  );

  const handleRunKnapsack = (
    graphToUse = currentGraph,
    rType = knapsackResourceType,
    cap = knapsackCapacity,
    scope = knapsackZoneScope
  ) => {
    const res = computeKnapsack(graphToUse, rType, cap, scope);
    setKnapsackResult(res);
  };

  // ----------------------------------------------------
  // MINIMUM SPANNING TREE (MST) STATE
  // ----------------------------------------------------
  const [mstResult, setMstResult] = useState(() => kruskalMST(URBAN_GRAPH));

  // Handler for disaster scenario change
  const handleScenarioChange = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    let g = scenarioId === 'live_location' && nearbyGraph ? nearbyGraph : URBAN_GRAPH;
    if (scenarioId !== 'baseline' && scenarioId !== 'live_location') {
      const sc = EMERGENCY_SCENARIOS.find((s) => s.id === scenarioId);
      if (sc) g = applyScenarioToGraph(URBAN_GRAPH, sc);
    }
    window.setTimeout(() => {
      startTransition(() => {
        handleRunDijkstra(sourceId, destinationId, g, selectedAlgo === 'dijkstra');
        handleRunFloydWarshall(g, selectedAlgo === 'floyd-warshall');
        handleRunGreedy(g, exitCapacities, greedyStrategy, greedyZoneScope, greedyAllowSplitting);
        handleRunKnapsack(g, knapsackResourceType, knapsackCapacity, knapsackZoneScope);
        setMstResult(kruskalMST(g));
      });
    }, 0);
  };

  useEffect(() => {
    if (!nearbyGraph) return;
    const firstExit = nearbyGraph.nodes.find((node) => node.type === 'exit');
    const nextSource = nearbyGraph.sourceNodeId || nearbyGraph.nodes[0]?.id;
    setSelectedScenarioId('live_location');
    setSourceId(nextSource || '');
    setDestinationId(firstExit?.id || nextSource || '');
    if (nextSource && firstExit) {
      handleRunDijkstra(nextSource, firstExit.id, nearbyGraph, selectedAlgo === 'dijkstra');
      handleRunFloydWarshall(nearbyGraph, selectedAlgo === 'floyd-warshall');
      handleRunGreedy(nearbyGraph);
      handleRunKnapsack(nearbyGraph);
      setMstResult(kruskalMST(nearbyGraph));
    }
  }, [nearbyGraph, selectedAlgo]);

  // Instant O(L) path reconstruction query from precomputed Floyd-Warshall matrix
  const fwActiveRoute = useMemo(() => {
    if (!fwResult || typeof fwResult.reconstructPath !== 'function') {
      return { path: [], totalCost: Infinity, distance: 0, hops: 0, pathEdges: [] };
    }
    return fwResult.reconstructPath(sourceId, destinationId);
  }, [fwResult, sourceId, destinationId]);

  // Capacity adjustment handlers for greedy
  const handleExitCapacityChange = (exitId, newCap) => {
    const updated = { ...exitCapacities, [exitId]: newCap };
    setExitCapacities(updated);
    handleRunGreedy(currentGraph, updated, greedyStrategy, greedyZoneScope, greedyAllowSplitting);
  };

  const handleApplyCapacityPreset = (presetType) => {
    let newCaps = { EX01: 5000, EX02: 5000, EX03: 6000, EX04: 4000 };
    if (presetType === 'abundant') {
      newCaps = { EX01: 5000, EX02: 5000, EX03: 6000, EX04: 5000 };
    } else if (presetType === 'constrained') {
      newCaps = { EX01: 2500, EX02: 2500, EX03: 2500, EX04: 2500 };
    } else if (presetType === 'bottleneck') {
      newCaps = { EX01: 1250, EX02: 1250, EX03: 1250, EX04: 1250 };
    }
    setExitCapacities(newCaps);
    handleRunGreedy(currentGraph, newCaps, greedyStrategy, greedyZoneScope, greedyAllowSplitting);
  };

  const handleStrategyChange = (newStrategy) => {
    setGreedyStrategy(newStrategy);
    handleRunGreedy(currentGraph, exitCapacities, newStrategy, greedyZoneScope, greedyAllowSplitting);
  };

  const handleZoneScopeChange = (newScope) => {
    setGreedyZoneScope(newScope);
    handleRunGreedy(currentGraph, exitCapacities, greedyStrategy, newScope, greedyAllowSplitting);
  };

  const handleToggleSplitting = (split) => {
    setGreedyAllowSplitting(split);
    handleRunGreedy(currentGraph, exitCapacities, greedyStrategy, greedyZoneScope, split);
  };

  // Knapsack parameter change handlers
  const handleKnapsackResourceTypeChange = (newType) => {
    setKnapsackResourceType(newType);
    handleRunKnapsack(currentGraph, newType, knapsackCapacity, knapsackZoneScope);
  };

  const handleKnapsackCapacityChange = (newCap) => {
    setKnapsackCapacity(newCap);
    handleRunKnapsack(currentGraph, knapsackResourceType, newCap, knapsackZoneScope);
  };

  const handleKnapsackZoneScopeChange = (newScope) => {
    setKnapsackZoneScope(newScope);
    handleRunKnapsack(currentGraph, knapsackResourceType, knapsackCapacity, newScope);
  };

  // ----------------------------------------------------
  // PLAYBACK CONTROLLER FOR STEP-BY-STEP VISUALIZATION
  // ----------------------------------------------------

  const activeStepsCount =
    selectedAlgo === 'dijkstra'
      ? dijkstraResult?.steps?.length || 1
      : selectedAlgo === 'floyd-warshall'
      ? fwResult?.steps?.length || 1
      : selectedAlgo === 'greedy'
      ? greedyResult?.decisionSequence?.length || 1
      : knapsackResult?.selectedZones?.length || 1;

  const currentStepIndex =
    selectedAlgo === 'dijkstra'
      ? dijkstraStepIndex
      : selectedAlgo === 'floyd-warshall'
      ? fwStepIndex
      : activeDecisionStep;

  // Play / Pause auto animation
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(30, Math.round(320 / playbackSpeed));
      timerRef.current = setInterval(() => {
        if (selectedAlgo === 'dijkstra') {
          setDijkstraStepIndex((prev) => {
            const maxIdx = (dijkstraResult?.steps?.length || 1) - 1;
            if (prev >= maxIdx) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        } else if (selectedAlgo === 'floyd-warshall') {
          setFwStepIndex((prev) => {
            const maxIdx = (fwResult?.steps?.length || 1) - 1;
            if (prev >= maxIdx) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        } else if (selectedAlgo === 'greedy') {
          setActiveDecisionStep((prev) => {
            const maxIdx = (greedyResult?.decisionSequence?.length || 1) - 1;
            if (prev >= maxIdx) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        }
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, selectedAlgo, dijkstraResult, fwResult, greedyResult]);

  // Quick route presets
  const presets = [
    { label: 'Metro Plaza → North Freeway', source: 'B01', dest: 'EX01' },
    { label: 'Riverfront → Coastal Highway', source: 'EZ02', dest: 'EX04' },
    { label: 'Downtown Core → East Ring', source: 'EZ01', dest: 'EX02' },
    { label: 'Skyline North → Trauma Center', source: 'B04', dest: 'H01' },
    { label: 'Academic Sector → South Interstate', source: 'EZ05', dest: 'EX03' },
  ];

  const handleApplyPreset = (p) => {
    setSourceId(p.source);
    setDestinationId(p.dest);
    setIsPlaying(false);
    if (selectedAlgo === 'dijkstra') {
      handleRunDijkstra(p.source, p.dest);
    }
  };

  const handleSelectPairFromMatrix = (src, dst) => {
    setSourceId(src);
    setDestinationId(dst);
    if (selectedAlgo === 'dijkstra') {
      handleRunDijkstra(src, dst);
    }
  };

  // Active step data
  const currentStepData =
    selectedAlgo === 'dijkstra'
      ? dijkstraResult?.steps?.[dijkstraStepIndex] || null
      : selectedAlgo === 'floyd-warshall'
      ? fwResult?.steps?.[fwStepIndex] || null
      : null;

  // Active decision step for greedy
  const currentGreedyDecision = greedyResult?.decisionSequence?.[activeDecisionStep] || null;

  // Active path and KPIs depending on selected algorithm
  const activePath =
    selectedAlgo === 'dijkstra'
      ? dijkstraResult.path
      : selectedAlgo === 'floyd-warshall'
      ? fwActiveRoute.path
      : selectedAlgo === 'greedy'
      ? selectedAssignment?.path || currentGreedyDecision?.consideredExits?.find((c) => c.exitId === currentGreedyDecision?.chosenExitId)?.path || []
      : [];

  const activePathEdges =
    selectedAlgo === 'dijkstra'
      ? dijkstraResult.pathEdges
      : selectedAlgo === 'floyd-warshall'
      ? fwActiveRoute.pathEdges
      : selectedAlgo === 'greedy'
      ? selectedAssignment?.pathEdges || currentGreedyDecision?.consideredExits?.find((c) => c.exitId === currentGreedyDecision?.chosenExitId)?.pathEdges || []
      : [];

  const activeTotalCost =
    selectedAlgo === 'dijkstra'
      ? dijkstraResult.totalCost
      : selectedAlgo === 'floyd-warshall'
      ? fwActiveRoute.totalCost
      : selectedAlgo === 'greedy'
      ? selectedAssignment?.distance || 0
      : knapsackResult.maxBenefit;

  const activeDistance =
    selectedAlgo === 'dijkstra'
      ? dijkstraResult.distance
      : selectedAlgo === 'floyd-warshall'
      ? fwActiveRoute.distance
      : selectedAlgo === 'greedy'
      ? selectedAssignment?.physicalDistance || 0
      : knapsackResult.resourceUsed;

  const algorithms = [
    {
      id: 'dijkstra',
      name: "Dijkstra's Algorithm",
      status: 'ACTIVE',
      complexity: 'O((V + E) log V)',
      description: 'Single-source greedy shortest path using Binary Min-Heap.',
    },
    {
      id: 'floyd-warshall',
      name: 'Floyd-Warshall DP',
      status: 'ACTIVE',
      complexity: 'O(V³)',
      description: 'All-pairs dynamic programming matrix with instant O(L) path query.',
    },
    {
      id: 'greedy',
      name: 'Greedy Evacuation',
      status: 'ACTIVE',
      complexity: 'O(Z log Z + Z·E)',
      description: 'Urgency-weighted greedy matching of disaster zones to exits respecting capacity.',
    },
    {
      id: 'knapsack',
      name: '0/1 Knapsack DP',
      status: 'ACTIVE',
      complexity: 'O(N·W)',
      description: 'Optimal emergency resource allocation under capacity limits with full backtracking.',
    },
    {
      id: 'mst',
      name: 'MST (Kruskal & Prim)',
      status: 'ACTIVE',
      complexity: 'O(E log E) / O(E log V)',
      description: 'Minimum Spanning Tree infrastructure backbone with DSU cycle detection and Min-Heap cut expansion.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Scenario Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Algorithm Lab
            </h1>
            <StatusBadge
              status="safe"
              text={
                selectedAlgo === 'dijkstra'
                  ? 'DIJKSTRA ACTIVE'
                  : selectedAlgo === 'floyd-warshall'
                  ? 'FLOYD-WARSHALL ACTIVE'
                  : selectedAlgo === 'greedy'
                  ? 'GREEDY EVACUATION ACTIVE'
                  : selectedAlgo === 'knapsack'
                  ? 'KNAPSACK DP ACTIVE'
                  : 'MST (KRUSKAL & PRIM) ACTIVE'
              }
              pulse
            />
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-mono text-emerald-800 font-bold">
              SCRATCH IMPLEMENTATION
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {nearbyGraph ? `Live location source: ${address?.displayName || 'current area'}. ` : 'Synthetic source: B01. '}
            Compare routing heuristics, step-by-step state visualization, and theoretical complexity bounds.
          </p>
        </div>

        {/* Disaster Scenario Preset for Algorithm Testing */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 font-mono text-xs shadow-xs">
          <span className="text-[10px] text-slate-500 px-2 uppercase font-bold">NETWORK STATE:</span>
          <button
            onClick={() => handleScenarioChange('baseline')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              selectedScenarioId === 'baseline'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Baseline Normal
          </button>
          {nearbyGraph && (
            <button
              onClick={() => handleScenarioChange('live_location')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                selectedScenarioId === 'live_location'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Live Location
            </button>
          )}
          <button
            onClick={() => handleScenarioChange('scenario_fire')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              selectedScenarioId === 'scenario_fire'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <Flame className="h-3 w-3 text-rose-500" />
            Fire (Roads Blocked)
          </button>
          <button
            onClick={() => handleScenarioChange('scenario_flood')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              selectedScenarioId === 'scenario_flood'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <Droplets className="h-3 w-3 text-blue-500" />
            Flood (Bridges Submerged)
          </button>
        </div>
      </div>

      {/* Algorithm Family Selector Tabs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {algorithms.map((algo) => {
          const isSelected = selectedAlgo === algo.id;
          const isActive = algo.status === 'ACTIVE';

          return (
            <div
              key={algo.id}
              onClick={() => {
                if (!isActive) return;
                setSelectedAlgo(algo.id);
                setIsPlaying(false);
                if (timerRef.current) clearInterval(timerRef.current);
                if (algo.id === 'floyd-warshall') {
                  handleRunFloydWarshall(currentGraph, true);
                } else if (algo.id === 'dijkstra') {
                  handleRunDijkstra(sourceId, destinationId, currentGraph, true);
                }
              }}
              className={`rounded-xl border p-4 transition-all shadow-xs ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              } ${isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                  {algo.status}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-medium">{algo.complexity}</span>
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900 tracking-tight">
                {algo.name}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {algo.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* ALGORITHM CONTROLS: DIJKSTRA & FLOYD-WARSHALL DECK  */}
      {/* ---------------------------------------------------- */}
      {(selectedAlgo === 'dijkstra' || selectedAlgo === 'floyd-warshall') && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Source and Destination Pickers */}
            <div className="flex flex-wrap items-center gap-4 flex-1">
              <div className="min-w-[200px] flex-1">
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1 font-bold">
                  SOURCE VERTEX (ORIGIN)
                </label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  {currentGraph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id}: {n.name} ({n.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center pt-4 text-emerald-700">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div className="min-w-[200px] flex-1">
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1 font-bold">
                  DESTINATION VERTEX (TARGET)
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  {currentGraph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id}: {n.name} ({n.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Run Button */}
              <div className="pt-4">
                {selectedAlgo === 'dijkstra' ? (
                  <button
                    onClick={() => handleRunDijkstra()}
                    className="flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer active:scale-95"
                  >
                    <Zap className="h-4 w-4" />
                    RUN DIJKSTRA
                  </button>
                ) : (
                  <button
                    onClick={() => handleRunFloydWarshall()}
                    className="flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer active:scale-95"
                  >
                    <Grid className="h-4 w-4" />
                    RECOMPUTE ALL-PAIRS MATRIX
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notice for Floyd-Warshall All-Pairs advantage */}
          {selectedAlgo === 'floyd-warshall' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-mono text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>All-Pairs Matrix Active:</strong> You can select any source and destination at any time. The optimal path is reconstructed in <strong>O(L) time</strong> from matrix Π without recalculating!
                </span>
              </div>
              <span className="text-[10px] text-emerald-800 uppercase font-bold shrink-0 hidden sm:inline">
                O(1) Matrix Lookup
              </span>
            </div>
          )}

          {/* Quick Presets Row */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 text-xs font-mono">
            <span className="text-[10px] uppercase text-slate-500 font-bold">PRESET ROUTES:</span>
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => handleApplyPreset(p)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-all cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EXECUTION TELEMETRY KPIS                             */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            {selectedAlgo === 'mst'
              ? 'BACKBONE COVERAGE'
              : selectedAlgo === 'knapsack'
              ? 'OPTIMALITY STATUS'
              : selectedAlgo === 'greedy'
              ? 'EVACUATION SUCCESS'
              : 'SHORTEST PATH STATUS'}
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-lg font-bold">
            {selectedAlgo === 'mst' ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> 100% SPANNED
              </span>
            ) : selectedAlgo === 'knapsack' ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Award className="h-4 w-4" /> DP OPTIMAL
              </span>
            ) : selectedAlgo === 'greedy' ? (
              <span
                className={`flex items-center gap-1 ${
                  greedyResult.metrics.evacuationRate >= 100
                    ? 'text-emerald-700'
                    : greedyResult.metrics.evacuationRate >= 70
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                <Users className="h-4 w-4" /> {greedyResult.metrics.evacuationRate}% ROUTED
              </span>
            ) : activePath.length > 0 ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> OPTIMAL
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> UNREACHABLE
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {selectedAlgo === 'mst'
              ? `${mstResult.nodeCount} vertices connected`
              : selectedAlgo === 'knapsack'
              ? `+${knapsackResult.comparison.benefitDiff} pts over Greedy`
              : selectedAlgo === 'greedy'
              ? `${greedyResult.metrics.totalAssigned?.toLocaleString()} civilians evacuated`
              : activePath.length > 0
              ? `${activePath.length} vertices in path`
              : 'All corridors severed'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            {selectedAlgo === 'mst'
              ? 'TOTAL MST WEIGHT'
              : selectedAlgo === 'knapsack'
              ? 'MAX BENEFIT (DP)'
              : selectedAlgo === 'greedy'
              ? 'AVG EVACUATION TIME'
              : 'EFFECTIVE IMPEDANCE'}
          </span>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {selectedAlgo === 'mst'
              ? `${mstResult.totalCost.toLocaleString()} s`
              : selectedAlgo === 'knapsack'
              ? `${knapsackResult.maxBenefit.toLocaleString()} pts`
              : selectedAlgo === 'greedy'
              ? `${greedyResult.metrics.averageDistance} s`
              : isFinite(activeTotalCost)
              ? `${activeTotalCost.toFixed(1)} s`
              : '∞'}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {selectedAlgo === 'mst'
              ? 'Minimum tree resistance'
              : selectedAlgo === 'knapsack'
              ? 'Humanitarian life score'
              : selectedAlgo === 'greedy'
              ? 'Mean travel impedance'
              : 'Time & hazard weighted cost'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            {selectedAlgo === 'mst'
              ? 'TREE CORRIDORS'
              : selectedAlgo === 'knapsack'
              ? 'RESOURCE USAGE'
              : selectedAlgo === 'greedy'
              ? 'UNASSIGNED OVERFLOW'
              : 'PHYSICAL DISTANCE'}
          </span>
          <div
            className={`mt-1 font-mono text-2xl font-bold ${
              selectedAlgo === 'mst'
                ? 'text-emerald-800'
                : selectedAlgo === 'knapsack'
                ? 'text-emerald-800'
                : selectedAlgo === 'greedy'
                ? greedyResult.metrics.totalUnassigned > 0
                  ? 'text-rose-600'
                  : 'text-emerald-700'
                : 'text-emerald-800'
            }`}
          >
            {selectedAlgo === 'mst'
              ? `${mstResult.selectedCount} / ${mstResult.edgeCount}`
              : selectedAlgo === 'knapsack'
              ? `${knapsackResult.resourceUsed} / ${knapsackResult.capacity}`
              : selectedAlgo === 'greedy'
              ? `${greedyResult.metrics.totalUnassigned?.toLocaleString()}`
              : `${activeDistance.toLocaleString()} m`}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {selectedAlgo === 'mst'
              ? `V - 1 = ${mstResult.nodeCount - 1} essential lines`
              : selectedAlgo === 'knapsack'
              ? `${knapsackResult.remainingResource} available`
              : selectedAlgo === 'greedy'
              ? 'Capacity deficit overflow'
              : 'Total road span'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            EXECUTION TIME
          </span>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {selectedAlgo === 'dijkstra'
              ? `${dijkstraResult.executionTime} ms`
              : selectedAlgo === 'floyd-warshall'
              ? `${fwResult.executionTime} ms`
              : selectedAlgo === 'greedy'
              ? `${greedyResult.metrics.executionTime} ms`
              : selectedAlgo === 'knapsack'
              ? `${knapsackResult.executionTime} ms`
              : `${mstResult.executionTime} ms`}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {selectedAlgo === 'mst'
              ? 'O(E log E) / O(E log V)'
              : selectedAlgo === 'knapsack'
              ? 'O(N·W) pseudo-poly table'
              : selectedAlgo === 'dijkstra'
              ? 'Binary Min-Heap latency'
              : selectedAlgo === 'floyd-warshall'
              ? 'All-Pairs O(V³) DP matrix'
              : 'O(Z log Z + Z·E) greedy pass'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            {selectedAlgo === 'mst'
              ? 'CYCLE ELIMINATIONS'
              : selectedAlgo === 'knapsack'
              ? 'SECTORS SECURED'
              : selectedAlgo === 'dijkstra'
              ? 'SETTLED / PROCESSED'
              : selectedAlgo === 'floyd-warshall'
              ? 'GRAPH NODES / CELLS'
              : 'ZONES ALLOCATED'}
          </span>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {selectedAlgo === 'mst'
              ? `${mstResult.rejectedCount} rejected`
              : selectedAlgo === 'knapsack'
              ? knapsackResult.selectedZones.length
              : selectedAlgo === 'dijkstra'
              ? dijkstraResult.nodesVisited
              : selectedAlgo === 'floyd-warshall'
              ? fwResult.nodesCount
              : greedyResult.metrics.assignedZonesCount}{' '}
            <span className="text-xs text-slate-500 font-normal">
              {selectedAlgo === 'mst'
                ? `corridors`
                : selectedAlgo === 'knapsack'
                ? `/ ${knapsackResult.items.length} zones`
                : selectedAlgo === 'greedy'
                ? `/ ${greedyResult.metrics.totalZonesCount}`
                : 'nodes'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {selectedAlgo === 'mst'
              ? 'Redundant loop prevention'
              : selectedAlgo === 'knapsack'
              ? `${knapsackResult.greedyResult.selectedZones.length} via Greedy`
              : selectedAlgo === 'dijkstra'
              ? `${dijkstraResult.edgesProcessed} edge relaxations`
              : selectedAlgo === 'floyd-warshall'
              ? `${fwResult.edgesProcessed} DP relaxations`
              : `${greedyResult.decisionSequence.length} greedy steps`}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FINAL PATH STRIP (For Dijkstra & Floyd-Warshall)     */}
      {/* ---------------------------------------------------- */}
      {(selectedAlgo === 'dijkstra' || selectedAlgo === 'floyd-warshall') && activePath.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2 font-mono text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
              Optimal Evacuation Route ({selectedAlgo === 'dijkstra' ? 'Dijkstra' : 'Floyd-Warshall'})
            </span>
            <span className="text-slate-600">
              {sourceId} → {destinationId} ({activePath.length - 1} hops)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activePath.map((nodeId, idx) => (
              <React.Fragment key={nodeId}>
                <span
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold border ${
                    idx === 0
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : idx === activePath.length - 1
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}
                >
                  {nodeId}
                </span>
                {idx < activePath.length - 1 && (
                  <span className="text-emerald-700 font-mono text-xs font-bold">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STEP-BY-STEP VISUALIZER CANVAS                       */}
      {/* ---------------------------------------------------- */}
      {selectedAlgo !== 'mst' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
                {selectedAlgo === 'dijkstra'
                  ? 'Step-by-Step Traversal Inspector (Dijkstra)'
                  : selectedAlgo === 'floyd-warshall'
                  ? 'Intermediate-Node Pivot Process Inspector (Floyd-Warshall)'
                  : selectedAlgo === 'greedy'
                  ? 'Spatial Evacuation Map (Greedy Decision Flow)'
                  : 'Spatial Resource Allocation Map (Knapsack DP)'}
              </span>
              <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-800 font-bold">
                Step {currentStepIndex + 1} of {activeStepsCount}
              </span>
              {selectedAlgo === 'floyd-warshall' && currentStepData?.pivotNodeId && (
                <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono text-amber-800 font-bold">
                  PIVOT: {currentStepData.pivotNodeId}
                </span>
              )}
              {selectedAlgo === 'greedy' && currentGreedyDecision && (
                <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono text-amber-800 font-bold">
                  ZONE: {currentGreedyDecision.zoneId} → {currentGreedyDecision.chosenExitId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {selectedAlgo === 'greedy'
                ? currentGreedyDecision?.rationale || 'Inspecting evacuation assignments'
                : selectedAlgo === 'knapsack'
                ? `Allocating ${knapsackResult.resourceUsed} / ${knapsackResult.capacity} ${knapsackResult.resourceType} across ${knapsackResult.selectedZones.length} priority sectors.`
                : currentStepData?.description || 'Awaiting algorithm playback'}
            </p>
          </div>

          {/* VCR Playback Controls (Active for Dijkstra, FW, and Greedy) */}
          {selectedAlgo !== 'knapsack' && (
            <div className="flex items-center gap-2 font-mono">
              <button
                onClick={() => {
                  if (selectedAlgo === 'dijkstra') setDijkstraStepIndex(0);
                  else if (selectedAlgo === 'floyd-warshall') setFwStepIndex(0);
                  else setActiveDecisionStep(0);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                title="Reset to step 0"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (selectedAlgo === 'dijkstra') setDijkstraStepIndex((prev) => Math.max(0, prev - 1));
                  else if (selectedAlgo === 'floyd-warshall') setFwStepIndex((prev) => Math.max(0, prev - 1));
                  else setActiveDecisionStep((prev) => Math.max(0, prev - 1));
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                title="Previous step"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isPlaying
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" /> PAUSE
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> PLAY
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (selectedAlgo === 'dijkstra') setDijkstraStepIndex((prev) => Math.min(activeStepsCount - 1, prev + 1));
                  else if (selectedAlgo === 'floyd-warshall') setFwStepIndex((prev) => Math.min(activeStepsCount - 1, prev + 1));
                  else setActiveDecisionStep((prev) => Math.min(activeStepsCount - 1, prev + 1));
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                title="Next step"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* Playback speed toggle */}
              <div className="ml-2 flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step Scrubber Slider */}
        {selectedAlgo !== 'knapsack' && (
          <div>
            <input
              type="range"
              min="0"
              max={Math.max(0, activeStepsCount - 1)}
              value={currentStepIndex}
              onChange={(e) => {
                setIsPlaying(false);
                const val = parseInt(e.target.value, 10);
                if (selectedAlgo === 'dijkstra') setDijkstraStepIndex(val);
                else if (selectedAlgo === 'floyd-warshall') setFwStepIndex(val);
                else setActiveDecisionStep(val);
              }}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>
        )}

        {/* Algorithm Visualization Canvas */}
        <div className="h-[480px]">
          <AlgorithmVisualizerCanvas
            graph={currentGraph}
            currentStepData={currentStepData}
            finalPath={activePath}
            finalPathEdges={activePathEdges}
            sourceNodeId={
              selectedAlgo === 'greedy'
                ? currentGreedyDecision?.zoneId || selectedAssignment?.zoneId || sourceId
                : selectedAlgo === 'knapsack'
                ? knapsackResult.selectedZones[0]?.id || null
                : sourceId
            }
            destinationNodeId={
              selectedAlgo === 'greedy'
                ? currentGreedyDecision?.chosenExitId || selectedAssignment?.assignedExitId || destinationId
                : destinationId
            }
            pivotNodeId={selectedAlgo === 'floyd-warshall' ? currentStepData?.pivotNodeId : null}
            onSelectSource={(id) => {
              setSourceId(id);
              if (selectedAlgo === 'dijkstra') {
                handleRunDijkstra(id, destinationId);
              }
            }}
            onSelectDestination={(id) => {
              setDestinationId(id);
              if (selectedAlgo === 'dijkstra') {
                handleRunDijkstra(sourceId, id);
              }
            }}
          />
        </div>
      </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* FLOYD-WARSHALL MATRIX VIEW (WHEN FW IS ACTIVE)       */}
      {/* ---------------------------------------------------- */}
      {selectedAlgo === 'floyd-warshall' && (
        <FloydWarshallMatrixView
          nodes={currentGraph.nodes}
          nodeIds={fwResult.nodeIds}
          distMatrix={
            currentStepData?.matrixSnapshot && currentStepIndex < activeStepsCount - 1
              ? currentStepData.matrixSnapshot
              : fwResult.distMatrix
          }
          nextMatrix={fwResult.nextMatrix}
          sourceId={sourceId}
          destinationId={destinationId}
          pivotNodeId={currentStepData?.pivotNodeId}
          onSelectPair={handleSelectPairFromMatrix}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* GREEDY EVACUATION VIEW (WHEN GREEDY IS ACTIVE)       */}
      {/* ---------------------------------------------------- */}
      {selectedAlgo === 'greedy' && (
        <GreedyEvacuationView
          assignments={greedyResult.assignments}
          exitSummary={greedyResult.exitSummary}
          decisionSequence={greedyResult.decisionSequence}
          metrics={greedyResult.metrics}
          exitCapacities={exitCapacities}
          onCapacityChange={handleExitCapacityChange}
          onApplyCapacityPreset={handleApplyCapacityPreset}
          strategy={greedyStrategy}
          onStrategyChange={handleStrategyChange}
          zoneScope={greedyZoneScope}
          onZoneScopeChange={handleZoneScopeChange}
          allowSplitting={greedyAllowSplitting}
          onToggleSplitting={handleToggleSplitting}
          selectedAssignment={selectedAssignment}
          onSelectAssignment={(item) => setSelectedAssignment(item)}
          activeDecisionStep={activeDecisionStep}
          onSelectDecisionStep={(stepOrUpdater) => {
            if (typeof stepOrUpdater === 'function') {
              setActiveDecisionStep(stepOrUpdater);
            } else {
              setActiveDecisionStep(stepOrUpdater);
            }
          }}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 0/1 KNAPSACK DP VIEW (WHEN KNAPSACK IS ACTIVE)       */}
      {/* ---------------------------------------------------- */}
      {selectedAlgo === 'knapsack' && (
        <KnapsackResourceOptimizerView
          result={knapsackResult}
          resourceType={knapsackResourceType}
          onResourceTypeChange={handleKnapsackResourceTypeChange}
          capacity={knapsackCapacity}
          onCapacityChange={handleKnapsackCapacityChange}
          zoneScope={knapsackZoneScope}
          onZoneScopeChange={handleKnapsackZoneScopeChange}
          onRunOptimizer={() => handleRunKnapsack()}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MINIMUM SPANNING TREE VIEW (WHEN MST IS ACTIVE)      */}
      {/* ---------------------------------------------------- */}
      {selectedAlgo === 'mst' && (
        <MstVisualizerView
          graph={currentGraph}
          selectedScenarioId={selectedScenarioId}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* THEORETICAL COMPLEXITY CARD                          */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Cpu className="h-5 w-5 text-emerald-700" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
            Theoretical Complexity & Mathematical Guarantees
          </h3>
        </div>

        {selectedAlgo === 'dijkstra' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                TIME COMPLEXITY: O((V + E) log V)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                With a Binary Min-Heap Priority Queue, extracting the minimum cost vertex costs O(log V), and edge relaxations decrease keys in O(log V) across all E edges.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                SPACE COMPLEXITY: O(V)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Requires O(V) memory for distance mappings, predecessor pointers, unvisited heaps, and settled visited hash sets across metropolitan vertices.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                NON-NEGATIVE WEIGHT INVARIANT
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Effective costs are strictly positive (w ≥ 0), satisfying the greedy choice property where every settled vertex is mathematically guaranteed optimal.
              </p>
            </div>
          </div>
        ) : selectedAlgo === 'floyd-warshall' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                TIME COMPLEXITY: O(V³)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Triply nested loops relax every vertex pair (i, j) across all V intermediate pivot vertices k = 0 ... V-1. Total relaxations: 47³ = 103,823.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                SPACE COMPLEXITY: O(V²)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Stores all-pairs distance matrix D and predecessor/next-hop matrix Π in V × V space (47 × 47 = 2,209 pairs), enabling O(1) query time.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                PRINCIPLE OF OPTIMALITY
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                D^(k)[i][j] = min( D^(k-1)[i][j], D^(k-1)[i][k] + D^(k-1)[k][j] ). A subpath of a shortest path is itself a shortest path.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                PATH QUERY LATENCY: O(L)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Once the all-pairs matrix is computed, arbitrary queries between any origin and destination reconstruct the shortest route in O(L) hops with 0ms latency.
              </p>
            </div>
          </div>
        ) : selectedAlgo === 'greedy' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-amber-800 font-bold block">
                TIME COMPLEXITY: O(Z log Z + Z·E)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Sorting Z zones by urgency costs O(Z log Z). For each zone, scanning E candidate exits costs O(E), totaling O(Z log Z + Z·E) sub-millisecond execution.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-amber-800 font-bold block">
                SPACE COMPLEXITY: O(Z + E)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Maintains linear state for exit remaining capacities and zone assignment manifests without exponential state-space expansion.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-amber-800 font-bold block">
                GREEDY CHOICE PROPERTY
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                At each step, the zone with highest urgency claims the nearest available exit with positive remaining capacity without backtracking or future speculation.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-amber-800 font-bold block">
                CAPACITY INVARIANT
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Strict physical throughput guarantee: total civilians assigned to exit e never exceeds capacity(e). Overflows are flagged for secondary diversion.
              </p>
            </div>
          </div>
        ) : selectedAlgo === 'knapsack' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                TIME COMPLEXITY: O(N · W)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Pseudo-polynomial dynamic programming fills an (N+1) × (W+1) matrix in O(N·W) operations where N is zones count and W is resource capacity.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                SPACE COMPLEXITY: O(N · W)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Stores the full 2D subproblem table for exact O(N) backtracking recovery of selected emergency sectors without recursive recalculation.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                OPTIMAL SUBSTRUCTURE
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                dp[i][w] = max(dp[i-1][w], dp[i-1][w - w_i] + v_i). The globally optimal allocation strictly contains optimal solutions to subproblems.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                WHY GREEDY FAILS ON 0/1
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Due to item indivisibility, density greedy packing leaves unusable slack capacity, missing complementary combinations with higher aggregate benefit.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                KRUSKAL TIME: O(E log E)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Initial edge sorting requires O(E log E). Disjoint Set Union with path compression and union-by-rank operates in near-constant amortized O(E · α(V)).
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                PRIM TIME: O(E log V)
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Binary Min-Heap Priority Queue maintains the cut frontier. Each vertex is spanned once, and incident cut edges are decreased in O(E log V).
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-amber-800 font-bold block">
                CUT PROPERTY THEOREM
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                For any cut in connected graph G, the minimum weight edge crossing the cut strictly belongs to all MSTs. Prim greedily expands across this cut.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                CYCLE PROPERTY THEOREM
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                For any cycle in graph G, the maximum weight edge cannot belong to any MST. Kruskal enforces this by using DSU to discard any edge connecting the same component.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
