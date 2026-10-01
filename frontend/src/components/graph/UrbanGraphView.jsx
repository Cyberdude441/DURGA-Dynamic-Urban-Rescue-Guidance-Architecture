import React, { useState } from 'react';

export default function UrbanGraphView({
  graph,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  visibleLayers = {
    buildings: true,
    hospitals: true,
    exits: true,
    zones: true,
    junctions: true,
    resourceCenters: true,
  },
  showEdgeCosts = false,
  routePath = [],
  userMapPoint = null,
  followUser = false,
}) {
  const [hoveredItem, setHoveredItem] = useState(null);

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return null;
  }

  const nodeMap = new Map();
  graph.nodes.forEach((n) => nodeMap.set(n.id, n));
  const routePoints = routePath.map((nodeId) => nodeMap.get(nodeId)).filter(Boolean);
  const viewBox = followUser && userMapPoint
    ? `${Math.max(0, userMapPoint.x - 350)} ${Math.max(0, userMapPoint.y - 280)} 700 560`
    : '0 0 1000 700';

  const getNodeColor = (type, riskLevel) => {
    if (riskLevel === 'CRITICAL') return '#ef4444'; // red-500
    if (riskLevel === 'HIGH') return '#f97316'; // orange-500
    switch (type) {
      case 'exit':
        return '#059669'; // emerald-600
      case 'hospital':
        return '#ef4444'; // red-500
      case 'resource_center':
        return '#2563eb'; // blue-600
      case 'evacuation_zone':
        return '#d97706'; // amber-600
      case 'junction':
        return '#047857'; // emerald-700
      case 'building':
      default:
        return '#64748b'; // slate-500
    }
  };

  const getEdgeStroke = (edge) => {
    if (edge.blocked) return '#ef4444'; // red for blocked
    if (edge.danger > 0.4) return '#f87171'; // red-400
    if (edge.congestion > 0.3) return '#f59e0b'; // amber-500
    return '#cbd5e1'; // slate-300 default
  };

  const getEdgeStrokeWidth = (edge) => {
    if (selectedEdge?.id === edge.id) return 4;
    if (edge.blocked) return 3;
    if (edge.danger > 0.4 || edge.congestion > 0.3) return 2.5;
    return 1.75;
  };

  const isNodeVisible = (node) => {
    if (node.type === 'building' && !visibleLayers.buildings) return false;
    if (node.type === 'hospital' && !visibleLayers.hospitals) return false;
    if (node.type === 'exit' && !visibleLayers.exits) return false;
    if (node.type === 'evacuation_zone' && !visibleLayers.zones) return false;
    if (node.type === 'junction' && !visibleLayers.junctions) return false;
    if (node.type === 'resource_center' && !visibleLayers.resourceCenters) return false;
    return true;
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-white border border-slate-200 select-none shadow-xs">
      {/* Background Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <defs>
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="#cbd5e1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />
      </svg>

      {/* Main Graph SVG Canvas */}
      <svg
        viewBox={viewBox}
        className="w-full h-full min-h-[460px] max-h-[680px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* --- EDGES LAYER --- */}
        <g id="edges-layer">
          {graph.edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const isSelected = selectedEdge?.id === edge.id;
            const strokeColor = getEdgeStroke(edge);
            const strokeWidth = getEdgeStrokeWidth(edge);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            return (
              <g
                key={edge.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEdge(edge);
                }}
                onMouseEnter={() => setHoveredItem({ type: 'edge', data: edge })}
                onMouseLeave={() => setHoveredItem(null)}
                className="cursor-pointer group"
              >
                {/* Invisible wide hit area for easy clicking */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="transparent"
                  strokeWidth="16"
                />

                {/* Visible Edge Line */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isSelected ? '#059669' : strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={edge.blocked ? '6,4' : undefined}
                  className="transition-all duration-200"
                />

                {/* Blocked indicator on the line */}
                {edge.blocked && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <circle r="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="-4" y1="-4" x2="4" y2="4" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="4" y1="-4" x2="-4" y2="4" stroke="#ef4444" strokeWidth="1.5" />
                  </g>
                )}

                {/* Cost label if enabled */}
                {showEdgeCosts && !edge.blocked && (
                  <text
                    x={midX}
                    y={midY - 5}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="pointer-events-none font-bold"
                  >
                    {edge.distance}m
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {routePoints.length > 1 && (
          <g id="planned-route-layer" pointerEvents="none">
            <polyline
              points={routePoints.map((node) => `${node.x},${node.y}`).join(' ')}
              fill="none"
              stroke="#059669"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.22"
            />
            <polyline
              points={routePoints.map((node) => `${node.x},${node.y}`).join(' ')}
              fill="none"
              stroke="#047857"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10,5"
            />
          </g>
        )}

        {userMapPoint && (
          <g transform={`translate(${userMapPoint.x}, ${userMapPoint.y})`} pointerEvents="none">
            <circle r="18" fill="#10b981" opacity="0.18" className="animate-pulse" />
            <circle r="8" fill="#059669" stroke="white" strokeWidth="3" />
            <circle r="3" fill="white" />
          </g>
        )}

        {/* --- NODES LAYER --- */}
        <g id="nodes-layer">
          {graph.nodes.filter(isNodeVisible).map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const nodeColor = getNodeColor(node.type, node.riskLevel);
            const isHazardous = node.riskLevel === 'CRITICAL' || node.riskLevel === 'HIGH';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                onMouseEnter={() => setHoveredItem({ type: 'node', data: node })}
                onMouseLeave={() => setHoveredItem(null)}
                className="cursor-pointer group"
              >
                {/* Selection Ring */}
                {isSelected && (
                  <circle
                    r="20"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeDasharray="4,2"
                    className="animate-spin"
                  />
                )}

                {/* Specific Shapes Based on Node Type */}
                {node.type === 'exit' ? (
                  // Exit: Green Diamond Portal
                  <g>
                    <polygon
                      points="0,-14 14,0 0,14 -14,0"
                      fill="#ecfdf5"
                      stroke="#059669"
                      strokeWidth="2"
                    />
                    <circle r="4" fill="#059669" />
                  </g>
                ) : node.type === 'hospital' ? (
                  // Hospital: Red Medical Cross
                  <g>
                    <rect x="-11" y="-11" width="22" height="22" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
                    <rect x="-2" y="-7" width="4" height="14" fill="#ef4444" />
                    <rect x="-7" y="-2" width="14" height="4" fill="#ef4444" />
                  </g>
                ) : node.type === 'resource_center' ? (
                  // Resource Center: Blue Hexagon
                  <g>
                    <polygon
                      points="0,-12 11,-4 8,8 0,13 -8,8 -11,-4"
                      fill="#eff6ff"
                      stroke="#2563eb"
                      strokeWidth="2"
                    />
                    <circle r="3" fill="#2563eb" />
                  </g>
                ) : node.type === 'evacuation_zone' ? (
                  // Evacuation Zone: Concentric Amber Marker
                  <g>
                    <circle r="14" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3,2" />
                    <circle r="6" fill="#d97706" />
                  </g>
                ) : node.type === 'junction' ? (
                  // Junction: Small Emerald Circle
                  <g>
                    <circle r="6" fill="#ecfdf5" stroke="#047857" strokeWidth="1.5" />
                    <circle r="2.5" fill="#047857" />
                  </g>
                ) : (
                  // Building: Rounded Slate Tile
                  <g>
                    <rect
                      x="-7"
                      y="-7"
                      width="14"
                      height="14"
                      rx="3"
                      fill={isHazardous ? '#fee2e2' : '#f8fafc'}
                      stroke={nodeColor}
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* Node ID label */}
                <text
                  y="18"
                  fill="#475569"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="pointer-events-none group-hover:fill-emerald-800 transition-colors font-bold"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover Tooltip Overlay */}
      {hoveredItem && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-mono shadow-lg z-20 text-slate-800">
          {hoveredItem.type === 'node' ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950">
                  {hoveredItem.data.id} — {hoveredItem.data.name}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-700 uppercase font-semibold">
                  {hoveredItem.data.type}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600">
                <span>Occupants: <b className="text-slate-900">{hoveredItem.data.people}</b></span>
                <span>Risk: <b className={hoveredItem.data.riskLevel === 'CRITICAL' ? 'text-red-600' : 'text-emerald-700'}>{hoveredItem.data.riskLevel}</b></span>
                <span>Priority: <b className="text-slate-900">{hoveredItem.data.priority}/5</b></span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950">
                  Road {hoveredItem.data.id}: {hoveredItem.data.source} ↔ {hoveredItem.data.target}
                </span>
                {hoveredItem.data.blocked ? (
                  <span className="rounded bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 text-[10px] font-bold">
                    BLOCKED
                  </span>
                ) : (
                  <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold">
                    OPEN
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600">
                <span>Dist: <b className="text-slate-900">{hoveredItem.data.distance}m</b></span>
                <span>Time: <b className="text-slate-900">{hoveredItem.data.travelTime}s</b></span>
                <span>Congestion: <b className="text-slate-900">{(hoveredItem.data.congestion * 100).toFixed(0)}%</b></span>
                <span>Danger: <b className="text-slate-900">{(hoveredItem.data.danger * 100).toFixed(0)}%</b></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas Corner Map Legend */}
      <div className="pointer-events-none absolute top-3 right-3 flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white/95 p-2.5 text-[10px] font-mono text-slate-600 shadow-xs">
        <div className="text-slate-900 font-bold uppercase tracking-wider mb-0.5">
          Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          <span>Exit Portal (4)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span>Hospital Center (2)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span>Resource Depot (2)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Evacuation Zone (5)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-700" />
          <span>Arterial Junction (12)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-slate-400" />
          <span>Building Structure (22)</span>
        </div>
        <div className="pt-1 mt-1 border-t border-slate-200 flex items-center gap-2">
          <span className="h-0.5 w-3 bg-red-500" />
          <span className="text-red-600 font-semibold">Blocked Road</span>
        </div>
      </div>
    </div>
  );
}
