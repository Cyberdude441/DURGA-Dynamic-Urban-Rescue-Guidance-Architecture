import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  RotateCcw,
  Flame,
  Droplets,
  Activity,
  Search,
  HelpCircle,
  MapPin,
  Navigation,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import GeographicLiveMap from '../components/graph/GeographicLiveMap.jsx';
import NodeInfoPanel from '../components/graph/NodeInfoPanel';
import EdgeInfoPanel from '../components/graph/EdgeInfoPanel';
import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from '../data';
import {
  getConnectedEdges,
  toggleEdgeBlocked,
  applyScenarioToGraph,
  getGraphSummary,
  findNode,
  findEdge,
} from '../utils/graphUtils';
import { useLocationContext } from '../context/LocationContext.jsx';

export default function GraphExplorer() {
  const [mode, setMode] = useState('synthetic');
  const [activeScenarioId, setActiveScenarioId] = useState('baseline');
  const [graphData, setGraphData] = useState(() => JSON.parse(JSON.stringify(URBAN_GRAPH)));
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { nearbyGraph, address, location, status: locationStatus, error: locationError, requestLocation, refreshNearbyGraph, isGraphLoading } = useLocationContext();

  const [visibleLayers, setVisibleLayers] = useState({
    buildings: true,
    hospitals: true,
    exits: true,
    zones: true,
    junctions: true,
    resourceCenters: true,
  });

  useEffect(() => {
    if (mode !== 'live' || !nearbyGraph) return;
    setGraphData(JSON.parse(JSON.stringify(nearbyGraph)));
    setActiveScenarioId('live_location');
    setSelectedNodeId(nearbyGraph.sourceNodeId || null);
    setSelectedEdgeId(null);
  }, [mode, nearbyGraph]);

  const displayedGraph = mode === 'live' ? nearbyGraph : graphData;

  const summary = useMemo(
    () => (displayedGraph ? getGraphSummary(displayedGraph) : { totalNodes: 0, totalEdges: 0, blockedEdgesCount: 0, peopleAtRisk: 0 }),
    [displayedGraph]
  );

  const selectedNode = useMemo(
    () => (selectedNodeId && displayedGraph ? findNode(displayedGraph, selectedNodeId) : null),
    [displayedGraph, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => (selectedEdgeId && displayedGraph ? findEdge(displayedGraph, selectedEdgeId) : null),
    [displayedGraph, selectedEdgeId]
  );

  const connectedEdgesToSelectedNode = useMemo(
    () => (selectedNodeId && displayedGraph ? getConnectedEdges(displayedGraph, selectedNodeId) : []),
    [displayedGraph, selectedNodeId]
  );

  // Scenario Switcher
  const handleScenarioChange = (scenarioId) => {
    if (mode !== 'synthetic') return;
    setActiveScenarioId(scenarioId);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    if (scenarioId === 'baseline') {
      setGraphData(JSON.parse(JSON.stringify(URBAN_GRAPH)));
    } else {
      const scenario = EMERGENCY_SCENARIOS.find((s) => s.id === scenarioId);
      if (scenario) {
        setGraphData(applyScenarioToGraph(JSON.parse(JSON.stringify(URBAN_GRAPH)), scenario));
      }
    }
  };

  // Reset Graph to default baseline state
  const handleResetGraph = () => {
    if (mode !== 'synthetic') return;
    setActiveScenarioId('baseline');
    setGraphData(JSON.parse(JSON.stringify(URBAN_GRAPH)));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSearchQuery('');
    setVisibleLayers({
      buildings: true,
      hospitals: true,
      exits: true,
      zones: true,
      junctions: true,
      resourceCenters: true,
    });
  };

  // Toggle Block/Unblock Road
  const handleToggleBlockRoad = (edgeId) => {
    if (!graphData) return;
    setGraphData((prev) => toggleEdgeBlocked(prev, edgeId));
  };

  // Edit Node Properties
  const handleUpdateNode = (nodeId, updatedProps) => {
    if (!graphData) return;
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...updatedProps } : n)),
    }));
  };

  // Edit Edge Properties
  const handleUpdateEdge = (edgeId, updatedProps) => {
    if (!graphData) return;
    setGraphData((prev) => ({
      ...prev,
      edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, ...updatedProps } : e)),
    }));
  };

  // Interactive Selection Handlers
  const handleSelectNode = (node) => {
    if (!node) {
      setSelectedNodeId(null);
      return;
    }
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const handleSelectEdge = (edge) => {
    if (!edge) {
      setSelectedEdgeId(null);
      return;
    }
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  };

  const toggleLayer = (layerKey) => {
    setVisibleLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleModeChange = async (nextMode) => {
    setMode(nextMode);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSearchQuery('');
    if (nextMode === 'synthetic') {
      setActiveScenarioId('baseline');
      setGraphData(JSON.parse(JSON.stringify(URBAN_GRAPH)));
      return;
    }
    setActiveScenarioId('live_location');
    setGraphData(nearbyGraph ? JSON.parse(JSON.stringify(nearbyGraph)) : null);
    try {
      if (!location) await requestLocation();
      else if (!nearbyGraph) await refreshNearbyGraph();
    } catch {
      setGraphData(null);
    }
  };

  // Filtered nodes for quick search jump
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (graphData?.nodes || []).filter(
      (n) => n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q)
    );
  }, [graphData, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & Command Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Graph Explorer
            </h1>
            <StatusBadge status={mode === 'live' && nearbyGraph ? 'safe' : mode === 'live' ? 'warning' : 'neutral'} text={mode === 'live' ? (nearbyGraph ? 'LIVE DATA' : 'LIVE DATA UNAVAILABLE') : 'SYNTHETIC DATA'} />
            <span className="rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-mono text-emerald-900 font-bold">
              INTERACTIVE TOPOLOGY
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            {mode === 'live' ? (location ? address?.displayName || 'Current GPS location' : 'GPS permission required') : 'Synthetic urban network'}
            <span className="text-slate-300">•</span>
            {mode === 'live' ? (isGraphLoading ? 'Loading OSM road network...' : locationStatus === 'active' ? 'GPS and provider status visible below' : locationError || 'Live data unavailable') : 'Node/Edge selection & editing'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button type="button" onClick={() => handleModeChange('synthetic')} className={`rounded-lg px-4 py-2 text-xs font-mono font-bold ${mode === 'synthetic' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>SYNTHETIC</button>
          <button type="button" onClick={() => handleModeChange('live')} className={`rounded-lg px-4 py-2 text-xs font-mono font-bold ${mode === 'live' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>LIVE</button>
        </div>

        {/* Action Controls & Reset */}
        {mode === 'synthetic' && <div className="flex flex-wrap items-center gap-2">
          {/* Scenario Buttons */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => handleScenarioChange('baseline')}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeScenarioId === 'baseline'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => handleScenarioChange('scenario_fire')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeScenarioId === 'scenario_fire'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:text-red-800'
              }`}
            >
              <Flame className="h-3 w-3" />
              Fire
            </button>
            <button
              onClick={() => handleScenarioChange('scenario_flood')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeScenarioId === 'scenario_flood'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:text-blue-800'
              }`}
            >
              <Droplets className="h-3 w-3" />
              Flood
            </button>
            <button
              onClick={() => handleScenarioChange('scenario_earthquake')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeScenarioId === 'scenario_earthquake'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
            >
              <Activity className="h-3 w-3" />
              Quake
            </button>
          </div>

          {/* Reset Graph Button */}
          <button
            onClick={handleResetGraph}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            title="Reset all node & edge modifications back to initial state"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            RESET GRAPH
          </button>
        </div>}
      </div>

      {mode === 'live' && (
        <div className={`rounded-2xl border p-4 shadow-xs ${nearbyGraph ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
              Live OpenStreetMap Data Feed
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold ${
              nearbyGraph
                ? 'border-emerald-300 bg-white text-emerald-800'
                : 'border-rose-300 bg-rose-50 text-rose-800'
            }`}>
              {nearbyGraph ? 'LIVE OSM DATA ACTIVE' : 'LIVE DATA UNAVAILABLE'}
            </span>
          </div>
          <div className="mt-2.5 grid gap-2 text-xs sm:grid-cols-3 font-mono">
            <div>
              <span className="text-slate-500">Browser GPS: </span>
              <strong className={location ? 'text-emerald-800' : 'text-rose-700'}>
                {location ? `${location.lat.toFixed(5)}°, ${location.lon.toFixed(5)}°` : locationStatus === 'denied' ? 'Permission denied' : 'Unavailable'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Road Geometry: </span>
              <strong className={nearbyGraph ? 'text-emerald-800' : 'text-slate-700'}>
                {nearbyGraph ? `${nearbyGraph.nodes.length} nodes, ${nearbyGraph.edges.length} roads` : isGraphLoading ? 'Loading OSM...' : 'Unavailable'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Classification: </span>
              <strong className="text-slate-700">
                {nearbyGraph ? 'LIVE OSM Geometry · STATIC class speeds' : 'No synthetic data shown in Live mode'}
              </strong>
            </div>
          </div>
          {!location && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600 font-mono">
                Real browser GPS is required to query OpenStreetMap roads in your vicinity.
              </span>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === 'requesting'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-mono font-bold text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>{locationStatus === 'requesting' ? 'Requesting GPS...' : 'Enable Location'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top Telemetry KPI Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="font-mono text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {mode === 'live' ? 'Mapped Live Nodes' : 'Total Vertices (Nodes)'}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900">
              {summary.totalNodes}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {mode === 'live' ? 'OSM / facility graph' : '(22 bld, 4 exit, 2 hosp, 5 zone, 2 rc, 12 junc)'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="font-mono text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {mode === 'live' ? 'Mapped Live Roads' : 'Total Edges (Roads)'}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900">
              {summary.totalEdges}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {mode === 'live' ? 'OSM network' : 'interconnected corridors'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="font-mono text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Severed Roads (Blocked)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold ${
                summary.blockedEdgesCount > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {summary.blockedEdgesCount}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {summary.blockedEdgesCount > 0 ? 'routes blocked' : 'all roads clear'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="font-mono text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {mode === 'live' ? 'Live Data Scope' : 'Civilians in Danger'}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold ${
                summary.peopleAtRisk > 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {mode === 'live' ? '--' : summary.peopleAtRisk.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-slate-500">
              {mode === 'live' ? 'Population feed unavailable' : 'civilians at high/critical risk'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Workspace Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Filter Layers & Node Jump Search */}
        <div className="lg:col-span-1 space-y-4">
          {/* Quick Node Search */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs relative">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-800 block mb-2">
              Find Node
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID (e.g. B01, EX01, H01)..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-30 font-mono text-xs">
                {searchResults.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      setSelectedEdgeId(null);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-emerald-800">{n.id}</span>
                      <span className="text-slate-600 ml-1.5 text-[11px]">{n.name}</span>
                    </div>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                      {n.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topology Layer Toggles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-800">
                Layer Visibility
              </span>
              <Filter className="h-3.5 w-3.5 text-emerald-700" />
            </div>

            <div className="mt-4 space-y-2.5 font-mono text-xs">
              <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.buildings}
                    onChange={() => toggleLayer('buildings')}
                    className="rounded accent-emerald-600"
                  />
                  <span>Buildings</span>
                </span>
                <span className="text-slate-400 text-[10px]">{mode === 'synthetic' ? '22' : '—'}</span>
              </label>

              <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.exits}
                    onChange={() => toggleLayer('exits')}
                    className="rounded accent-emerald-600"
                  />
                  <span>Exit Portals</span>
                </span>
                <span className="text-emerald-700 font-bold text-[10px]">{mode === 'synthetic' ? '4' : graphData?.nodes.filter((node) => node.type === 'exit').length || '—'}</span>
              </label>

              <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.hospitals}
                    onChange={() => toggleLayer('hospitals')}
                    className="rounded accent-emerald-600"
                  />
                  <span>Emergency Hospitals</span>
                </span>
                <span className="text-red-600 font-bold text-[10px]">{mode === 'synthetic' ? '2' : graphData?.nodes.filter((node) => node.type === 'hospital').length || '—'}</span>
              </label>

              <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.zones}
                    onChange={() => toggleLayer('zones')}
                    className="rounded accent-emerald-600"
                  />
                  <span>Evacuation Zones</span>
                </span>
                <span className="text-amber-700 font-bold text-[10px]">{mode === 'synthetic' ? '5' : graphData?.nodes.filter((node) => node.type === 'evacuation_zone').length || '—'}</span>
              </label>

              <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.resourceCenters}
                    onChange={() => toggleLayer('resourceCenters')}
                    className="rounded accent-emerald-600"
                  />
                  <span>Resource Centers</span>
                </span>
                <span className="text-blue-700 font-bold text-[10px]">{mode === 'synthetic' ? '2' : graphData?.nodes.filter((node) => node.type === 'resource_center').length || '—'}</span>
              </label>

              <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.junctions}
                    onChange={() => toggleLayer('junctions')}
                    className="rounded accent-emerald-600"
                  />
                  <span>Arterial Junctions</span>
                </span>
                <span className="text-emerald-800 font-bold text-[10px]">{mode === 'synthetic' ? '12' : graphData?.nodes.filter((node) => node.type === 'junction' && (node.degree || 0) >= 4).length || '—'}</span>
              </label>
            </div>
          </div>

          {/* Quick Instructions & Help */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs font-mono text-[11px] text-slate-500 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase">
              <HelpCircle className="h-3.5 w-3.5 text-emerald-700" />
              <span>Canvas Controls</span>
            </div>
            <ul className="space-y-1 text-slate-600">
              <li>• Click any node to open properties & edit</li>
              <li>• Click any road to inspect or block/unblock</li>
              <li>• Scroll to zoom, drag to pan canvas</li>
              <li>• MiniMap on bottom-right for navigation</li>
            </ul>
          </div>
        </div>

        {/* Center Canvas: React Flow Interactive Graph */}
        <div className={`${selectedNode || selectedEdge ? 'lg:col-span-2' : 'lg:col-span-3'} h-[420px] sm:h-[520px] lg:h-[620px]`}>
          {mode === 'live' && !nearbyGraph ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
              <MapPin className="h-8 w-8 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900 font-mono">Live OpenStreetMap Graph Unavailable</h2>
              <p className="max-w-md text-xs text-slate-600 font-mono">
                {!location
                  ? locationError || 'Browser GPS permission is required. Click "Enable Location" below.'
                  : isGraphLoading
                  ? 'Querying OpenStreetMap via Overpass API around your GPS coordinates...'
                  : 'OpenStreetMap road network could not be loaded for your location.'}
              </p>
              {!location ? (
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locationStatus === 'requesting'}
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-mono font-bold text-white shadow-2xs cursor-pointer"
                >
                  {locationStatus === 'requesting' ? 'Requesting GPS...' : 'Enable Location'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => refreshNearbyGraph().catch(() => {})}
                  disabled={isGraphLoading}
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-mono font-bold text-white shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Retry OpenStreetMap Query
                </button>
              )}
              <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-900">
                Synthetic data is never substituted into LIVE mode
              </span>
            </div>
          ) : (
            <GeographicLiveMap
              graph={displayedGraph}
              location={mode === 'live' ? location : null}
              followUser={mode === 'live' && Boolean(location)}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={handleSelectNode}
              onSelectEdge={handleSelectEdge}
              visibleLayers={visibleLayers}
            />
          )}
        </div>

        {/* Right Side: Dynamic Information & Editing Panels */}
        {(selectedNode || selectedEdge || mode === 'live') && (
          <div className="lg:col-span-1 h-[420px] sm:h-[520px] lg:h-[620px]">
            {selectedNode && (
              <NodeInfoPanel
                key={selectedNode.id}
                node={selectedNode}
                connectedEdges={connectedEdgesToSelectedNode}
                onClose={() => setSelectedNodeId(null)}
                onUpdateNode={handleUpdateNode}
                onSelectEdge={(e) => {
                  setSelectedEdgeId(e.id);
                  setSelectedNodeId(null);
                }}
              />
            )}

            {selectedEdge && (
              <EdgeInfoPanel
                key={selectedEdge.id}
                edge={selectedEdge}
                onClose={() => setSelectedEdgeId(null)}
                onToggleBlock={handleToggleBlockRoad}
                onUpdateEdge={handleUpdateEdge}
                onSelectNode={(nodeId) => {
                  setSelectedNodeId(nodeId);
                  setSelectedEdgeId(null);
                }}
              />
            )}
            {mode === 'live' && !selectedNode && !selectedEdge && <div className="flex h-full flex-col justify-center rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"><div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">Live Situation</div><div className="mt-4 space-y-3 text-sm"><div><div className="text-xs text-slate-500">Current GPS</div><strong>{location ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : 'Unavailable'}</strong></div><div><div className="text-xs text-slate-500">Provider status</div><strong className={nearbyGraph ? 'text-emerald-700' : 'text-amber-700'}>{nearbyGraph ? 'Live OSM data loaded' : 'Live data unavailable'}</strong></div><div><div className="text-xs text-slate-500">Algorithms</div><strong className="text-emerald-700">Available on complete graph</strong></div></div></div>}
          </div>
        )}
      </div>
    </div>
  );
}
