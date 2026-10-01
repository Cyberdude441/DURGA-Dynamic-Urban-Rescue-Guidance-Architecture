import React, { useState, useEffect } from 'react';
import {
  Ambulance,
  ShieldCheck,
  Truck,
  ShieldAlert,
  Send,
  Building2,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import KnapsackResourceOptimizerView from '../components/graph/KnapsackResourceOptimizerView';
import { knapsackResourceOptimizer } from '../algorithms/resourceOptimizer';
import { URBAN_GRAPH } from '../data';
import { findNodesByType } from '../utils/graphUtils';
import { useLocationContext } from '../context/LocationContext.jsx';

export default function ResourceOptimizer() {
  const { nearbyGraph, address } = useLocationContext();
  const activeGraph = nearbyGraph || URBAN_GRAPH;
  const resourceCenters = findNodesByType(activeGraph, 'resource_center');
  const hospitals = findNodesByType(activeGraph, 'hospital');

  const [resourceType, setResourceType] = useState('ambulances');
  const [capacity, setCapacity] = useState(24);
  const [zoneScope, setZoneScope] = useState('zones_only');

  const computeResult = (rType = resourceType, cap = capacity, scope = zoneScope) => {
    const targetZones =
      scope === 'zones_only'
        ? activeGraph.nodes.filter((n) => n.type === 'evacuation_zone')
        : activeGraph.nodes.filter(
            (n) => n.type === 'evacuation_zone' || (n.type === 'building' && n.people > 0)
          );

    return knapsackResourceOptimizer({
      zones: targetZones,
      resourceType: rType,
      capacity: cap,
    });
  };

  const [result, setResult] = useState(() => computeResult('ambulances', 24, 'zones_only'));

  useEffect(() => {
    if (nearbyGraph) setResult(computeResult(resourceType, capacity, zoneScope));
  }, [nearbyGraph]);

  const handleRunOptimizer = (rType = resourceType, cap = capacity, scope = zoneScope) => {
    const res = computeResult(rType, cap, scope);
    setResult(res);
  };

  const fleetResources = [
    { title: 'Ambulance Units', count: nearbyGraph ? '--' : '28', status: nearbyGraph ? 'Live fleet feed unavailable' : 'Staged at RC01', icon: Ambulance, color: 'text-rose-600' },
    { title: 'Rescue Squads', count: nearbyGraph ? '--' : '18', status: nearbyGraph ? 'Live fleet feed unavailable' : 'Staged at RC02', icon: ShieldCheck, color: 'text-amber-600' },
    { title: 'Hazard Engines', count: nearbyGraph ? '--' : '12', status: nearbyGraph ? 'Live fleet feed unavailable' : 'Staged at RC02', icon: Truck, color: 'text-blue-600' },
    { title: 'Hospital Trauma Beds', count: nearbyGraph ? '--' : '2,200', status: nearbyGraph ? 'Mapped facility capacity unavailable' : 'H01 & H02', icon: ShieldAlert, color: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Resource Optimizer
            </h1>
            <StatusBadge status={nearbyGraph ? 'safe' : 'neutral'} text={nearbyGraph ? 'LIVE AFFECTED AREA' : 'SYNTHETIC AREA'} pulse={Boolean(nearbyGraph)} />
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-mono text-emerald-800 font-bold">
              0/1 DYNAMIC PROGRAMMING
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {nearbyGraph ? `Current area: ${address?.displayName || 'current GPS location'}. ` : ''}
            Emergency fleet staging, ambulance dispatch optimization, and 0/1 Knapsack DP solvers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunOptimizer()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-mono font-bold text-white shadow-xs cursor-pointer active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            RE-OPTIMIZE FLEET
          </button>
        </div>
      </div>

      {/* Fleet Resource Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fleetResources.map((res) => {
          const Icon = res.icon;
          return (
            <div
              key={res.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-500 font-bold">
                  {res.title}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 ${res.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-slate-900">
                  {res.count}
                </span>
                <span className="font-mono text-xs text-slate-500">available</span>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">LOCATION:</span>
                <span className="text-emerald-800 font-semibold">{res.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Depots Overview Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-700" />
          <span className="font-bold uppercase tracking-wider text-slate-900">
            Active Strategic Staging Depots:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-700">
          {resourceCenters.map((rc) => (
            <div key={rc.id} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="font-bold text-blue-900">{rc.id}:</span>
              <span className="text-[11px] text-blue-800">{rc.name}</span>
            </div>
          ))}
          {hospitals.map((h) => (
            <div key={h.id} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="font-bold text-rose-900">{h.id}:</span>
              <span className="text-[11px] text-rose-800">{h.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Knapsack DP Resource Optimizer Interactive Console */}
      <KnapsackResourceOptimizerView
        result={result}
        resourceType={resourceType}
        onResourceTypeChange={(newType) => {
          setResourceType(newType);
          handleRunOptimizer(newType, capacity, zoneScope);
        }}
        capacity={capacity}
        onCapacityChange={(newCap) => {
          setCapacity(newCap);
          handleRunOptimizer(resourceType, newCap, zoneScope);
        }}
        zoneScope={zoneScope}
        onZoneScopeChange={(newScope) => {
          setZoneScope(newScope);
          handleRunOptimizer(resourceType, capacity, newScope);
        }}
        onRunOptimizer={() => handleRunOptimizer()}
      />
    </div>
  );
}
