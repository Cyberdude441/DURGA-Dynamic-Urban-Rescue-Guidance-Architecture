import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Droplets,
  Activity,
  Biohazard,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Ambulance,
  Truck,
  Users,
  DoorOpen,
  Navigation,
  GitMerge,
  Network,
  Sliders,
  ChevronRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  MapPin,
  Bot,
  Volume2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/common/StatusBadge';
import { URBAN_GRAPH } from '../data/urbanGraph.js';
import { runEmergencySimulation, HAZARD_PRESETS } from '../simulation/emergencySimulator.js';
import {
  getLiveDataConfiguration,
} from '../services/liveSimulationService.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import GeminiDecisionSupport from '../components/common/GeminiDecisionSupport.jsx';
import LiveConditionsPanel from '../components/common/LiveConditionsPanel.jsx';

// Predefined disaster scenario templates
const DISASTER_PRESETS = [
  {
    type: 'Fire',
    name: 'Downtown Commercial Firestorm',
    icon: Flame,
    color: 'rose',
    accentClass: 'text-rose-700 border-rose-200 bg-rose-50',
    activeBg: 'bg-rose-50/90 border-rose-300 text-rose-900 ring-1 ring-rose-200',
    badge: 'CONFLAGRATION',
    defaultLocation: 'B01',
    defaultPeople: 1200,
    defaultRisk: 'CRITICAL',
    defaultBlockedRoads: ['E10', 'E12', 'E14', 'E26'],
    defaultBlockedBuildings: ['B01'],
  },
  {
    type: 'Flood',
    name: 'Riverfront Basin Flash Inundation',
    icon: Droplets,
    color: 'sky',
    accentClass: 'text-sky-700 border-sky-200 bg-sky-50',
    activeBg: 'bg-sky-50/90 border-sky-300 text-sky-900 ring-1 ring-sky-200',
    badge: 'HYDRO-SURGE',
    defaultLocation: 'EZ02',
    defaultPeople: 1420,
    defaultRisk: 'HIGH',
    defaultBlockedRoads: ['E41', 'E43', 'E45'],
    defaultBlockedBuildings: ['B22'],
  },
  {
    type: 'Earthquake',
    name: 'Metropolitan Fault Rupture & Debris Collapse',
    icon: Activity,
    color: 'amber',
    accentClass: 'text-amber-700 border-amber-200 bg-amber-50',
    activeBg: 'bg-amber-50/90 border-amber-300 text-amber-900 ring-1 ring-amber-200',
    badge: 'SEISMIC TIER-4',
    defaultLocation: 'J07',
    defaultPeople: 2100,
    defaultRisk: 'CRITICAL',
    defaultBlockedRoads: ['E26', 'E28', 'E29', 'E30', 'E51'],
    defaultBlockedBuildings: ['B14', 'B15'],
  },
  {
    type: 'Chemical Leak',
    name: 'Toxic Industrial Vapor & Chlorine Plume',
    icon: Biohazard,
    color: 'emerald',
    accentClass: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    activeBg: 'bg-emerald-50/90 border-emerald-300 text-emerald-900 ring-1 ring-emerald-200',
    badge: 'BIOHAZARD LEVEL-3',
    defaultLocation: 'B16',
    defaultPeople: 1800,
    defaultRisk: 'CRITICAL',
    defaultBlockedRoads: ['E57', 'E58'],
    defaultBlockedBuildings: ['B16'],
  },
];

// 12 Pipeline stages specification
const PIPELINE_STAGES = [
  { id: 1, name: 'Apply Emergency', desc: 'Disaster propagation & hazard radius geometry' },
  { id: 2, name: 'Update Graph', desc: 'Recalculate dynamic threat and vulnerability multipliers' },
  { id: 3, name: 'Disable Blocked Roads', desc: 'Isolate severed corridors and compromised structures' },
  { id: 4, name: 'Calculate Edge Costs', desc: 'Traverse resistance: base time × congestion × danger' },
  { id: 5, name: 'Run Dijkstra', desc: 'Shortest path extraction from epicenter to active safe havens' },
  { id: 6, name: 'Run Floyd-Warshall', desc: 'All-pairs dynamic shortest path distance matrix' },
  { id: 7, name: 'Run Greedy Evacuation', desc: 'Capacity-constrained triage evacuation matching' },
  { id: 8, name: 'Run DP Resource Optimization', desc: '0/1 Knapsack fleet distribution for maximum life benefit' },
  { id: 9, name: 'Run Kruskal', desc: 'Disjoint-set union minimal spanning tree arterial backbone' },
  { id: 10, name: 'Run Prim', desc: 'Priority cut expansion resilient network core verification' },
  { id: 11, name: 'Generate Evacuation Plan', desc: 'Synthesize tactical directives, feasibility & exit quotas' },
  { id: 12, name: 'Display Results', desc: 'Telemetry packaging, manifest publishing & audit generation' },
];

export default function EmergencySimulator() {
  // Scenario & Configuration State
  const [simulationMode, setSimulationMode] = useState('synthetic');
  const [liveGraph, setLiveGraph] = useState(null);
  const [livePlaceName, setLivePlaceName] = useState('');
  const [liveRadius, setLiveRadius] = useState(1000);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false);
  const [liveDataError, setLiveDataError] = useState('');
  const [liveDataNotice, setLiveDataNotice] = useState('');
  const [selectedDisasterType, setSelectedDisasterType] = useState('Fire');
  const [emergencyLocation, setEmergencyLocation] = useState('B01');
  const [affectedPeople, setAffectedPeople] = useState(1200);
  const [riskLevel, setRiskLevel] = useState('CRITICAL');
  const [blockedRoads, setBlockedRoads] = useState(['E10', 'E12', 'E14', 'E26']);
  const [blockedBuildings, setBlockedBuildings] = useState(['B01']);
  
  // Exit Availability & Capacity Configuration
  const [exitAvailability, setExitAvailability] = useState({
    EX01: { available: true, capacity: 5000, name: 'North Highway Gate' },
    EX02: { available: true, capacity: 5000, name: 'East Boulevard Gate' },
    EX03: { available: true, capacity: 6000, name: 'South Coastal Expressway' },
    EX04: { available: true, capacity: 4000, name: 'West Valley Tunnel' },
  });

  // Resource Fleet Budget
  const [fleetBudget, setFleetBudget] = useState({
    ambulances: 18,
    rescueTeams: 12,
    emergencyVehicles: 10,
  });

  // Execution & Pipeline Stepper State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0); // 0 to 100
  const [currentRunningStage, setCurrentRunningStage] = useState(null);
  const [completedStageMap, setCompletedStageMap] = useState({});
  const [simulationResult, setSimulationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('directive'); // 'directive' | 'map' | 'evacuation' | 'resources' | 'mst' | 'telemetry'
  const [selectedNodeHover, setSelectedNodeHover] = useState(null);
  const [roadFilter, setRoadFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const {
    location: globalLocation,
    status: globalLocationStatus,
    error: globalLocationError,
    graphError: globalGraphError,
    isGraphLoading: globalIsGraphLoading,
    address: globalAddress,
    nearbyGraph: globalNearbyGraph,
    liveConditions: globalLiveConditions,
    requestLocation,
    refreshNearbyGraph,
  } = useLocationContext();
  const activeGraph = simulationMode === 'live' ? liveGraph : URBAN_GRAPH;

  useEffect(() => {
    if (!globalNearbyGraph) return;
    setLiveGraph(globalNearbyGraph);
    if (globalAddress?.displayName) setLivePlaceName(globalAddress.displayName);
  }, [globalNearbyGraph, globalAddress]);

  const handleUseCurrentLocation = async () => {
    setIsLoadingLiveData(true);
    setLiveDataError('');
    setLiveDataNotice('Requesting browser location permission...');
    setSimulationResult(null);
    try {
      await requestLocation();
      setLiveDataNotice('Reading the location name and nearby OpenStreetMap roads...');
      const graph = await refreshNearbyGraph(liveRadius);
      setLiveGraph(graph);
      if (globalAddress?.displayName) setLivePlaceName(globalAddress.displayName);
      setSimulationMode('live');
      setEmergencyLocation(graph.sourceNodeId);
      setAffectedPeople(0);
      setRiskLevel('HIGH');
      setBlockedRoads([]);
      setBlockedBuildings([]);
      setExitAvailability(
        Object.fromEntries(
          graph.nodes
            .filter((node) => node.type === 'exit')
            .map((node) => [
              node.id,
              { available: true, capacity: node.capacity || 0, name: node.name },
            ])
        )
      );
      const liveConfiguration = getLiveDataConfiguration();
      setLiveDataNotice(
        `${graph.nodes.length} mapped road nodes and ${graph.edges.length} road segments loaded. ${liveConfiguration.trafficMessage} Population and danger data remain unavailable.`
      );
    } catch (error) {
      setLiveDataError(error.message || 'Live location data could not be loaded.');
      setLiveDataNotice('');
    } finally {
      setIsLoadingLiveData(false);
    }
  };

  const handleSyntheticMode = () => {
    if (isSimulating) return;
    setSimulationMode('synthetic');
    setLiveDataError('');
    setLiveDataNotice('');
    handleSelectDisaster('Fire');
  };

  // Sync state when disaster type changes
  const handleSelectDisaster = (type) => {
    const preset = DISASTER_PRESETS.find((p) => p.type === type) || DISASTER_PRESETS[0];
    setSelectedDisasterType(type);
    setEmergencyLocation(preset.defaultLocation);
    setAffectedPeople(preset.defaultPeople);
    setRiskLevel(preset.defaultRisk);
    setBlockedRoads([...preset.defaultBlockedRoads]);
    setBlockedBuildings([...preset.defaultBlockedBuildings]);
  };

  // Toggle Road Block
  const toggleRoadBlocked = (edgeId) => {
    setBlockedRoads((prev) =>
      prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId]
    );
  };

  // Toggle Building Block
  const toggleBuildingBlocked = (nodeId) => {
    setBlockedBuildings((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Toggle Exit Availability
  const toggleExit = (exitId) => {
    setExitAvailability((prev) => ({
      ...prev,
      [exitId]: {
        ...prev[exitId],
        available: !prev[exitId].available,
      },
    }));
  };

  // Update Exit Capacity
  const updateExitCapacity = (exitId, newCap) => {
    setExitAvailability((prev) => ({
      ...prev,
      [exitId]: {
        ...prev[exitId],
        capacity: Number(newCap),
      },
    }));
  };

  // Reset to current disaster preset defaults
  const handleResetDefaults = () => {
    const preset = DISASTER_PRESETS.find((p) => p.type === selectedDisasterType) || DISASTER_PRESETS[0];
    setEmergencyLocation(preset.defaultLocation);
    setAffectedPeople(preset.defaultPeople);
    setRiskLevel(preset.defaultRisk);
    setBlockedRoads([...preset.defaultBlockedRoads]);
    setBlockedBuildings([...preset.defaultBlockedBuildings]);
    setExitAvailability({
      EX01: { available: true, capacity: 5000, name: 'North Highway Gate' },
      EX02: { available: true, capacity: 5000, name: 'East Boulevard Gate' },
      EX03: { available: true, capacity: 6000, name: 'South Coastal Expressway' },
      EX04: { available: true, capacity: 4000, name: 'West Valley Tunnel' },
    });
    setFleetBudget({
      ambulances: 18,
      rescueTeams: 12,
      emergencyVehicles: 10,
    });
  };

  // Execute Complete 12-Stage Pipeline with Live Progress
  const executeSimulation = useCallback(
    async (withVisualDelay = true) => {
      if (isSimulating) return;
      if (simulationMode === 'live' && !liveGraph) {
        setLiveDataError('Live simulation requires a loaded OpenStreetMap road graph. Click "Use My Current Location" first.');
        return;
      }

      setIsSimulating(true);
      setSimulationProgress(0);
      setCompletedStageMap({});
      setCurrentRunningStage(1);

      const config = {
        disasterType: selectedDisasterType,
        emergencyLocation,
        affectedPeople: Number(affectedPeople),
        riskLevel,
        blockedRoads,
        blockedBuildings,
        hazardRadiusMeters: simulationMode === 'live' ? liveRadius : null,
        exitAvailability,
        fleetBudget,
      };

      if (withVisualDelay) {
        // Step-by-step visual animation for user feedback
        const recordedStages = {};

        const onProgressCallback = (stageInfo) => {
          recordedStages[stageInfo.stage] = stageInfo;
        };

        // Run underlying real calculation
        const result = await runEmergencySimulation(activeGraph, config, onProgressCallback);

        // Smooth step-by-step playback of stages
        for (let s = 1; s <= 12; s++) {
          setCurrentRunningStage(s);
          setSimulationProgress(Math.round((s / 12) * 100));

          const stageData = result.stages.find((st) => st.stage === s) || {
            stage: s,
            name: PIPELINE_STAGES[s - 1].name,
            durationMs: 1.5,
          };

          setCompletedStageMap((prev) => ({
            ...prev,
            [s]: stageData,
          }));

          // 75ms pacing so the operator can visibly monitor the 12 algorithms executing
          await new Promise((r) => setTimeout(r, 75));
        }

        setSimulationResult(result);
        setIsSimulating(false);
        setCurrentRunningStage(null);
      } else {
        // Direct instant execution for initial loading
        const result = await runEmergencySimulation(activeGraph, config);
        const stageMap = {};
        result.stages.forEach((st) => {
          stageMap[st.stage] = st;
        });
        setCompletedStageMap(stageMap);
        setSimulationProgress(100);
        setSimulationResult(result);
        setIsSimulating(false);
        setCurrentRunningStage(null);
      }
    },
    [
      isSimulating,
      selectedDisasterType,
      emergencyLocation,
      affectedPeople,
      riskLevel,
      blockedRoads,
      blockedBuildings,
      exitAvailability,
      fleetBudget,
      activeGraph,
      liveRadius,
      simulationMode,
      liveGraph,
    ]
  );

  // Initial Run on Mount
  const initialRunRef = useRef(false);
  const liveAutoRunKeyRef = useRef('');
  const liveAutoRunReadyRef = useRef(false);
  useEffect(() => {
    if (!initialRunRef.current) {
      initialRunRef.current = true;
      executeSimulation(false); // fast initial execution
    }
  }, [executeSimulation]);

  useEffect(() => {
    if (simulationMode !== 'live' || !liveGraph) return;
    const conditionKey = [
      liveGraph.dataFreshness,
      blockedRoads.join(','),
      blockedBuildings.join(','),
    ].join('|');
    if (!liveAutoRunReadyRef.current) {
      liveAutoRunReadyRef.current = true;
      liveAutoRunKeyRef.current = conditionKey;
      return;
    }
    if (liveAutoRunKeyRef.current === conditionKey) return;
    liveAutoRunKeyRef.current = conditionKey;
    executeSimulation(false);
  }, [simulationMode, liveGraph, blockedRoads, blockedBuildings, executeSimulation]);

  // Filtered Roads & Buildings lists
  const filteredEdges = useMemo(() => {
    if (!roadFilter) return activeGraph.edges;
    const q = roadFilter.toLowerCase();
    return activeGraph.edges.filter(
      (e) => e.id.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.target.toLowerCase().includes(q)
    );
  }, [activeGraph, roadFilter]);

  const filteredNodes = useMemo(() => {
    if (!buildingFilter) return activeGraph.nodes.filter((n) => n.type === 'building' || n.type === 'evacuation_zone');
    const q = buildingFilter.toLowerCase();
    return activeGraph.nodes.filter(
      (n) => n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q)
    );
  }, [activeGraph, buildingFilter]);

  // Dijkstra escape route edges for SVG highlighting
  const escapePathNodeSet = useMemo(() => {
    if (!simulationResult?.dijkstraResults?.epicenterToExit?.path) return new Set();
    return new Set(simulationResult.dijkstraResults.epicenterToExit.path);
  }, [simulationResult]);

  const escapePathEdgeSet = useMemo(() => {
    const path = simulationResult?.dijkstraResults?.epicenterToExit?.path;
    if (!path || path.length < 2) return new Set();
    const set = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      set.add(`${path[i]}->${path[i + 1]}`);
      set.add(`${path[i + 1]}->${path[i]}`);
    }
    return set;
  }, [simulationResult]);

  return (
    <div className="space-y-6">
      {/* Header & Global Action Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-emerald-700" />
              Emergency Simulator
            </h1>
            <StatusBadge
              status={isSimulating ? 'emergency' : simulationResult ? 'safe' : 'warning'}
              text={isSimulating ? 'PIPELINE ACTIVE' : simulationResult ? 'SIMULATION SYNCED' : 'READY'}
              pulse={isSimulating}
            />
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-800">
              12-STAGE DISASTER ENGINE
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Dynamic urban disaster propagation, cascading network failure modeling, and autonomous multi-algorithmic rescue dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            disabled={isSimulating}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs disabled:opacity-50"
            title="Reset parameters to scenario baseline"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            RESET
          </button>

          <button
            onClick={() => executeSimulation(true)}
            disabled={isSimulating || (simulationMode === 'live' && !liveGraph)}
            title={simulationMode === 'live' && !liveGraph ? 'Acquire GPS and load OpenStreetMap road network before running live simulation' : 'Run 12-stage algorithmic simulation'}
            className={`inline-flex items-center gap-2.5 rounded-xl px-5 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-xs ${
              isSimulating
                ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-wait'
                : simulationMode === 'live' && !liveGraph
                ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 shadow-sm active:scale-95'
            }`}
          >
            {isSimulating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-amber-700" />
                SIMULATING STAGE {currentRunningStage}/12...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                RUN SIMULATION
              </>
            )}
          </button>
        </div>
      </div>

      {/* DATA SOURCE MODE */}
      <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs" aria-labelledby="simulation-mode-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span id="simulation-mode-title" className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Simulation data source
              </span>
              <StatusBadge
                status={simulationMode === 'live' ? 'safe' : 'neutral'}
                text={simulationMode === 'live' ? 'LIVE DATA' : 'SYNTHETIC DATA'}
                pulse={simulationMode === 'live' && Boolean(liveGraph)}
                size="xs"
              />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {simulationMode === 'live'
                ? livePlaceName || 'Load a location to build a local OpenStreetMap road graph.'
                : 'Use DURGA\'s existing controlled disaster scenarios and synthetic urban graph.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyntheticMode}
              disabled={isSimulating || isLoadingLiveData}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                simulationMode === 'synthetic'
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Synthetic Simulation
            </button>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isSimulating || isLoadingLiveData}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                simulationMode === 'live'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {isLoadingLiveData ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {isLoadingLiveData ? 'Loading Live Data...' : 'Use My Current Location'}
            </button>
          </div>
        </div>

        {simulationMode === 'live' && liveGraph && (
          <div className="mt-4 grid gap-3 border-t border-emerald-100 pt-4 sm:grid-cols-3">
            <div>
              <label htmlFor="live-radius" className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Emergency radius</span>
                <span className="font-mono text-emerald-800">{liveRadius.toLocaleString()} m</span>
              </label>
              <input
                id="live-radius"
                type="range"
                min="500"
                max="3000"
                step="100"
                value={liveRadius}
                disabled={isSimulating || isLoadingLiveData}
                onChange={(event) => setLiveRadius(Number(event.target.value))}
                className="mt-2 w-full accent-emerald-700"
              />
              <p className="mt-1 text-[11px] text-slate-500">Reload Live Data after changing the radius.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Current source</div>
              <div className="mt-1 text-emerald-800">{livePlaceName || 'Current GPS area'}</div>
              <div className="mt-1 text-slate-500">OSM source node: {emergencyLocation}</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="font-semibold">Live data limits</div>
              <div className="mt-1 leading-relaxed">No traffic, danger, or population feed is used. Baseline road travel time is derived from OSM road class only.</div>
              <div className="mt-2 text-[11px] text-amber-800">Road geometry and mapped facilities: © OpenStreetMap contributors.</div>
            </div>
          </div>
        )}

        {liveDataNotice && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900" role="status">
            {liveDataNotice}
          </div>
        )}
        {liveDataError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{liveDataError}</span>
          </div>
        )}

        {simulationMode === 'live' && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <LiveConditionsPanel
              mode="live"
              location={globalLocation}
              locationStatus={globalLocationStatus}
              locationError={globalLocationError}
              requestLocation={handleUseCurrentLocation}
              address={globalAddress}
              graph={liveGraph}
              isGraphLoading={isLoadingLiveData || globalIsGraphLoading}
              graphError={liveDataError || globalGraphError}
              conditions={globalLiveConditions}
            />
          </div>
        )}
      </section>

      {/* DISASTER TYPE SELECTOR CARDS */}
      {simulationMode === 'synthetic' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DISASTER_PRESETS.map((preset) => {
          const isSelected = selectedDisasterType === preset.type;
          const Icon = preset.icon;
          return (
            <button
              key={preset.type}
              onClick={() => handleSelectDisaster(preset.type)}
              disabled={isSimulating}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? preset.activeBg + ' shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600 hover:text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/80 text-slate-900 shadow-2xs' : 'bg-slate-100 text-slate-700'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isSelected ? 'border-current/30 text-current' : 'border-slate-200 text-slate-500'}`}>
                  {preset.badge}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-sm font-bold text-slate-900 font-mono tracking-tight">{preset.type}</div>
                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{preset.name}</div>
              </div>
              {isSelected && (
                <motion.div
                  layoutId="disasterIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-current"
                />
              )}
            </button>
          );
        })}
      </div>}

      {/* LIVE 12-STAGE PIPELINE PROGRESS STEPPER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-700" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
              Autonomous Pipeline Stepper
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 border border-slate-200">
              12 Stages
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-500">
              Pipeline Execution:
            </span>
            <span className="text-slate-900 font-bold">
              {simulationResult ? `${simulationResult.totalExecutionTime} ms` : isSimulating ? 'Executing...' : 'Ready'}
            </span>
            <span className="text-emerald-700 font-bold">{simulationProgress}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
          <motion.div
            className="h-full bg-emerald-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${simulationProgress}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          />
        </div>

        {/* Horizontal Pipeline Steps */}
        <div className="grid grid-cols-2 gap-2 mt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
          {PIPELINE_STAGES.map((st) => {
            const isCompleted = !!completedStageMap[st.id];
            const isCurrent = currentRunningStage === st.id;
            const stageMetric = completedStageMap[st.id];

            return (
              <div
                key={st.id}
                className={`relative flex flex-col justify-between rounded-xl p-2.5 text-xs transition-all border ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold opacity-75">#{st.id}</span>
                  {isCurrent ? (
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-700" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="my-1.5 font-mono text-[11px] font-semibold leading-tight line-clamp-1 text-slate-900">
                  {st.name}
                </div>

                <div className="text-[9px] font-mono text-slate-500 flex items-center justify-between">
                  <span>{isCompleted ? `${stageMetric?.durationMs ?? 0}ms` : isCurrent ? 'RUNNING' : 'WAIT'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH: CONFIGURATION CONTROLS & REAL RESULTS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT COLUMN: HAZARD & NETWORK CONFIGURATION PANEL (4 Cols) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-700" />
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
                  Simulation Parameters
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 font-bold">CONFIG</span>
            </div>

            {/* Emergency Location Epicenter Dropdown */}
            <div>
              <label className="text-xs font-mono text-slate-700 flex items-center justify-between">
                <span>EMERGENCY LOCATION (EPICENTER)</span>
                <span className="text-emerald-700 font-bold">{emergencyLocation}</span>
              </label>
              <select
                value={emergencyLocation}
                onChange={(e) => setEmergencyLocation(e.target.value)}
                disabled={isSimulating}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-600 focus:bg-white focus:outline-none shadow-xs"
              >
                <optgroup label="Buildings">
                  {activeGraph.nodes
                    .filter((n) => n.type === 'building')
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} - {n.name} ({n.people} pers)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Evacuation Zones">
                  {activeGraph.nodes
                    .filter((n) => n.type === 'evacuation_zone')
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} - {n.name} ({n.people} pers)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Junctions">
                  {activeGraph.nodes
                    .filter((n) => n.type === 'junction')
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} - {n.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Affected People Slider */}
            {simulationMode === 'live' ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="font-semibold">Population data unavailable</div>
                <p className="mt-1 leading-relaxed">DURGA will not invent civilian counts for OpenStreetMap road nodes. Evacuation totals remain zero until a verified population feed is provided.</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-700">
                  <span>AFFECTED CIVILIANS</span>
                  <span className="text-rose-600 font-bold">{affectedPeople.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={affectedPeople}
                  onChange={(e) => setAffectedPeople(Number(e.target.value))}
                  disabled={isSimulating}
                  className="mt-2 w-full accent-rose-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>100</span>
                  <span>2,500</span>
                  <span>5,000</span>
                </div>
              </div>
            )}

            {/* Risk Level Selector */}
            <div>
              <label className="text-xs font-mono text-slate-700 block mb-1.5 font-medium">
                DISASTER SEVERITY / RISK LEVEL
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((lvl) => {
                  const isCurrent = riskLevel === lvl;
                  const colorMap = {
                    LOW: isCurrent ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' : 'bg-slate-50 text-emerald-800 border-slate-200 hover:bg-emerald-50',
                    MEDIUM: isCurrent ? 'bg-amber-500 text-white border-amber-600 shadow-xs' : 'bg-slate-50 text-amber-800 border-slate-200 hover:bg-amber-50',
                    HIGH: isCurrent ? 'bg-orange-500 text-white border-orange-600 shadow-xs' : 'bg-slate-50 text-orange-800 border-slate-200 hover:bg-orange-50',
                    CRITICAL: isCurrent ? 'bg-rose-600 text-white border-rose-700 shadow-xs' : 'bg-slate-50 text-rose-800 border-slate-200 hover:bg-rose-50',
                  };
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRiskLevel(lvl)}
                      disabled={isSimulating}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-all ${colorMap[lvl]}`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exit Availability & Dynamic Capacities */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-mono text-slate-700">
                <span>SAFE HAVEN EXITS & CAPACITY</span>
                <span className="text-emerald-700 font-bold">
                  {Object.values(exitAvailability).filter((e) => e.available).length}/{Object.keys(exitAvailability).length} ACTIVE
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {Object.entries(exitAvailability).map(([exId, ex]) => (
                  <div
                    key={exId}
                    className={`rounded-xl border p-2.5 text-xs transition-all ${
                      ex.available
                        ? 'border-slate-200 bg-slate-50/80 shadow-2xs'
                        : 'border-rose-200 bg-rose-50/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExit(exId)}
                          disabled={isSimulating}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition-all ${
                            ex.available
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {ex.available ? 'OPEN' : 'BLOCKED'}
                        </button>
                        <span className="font-mono font-bold text-slate-900">{exId}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{ex.name}</span>
                      </div>

                      <span className="font-mono text-xs text-emerald-800 font-bold">
                        {ex.available ? `${ex.capacity.toLocaleString()} cap` : 'OFFLINE'}
                      </span>
                    </div>

                    {ex.available && (
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          min="500"
                          max="8000"
                          step="250"
                          value={ex.capacity}
                          onChange={(e) => updateExitCapacity(exId, e.target.value)}
                          disabled={isSimulating}
                          className="w-full accent-emerald-700 h-1 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Fleet Allocation (Knapsack Inputs) */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-mono text-slate-700">
                <span>RESCUE FLEET BUDGET</span>
                <span className="text-emerald-700 font-bold">KNAPSACK CONSTRAINTS</span>
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Ambulance className="h-3.5 w-3.5 text-rose-600" /> Ambulances
                    </span>
                    <span className="text-slate-900 font-bold">{fleetBudget.ambulances} units</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="35"
                    value={fleetBudget.ambulances}
                    onChange={(e) =>
                      setFleetBudget((prev) => ({ ...prev, ambulances: Number(e.target.value) }))
                    }
                    disabled={isSimulating}
                    className="w-full accent-rose-600 mt-1 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Users className="h-3.5 w-3.5 text-emerald-700" /> Rescue Squads
                    </span>
                    <span className="text-slate-900 font-bold">{fleetBudget.rescueTeams} squads</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="25"
                    value={fleetBudget.rescueTeams}
                    onChange={(e) =>
                      setFleetBudget((prev) => ({ ...prev, rescueTeams: Number(e.target.value) }))
                    }
                    disabled={isSimulating}
                    className="w-full accent-emerald-700 mt-1 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Truck className="h-3.5 w-3.5 text-amber-600" /> Emergency Vehicles
                    </span>
                    <span className="text-slate-900 font-bold">{fleetBudget.emergencyVehicles} units</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="25"
                    value={fleetBudget.emergencyVehicles}
                    onChange={(e) =>
                      setFleetBudget((prev) => ({ ...prev, emergencyVehicles: Number(e.target.value) }))
                    }
                    disabled={isSimulating}
                    className="w-full accent-amber-600 mt-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Blocked Road Arterials Toggle Panel */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-mono text-slate-700">
                <span>SEVERED ROADS ({blockedRoads.length})</span>
                <input
                  type="text"
                  placeholder="Filter (e.g. E12)..."
                  value={roadFilter}
                  onChange={(e) => setRoadFilter(e.target.value)}
                  className="rounded bg-slate-50 px-2 py-0.5 text-[10px] text-slate-800 border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="mt-2.5 max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-1.5 custom-scrollbar">
                {filteredEdges.map((edge) => {
                  const isBlocked = blockedRoads.includes(edge.id);
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => toggleRoadBlocked(edge.id)}
                      disabled={isSimulating}
                      className={`rounded px-2 py-1 text-[10px] font-mono transition-all border ${
                        isBlocked
                          ? 'border-rose-300 bg-rose-50 text-rose-800 font-bold ring-1 ring-rose-200'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                      title={`${edge.source} ↔ ${edge.target} (${edge.distance}m)`}
                    >
                      {edge.id} {isBlocked && '✕'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compromised Buildings Blocked Toggle Panel */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-mono text-slate-700">
                <span>COMPROMISED STRUCTURES ({blockedBuildings.length})</span>
                <input
                  type="text"
                  placeholder="Filter (e.g. B01)..."
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="rounded bg-slate-50 px-2 py-0.5 text-[10px] text-slate-800 border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="mt-2.5 max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 custom-scrollbar">
                {filteredNodes.map((node) => {
                  const isBlocked = blockedBuildings.includes(node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => toggleBuildingBlocked(node.id)}
                      disabled={isSimulating}
                      className={`rounded px-2 py-1 text-[10px] font-mono transition-all border ${
                        isBlocked
                          ? 'border-rose-300 bg-rose-50 text-rose-800 font-bold ring-1 ring-rose-200'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                      title={`${node.name} (${node.people} pers)`}
                    >
                      {node.id} {isBlocked && '✕'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL ALGORITHMIC OUTPUT & INTERACTIVE COMMAND SUITE (8 Cols) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Output Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'directive', label: 'Command Directive', icon: ShieldCheck },
                { id: 'map', label: 'Spatial Disaster Map', icon: MapPin },
                { id: 'evacuation', label: 'Greedy Evacuation', icon: DoorOpen },
                { id: 'resources', label: 'Fleet DP Optimizer', icon: Ambulance },
                { id: 'mst', label: 'MST Backbone', icon: Network },
                { id: 'telemetry', label: 'Telemetry Audit', icon: Cpu },
                { id: 'ai', label: 'DURGA AI', icon: Bot },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-mono transition-all ${
                      isActive
                        ? 'border border-emerald-300 bg-emerald-100 text-emerald-950 font-bold shadow-xs'
                        : 'border border-transparent bg-white text-slate-600 hover:border-slate-200 hover:text-slate-900 shadow-2xs'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {simulationResult && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Plan: <strong className="text-slate-900">{simulationResult.evacuationPlan.planId}</strong></span>
              </div>
            )}
          </div>

          {/* TAB CONTENT PANELS */}
          {simulationResult && (
            <div>
              {/* TAB 1: EXECUTIVE COMMAND DIRECTIVE */}
              {activeTab === 'directive' && (
                <div className="space-y-4">
                  {/* High Level Feasibility Banner */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            TACTICAL EVACUATION DIRECTIVE
                          </span>
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider ${
                              simulationResult.evacuationPlan.directiveLevel === 'OPTIMAL_COMMAND_CONTROL'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                : simulationResult.evacuationPlan.directiveLevel === 'ELEVATED_CONTINGENCY'
                                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                                : 'bg-rose-50 border border-rose-200 text-rose-800'
                            }`}
                          >
                            {simulationResult.evacuationPlan.directiveLevel}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 font-mono">
                          {selectedDisasterType.toUpperCase()} INCIDENT COMMAND: {emergencyLocation}
                        </h2>
                        <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                          DURGA has analyzed {simulationResult.graph.nodes.length} nodes and {simulationResult.graph.edges.length} corridors.
                          {simulationResult.dijkstraResults.epicenterToExit.isReachable ? (
                            <span> Rapid egress corridor established via <strong>{simulationResult.dijkstraResults.epicenterToExit.targetExitId}</strong> in <strong>{simulationResult.dijkstraResults.epicenterToExit.totalCost.toFixed(1)}s</strong> dynamic travel cost.</span>
                          ) : (
                            <span className="text-rose-600 font-semibold"> Critical Warning: Epicenter is cut off from primary exits by road blockades. Immediate rescue squad clearance required.</span>
                          )}
                        </p>
                      </div>

                      {/* Feasibility Ring Score */}
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
                        <div className="relative flex items-center justify-center">
                          <svg className="h-20 w-20 -rotate-90 transform">
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="currentColor"
                              strokeWidth="6"
                              className="text-slate-200"
                              fill="transparent"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="currentColor"
                              strokeWidth="6"
                              className={`${
                                simulationResult.evacuationPlan.feasibilityScore >= 70
                                  ? 'text-emerald-600'
                                  : simulationResult.evacuationPlan.feasibilityScore >= 40
                                  ? 'text-amber-500'
                                  : 'text-rose-600'
                              } transition-all duration-1000 ease-out`}
                              strokeDasharray={200}
                              strokeDashoffset={200 - (200 * simulationResult.evacuationPlan.feasibilityScore) / 100}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-lg font-mono font-bold text-slate-900">
                              {simulationResult.evacuationPlan.feasibilityScore}%
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 font-semibold">FEASIBLE</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs font-mono">
                          <div className="text-slate-500">Egress Status</div>
                          <div className="font-bold text-slate-900">
                            {simulationResult.evacuationPlan.evacuationRate}% Evacuated
                          </div>
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            {simulationResult.evacuationPlan.totalCiviliansEvacuated.toLocaleString()} / {simulationResult.evacuationPlan.totalCiviliansAtRisk.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                        <span>CIVILIANS AT RISK</span>
                        <Users className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                        {simulationResult.evacuationPlan.totalCiviliansAtRisk.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-[10px] font-mono text-rose-600">Across danger perimeter</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                        <span>FLEET DEPLOYED</span>
                        <Ambulance className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold font-mono text-emerald-800">
                        {simulationResult.evacuationPlan.ambulanceUnitsStaged + simulationResult.evacuationPlan.rescueSquadsStaged + simulationResult.evacuationPlan.utilityVehiclesStaged}
                      </div>
                      <div className="mt-0.5 text-[10px] font-mono text-slate-500">0/1 Knapsack optimal</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                        <span>SURVIVAL BENEFIT</span>
                        <TrendingUp className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div className="mt-2 text-xl font-bold font-mono text-emerald-800">
                        {simulationResult.evacuationPlan.totalLifeBenefitScore.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-[10px] font-mono text-slate-500">DP maximum aggregate</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                        <span>MST BACKBONE</span>
                        <Network className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                        {simulationResult.evacuationPlan.backboneCorridorCount}
                      </div>
                      <div className="mt-0.5 text-[10px] font-mono text-slate-500">
                        {simulationResult.evacuationPlan.severedArterialsCount} severed / cycles rejected
                      </div>
                    </div>
                  </div>

                  {/* Primary Tactical Routes: Dijkstra Epicenter Egress & Medical Route */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Epicenter -> Exit Route Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-emerald-700" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">
                            Epicenter Egress Route (Dijkstra)
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-emerald-800 font-bold">
                          TO {simulationResult.dijkstraResults.epicenterToExit.targetExitId}
                        </span>
                      </div>

                      {simulationResult.dijkstraResults.epicenterToExit.isReachable ? (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {simulationResult.dijkstraResults.epicenterToExit.path.map((nodeId, idx) => (
                              <React.Fragment key={nodeId}>
                                <span className={`rounded-lg px-2 py-1 text-xs font-mono font-bold ${
                                  idx === 0
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : idx === simulationResult.dijkstraResults.epicenterToExit.path.length - 1
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}>
                                  {nodeId}
                                </span>
                                {idx < simulationResult.dijkstraResults.epicenterToExit.path.length - 1 && (
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono text-slate-500">
                            <span>Travel Time: <strong className="text-slate-900">{simulationResult.dijkstraResults.epicenterToExit.totalCost.toFixed(1)}s</strong></span>
                            <span>Distance: <strong className="text-slate-900">{simulationResult.dijkstraResults.epicenterToExit.distance}m</strong></span>
                            <span>Hops: <strong className="text-slate-900">{simulationResult.dijkstraResults.epicenterToExit.path.length - 1}</strong></span>
                          </div>

                          <div className="pt-2 border-t border-slate-200">
                            <Link
                              to="/evacuation-planner"
                              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-mono font-bold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                            >
                              <Volume2 className="h-4 w-4" />
                              <span>Launch Turn-by-Turn Voice Navigation</span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>NO VIABLE PATH. Roadblock isolation severed all routes to {simulationResult.dijkstraResults.epicenterToExit.targetExitId}.</span>
                        </div>
                      )}
                    </div>

                    {/* Epicenter -> Nearest Medical Facility Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Ambulance className="h-4 w-4 text-rose-600" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">
                            Casualty Triage Corridor (Dijkstra)
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-rose-800 font-bold">
                          TO {simulationResult.dijkstraResults.epicenterToMedical.targetHospitalId}
                        </span>
                      </div>

                      {simulationResult.dijkstraResults.epicenterToMedical.isReachable ? (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {simulationResult.dijkstraResults.epicenterToMedical.path.map((nodeId, idx) => (
                              <React.Fragment key={nodeId}>
                                <span className={`rounded-lg px-2 py-1 text-xs font-mono font-bold ${
                                  idx === 0
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : idx === simulationResult.dijkstraResults.epicenterToMedical.path.length - 1
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}>
                                  {nodeId}
                                </span>
                                {idx < simulationResult.dijkstraResults.epicenterToMedical.path.length - 1 && (
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono text-slate-500">
                            <span>Travel Time: <strong className="text-slate-900">{simulationResult.dijkstraResults.epicenterToMedical.totalCost.toFixed(1)}s</strong></span>
                            <span>Distance: <strong className="text-slate-900">{simulationResult.dijkstraResults.epicenterToMedical.distance}m</strong></span>
                            <span>Hops: <strong className="text-slate-900">{simulationResult.dijkstraResults.epicenterToMedical.path.length - 1}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>HOSPITAL ACCESS SEVERED. Ambulances cannot access {simulationResult.dijkstraResults.epicenterToMedical.targetHospitalId}.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SPATIAL HAZARD & EVACUATION MAP (SVG Topo Canvas) */}
              {activeTab === 'map' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      <span className="font-mono text-xs uppercase font-bold text-slate-900">
                        Urban Spatial Topology & Disaster Vector
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                        Epicenter: <strong className="text-slate-900">{emergencyLocation}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block" />
                        Safe Exits
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-4 border-b-2 border-dashed border-rose-500 inline-block" />
                        Blocked Roads
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-4 border-b-2 border-emerald-600 inline-block" />
                        Dijkstra Escape Path
                      </span>
                    </div>
                  </div>

                  {/* SVG Map Canvas */}
                  <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                    <svg
                      viewBox="40 40 760 620"
                      className="w-full h-full select-none"
                    >
                      <defs>
                        {/* Hazard Radius Radial Gradient */}
                        <radialGradient id="hazardPulse" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                          <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.10" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                        </radialGradient>

                        {/* Glow filter for escape corridor */}
                        <filter id="corridorGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="2.5" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Hazard Impact Radius Plume */}
                      {(() => {
                        const epicNode = simulationResult.graph.nodes.find((n) => n.id === emergencyLocation);
                        if (!epicNode) return null;
                        const r = simulationMode === 'live' ? liveRadius : HAZARD_PRESETS[selectedDisasterType]?.radiusMeters || 650;
                        const pixelRadius = r * 0.28; // scale to viewport
                        return (
                          <g>
                            <circle
                              cx={epicNode.x}
                              cy={epicNode.y}
                              r={pixelRadius}
                              fill="url(#hazardPulse)"
                              stroke="#f43f5e"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                              className="animate-pulse"
                            />
                            <text
                              x={epicNode.x}
                              y={epicNode.y - pixelRadius - 6}
                              textAnchor="middle"
                              fill="#e11d48"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              HAZARD PERIMETER: {r}m
                            </text>
                          </g>
                        );
                      })()}

                      {/* Browser location marker for live mode */}
                      {simulationMode === 'live' && liveGraph?.userLocation && (
                        <g aria-label="Current browser location">
                          <circle
                            cx={liveGraph.userLocation.x}
                            cy={liveGraph.userLocation.y}
                            r="10"
                            fill="#ffffff"
                            stroke="#166534"
                            strokeWidth="2"
                          />
                          <circle
                            cx={liveGraph.userLocation.x}
                            cy={liveGraph.userLocation.y}
                            r="4"
                            fill="#16a34a"
                          />
                          <text
                            x={liveGraph.userLocation.x}
                            y={liveGraph.userLocation.y + 24}
                            textAnchor="middle"
                            fill="#166534"
                            fontSize="10"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            YOUR LOCATION
                          </text>
                        </g>
                      )}

                      {/* Edges / Road Arterials */}
                      {simulationResult.graph.edges.map((edge) => {
                        const src = simulationResult.graph.nodes.find((n) => n.id === edge.source);
                        const tgt = simulationResult.graph.nodes.find((n) => n.id === edge.target);
                        if (!src || !tgt) return null;

                        const isBlocked = edge.blocked;
                        const isEscapeCorridor =
                          escapePathEdgeSet.has(`${edge.source}->${edge.target}`) ||
                          escapePathEdgeSet.has(`${edge.target}->${edge.source}`);

                        if (isEscapeCorridor) {
                          return (
                            <line
                              key={edge.id}
                              x1={src.x}
                              y1={src.y}
                              x2={tgt.x}
                              y2={tgt.y}
                              stroke="#059669"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              filter="url(#corridorGlow)"
                            />
                          );
                        }

                        if (isBlocked) {
                          return (
                            <g key={edge.id}>
                              <line
                                x1={src.x}
                                y1={src.y}
                                x2={tgt.x}
                                y2={tgt.y}
                                stroke="#f43f5e"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                opacity="0.8"
                              />
                              {/* Blocked indicator cross */}
                              <circle
                                cx={(src.x + tgt.x) / 2}
                                cy={(src.y + tgt.y) / 2}
                                r="4"
                                fill="#fee2e2"
                                stroke="#ef4444"
                                strokeWidth="1.2"
                              />
                            </g>
                          );
                        }

                        return (
                          <line
                            key={edge.id}
                            x1={src.x}
                            y1={src.y}
                            x2={tgt.x}
                            y2={tgt.y}
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            opacity="0.8"
                          />
                        );
                      })}

                      {/* Graph Nodes */}
                      {simulationResult.graph.nodes.map((node) => {
                        const isEpicenter = node.id === emergencyLocation;
                        const isPath = escapePathNodeSet.has(node.id);
                        const isHovered = selectedNodeHover?.id === node.id;

                        // Type colors
                        let fillColor = '#64748b';
                        if (node.type === 'exit') fillColor = '#10b981';
                        else if (node.type === 'hospital') fillColor = '#0f766e';
                        else if (node.type === 'evacuation_zone') fillColor = '#f59e0b';
                        else if (node.type === 'junction') fillColor = '#64748b';

                        if (isEpicenter) fillColor = '#dc2626';

                        return (
                          <g
                            key={node.id}
                            className="cursor-pointer"
                            onMouseEnter={() => setSelectedNodeHover(node)}
                            onMouseLeave={() => setSelectedNodeHover(null)}
                          >
                            {/* Epicenter ping effect */}
                            {isEpicenter && (
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r="18"
                                fill="none"
                                stroke="#dc2626"
                                strokeWidth="1.5"
                                className="animate-ping"
                              />
                            )}

                            {/* Node Body */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isEpicenter ? 9 : isPath ? 7.5 : node.type === 'exit' ? 8 : 5.5}
                              fill={fillColor}
                              stroke={isHovered ? '#0f172a' : isPath ? '#059669' : '#ffffff'}
                              strokeWidth={isHovered ? 2.5 : isPath ? 2.5 : 1.5}
                            />

                            {/* Node Label for prominent vertices */}
                            {(node.type === 'exit' || node.type === 'hospital' || isEpicenter || isPath || isHovered) && (
                              <text
                                x={node.x}
                                y={node.y - 10}
                                textAnchor="middle"
                                fill={isEpicenter ? '#b91c1c' : node.type === 'exit' ? '#047857' : '#334155'}
                                fontSize={node.type === 'exit' ? '10' : '9'}
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {node.id}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Hover Tooltip Overlay */}
                    {selectedNodeHover && (
                      <div className="absolute bottom-4 left-4 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg backdrop-blur-md font-mono text-xs text-slate-800 max-w-xs pointer-events-none">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-emerald-800">{selectedNodeHover.id}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {selectedNodeHover.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-1 font-sans text-xs">{selectedNodeHover.name}</div>
                        <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                          <div>People: <strong className="text-slate-900">{selectedNodeHover.people}</strong></div>
                          <div>At Risk: <strong className="text-rose-600">{selectedNodeHover.peopleAtRisk || 0}</strong></div>
                          <div>Risk: <strong className="text-amber-600">{selectedNodeHover.riskLevel}</strong></div>
                          <div>Priority: <strong className="text-slate-900">{selectedNodeHover.priority}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: EXIT CAPACITIES & GREEDY EVACUATION MANIFEST */}
              {activeTab === 'evacuation' && (
                <div className="space-y-4">
                  {/* Exit Capacity Utilization Cards */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(simulationResult.greedyResult.exitSummary).map(([exId, summary]) => {
                      const util = summary.utilizationPercent || 0;
                      return (
                        <div
                          key={exId}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <DoorOpen className="h-4 w-4 text-emerald-700" />
                              {exId}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              summary.available
                                ? util > 90
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {summary.available ? `${util}% FULL` : 'OFFLINE'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono text-slate-500">
                              <span>Assigned Civilians:</span>
                              <strong className="text-slate-900 font-bold">{summary.assigned.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500">
                              <span>Total Capacity:</span>
                              <strong className="text-slate-600">{summary.totalCapacity.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500">
                              <span>Remaining Margin:</span>
                              <strong className="text-emerald-700 font-bold">{summary.remainingCapacity.toLocaleString()}</strong>
                            </div>
                          </div>

                          {/* Mini Progress */}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                util > 90 ? 'bg-rose-500' : util > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, util)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Greedy Assignments Manifest Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-700" />
                        <span className="font-mono text-xs uppercase font-bold text-slate-900">
                          Zone Evacuation Manifest (Greedy Strategy: Urgency-First)
                        </span>
                      </div>
                      <span className="font-mono text-xs text-emerald-700 font-bold">
                        {simulationResult.greedyResult.assignments.length} ZONES ASSIGNED
                      </span>
                    </div>

                    <div className="mt-3 overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left font-mono text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Zone / Building</th>
                            <th className="py-2.5 px-3">Population</th>
                            <th className="py-2.5 px-3">Risk Level</th>
                            <th className="py-2.5 px-3">Assigned Safe Exit</th>
                            <th className="py-2.5 px-3">Effective Distance</th>
                            <th className="py-2.5 px-3">Exit Headroom Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {simulationResult.greedyResult.assignments.map((asg, idx) => (
                            <tr key={`${asg.zoneId}-${idx}`} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {asg.zoneId} <span className="text-[11px] font-normal text-slate-500">({asg.zoneName})</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-900 font-bold">
                                {asg.evacuees.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  asg.riskLevel === 'CRITICAL'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : asg.riskLevel === 'HIGH'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {asg.riskLevel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-800">
                                {asg.exitId} ({asg.exitName})
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {asg.effectiveDistance.toFixed(1)}s
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {asg.remainingExitCapacity.toLocaleString()} slots
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: 0/1 KNAPSACK DYNAMIC PROGRAMMING RESOURCE ALLOCATION */}
              {activeTab === 'resources' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Ambulances */}
                    <div className="rounded-2xl border border-rose-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Ambulance className="h-4 w-4 text-rose-600" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">Ambulances</span>
                        </div>
                        <span className="font-mono text-xs text-rose-700 font-bold">
                          {simulationResult.knapsackResults.ambulances.resourceUsed} / {simulationResult.knapsackResults.ambulances.capacity} USED
                        </span>
                      </div>

                      <div className="text-xs font-mono space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>DP Optimized Benefit:</span>
                          <strong className="text-rose-800 font-bold">{simulationResult.knapsackResults.ambulances.maxBenefit} pts</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Zones Serviced:</span>
                          <strong className="text-slate-900 font-bold">{simulationResult.knapsackResults.ambulances.selectedZones.length}</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Computation Time:</span>
                          <strong className="text-slate-600">{simulationResult.knapsackResults.ambulances.executionTime} ms</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-500">
                        <span className="block mb-1 font-bold text-slate-700">Selected Priority Targets:</span>
                        <div className="flex flex-wrap gap-1">
                          {simulationResult.knapsackResults.ambulances.selectedZones.map((z) => (
                            <span key={z.id} className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-rose-800 text-[10px] font-bold">
                              {z.id} ({z.requirement}u)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Rescue Teams */}
                    <div className="rounded-2xl border border-emerald-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-emerald-700" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">Rescue Squads</span>
                        </div>
                        <span className="font-mono text-xs text-emerald-800 font-bold">
                          {simulationResult.knapsackResults.rescueTeams.resourceUsed} / {simulationResult.knapsackResults.rescueTeams.capacity} USED
                        </span>
                      </div>

                      <div className="text-xs font-mono space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>DP Optimized Benefit:</span>
                          <strong className="text-emerald-800 font-bold">{simulationResult.knapsackResults.rescueTeams.maxBenefit} pts</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Zones Serviced:</span>
                          <strong className="text-slate-900 font-bold">{simulationResult.knapsackResults.rescueTeams.selectedZones.length}</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Computation Time:</span>
                          <strong className="text-slate-600">{simulationResult.knapsackResults.rescueTeams.executionTime} ms</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-500">
                        <span className="block mb-1 font-bold text-slate-700">Selected Priority Targets:</span>
                        <div className="flex flex-wrap gap-1">
                          {simulationResult.knapsackResults.rescueTeams.selectedZones.map((z) => (
                            <span key={z.id} className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-emerald-800 text-[10px] font-bold">
                              {z.id} ({z.requirement}s)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Vehicles */}
                    <div className="rounded-2xl border border-amber-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-amber-600" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">Emergency Vehicles</span>
                        </div>
                        <span className="font-mono text-xs text-amber-800 font-bold">
                          {simulationResult.knapsackResults.emergencyVehicles.resourceUsed} / {simulationResult.knapsackResults.emergencyVehicles.capacity} USED
                        </span>
                      </div>

                      <div className="text-xs font-mono space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>DP Optimized Benefit:</span>
                          <strong className="text-amber-800 font-bold">{simulationResult.knapsackResults.emergencyVehicles.maxBenefit} pts</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Zones Serviced:</span>
                          <strong className="text-slate-900 font-bold">{simulationResult.knapsackResults.emergencyVehicles.selectedZones.length}</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Computation Time:</span>
                          <strong className="text-slate-600">{simulationResult.knapsackResults.emergencyVehicles.executionTime} ms</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-500">
                        <span className="block mb-1 font-bold text-slate-700">Selected Priority Targets:</span>
                        <div className="flex flex-wrap gap-1">
                          {simulationResult.knapsackResults.emergencyVehicles.selectedZones.map((z) => (
                            <span key={z.id} className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-amber-800 text-[10px] font-bold">
                              {z.id} ({z.requirement}u)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DP Table Backtracking Summary */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs text-xs font-mono text-slate-700 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-900">
                      <span>Knapsack DP Exact Mathematical Guarantee</span>
                      <span className="text-emerald-700 font-bold">O(N × W) COMPLEXITY</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      By computing the 2D dynamic programming memoization recurrence <code className="bg-slate-100 text-emerald-800 px-1 py-0.5 rounded border border-slate-200">V[i][w] = max(V[i-1][w], V[i-1][w-w_i] + v_i)</code> and backtracking from the global maximum, DURGA guarantees that the selected rescue units deliver strictly optimal survival benefits under capacity constraints, completely avoiding the local sub-optima inherent in greedy heuristics.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: MINIMAL SPANNING TREE INFRASTRUCTURE BACKBONE */}
              {activeTab === 'mst' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Kruskal MST Suite */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-emerald-700" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">Kruskal's MST</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          DSU & SORTING
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">TOTAL BACKBONE COST</span>
                          <span className="text-lg font-bold text-slate-900">{simulationResult.kruskalResult.totalCost.toFixed(1)}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">SELECTED ARTERIALS</span>
                          <span className="text-lg font-bold text-emerald-800">{simulationResult.kruskalResult.selectedCount} corridors</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">REJECTED / SEVERED</span>
                          <span className="text-lg font-bold text-rose-600">{simulationResult.kruskalResult.rejectedCount} cycles/cuts</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">EXECUTION TIME</span>
                          <span className="text-lg font-bold text-emerald-800">{simulationResult.kruskalResult.executionTime} ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Prim MST Suite */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <GitMerge className="h-4 w-4 text-emerald-700" />
                          <span className="font-mono text-xs uppercase font-bold text-slate-900">Prim's MST</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          PRIORITY CUT EXPANSION
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">TOTAL BACKBONE COST</span>
                          <span className="text-lg font-bold text-slate-900">{simulationResult.primResult.totalCost.toFixed(1)}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">SELECTED ARTERIALS</span>
                          <span className="text-lg font-bold text-emerald-800">{simulationResult.primResult.selectedCount} corridors</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">SPAN STATUS</span>
                          <span className="text-lg font-bold text-emerald-800">
                            {simulationResult.primResult.isFullySpanned ? 'Fully Spanned' : 'Partial Forest'}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">EXECUTION TIME</span>
                          <span className="text-lg font-bold text-emerald-800">{simulationResult.primResult.executionTime} ms</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resilient Backbone Edge Manifest */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 font-mono text-xs">
                      <span className="font-bold text-slate-900 uppercase">Resilient MST Backbone Corridors</span>
                      <span className="text-emerald-700 font-bold">KRUSKAL CRITICAL LINKS</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {simulationResult.kruskalResult.mstEdges.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-mono text-slate-700 flex items-center gap-2"
                        >
                          <span className="font-bold text-emerald-800">{e.id}</span>
                          <span className="text-slate-600">{e.source} ↔ {e.target}</span>
                          <span className="text-slate-500 text-[10px]">({e.effectiveCost ? e.effectiveCost.toFixed(1) : e.weight ? e.weight.toFixed(1) : 0} cost)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: AUDIT TELEMETRY & 12-STAGE LOG */}
              {activeTab === 'telemetry' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-700" />
                      <span className="font-mono text-xs uppercase font-bold text-slate-900">
                        12-Stage Algorithmic Execution Benchmark Audit
                      </span>
                    </div>
                    <span className="font-mono text-xs text-emerald-700 font-bold">
                      TOTAL DURATION: {simulationResult.totalExecutionTime} ms
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Stage #</th>
                          <th className="py-2.5 px-3">Pipeline Stage Name</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Execution Time</th>
                          <th className="py-2.5 px-3">Algorithm & Mechanism</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {simulationResult.stages.map((st) => (
                          <tr key={st.stage} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 text-emerald-800 font-bold">STAGE {st.stage}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> COMPLETED
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-emerald-800 font-bold">{st.durationMs} ms</td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {PIPELINE_STAGES[st.stage - 1]?.desc || 'Autonomous step'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <GeminiDecisionSupport
                  simulationResult={simulationResult}
                  disasterType={selectedDisasterType}
                  location={emergencyLocation}
                  people={affectedPeople}
                  risk={riskLevel}
                  mode={simulationMode}
                  blockedRoads={blockedRoads}
                  onViewAlgorithmResults={() => setActiveTab('directive')}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
