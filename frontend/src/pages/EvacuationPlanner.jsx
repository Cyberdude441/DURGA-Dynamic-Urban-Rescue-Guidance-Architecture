import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Route,
  Navigation,
  Compass,
  Activity,
  DoorOpen,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { URBAN_GRAPH } from '../data/urbanGraph.js';
import { dijkstra } from '../algorithms/dijkstra.js';
import { greedyEvacuation } from '../algorithms/greedyEvacuation.js';
import { findNodesByType, findNode } from '../utils/graphUtils.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import LiveConditionsPanel from '../components/common/LiveConditionsPanel.jsx';
import LiveEvacuationTracker from '../components/graph/LiveEvacuationTracker.jsx';
import { getHumanRoute } from '../utils/navigationUtils.js';

export default function EvacuationPlanner() {
  const {
    nearbyGraph,
    address,
    location,
    status: locationStatus,
    error: locationError,
    graphError,
    isGraphLoading,
    requestLocation,
    refreshNearbyGraph,
    liveConditions,
  } = useLocationContext();

  // Explicit routing mode: 'live' | 'synthetic'
  const [plannerMode, setPlannerMode] = useState(() => (nearbyGraph && location ? 'live' : 'synthetic'));

  useEffect(() => {
    if (nearbyGraph && location && plannerMode === 'synthetic') {
      // If live graph just loaded from a fresh GPS lock, switch to live
      setPlannerMode('live');
    }
  }, [nearbyGraph, location]);

  const isLive = plannerMode === 'live';
  const hasLiveGraph = Boolean(isLive && nearbyGraph && location);
  const activeGraph = isLive ? nearbyGraph : URBAN_GRAPH;

  const evacuationZones = useMemo(() => {
    if (!activeGraph) return [];
    if (isLive && activeGraph.sourceNodeId) {
      const source = findNode(activeGraph, activeGraph.sourceNodeId);
      return source ? [{ ...source, name: 'Current GPS source', people: 0 }] : [];
    }
    return findNodesByType(URBAN_GRAPH, 'evacuation_zone');
  }, [activeGraph, isLive]);

  const exits = useMemo(() => {
    if (!activeGraph) return [];
    return findNodesByType(activeGraph, 'exit');
  }, [activeGraph]);

  const [selectedOrigin, setSelectedOrigin] = useState(() => (isLive && activeGraph?.sourceNodeId ? activeGraph.sourceNodeId : 'EZ01'));
  const [selectedExit, setSelectedExit] = useState('all');
  const [velocityMode, setVelocityMode] = useState('standard'); // 'standard' | 'congested' | 'vehicular'
  const [isCalculating, setIsCalculating] = useState(false);

  // Speed multiplier for clearance calculation
  const speedProfiles = useMemo(
    () => ({
      standard: { speedMps: 1.2, name: 'Standard Pedestrian Velocity (1.2 m/s)', factor: 1.0 },
      congested: { speedMps: 0.5, name: 'High Density Crush Limit (0.5 m/s)', factor: 2.4 },
      vehicular: { speedMps: 9.7, name: 'Emergency Vehicle Evacuation (35 km/h)', factor: 0.15 },
    }),
    []
  );

  // Perform calculation deterministically
  const computePlan = useCallback(
    (graphToUse, origin = selectedOrigin, exitTarget = selectedExit, vel = velocityMode) => {
      if (!graphToUse || !graphToUse.nodes?.length) return null;
      const originNode = findNode(graphToUse, origin) || graphToUse.nodes[0];
      if (!originNode) return null;

      const speed = speedProfiles[vel] || speedProfiles.standard;
      const availableExits = findNodesByType(graphToUse, 'exit');
      const candidateExits = exitTarget === 'all' ? availableExits : availableExits.filter((e) => e.id === exitTarget);

      if (!candidateExits.length) return null;

      const exitRoutes = candidateExits.map((ex) => {
        const result = dijkstra(graphToUse, originNode.id, ex.id);
        const estWalkSeconds = result.totalCost * 20 * speed.factor;
        const capacityMinutes = ex.capacity > 0 ? (originNode.people || 0) / (ex.capacity / 60) : 0;
        const egressMinutes = Number(((estWalkSeconds + capacityMinutes) / 60).toFixed(1));

        return {
          exit: ex,
          result,
          egressMinutes,
          estWalkSeconds,
        };
      });

      // Sort by egress time ascending
      exitRoutes.sort((a, b) => a.egressMinutes - b.egressMinutes);
      const bestRoute = exitRoutes[0];

      // Multi-zone greedy matching
      const greedyResult = greedyEvacuation({
        graph: graphToUse,
        zones: isLive && originNode ? [originNode] : findNodesByType(graphToUse, 'evacuation_zone'),
        exits: availableExits,
        strategy: 'urgency_first',
      });

      return {
        originNode,
        bestRoute,
        allCandidateRoutes: exitRoutes,
        greedyResult,
        computedAt: new Date(),
      };
    },
    [isLive, selectedOrigin, selectedExit, velocityMode, speedProfiles]
  );

  const [planResult, setPlanResult] = useState(() => computePlan(isLive ? nearbyGraph : URBAN_GRAPH, isLive ? nearbyGraph?.sourceNodeId : 'EZ01', 'all', 'standard'));

  // Sync plan when activeGraph or mode changes
  useEffect(() => {
    if (isLive) {
      if (nearbyGraph?.sourceNodeId) {
        setSelectedOrigin(nearbyGraph.sourceNodeId);
        setSelectedExit('all');
        setPlanResult(computePlan(nearbyGraph, nearbyGraph.sourceNodeId, 'all', velocityMode));
      } else {
        setPlanResult(null);
      }
    } else {
      setSelectedOrigin('EZ01');
      setSelectedExit('all');
      setPlanResult(computePlan(URBAN_GRAPH, 'EZ01', 'all', velocityMode));
    }
  }, [isLive, nearbyGraph, computePlan, velocityMode]);

  const handleRunCalculation = () => {
    if (!activeGraph) return;
    setIsCalculating(true);
    setTimeout(() => {
      const res = computePlan(activeGraph, selectedOrigin, selectedExit, velocityMode);
      setPlanResult(res);
      setIsCalculating(false);
    }, 200);
  };

  const currentZone = activeGraph ? findNode(activeGraph, selectedOrigin) : null;
  const humanRoute = useMemo(
    () => (activeGraph && planResult?.bestRoute?.result?.path ? getHumanRoute(activeGraph, planResult.bestRoute.result.path) : { nodes: [], steps: [], names: [], totalDistance: 0 }),
    [activeGraph, planResult]
  );

  const handleRouteDeviation = (nearestNodeId) => {
    if (!nearestNodeId || !activeGraph) return;
    setSelectedOrigin(nearestNodeId);
    setPlanResult(computePlan(activeGraph, nearestNodeId, selectedExit, velocityMode));
  };

  return (
    <div className="space-y-6">
      {/* Live Conditions HUD with Strict Source Classification */}
      <LiveConditionsPanel
        mode={plannerMode}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        requestLocation={requestLocation}
        address={address}
        graph={isLive ? nearbyGraph : URBAN_GRAPH}
        isGraphLoading={isGraphLoading}
        graphError={graphError}
        conditions={liveConditions}
      />

      {/* Header and Mode Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Route className="h-6 w-6 text-emerald-700" />
              Dynamic Evacuation Planner
            </h1>
            <StatusBadge
              status={isLive ? (hasLiveGraph ? 'safe' : 'danger') : 'neutral'}
              text={isLive ? (hasLiveGraph ? 'LIVE OSM ROUTING' : 'LIVE DATA UNAVAILABLE') : 'SYNTHETIC BENCHMARK ROUTING'}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            {isLive
              ? hasLiveGraph
                ? `Active GPS: ${address?.displayName || `${location.lat.toFixed(5)}°, ${location.lon.toFixed(5)}°`}. Deterministic Dijkstra routing on real OpenStreetMap roads.`
                : 'Live mode active. Real browser GPS and OpenStreetMap road geometry required.'
              : 'Synthetic urban graph sandbox (47 nodes, 58 road corridors) with deterministic capacity constraints.'}
          </p>
        </div>

        {/* Mode Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setPlannerMode('live')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                isLive ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>LIVE GPS</span>
            </button>
            <button
              type="button"
              onClick={() => setPlannerMode('synthetic')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                !isLive ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>SYNTHETIC GRAPH</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRunCalculation}
            disabled={isCalculating || (isLive && !hasLiveGraph)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-mono font-bold text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Navigation className={`h-3.5 w-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'CALCULATING...' : 'RECALCULATE ROUTE'}</span>
          </button>
        </div>
      </div>

      {/* IF LIVE MODE BUT GPS/OSM NOT READY: NEVER SILENTLY SUBSTITUTE SYNTHETIC DATA */}
      {isLive && !hasLiveGraph && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
                Live Evacuation Route Unavailable
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 font-mono">
                DURGA strictly separates verified LIVE data from simulation data. Synthetic data is never silently substituted into Live Mode.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 font-mono text-xs text-amber-950 space-y-2">
            <div>
              <strong>Reason:</strong>{' '}
              {!location
                ? locationError || 'Browser GPS permission not yet granted. Real location coordinates are required.'
                : isGraphLoading
                ? 'Downloading OpenStreetMap road network around your GPS position via Overpass API...'
                : graphError || 'OpenStreetMap returned no road geometry for this radius.'}
            </div>
            {!location && (
              <p className="text-[11px] text-amber-900">
                Click <strong>"Enable Location"</strong> in the Live Conditions panel above to grant browser GPS permission.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!location ? (
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === 'requesting'}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-mono font-bold text-white shadow-2xs cursor-pointer"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>{locationStatus === 'requesting' ? 'Requesting GPS...' : 'Enable Browser Location'}</span>
              </button>
            ) : isGraphLoading ? (
              <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
                <span>Loading real road network...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => refreshNearbyGraph(800)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-mono font-bold text-white shadow-2xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry OpenStreetMap Query</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPlannerMode('synthetic')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-mono font-bold text-slate-800 shadow-2xs cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Switch to Synthetic Benchmark Routing (47 Nodes)</span>
            </button>
          </div>
        </div>
      )}

      {/* LIVE EVACUATION TRACKER: ONLY RENDERED WHEN GRAPH IS LIVE & HAS REAL GPS */}
      {isLive && hasLiveGraph && planResult?.bestRoute && (
        <LiveEvacuationTracker
          graph={activeGraph}
          routePath={planResult.bestRoute.result.path || []}
          location={location}
          locationStatus={locationStatus}
          locationError={locationError}
          requestLocation={requestLocation}
          onRouteDeviation={handleRouteDeviation}
          emergency="Live location evacuation"
          riskLevel={currentZone?.riskLevel}
          peopleAffected={currentZone?.people}
          nearestExit={planResult.bestRoute.exit?.name}
        />
      )}

      {/* Plan Parameters Grid & Route Viewport (when activeGraph and planResult are valid) */}
      {(!isLive || hasLiveGraph) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Origin / Destination Setup */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-700" />
                Zone & Egress Setup
              </span>
              <span className="text-[11px] font-mono text-emerald-800 font-bold">
                {isLive ? 'LIVE' : 'SYNTHETIC'}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-600 flex items-center justify-between font-medium">
                  <span>ORIGIN EVACUATION ZONE</span>
                  <span className="text-emerald-800 font-bold">{evacuationZones.length} ZONES</span>
                </label>
                <select
                  value={selectedOrigin}
                  onChange={(e) => {
                    setSelectedOrigin(e.target.value);
                    if (activeGraph) setPlanResult(computePlan(activeGraph, e.target.value, selectedExit, velocityMode));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  {evacuationZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.id}: {z.name} ({z.people?.toLocaleString() || 0} civilians)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 flex items-center justify-between font-medium">
                  <span>DESIGNATED EXIT CORRIDOR</span>
                  <span className="text-emerald-800 font-bold">{exits.length} EXITS</span>
                </label>
                <select
                  value={selectedExit}
                  onChange={(e) => {
                    setSelectedExit(e.target.value);
                    if (activeGraph) setPlanResult(computePlan(activeGraph, selectedOrigin, e.target.value, velocityMode));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">-- All Available Exits (Dynamic Multi-Exit Solver) --</option>
                  {exits.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.id}: {ex.name} (Cap: {ex.capacity || 0}/min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium">VELOCITY & FLOW CONSTRAINT</label>
                <select
                  value={velocityMode}
                  onChange={(e) => {
                    setVelocityMode(e.target.value);
                    if (activeGraph) setPlanResult(computePlan(activeGraph, selectedOrigin, selectedExit, e.target.value));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="standard">Standard Pedestrian Velocity (1.2 m/s)</option>
                  <option value="congested">High Density Crush Limit (0.5 m/s)</option>
                  <option value="vehicular">Emergency Vehicle Evacuation (35 km/h)</option>
                </select>
              </div>
            </div>

            {currentZone && (
              <div className="mt-4 pt-3 border-t border-slate-200 font-mono text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Origin Zone:</span>
                  <span className="text-slate-900 font-bold">{currentZone.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Civilians Present:</span>
                  <span className="text-emerald-800 font-bold">{currentZone.people?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Classification:</span>
                  <span className="text-emerald-700 font-bold">{isLive ? 'LIVE OSM NODE' : 'SYNTHETIC BASELINE'}</span>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-950 font-mono space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Activity className="h-3.5 w-3.5" />
                <span>ALGORITHMIC ROUTING ENGINE</span>
              </div>
              <p className="text-slate-600 font-sans">
                Dijkstra minimizes dynamic impedance while the greedy engine assigns gates without exceeding crush thresholds.
              </p>
            </div>
          </div>

          {/* Evacuation Route Viewport */}
          <div className="lg:col-span-2 space-y-6">
            {planResult?.bestRoute ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                {/* Primary Recommended Route Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-mono text-emerald-950 font-bold">
                        OPTIMAL CORRIDOR
                      </span>
                      <span className="font-mono text-xs text-slate-600">
                        Destination: <strong className="text-slate-900">{planResult.bestRoute.exit.name}</strong> ({planResult.bestRoute.exit.id})
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      Human Route: {humanRoute.names.join(' → ')}
                    </h3>
                    <details className="mt-2 text-xs font-mono text-slate-500">
                      <summary className="cursor-pointer">Technical Details</summary>
                      <div className="mt-1 break-words">Technical Path: {planResult.bestRoute.result.path.join(' → ')}</div>
                    </details>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-emerald-800 font-bold">
                      ETA: {planResult.bestRoute.egressMinutes} MIN
                    </span>
                  </div>
                </div>

                {/* Waypoint Guidance Instructions */}
                <div className="space-y-3">
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-emerald-700" />
                    Turn-by-Turn Waypoint Guidance
                  </span>

                  <div className="space-y-2">
                    {humanRoute.steps.map((step, idx) => {
                      const isStart = step.type === 'start';
                      const isEnd = step.type === 'destination';
                      const technicalNodes = planResult.bestRoute.result.path.slice(step.startIndex, step.endIndex + 1);
                      return (
                        <div
                          key={`${step.type}-${step.startIndex}-${step.endIndex}`}
                          className={`flex items-center justify-between rounded-lg border p-3 font-mono text-xs ${
                            isStart
                              ? 'border-blue-200 bg-blue-50/60 text-blue-950'
                              : isEnd
                              ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                              : 'border-slate-200 bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                                isStart ? 'bg-blue-600 text-white' : isEnd ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <span className="block font-bold text-slate-900">
                                {isStart ? `Start: ${step.label}` : isEnd ? `Arrive at ${step.label}` : step.instruction}
                              </span>
                              {!isStart && !isEnd && (
                                <span className="text-[10px] text-slate-500">
                                  {step.distance} meters{step.roadName ? ` on ${step.roadName}` : ''}
                                </span>
                              )}
                              <details className="text-[10px] text-slate-500">
                                <summary className="cursor-pointer">Technical Details</summary>
                                <span>{technicalNodes.join(' → ')}</span>
                              </details>
                            </div>
                          </div>
                          <div className="text-right text-[11px]">
                            {isStart && <span className="font-bold text-blue-700">ORIGIN</span>}
                            {isEnd && <span className="font-bold text-emerald-700">DESTINATION</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-mono text-slate-600">
                    <span>
                      Total: <strong className="text-slate-900">{(humanRoute.totalDistance / 1000).toFixed(2)} km</strong>
                    </span>
                    <span>
                      ETA: <strong className="text-emerald-700">{planResult.bestRoute.egressMinutes} min</strong>
                    </span>
                  </div>
                </div>

                {/* Multi-Exit Alternative Comparison */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-emerald-700" />
                    All Candidate Exit Portal Evaluations
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {planResult.allCandidateRoutes.map((cr) => (
                      <div
                        key={cr.exit.id}
                        className={`rounded-lg border p-3 space-y-1.5 ${
                          cr.exit.id === planResult.bestRoute.exit.id
                            ? 'border-emerald-300 bg-emerald-50/70 shadow-2xs'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{cr.exit.name}</span>
                          <span className="text-[10px] text-emerald-800 font-bold">{cr.exit.id}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Effective Cost:</span>
                          <span className="text-slate-900 font-bold">{cr.result.totalCost.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Total Clearance ETA:</span>
                          <span className="text-emerald-700 font-bold">{cr.egressMinutes} mins</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Gate Capacity:</span>
                          <span>{(cr.exit.capacity || 0).toLocaleString()} / min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 font-mono text-xs">
                Calculating optimal evacuation routes...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
