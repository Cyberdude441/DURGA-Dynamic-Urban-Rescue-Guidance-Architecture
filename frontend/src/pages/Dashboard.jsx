import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Activity,
  Layers,
  Radio,
  Flame,
  Droplets,
  ArrowUpRight,
  Shield,
  MapPin,
} from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import DurgaLogo from '../components/common/DurgaLogo';
import UrbanGraphView from '../components/graph/UrbanGraphView';
import { URBAN_GRAPH, EMERGENCY_SCENARIOS } from '../data';
import { APP_CONFIG } from '../utils/constants';
import {
  applyScenarioToGraph,
  getGraphSummary,
} from '../utils/graphUtils';
import { useLocationContext } from '../context/LocationContext.jsx';

export default function Dashboard() {
  const [selectedScenarioId, setSelectedScenarioId] = useState('baseline');
  const { nearbyGraph, address, status } = useLocationContext();

  const activeScenario = EMERGENCY_SCENARIOS.find((s) => s.id === selectedScenarioId) || null;
  const currentGraph = nearbyGraph && !activeScenario ? nearbyGraph : activeScenario ? applyScenarioToGraph(URBAN_GRAPH, activeScenario) : URBAN_GRAPH;
  const summary = getGraphSummary(currentGraph);
  const usingLiveGraph = Boolean(nearbyGraph && !activeScenario);

  const pipelineStages = [
    { name: 'Analyze', role: usingLiveGraph ? 'Nearby OSM topology ingested' : 'Synthetic topology ingested', status: 'Active' },
    { name: 'Optimize', role: 'Dynamic Flow & Dispatch', status: 'Standby' },
    { name: 'Guide', role: 'Bottleneck-free Guidance', status: 'Ready' },
    { name: 'Rescue', role: 'Field Squad Telemetry', status: 'Standby' },
  ];

  // 8 Core KPI Cards connected to the synthetic graph
  const kpiCards = [
    {
      id: 'people_at_risk',
      label: 'People at Risk',
      value: activeScenario ? summary.peopleAtRisk.toLocaleString() : '0',
      unit: 'civilians',
      status: activeScenario ? 'danger' : 'safe',
      statusText: activeScenario
        ? `${summary.peopleAtRisk.toLocaleString()} in ${activeScenario.type.toLowerCase()} hazard zone`
        : 'Zero casualties reported',
      icon: 'Users',
      changeText: activeScenario ? 'Evacuation alert active' : 'Zero perimeter breaches',
    },
    {
      id: 'active_zones',
      label: 'Active Zones',
      value: activeScenario ? activeScenario.activeZones : summary.activeZonesCount,
      unit: 'sectors',
      status: activeScenario ? 'warning' : 'safe',
      statusText: activeScenario
        ? `${activeScenario.activeZones} sectors under threat`
        : `${summary.activeZonesCount} monitored zones nominal`,
      icon: 'Radio',
      changeText: activeScenario ? 'Perimeter containment' : 'All urban sectors nominal',
    },
    {
      id: 'available_exits',
      label: 'Available Exits',
      value: activeScenario ? activeScenario.recommendedExits.length : summary.exitsCount,
      unit: 'exit corridors',
      status: 'safe',
      statusText: activeScenario
        ? `Primary: ${activeScenario.recommendedExits.join(', ')}`
        : `${summary.exitsCount} municipal exits operational`,
      icon: 'DoorOpen',
      changeText: 'Evacuation corridors clear',
    },
    {
      id: 'blocked_roads',
      label: 'Blocked Roads',
      value: summary.blockedEdgesCount,
      unit: 'blocked segments',
      status: summary.blockedEdgesCount > 0 ? 'danger' : 'safe',
      statusText: summary.blockedEdgesCount > 0
        ? `${summary.blockedEdgesCount} roads severed by hazard`
        : 'No network hazards detected',
      icon: 'Ban',
      changeText: summary.blockedEdgesCount > 0 ? 'Rerouting necessary' : 'Road throughput 100%',
    },
    {
      id: 'ambulances',
      label: 'Ambulances',
      value: activeScenario ? activeScenario.ambulancesRequired : '--',
      unit: 'units ready',
      status: activeScenario ? 'warning' : 'neutral',
      statusText: activeScenario
        ? `${activeScenario.ambulancesRequired} dispatched from RC01`
        : 'Fleet telemetry standby (RC01)',
      icon: 'Ambulance',
      changeText: activeScenario ? 'Priority triage active' : 'Depot dispatch idle',
    },
    {
      id: 'rescue_teams',
      label: 'Rescue Teams',
      value: activeScenario ? activeScenario.rescueTeamsRequired : '--',
      unit: 'squads staged',
      status: activeScenario ? 'warning' : 'neutral',
      statusText: activeScenario
        ? `${activeScenario.rescueTeamsRequired} squads mobilized from RC02`
        : 'Specialist rescue standby (RC02)',
      icon: 'ShieldCheck',
      changeText: activeScenario ? 'Deploying to epicenter' : 'Perimeter staging nominal',
    },
    {
      id: 'evacuation_time',
      label: 'Clearance Time',
      value: activeScenario ? activeScenario.estimatedEvacTimeMinutes : '--',
      unit: 'minutes (est.)',
      status: activeScenario ? 'warning' : 'neutral',
      statusText: activeScenario
        ? `Dynamic clearance via exits ${activeScenario.recommendedExits.join(', ')}`
        : 'Awaiting route solver telemetry',
      icon: 'Timer',
      changeText: activeScenario ? 'Dynamic flow active' : 'Flow calculation idle',
    },
    {
      id: 'graph_status',
      label: 'Graph Integrity',
      value: summary.blockedEdgesCount > 0 ? `${summary.activeEdgesCount}/${summary.totalEdges}` : `${summary.totalEdges}/${summary.totalEdges}`,
      unit: 'corridors open',
      status: summary.blockedEdgesCount > 0 ? 'warning' : 'safe',
      statusText: summary.blockedEdgesCount > 0
        ? `${summary.blockedEdgesCount} roads severed • Reroute active`
        : 'All 58 arterial edges operational',
      icon: 'Activity',
      changeText: '47 nodes mapped',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Current location context">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-emerald-200 bg-white p-2 text-emerald-700">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-900">Current area</span>
              <StatusBadge status={status === 'active' ? 'safe' : 'neutral'} text={usingLiveGraph ? 'LIVE LOCATION DATA' : 'SYNTHETIC FALLBACK'} size="xs" />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">{address?.displayName || 'Location permission pending'}</p>
            <p className="mt-0.5 text-xs text-slate-600">{usingLiveGraph ? `${summary.totalNodes} nearby road nodes monitored` : 'Synthetic urban network remains available until live data is loaded.'}</p>
          </div>
        </div>
        {usingLiveGraph && <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800">OSM NETWORK ACTIVE</span>}
      </section>

      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 shadow-xs"
      >
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge
                status={activeScenario ? 'danger' : 'safe'}
                text={activeScenario ? `${activeScenario.name} ACTIVE` : 'ALL SECTORS NOMINAL'}
                pulse={Boolean(activeScenario)}
              />
              <span className="font-mono text-xs text-slate-500 font-semibold">
                TOPOLOGY: 47 NODES • 58 ROADS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950 flex items-center gap-3">
              <DurgaLogo size={32} />
              <span>{APP_CONFIG.name} Command Center</span>
            </h1>
            <p className="text-sm text-slate-600">
              {APP_CONFIG.fullName} — High-readiness urban telemetry and emergency orchestration console.
            </p>
          </div>

          {/* Scenario Trigger Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 font-mono text-xs">
            <span className="text-slate-600 uppercase text-[11px] font-bold">SIMULATE SCENARIO:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedScenarioId('baseline')}
                className={`rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer shadow-xs ${
                  selectedScenarioId === 'baseline'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setSelectedScenarioId('scenario_fire')}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer shadow-xs ${
                  selectedScenarioId === 'scenario_fire'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                }`}
              >
                <Flame className="h-3 w-3" />
                Fire
              </button>
              <button
                onClick={() => setSelectedScenarioId('scenario_flood')}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer shadow-xs ${
                  selectedScenarioId === 'scenario_flood'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                <Droplets className="h-3 w-3" />
                Flood
              </button>
              <button
                onClick={() => setSelectedScenarioId('scenario_earthquake')}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer shadow-xs ${
                  selectedScenarioId === 'scenario_earthquake'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                <Activity className="h-3 w-3" />
                Quake
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 8 Core KPI Cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-700" />
            <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-slate-800">
              Core Emergency Command Indicators
            </h2>
          </div>
          <span className="font-mono text-[11px] text-slate-500 font-medium">
            {activeScenario ? `Active: ${activeScenario.name}` : 'Synthetic graph loaded • Algorithms standby'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((metric, index) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              status={metric.status}
              statusText={metric.statusText}
              icon={metric.icon}
              changeText={metric.changeText}
              delay={index * 0.03}
            />
          ))}
        </div>
      </section>

      {/* 4-Pillar Architecture Progression */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono">
              Architecture Pipeline Status
            </h2>
            <p className="text-xs text-slate-500">
              {APP_CONFIG.tagline}
            </p>
          </div>
          <span className="rounded bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono text-emerald-900 font-bold">
            DATA LAYER ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineStages.map((stage, idx) => (
            <div
              key={stage.name}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-emerald-50/40 p-4 transition-all hover:border-emerald-300"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-900 font-bold">0{idx + 1}. {stage.name}</span>
                <span className="text-[11px] text-emerald-700 font-semibold">{stage.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-700 font-medium">
                {stage.role}
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200">
                <div
                  className="h-1.5 rounded-full bg-emerald-600"
                  style={{ width: `${(idx + 1) * 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Central Viewport & Telemetry Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Viewport with Live Graph Preview */}
        <div className="lg:col-span-2">
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-700" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
                  Urban Topology Viewport
                </h3>
              </div>
              <Link
                to="/graph-explorer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
              >
                OPEN GRAPH EXPLORER
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Interactive Graph Canvas Preview */}
            <div className="my-4 flex-1">
              <UrbanGraphView
                graph={currentGraph}
                onSelectNode={() => {}}
                onSelectEdge={() => {}}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 text-xs text-slate-500 font-mono">
              <span>CANVAS: 47 NODES • 58 ROADS</span>
              <span>EXITS: 4 SAFE PORTALS</span>
              <span className="text-emerald-700 font-semibold">ALL ALGORITHMS LOADED</span>
            </div>
          </div>
        </div>

        {/* Live Incident Queue */}
        <div>
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-600" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
                  Live Incident Queue
                </h3>
              </div>
              <span className={`font-mono text-xs font-bold ${activeScenario ? 'text-red-600' : 'text-emerald-700'}`}>
                {activeScenario ? '1 ACTIVE' : '0 DETECTED'}
              </span>
            </div>

            <div className="my-4 space-y-4">
              {activeScenario ? (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-800">{activeScenario.type} WARNING</span>
                    <span className="rounded bg-red-100 text-red-800 px-2 py-0.5 text-[10px] font-bold">
                      {activeScenario.severity}
                    </span>
                  </div>
                  <h4 className="text-slate-900 font-bold">{activeScenario.name}</h4>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {activeScenario.description}
                  </p>
                  <div className="pt-2 border-t border-red-200 space-y-1 text-[11px] text-slate-700">
                    <div><b>Epicenter:</b> {activeScenario.epicenterName} ({activeScenario.epicenter})</div>
                    <div><b>Blocked Roads:</b> {activeScenario.blockedEdgeIds.join(', ')}</div>
                    <div><b>Recommended Exits:</b> {activeScenario.recommendedExits.join(', ')}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <Shield className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                  <div className="text-sm font-bold text-slate-900">Passive Monitoring Active</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Select Fire, Flood, or Earthquake at the top banner to simulate synthetic disaster events.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-center font-mono text-[11px] text-slate-500">
              {activeScenario ? 'Hazard telemetry streaming into network graph' : 'System nominal • Awaiting emergency trigger'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
