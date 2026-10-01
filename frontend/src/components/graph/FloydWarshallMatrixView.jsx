import React, { useState, useMemo } from 'react';
import {
  Grid,
  Search,
  ArrowRight,
} from 'lucide-react';

export default function FloydWarshallMatrixView({
  nodes = [],
  nodeIds = [],
  distMatrix = [],
  nextMatrix = [],
  sourceId,
  destinationId,
  onSelectPair,
  pivotNodeId = null,
}) {
  const [viewMode, setViewMode] = useState('distance'); // 'distance' | 'next'
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [pageSize, setPageSize] = useState(20); // 20 | 47 (all)

  // Map nodes by ID for fast name/type lookups
  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Filtered node IDs based on search and type filter
  const filteredNodeIds = useMemo(() => {
    return nodeIds.filter((id) => {
      const node = nodeMap.get(id);
      if (!node) return false;

      // Filter by type
      if (filterType !== 'all' && node.type !== filterType) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = id.toLowerCase().includes(query);
        const matchesName = node.name.toLowerCase().includes(query);
        if (!matchesId && !matchesName) return false;
      }

      return true;
    });
  }, [nodeIds, nodeMap, filterType, searchQuery]);

  // Paginated/Sliced subset for performance and readability
  const displayedNodeIds = useMemo(() => {
    if (pageSize === 0 || pageSize >= filteredNodeIds.length) {
      return filteredNodeIds;
    }
    return filteredNodeIds.slice(0, pageSize);
  }, [filteredNodeIds, pageSize]);

  // Mapping from nodeId to original matrix index
  const indexMap = useMemo(() => {
    const map = {};
    nodeIds.forEach((id, idx) => {
      map[id] = idx;
    });
    return map;
  }, [nodeIds]);

  // Calculate cell color based on distance
  const getCellColor = (d, isSelf, isSelected, isPivotRow, isPivotCol) => {
    if (isSelected) {
      return 'bg-emerald-200 text-emerald-950 border-2 border-emerald-600 font-bold';
    }
    if (isSelf) {
      return 'bg-slate-100 text-slate-400 border border-slate-200 font-mono';
    }
    if (!isFinite(d)) {
      return 'bg-red-50 text-red-400 border border-red-100';
    }
    if (isPivotRow || isPivotCol) {
      return 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
    }
    if (d < 100) {
      return 'bg-emerald-100/70 text-emerald-900 border border-emerald-200 hover:bg-emerald-200';
    }
    if (d < 200) {
      return 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100';
    }
    if (d < 300) {
      return 'bg-blue-50 text-blue-900 border border-blue-100 hover:bg-blue-100';
    }
    return 'bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100';
  };

  const activeHoverData = useMemo(() => {
    if (!hoveredCell) return null;
    const { fromId, toId, u, v } = hoveredCell;
    const dist = distMatrix[u]?.[v];
    const nextHopIdx = nextMatrix[u]?.[v];
    const nextHopId = nextHopIdx !== null && nextHopIdx !== undefined ? nodeIds[nextHopIdx] : null;
    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);

    return {
      fromId,
      toId,
      fromName: fromNode?.name || fromId,
      toName: toNode?.name || toId,
      distance: isFinite(dist) ? Math.round(dist * 10) / 10 : Infinity,
      nextHop: nextHopId,
    };
  }, [hoveredCell, distMatrix, nextMatrix, nodeIds, nodeMap]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-xs">
      {/* Matrix Controls Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Grid className="h-5 w-5 text-emerald-700" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
              Dynamic Programming All-Pairs Matrix
            </h3>
          </div>
          <span className="rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-mono text-emerald-800 font-bold">
            {nodeIds.length}×{nodeIds.length} ({nodeIds.length * nodeIds.length} pairs)
          </span>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Matrix Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode('distance')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'distance'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cost Matrix D[i][j]
            </button>
            <button
              onClick={() => setViewMode('next')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'next'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Next-Hop Matrix Π[i][j]
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">Filter: All Types</option>
            <option value="building">Buildings</option>
            <option value="junction">Junctions</option>
            <option value="exit">Exits</option>
            <option value="hospital">Hospitals</option>
            <option value="evacuation_zone">Evacuation Zones</option>
            <option value="resource_center">Resource Centers</option>
          </select>

          {/* Quick Search */}
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vertex..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 rounded-xl border border-slate-200 bg-white pl-7 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Page / Slice Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setPageSize(20)}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition-colors cursor-pointer ${
                pageSize === 20 ? 'bg-emerald-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Top 20
            </button>
            <button
              onClick={() => setPageSize(0)}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition-colors cursor-pointer ${
                pageSize === 0 ? 'bg-emerald-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full ({filteredNodeIds.length}×{filteredNodeIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Matrix Grid Container */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[500px] border-b border-slate-200 select-none bg-white">
        <table className="w-full border-collapse font-mono text-[11px]">
          {/* Column Headers (Destination Vertices) */}
          <thead className="sticky top-0 z-20 bg-slate-100 backdrop-blur-md">
            <tr>
              {/* Top-left Origin/Target intersection */}
              <th className="sticky left-0 z-30 bg-slate-200 border-b border-r border-slate-200 px-3 py-2 text-slate-700 text-left min-w-[90px]">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-700">
                  <span>Src \ Dst</span>
                </div>
              </th>

              {displayedNodeIds.map((toId) => {
                const isSelectedDst = toId === destinationId;
                const isPivot = toId === pivotNodeId;
                const node = nodeMap.get(toId);

                return (
                  <th
                    key={toId}
                    className={`border-b border-slate-200 px-2.5 py-1.5 text-center min-w-[68px] transition-colors ${
                      isSelectedDst
                        ? 'bg-emerald-100 text-emerald-950 font-bold border-emerald-400'
                        : isPivot
                        ? 'bg-amber-100 text-amber-900 font-bold border-amber-300'
                        : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                    title={`${toId}: ${node?.name || ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-bold">{toId}</span>
                      <span className="text-[9px] text-slate-500 truncate max-w-[60px]">
                        {node?.type ? node.type.substring(0, 4) : ''}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Row Data (Source Vertices) */}
          <tbody>
            {displayedNodeIds.map((fromId) => {
              const u = indexMap[fromId];
              const isSelectedSrc = fromId === sourceId;
              const isPivotRow = fromId === pivotNodeId;
              const fromNode = nodeMap.get(fromId);

              return (
                <tr key={fromId} className="hover:bg-emerald-50/40 transition-colors">
                  {/* Sticky Row Header */}
                  <th
                    className={`sticky left-0 z-10 border-r border-b border-slate-200 px-3 py-1.5 text-left transition-colors ${
                      isSelectedSrc
                        ? 'bg-emerald-100 text-emerald-950 font-bold border-emerald-400'
                        : isPivotRow
                        ? 'bg-amber-100 text-amber-900 font-bold'
                        : 'bg-slate-100/90 text-slate-800'
                    }`}
                    title={`${fromId}: ${fromNode?.name || ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{fromId}</span>
                      <span className="text-[9px] text-slate-500 truncate max-w-[45px]">
                        {fromNode?.type ? fromNode.type.substring(0, 4) : ''}
                      </span>
                    </div>
                  </th>

                  {/* Cell Values */}
                  {displayedNodeIds.map((toId) => {
                    const v = indexMap[toId];
                    const isSelf = u === v;
                    const isSelected = fromId === sourceId && toId === destinationId;
                    const isPivotCol = toId === pivotNodeId;
                    const d = distMatrix[u]?.[v];
                    const nextHopIdx = nextMatrix[u]?.[v];
                    const nextHopId =
                      nextHopIdx !== null && nextHopIdx !== undefined
                        ? nodeIds[nextHopIdx]
                        : null;

                    let cellDisplay = '';
                    if (viewMode === 'distance') {
                      if (isSelf) cellDisplay = '0';
                      else if (!isFinite(d)) cellDisplay = '∞';
                      else cellDisplay = Math.round(d).toString();
                    } else {
                      if (isSelf) cellDisplay = '—';
                      else if (nextHopId === null) cellDisplay = '∅';
                      else cellDisplay = nextHopId;
                    }

                    const cellColor = getCellColor(
                      d,
                      isSelf,
                      isSelected,
                      isPivotRow,
                      isPivotCol
                    );

                    return (
                      <td
                        key={`${fromId}_${toId}`}
                        onClick={() => onSelectPair && onSelectPair(fromId, toId)}
                        onMouseEnter={() =>
                          setHoveredCell({ fromId, toId, u, v })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`border-b border-r border-slate-200/80 px-1 py-1 text-center transition-all cursor-pointer ${cellColor}`}
                        title={`${fromId} → ${toId}: ${
                          isFinite(d) ? Math.round(d * 10) / 10 + 's' : 'Unreachable'
                        } (Next: ${nextHopId || 'None'})`}
                      >
                        <span className="block truncate px-1">{cellDisplay}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info / Hover Inspector Deck */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-mono">
        {activeHoverData ? (
          <div className="flex flex-wrap items-center gap-3 text-slate-700">
            <span className="text-[10px] text-emerald-800 font-bold uppercase">
              INSPECTED CELL:
            </span>
            <span className="text-slate-900 font-bold">
              {activeHoverData.fromId} ({activeHoverData.fromName})
            </span>
            <ArrowRight className="h-3 w-3 text-emerald-700" />
            <span className="text-slate-900 font-bold">
              {activeHoverData.toId} ({activeHoverData.toName})
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Impedance:{' '}
              <strong
                className={
                  isFinite(activeHoverData.distance)
                    ? 'text-emerald-700'
                    : 'text-red-600'
                }
              >
                {isFinite(activeHoverData.distance)
                  ? `${activeHoverData.distance}s`
                  : 'Unreachable (∞)'}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Next Hop:{' '}
              <strong className="text-emerald-800">
                {activeHoverData.nextHop || 'None'}
              </strong>
            </span>
            <button
              onClick={() =>
                onSelectPair &&
                onSelectPair(activeHoverData.fromId, activeHoverData.toId)
              }
              className="ml-2 rounded-lg bg-emerald-700 text-white font-semibold px-2 py-0.5 text-[10px] hover:bg-emerald-800 cursor-pointer shadow-xs"
            >
              Select as Active Route
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
            <span>
              Click any matrix cell to instantly reconstruct and visualize the shortest route between those vertices in O(L) time.
            </span>
          </div>
        )}

        <div className="mt-2 sm:mt-0 flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-100 border border-emerald-300" />
            <span>&lt;100s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-50 border border-emerald-200" />
            <span>100-200s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-blue-50 border border-blue-200" />
            <span>200-300s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-200 border border-emerald-600" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-red-50 border border-red-200" />
            <span>∞ (Cutoff)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
