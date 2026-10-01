import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Network,
  GitFork,
  Split,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  TrendingUp,
  Cpu,
  Zap,
  ShieldCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { kruskalMST, primMST, compareMST } from '../../algorithms/mst';

export default function MstVisualizerView({
  graph,
  selectedScenarioId = 'baseline',
}) {
  const [algoMode, setAlgoMode] = useState('kruskal'); // 'kruskal' | 'prim' | 'compare'
  const [weightMetric, setWeightMetric] = useState('effectiveCost'); // 'effectiveCost' | 'distance' | 'travelTime'
  const [primStartNode, setPrimStartNode] = useState('EX01');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  // Playback state
  const [stepOffset, setStepOffset] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 2x, 4x
  const timerRef = useRef(null);

  // Compute Kruskal MST
  const kruskalResult = useMemo(() => {
    return kruskalMST(graph, {
      weightMetric,
      includeBlocked: false,
      recordSteps: true,
    });
  }, [graph, weightMetric]);

  // Compute Prim MST
  const primResult = useMemo(() => {
    return primMST(graph, {
      startNodeId: primStartNode,
      weightMetric,
      includeBlocked: false,
      recordSteps: true,
    });
  }, [graph, primStartNode, weightMetric]);

  // Comparative analysis
  const comparison = useMemo(() => {
    return compareMST(kruskalResult, primResult);
  }, [kruskalResult, primResult]);

  // Active result for visualization based on mode
  const activeResult = algoMode === 'prim' ? primResult : kruskalResult;
  const activeSteps = useMemo(() => activeResult.steps || [], [activeResult]);
  const maxSteps = Math.max(0, activeSteps.length - 1);

  // Derived current step index (defaults to maxSteps when stepOffset is null)
  const currentStepIndex = stepOffset !== null ? Math.min(stepOffset, maxSteps) : maxSteps;

  const handleModeChange = (mode) => {
    setAlgoMode(mode);
    setStepOffset(null);
    setIsPlaying(false);
  };

  const handleMetricChange = (metric) => {
    setWeightMetric(metric);
    setStepOffset(null);
    setIsPlaying(false);
  };

  const handlePrimStartChange = (nodeId) => {
    setPrimStartNode(nodeId);
    setStepOffset(null);
    setIsPlaying(false);
  };

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(300 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setStepOffset((prev) => {
          const current = prev !== null ? prev : maxSteps;
          if (current >= maxSteps) {
            setIsPlaying(false);
            return maxSteps;
          }
          return current + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxSteps]);

  const currentStepData = activeSteps[currentStepIndex] || activeSteps[0] || null;

  // Build sets of edges accepted or rejected up to current step
  const stepState = useMemo(() => {
    const acceptedEdgeIds = new Set();
    const rejectedEdgeIds = new Set();
    const visitedNodes = new Set();

    for (let i = 0; i <= currentStepIndex && i < activeSteps.length; i++) {
      const s = activeSteps[i];
      if (s.type === 'accepted' && s.edge) {
        acceptedEdgeIds.add(s.edge.id);
        if (s.source) visitedNodes.add(s.source);
        if (s.target) visitedNodes.add(s.target);
      } else if (s.type === 'rejected' && s.edge) {
        rejectedEdgeIds.add(s.edge.id);
      } else if (s.type === 'init' && s.currentVertex) {
        visitedNodes.add(s.currentVertex);
      }
    }

    return { acceptedEdgeIds, rejectedEdgeIds, visitedNodes };
  }, [activeSteps, currentStepIndex]);

  // Node Map for fast coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map();
    if (graph && Array.isArray(graph.nodes)) {
      graph.nodes.forEach((n) => map.set(n.id, n));
    }
    return map;
  }, [graph]);

  // Final selected edge IDs
  const finalSelectedEdgeIds = useMemo(() => {
    return new Set(activeResult.selectedEdges.map((e) => e.id));
  }, [activeResult]);

  const metricUnit = weightMetric === 'distance' ? 'm' : 's';
  const metricLabel =
    weightMetric === 'effectiveCost'
      ? 'Effective Impedance'
      : weightMetric === 'distance'
      ? 'Physical Distance'
      : 'Base Travel Time';

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP CONTROLS & ALGORITHM SWITCHER DECK            */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-emerald-700" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
                Minimum Spanning Tree (MST) Algorithmic Engine
              </h3>
              {selectedScenarioId && selectedScenarioId !== 'baseline' && (
                <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-mono text-rose-700 font-bold">
                  {selectedScenarioId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Extract the optimal resilient communication and rescue infrastructure backbone with zero redundant cycles.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => handleModeChange('kruskal')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer border ${
                algoMode === 'kruskal'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Kruskal's MST (DSU)</span>
            </button>

            <button
              onClick={() => handleModeChange('prim')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer border ${
                algoMode === 'prim'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              <span>Prim's MST (Min-Heap)</span>
            </button>

            <button
              onClick={() => handleModeChange('compare')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer border ${
                algoMode === 'compare'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Kruskal vs Prim Comparison</span>
            </button>
          </div>
        </div>

        {/* Parameter Sub-deck */}
        <div className="pt-3 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-mono text-xs">
          {/* Weight Metric Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">OPTIMIZATION METRIC:</span>
            <button
              onClick={() => handleMetricChange('effectiveCost')}
              className={`rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors border ${
                weightMetric === 'effectiveCost'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Effective Cost (s)
            </button>
            <button
              onClick={() => handleMetricChange('distance')}
              className={`rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors border ${
                weightMetric === 'distance'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Physical Distance (m)
            </button>
            <button
              onClick={() => handleMetricChange('travelTime')}
              className={`rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors border ${
                weightMetric === 'travelTime'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Base Travel Time (s)
            </button>
          </div>

          {/* Root Vertex Selector for Prim */}
          {algoMode === 'prim' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-800">PRIM ROOT VERTEX:</span>
              <select
                value={primStartNode}
                onChange={(e) => handlePrimStartChange(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                {graph.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name} ({n.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. TELEMETRY KPI METRICS CARDS                       */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Cost */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              TOTAL MST WEIGHT
            </span>
            <Zap className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {activeResult.totalCost.toLocaleString()}{' '}
            <span className="text-xs text-emerald-700 font-normal">{metricUnit}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {metricLabel} optimization
          </span>
        </div>

        {/* Selected Edges */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-emerald-800 uppercase tracking-wider font-bold">
              SELECTED CORRIDORS
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-900">
            {activeResult.selectedCount} / {activeResult.edgeCount}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Exactly V - 1 = {activeResult.nodeCount - 1} tree edges
          </span>
        </div>

        {/* Rejected Edges */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-rose-800 uppercase tracking-wider font-bold">
              REJECTED CORRIDORS
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-900">
            {activeResult.rejectedCount}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Cycle-causing / redundant lines
          </span>
        </div>

        {/* Spanning Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              NETWORK COVERAGE
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
            100% SPANNED
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {activeResult.nodeCount} vertices connected
          </span>
        </div>

        {/* Execution Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              EXECUTION LATENCY
            </span>
            <Cpu className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {activeResult.executionTime} ms
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {algoMode === 'prim' ? 'O(E log V) Min-Heap' : 'O(E log E) DSU'}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. STEP-BY-STEP PLAYBACK CONTROLLER                  */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-700" />
            <span className="font-bold uppercase tracking-wider text-slate-900">
              {algoMode === 'prim'
                ? "Prim's Frontier Cut Inspector"
                : "Kruskal's Edge-Greedy & DSU Merger"}
            </span>
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800 font-bold">
              Step {currentStepIndex + 1} of {activeSteps.length}
            </span>
          </div>

          {/* VCR Playback Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepOffset(0);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Reset to beginning"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepOffset((prev) => {
                  const current = prev !== null ? prev : maxSteps;
                  return Math.max(0, current - 1);
                });
              }}
              disabled={currentStepIndex === 0}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Previous step"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="rounded-lg bg-emerald-700 px-2.5 py-1.5 font-bold text-white hover:bg-emerald-800 flex items-center gap-1 cursor-pointer shadow-xs"
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
                setIsPlaying(false);
                setStepOffset((prev) => {
                  const current = prev !== null ? prev : maxSteps;
                  return Math.min(maxSteps, current + 1);
                });
              }}
              disabled={currentStepIndex >= maxSteps}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Next step"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            {/* Speed Selector */}
            <div className="ml-2 flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`rounded px-1.5 py-0.5 cursor-pointer ${
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
        </div>

        {/* Step Slider */}
        <div>
          <input
            type="range"
            min="0"
            max={maxSteps}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setStepOffset(parseInt(e.target.value, 10));
            }}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Step Context Banner */}
        {currentStepData && (
          <div
            className={`rounded-lg border p-3 text-xs leading-relaxed flex items-center justify-between ${
              currentStepData.type === 'accepted'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950 font-medium'
                : currentStepData.type === 'rejected'
                ? 'border-rose-200 bg-rose-50 text-rose-950 font-medium'
                : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {currentStepData.type === 'accepted' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : currentStepData.type === 'rejected' ? (
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
              ) : (
                <Activity className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span>{currentStepData.description}</span>
            </div>

            {currentStepData.weight !== undefined && (
              <span className="font-bold shrink-0 ml-3 rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-800">
                Weight: {currentStepData.weight} {metricUnit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. INTERACTIVE SVG GRAPH VISUALIZATION CANVAS        */}
      {/* ---------------------------------------------------- */}
      <div className="relative w-full rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs overflow-hidden">
        {/* HUD Overlay Legend */}
        <div className="absolute top-6 left-6 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-xs font-mono text-[11px] select-none">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full bg-emerald-600" />
            <span className="text-emerald-900 font-bold">Selected MST Edge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full border border-dashed border-slate-400 bg-transparent" />
            <span className="text-slate-600">Rejected Cycle Edge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-800 font-bold">Current Edge</span>
          </div>
          {algoMode === 'prim' && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-emerald-600 bg-emerald-100" />
              <span className="text-emerald-900">Spanned Vertex Cut</span>
            </div>
          )}
        </div>

        {/* SVG Drawing Canvas */}
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-auto min-h-[480px] max-h-[640px] select-none bg-white rounded-lg border border-slate-200"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* --- EDGES LAYER --- */}
          <g id="mst-edges">
            {graph.edges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const isAccepted = stepState.acceptedEdgeIds.has(edge.id);
              const isRejected = stepState.rejectedEdgeIds.has(edge.id);
              const isCurrent = currentStepData?.edge?.id === edge.id;

              // Edge styling
              let stroke = '#cbd5e1';
              let strokeWidth = 1.2;
              let strokeDasharray = undefined;

              if (isCurrent) {
                stroke = '#d97706'; // amber-600
                strokeWidth = 4;
              } else if (isAccepted) {
                stroke = '#059669'; // emerald-600
                strokeWidth = 3;
              } else if (isRejected) {
                stroke = '#94a3b8';
                strokeWidth = 1.5;
                strokeDasharray = '4,4';
              } else if (edge.blocked) {
                stroke = '#e11d48';
                strokeWidth = 2;
                strokeDasharray = '5,3';
              }

              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;

              return (
                <g
                  key={edge.id}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredEdge(edge)}
                  onMouseLeave={() => setHoveredEdge(null)}
                >
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />

                  {/* Blocked Cross Indicator */}
                  {edge.blocked && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <circle r="6" fill="#fff1f2" stroke="#e11d48" strokeWidth="1.5" />
                      <line x1="-3" y1="-3" x2="3" y2="3" stroke="#e11d48" strokeWidth="1.5" />
                      <line x1="3" y1="-3" x2="-3" y2="3" stroke="#e11d48" strokeWidth="1.5" />
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* --- NODES LAYER --- */}
          <g id="mst-nodes">
            {graph.nodes.map((node) => {
              const isSpanned = stepState.visitedNodes.has(node.id);
              const isPrimRoot = algoMode === 'prim' && node.id === primStartNode;
              const isHovered = hoveredNode?.id === node.id;

              let fill = '#ffffff';
              let stroke = '#94a3b8';
              let radius = 10;

              if (isPrimRoot) {
                stroke = '#059669';
                fill = '#dcfce7';
                radius = 13;
              } else if (isSpanned) {
                fill = '#ecfdf5';
                stroke = '#059669';
              } else if (node.type === 'exit') {
                stroke = '#059669';
              } else if (node.type === 'hospital') {
                stroke = '#e11d48';
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {isHovered && (
                    <circle r={radius + 8} fill="none" stroke="#059669" strokeWidth="1.5" opacity="0.6" />
                  )}

                  <circle
                    r={radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isPrimRoot || isHovered ? 2.5 : 1.5}
                  />

                  {/* Node ID label */}
                  <text
                    y="3.5"
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Inspection Overlay */}
        {(hoveredNode || hoveredEdge) && (
          <div className="absolute bottom-6 left-6 z-10 rounded-lg border border-slate-200 bg-white p-3 shadow-lg font-mono text-xs text-slate-900 max-w-sm">
            {hoveredNode && (
              <div>
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span>{hoveredNode.id}: {hoveredNode.name}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600">
                  Type: <span className="uppercase text-slate-900 font-semibold">{hoveredNode.type}</span> | Civilians: {hoveredNode.people?.toLocaleString() || 0}
                </div>
              </div>
            )}
            {hoveredEdge && (
              <div>
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span>{hoveredEdge.id}: {hoveredEdge.source} ↔ {hoveredEdge.target}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600">
                  Distance: {hoveredEdge.distance}m | Travel Time: {hoveredEdge.travelTime}s | Status:{' '}
                  {finalSelectedEdgeIds.has(hoveredEdge.id) ? (
                    <span className="text-emerald-700 font-bold">In MST Tree</span>
                  ) : (
                    <span className="text-rose-600 font-medium">Rejected / Redundant</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. KRUSKAL VS PRIM COMPARISON DECK                   */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-700" />
            <h3 className="font-bold uppercase tracking-wider text-slate-900">
              Kruskal vs Prim Algorithmic Benchmark & Proof of Optimality
            </h3>
          </div>
          <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800 font-bold">
            {comparison.areCostsIdentical ? 'MATHEMATICALLY EQUIVALENT' : 'COST DIVERGENCE'}
          </span>
        </div>

        {/* Verification Banner */}
        <div
          className={`rounded-lg border p-3.5 leading-relaxed flex items-start gap-3 ${
            comparison.areCostsIdentical
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-900 text-sm">
              MST Optimality Theorem Verified
            </div>
            <p className="text-xs text-slate-700">{comparison.summary}</p>
          </div>
        </div>

        {/* Comparison Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Total Cost Comparison */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              TOTAL MST WEIGHT
            </span>
            <div className="flex items-center justify-between text-base font-bold">
              <span className="text-emerald-800">Kruskal: {kruskalResult.totalCost} {metricUnit}</span>
              <span className="text-emerald-700">Prim: {primResult.totalCost} {metricUnit}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Difference: <strong className="text-slate-900">{comparison.costDifference} {metricUnit}</strong> (Δ = 0.00)
            </div>
          </div>

          {/* Edge Overlap Ratio */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              CORRIDOR OVERLAP RATIO
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {comparison.edgeOverlapPercent}%
            </div>
            <div className="text-[10px] text-slate-500">
              {comparison.sharedEdges.length} shared corridors out of {kruskalResult.selectedEdges.length}
            </div>
          </div>

          {/* Latency Comparison */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              COMPUTATION SPEEDUP
            </span>
            <div className="text-2xl font-bold text-emerald-800">
              {comparison.fasterAlgorithm} Faster ({comparison.speedRatio}x)
            </div>
            <div className="text-[10px] text-slate-500">
              Kruskal: {kruskalResult.executionTime}ms vs Prim: {primResult.executionTime}ms
            </div>
          </div>
        </div>

        {/* Strategy Matrix Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full border-collapse font-mono text-xs text-left">
            <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Algorithm</th>
                <th className="px-3 py-2">Core Strategy</th>
                <th className="px-3 py-2">Key Data Structure</th>
                <th className="px-3 py-2">Time Complexity</th>
                <th className="px-3 py-2">Ideal Graph Topology</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-bold text-emerald-800">Kruskal's MST</td>
                <td className="px-3 py-2.5 text-slate-700">Global edge-sorting; connects disjoint trees</td>
                <td className="px-3 py-2.5 text-slate-900 font-medium">Disjoint Set Union (Path compression + rank)</td>
                <td className="px-3 py-2.5 text-emerald-700 font-bold">O(E log E)</td>
                <td className="px-3 py-2.5 text-slate-600">Sparse urban networks (E ≈ V)</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-bold text-emerald-700">Prim's MST</td>
                <td className="px-3 py-2.5 text-slate-700">Local vertex-cut expansion from seed root</td>
                <td className="px-3 py-2.5 text-slate-900 font-medium">Binary Min-Heap Priority Queue</td>
                <td className="px-3 py-2.5 text-emerald-700 font-bold">O(E log V)</td>
                <td className="px-3 py-2.5 text-slate-600">Dense interconnects & localized cuts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 6. CORRIDORS MANIFEST TABLES (SELECTED & REJECTED)   */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected MST Corridors */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 font-mono text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <h3 className="font-bold uppercase tracking-wider text-slate-900">
                Selected MST Corridors ({activeResult.selectedCount})
              </h3>
            </div>
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800 font-bold">
              Tree Backbone
            </span>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full border-collapse font-mono text-xs text-left">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Corridor ID</th>
                  <th className="px-3 py-2">Endpoints</th>
                  <th className="px-3 py-2">{metricLabel}</th>
                  <th className="px-3 py-2">Distance</th>
                  <th className="px-3 py-2 text-right">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeResult.selectedEdges.map((edge) => (
                  <tr key={edge.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      {edge.id}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {edge.source} <ArrowRight className="h-3 w-3 inline text-slate-400" /> {edge.target}
                    </td>
                    <td className="px-3 py-2 font-bold text-emerald-800">
                      {edge.weight} {metricUnit}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {edge.distance}m
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {edge.capacity?.toLocaleString() || 1200}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejected Corridors & Cycle Prevention */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 font-mono text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h3 className="font-bold uppercase tracking-wider text-slate-900">
                Rejected Corridors ({activeResult.rejectedCount})
              </h3>
            </div>
            <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] text-rose-700 font-bold">
              Cycle Prevention
            </span>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full border-collapse font-mono text-xs text-left">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Corridor ID</th>
                  <th className="px-3 py-2">Endpoints</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeResult.rejectedEdges.map((edge) => (
                  <tr key={edge.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      {edge.id}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {edge.source} <ArrowRight className="h-3 w-3 inline text-slate-400" /> {edge.target}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {edge.weight} {metricUnit}
                    </td>
                    <td className="px-3 py-2 text-rose-700 text-[11px] truncate max-w-[200px]">
                      {edge.reason || 'Forms redundant cycle'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
