import React from 'react';

export default function AlgorithmVisualizerCanvas({
  graph,
  currentStepData,
  finalPath = [],
  finalPathEdges = [],
  sourceNodeId,
  destinationNodeId,
  pivotNodeId = null,
  onSelectSource,
  onSelectDestination,
}) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return null;
  }

  const nodeMap = new Map();
  graph.nodes.forEach((n) => nodeMap.set(n.id, n));

  const visitedSet = new Set(currentStepData?.visited || []);
  const unvisitedSet = new Set(currentStepData?.unvisited || []);
  const currentNodeId = currentStepData?.current || null;
  const activePivotId = pivotNodeId || currentStepData?.pivotNodeId || null;
  const pathSet = new Set(finalPath);
  const pathEdgeSet = new Set(finalPathEdges);

  // Helper to determine node visual state during step-by-step playback
  const getNodeState = (nodeId) => {
    if (nodeId === activePivotId) return 'pivot';
    if (nodeId === currentNodeId) return 'current';
    if (pathSet.has(nodeId) && currentStepData?.type === 'done') return 'path';
    if (nodeId === sourceNodeId) return 'source';
    if (nodeId === destinationNodeId) return 'destination';
    if (visitedSet.has(nodeId)) return 'visited';
    if (unvisitedSet.has(nodeId)) return 'unvisited';
    return 'default';
  };

  const getNodeFill = (node) => {
    const state = getNodeState(node.id);
    if (state === 'pivot') return '#fef3c7'; // light amber
    if (state === 'current') return '#059669'; // dark emerald
    if (state === 'path') return '#10b981'; // emerald
    if (state === 'source') return '#0284c7'; // sky
    if (state === 'destination') return '#047857'; // deep emerald
    if (state === 'visited') return '#d1fae5'; // very light green
    if (state === 'unvisited') return '#f8fafc'; // light slate
    return '#ffffff';
  };

  const getNodeStroke = (node) => {
    const state = getNodeState(node.id);
    if (state === 'pivot') return '#d97706';
    if (state === 'current') return '#047857';
    if (state === 'path') return '#059669';
    if (state === 'source') return '#0369a1';
    if (state === 'destination') return '#065f46';
    if (state === 'visited') return '#10b981';
    if (node.type === 'exit') return '#059669';
    if (node.type === 'hospital') return '#ef4444';
    return '#94a3b8';
  };

  const getEdgeStroke = (edge) => {
    if (edge.blocked) return '#ef4444';
    if (pathEdgeSet.has(edge.id) && currentStepData?.type === 'done') {
      return '#059669'; // clean emerald for final path
    }
    if (activePivotId && (edge.source === activePivotId || edge.target === activePivotId)) {
      return '#d97706'; // amber exploration
    }
    if (edge.source === currentNodeId || edge.target === currentNodeId) {
      return '#10b981'; // active exploration
    }
    return '#cbd5e1';
  };

  const getEdgeWidth = (edge) => {
    if (pathEdgeSet.has(edge.id) && currentStepData?.type === 'done') return 4;
    if (activePivotId && (edge.source === activePivotId || edge.target === activePivotId)) return 3;
    if (edge.source === currentNodeId || edge.target === currentNodeId) return 3;
    if (edge.blocked) return 2.5;
    return 1.5;
  };

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden rounded-2xl bg-white select-none border border-slate-200 shadow-xs">
      {/* Background Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <defs>
          <pattern id="algoGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="#cbd5e1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#algoGridPattern)" />
      </svg>

      {/* SVG Visualization Canvas */}
      <svg
        viewBox="0 0 1000 700"
        className="w-full h-full min-h-[460px] max-h-[640px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* --- EDGES LAYER --- */}
        <g id="algo-edges">
          {graph.edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const strokeColor = getEdgeStroke(edge);
            const strokeWidth = getEdgeWidth(edge);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            return (
              <g key={edge.id} className="transition-all duration-200">
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={edge.blocked ? '6,4' : undefined}
                />

                {/* Blocked Red Marker */}
                {edge.blocked && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <circle r="7" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#ef4444" strokeWidth="1.5" />
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* --- NODES LAYER --- */}
        <g id="algo-nodes">
          {graph.nodes.map((node) => {
            const state = getNodeState(node.id);
            const isPivot = state === 'pivot';
            const isCurrent = state === 'current';
            const isPath = state === 'path';
            const isSource = node.id === sourceNodeId;
            const isDestination = node.id === destinationNodeId;
            const nodeFill = getNodeFill(node);
            const nodeStroke = getNodeStroke(node);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => {
                  if (!sourceNodeId || (sourceNodeId && destinationNodeId)) {
                    onSelectSource(node.id);
                  } else {
                    onSelectDestination(node.id);
                  }
                }}
                className="cursor-pointer group"
              >
                {/* Active Pivot (k) Radar Halo */}
                {isPivot && (
                  <circle
                    r="26"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2.5"
                    className="animate-ping"
                    opacity="0.5"
                  />
                )}

                {/* Active Current Node Pulse Halo */}
                {isCurrent && (
                  <circle
                    r="24"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    className="animate-ping"
                    opacity="0.5"
                  />
                )}

                {/* Node Main Circle */}
                <circle
                  r={isPivot || isCurrent || isPath || isSource || isDestination ? 14 : 10}
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth={isPivot || isCurrent || isPath ? 2.5 : 1.5}
                  className="transition-all duration-300"
                />

                {/* Special Center Dot for Source / Destination */}
                {isSource && (
                  <circle r="4" fill="#ffffff" />
                )}
                {isDestination && (
                  <circle r="4" fill="#ffffff" />
                )}

                {/* Node Identifier Label */}
                <text
                  y="22"
                  fill={isPath ? '#047857' : isPivot ? '#b45309' : isCurrent ? '#065f46' : '#475569'}
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={isPath || isPivot || isCurrent ? 'bold' : '600'}
                  className="pointer-events-none transition-colors"
                >
                  {node.id}
                </text>

                {/* Live Distance Tag during playback */}
                {currentStepData?.distances && currentStepData.distances[node.id] !== Infinity && (
                  <text
                    y="-15"
                    fill="#0284c7"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {Math.round(currentStepData.distances[node.id])}s
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend Indicator */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[10px] font-mono text-slate-600 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-100 border border-slate-400" />
          <span>Unvisited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span className="text-emerald-800 font-bold">Current</span>
        </div>
        {activePivotId && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-amber-800 font-bold">Pivot (k)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-200 border border-emerald-500" />
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span className="text-emerald-900 font-bold">Final Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-700">Blocked</span>
        </div>
      </div>
    </div>
  );
}
