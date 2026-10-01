import React, { useState, useMemo } from 'react';
import {
  Ambulance,
  ShieldCheck,
  Truck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Table,
  Award,
  Zap,
} from 'lucide-react';

export default function KnapsackResourceOptimizerView({
  result,
  resourceType = 'ambulances',
  onResourceTypeChange,
  capacity = 24,
  onCapacityChange,
  zoneScope = 'zones_only',
  onZoneScopeChange,
  onRunOptimizer,
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const {
    selectedZones = [],
    maxBenefit = 0,
    resourceUsed = 0,
    remainingResource = 0,
    dpTable = [],
    backtrackPath = [],
    items = [],
    greedyResult = { selectedZones: [], totalBenefit: 0, resourceUsed: 0 },
    comparison = { benefitDiff: 0, benefitGainPercent: 0, isDpStrictlySuperior: false, dpExclusive: [], greedyExclusive: [] },
    executionTime = 0,
  } = result || {};

  // Build a set of backtracked cell keys: `${itemIndex}_${capacityAtStep}`
  const backtrackSet = useMemo(() => {
    const set = new Set();
    backtrackPath.forEach((step) => {
      set.add(`${step.itemIndex}_${step.capacityAtStep}`);
    });
    return set;
  }, [backtrackPath]);

  // Set of selected zone IDs for fast lookup
  const selectedZoneIds = useMemo(() => {
    return new Set(selectedZones.map((z) => z.id));
  }, [selectedZones]);

  // Resource metadata
  const resourceMeta = {
    ambulances: {
      name: 'Ambulance Units',
      icon: Ambulance,
      unit: 'ambulances',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50 border-rose-200',
      stagedAt: 'Staged at Depot RC01',
      defaultCap: 18,
    },
    rescueTeams: {
      name: 'Rescue Squads',
      icon: ShieldCheck,
      unit: 'squads',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      stagedAt: 'Staged at Depot RC02',
      defaultCap: 12,
    },
    emergencyVehicles: {
      name: 'Hazard & Utility Engines',
      icon: Truck,
      unit: 'vehicles',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      stagedAt: 'Staged at Depot RC02',
      defaultCap: 10,
    },
    compositeUnits: {
      name: 'Composite Tactical Points',
      icon: Zap,
      unit: 'points',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200',
      stagedAt: 'Joint Multi-Depot Fleet',
      defaultCap: 25,
    },
  };

  const activeRes = resourceMeta[resourceType] || resourceMeta.ambulances;
  const ActiveIcon = activeRes.icon;

  const getRiskBadgeColor = (risk) => {
    const r = String(risk).toUpperCase();
    if (r === 'CRITICAL') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r === 'LOW') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. RESOURCE CONTROLS & CAPACITY CONFIGURATION        */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-700" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
                0/1 Knapsack Dynamic Programming Resource Optimizer
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Allocate scarce municipal fleet resources to maximize total humanitarian benefit under strict budget caps.
            </p>
          </div>

          {/* Resource Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {Object.entries(resourceMeta).map(([typeKey, meta]) => {
              const Icon = meta.icon;
              const isSelected = resourceType === typeKey;
              return (
                <button
                  key={typeKey}
                  onClick={() => onResourceTypeChange && onResourceTypeChange(typeKey)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{meta.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Capacity Slider & Presets Deck */}
        <div className="pt-3 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="min-w-[140px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono flex items-center gap-1.5">
                <ActiveIcon className="h-3.5 w-3.5 text-emerald-700" />
                {activeRes.name} Budget:
              </span>
              <span className="font-mono text-lg font-extrabold text-slate-900">
                {capacity} <span className="text-xs text-emerald-700 font-normal">{activeRes.unit}</span>
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="45"
              value={capacity}
              onChange={(e) => onCapacityChange && onCapacityChange(parseInt(e.target.value, 10))}
              className="w-full max-w-[320px] accent-emerald-600 cursor-pointer"
            />

            <div className="flex items-center gap-1 font-mono text-xs">
              {[8, 15, 24, 32].map((presetVal) => (
                <button
                  key={presetVal}
                  onClick={() => onCapacityChange && onCapacityChange(presetVal)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] cursor-pointer transition-colors ${
                    capacity === presetVal
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {presetVal}
                </button>
              ))}
            </div>
          </div>

          {/* Scope Toggle & Run Button */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => onZoneScopeChange && onZoneScopeChange('zones_only')}
                className={`rounded-md px-2.5 py-1 text-xs cursor-pointer transition-all ${
                  zoneScope === 'zones_only'
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                5 Evac Zones
              </button>
              <button
                onClick={() => onZoneScopeChange && onZoneScopeChange('all_sectors')}
                className={`rounded-md px-2.5 py-1 text-xs cursor-pointer transition-all ${
                  zoneScope === 'all_sectors'
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All 27 Sectors
              </button>
            </div>

            <button
              onClick={() => onRunOptimizer && onRunOptimizer()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-800 cursor-pointer active:scale-95"
            >
              <Cpu className="h-3.5 w-3.5" />
              RUN KNAPSACK DP
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. TELEMETRY & DP VS GREEDY COMPARISON KPIS          */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Maximum Benefit (DP Optimal) */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-emerald-800 uppercase tracking-wider font-bold">
              MAX BENEFIT (DP OPTIMAL)
            </span>
            <Award className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-1 font-mono text-3xl font-extrabold text-slate-900">
            {maxBenefit.toLocaleString()} <span className="text-xs text-emerald-700 font-normal">pts</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Global mathematical optimum
          </span>
        </div>

        {/* Greedy Benefit */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
            GREEDY BENEFIT (RATIO PACK)
          </span>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-800">
            {greedyResult.totalBenefit.toLocaleString()}{' '}
            <span className="text-xs text-slate-500 font-normal">pts</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Local density heuristic
          </span>
        </div>

        {/* Optimality Gap */}
        <div
          className={`rounded-xl border p-4 shadow-xs ${
            comparison.benefitDiff > 0
              ? 'border-amber-200 bg-amber-50/60'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-amber-800 uppercase tracking-wider font-bold">
              DP OPTIMALITY GAP
            </span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div
            className={`mt-1 font-mono text-2xl font-bold ${
              comparison.benefitDiff > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}
          >
            +{comparison.benefitDiff} pts
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {comparison.benefitDiff > 0
              ? `DP +${comparison.benefitGainPercent}% superior to Greedy`
              : 'Greedy matched DP on this instance'}
          </span>
        </div>

        {/* Resource Usage */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
            RESOURCE USAGE
          </span>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-800">
            {resourceUsed} / {capacity}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {remainingResource} {activeRes.unit} remaining
          </span>
        </div>

        {/* Execution Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
            DP LATENCY & TABLE SIZE
          </span>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {executionTime} ms
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {items.length + 1} × {capacity + 1} subproblem states
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. SELECTED ZONES & GREEDY COMPARISON MANIFEST       */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DP Selected Zones List (2 Columns) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
                DP Optimal Allocation Manifest ({selectedZones.length} Sectors Selected)
              </h3>
            </div>
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-800 font-bold">
              {resourceUsed} of {capacity} {activeRes.unit} allocated
            </span>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full border-collapse font-mono text-xs text-left">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Sector</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Risk Level</th>
                  <th className="px-3 py-2.5">Civilians</th>
                  <th className="px-3 py-2.5">{activeRes.name} Cost (w)</th>
                  <th className="px-3 py-2.5">Benefit (v)</th>
                  <th className="px-3 py-2.5 text-right">Ratio (v/w)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isSelected = selectedZoneIds.has(item.id);
                  const isGreedySelected = greedyResult.selectedZones.some((z) => z.id === item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 border-l-4 border-emerald-600 font-medium'
                          : 'opacity-70'
                      }`}
                    >
                      {/* Sector */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {isSelected ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900">{item.id}</span>
                          {isGreedySelected && (
                            <span className="rounded bg-slate-100 border border-slate-200 px-1 py-0.2 text-[9px] text-slate-600 font-normal">
                              Greedy
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {item.name}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-slate-700">
                          P{item.priority}
                        </span>
                      </td>

                      {/* Risk Level */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${getRiskBadgeColor(
                            item.riskLevel
                          )}`}
                        >
                          {item.riskLevel}
                        </span>
                      </td>

                      {/* Civilians */}
                      <td className="px-3 py-2.5 text-slate-700">
                        {item.people.toLocaleString()}
                      </td>

                      {/* Weight / Cost */}
                      <td className="px-3 py-2.5 font-bold text-emerald-800">
                        {item.weight} {activeRes.unit}
                      </td>

                      {/* Benefit / Value */}
                      <td className="px-3 py-2.5 font-bold text-emerald-700">
                        +{item.value} pts
                      </td>

                      {/* Ratio */}
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {item.ratio}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side-by-Side DP vs Greedy Decision Differential */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="font-bold uppercase tracking-wider text-slate-900">
              DP vs Greedy Differential
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-700" />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                ZONES INCLUDED BY DP (GLOBAL OPTIMUM):
              </span>
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedZones.map((z) => (
                  <span
                    key={z.id}
                    className="rounded bg-white border border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-900 font-bold shadow-2xs"
                  >
                    {z.id} ({z.weight}w, +{z.value}v)
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                ZONES INCLUDED BY GREEDY HEURISTIC:
              </span>
              <div className="flex flex-wrap gap-1 pt-1">
                {greedyResult.selectedZones.map((z) => (
                  <span
                    key={z.id}
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700 font-bold"
                  >
                    {z.id} ({z.weight}w, +{z.value}v)
                  </span>
                ))}
              </div>
            </div>

            {/* Discrepancy Analysis */}
            {comparison.benefitDiff > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-800 block flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> WHY GREEDY FAILED:
                </span>
                <p className="text-amber-950 leading-relaxed">
                  Greedy packed high-density items locally, which exhausted capacity and blocked a combination of higher-yielding sectors.
                </p>
                {comparison.dpExclusive.length > 0 && (
                  <div>
                    <span className="text-amber-900 font-bold">DP Selected Exclusively: </span>
                    <span className="text-slate-900 font-semibold">
                      {comparison.dpExclusive.map((z) => z.id).join(', ')}
                    </span>
                  </div>
                )}
                {comparison.greedyExclusive.length > 0 && (
                  <div>
                    <span className="text-slate-600 font-bold">Greedy Grabbed Sub-optimally: </span>
                    <span className="text-slate-700">
                      {comparison.greedyExclusive.map((z) => z.id).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
                Greedy heuristic achieved 100% of the DP global optimum on this specific budget threshold!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. INTERACTIVE 2D DYNAMIC PROGRAMMING TABLE          */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-emerald-700" />
            <h3 className="font-bold uppercase tracking-wider text-slate-900">
              Dynamic Programming State Space Matrix dp[i][w]
            </h3>
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800 font-bold">
              {dpTable.length} Rows × {dpTable[0]?.length || 0} Columns
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px]">
              Gold cells = Optimal Backtracking Traversal Path
            </span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto overflow-y-auto max-h-[460px] select-none">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 border-r border-slate-200 px-3 py-2 text-left min-w-[120px] text-slate-700 font-bold">
                  Sector (w_i, v_i) \ Cap
                </th>
                {Array.from({ length: capacity + 1 }, (_, w) => (
                  <th
                    key={w}
                    className="border-r border-slate-200 px-2 py-1 text-center min-w-[42px] text-slate-600 text-[10px]"
                  >
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 0: Base Case 0 items */}
              <tr className="hover:bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 border-r border-b border-slate-200 px-3 py-1.5 text-left text-slate-600 font-mono text-[10px]">
                  dp[0] (Base 0)
                </th>
                {Array.from({ length: capacity + 1 }, (_, w) => (
                  <td
                    key={w}
                    className="border-r border-b border-slate-100 px-1 py-1 text-center text-slate-400 text-[10px]"
                  >
                    0
                  </td>
                ))}
              </tr>

              {/* Rows 1..N: Each item */}
              {items.map((item, itemIdx) => {
                const i = itemIdx + 1;
                const isSelected = selectedZoneIds.has(item.id);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Sticky Row Header */}
                    <th
                      className={`sticky left-0 z-10 border-r border-b border-slate-200 px-3 py-1.5 text-left text-[11px] ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-600'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{item.id}</span>
                        <span className="text-[9px] text-slate-500 font-normal">
                          w:{item.weight}, v:{item.value}
                        </span>
                      </div>
                    </th>

                    {/* Cells for capacities w = 0..W */}
                    {Array.from({ length: capacity + 1 }, (_, w) => {
                      const cellVal = dpTable[i]?.[w] || 0;
                      const isBacktrackCell = backtrackSet.has(`${i}_${w}`);

                      return (
                        <td
                          key={w}
                          onMouseEnter={() =>
                            setHoveredCell({ item, i, w, cellVal, isBacktrackCell })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`border-r border-b border-slate-100 px-1 py-1 text-center transition-all cursor-pointer ${
                            isBacktrackCell
                              ? 'bg-amber-100 text-amber-950 border-2 border-amber-500 font-bold shadow-xs'
                              : cellVal > 0
                              ? 'text-emerald-800 font-medium hover:bg-emerald-50'
                              : 'text-slate-400'
                          }`}
                        >
                          {cellVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Hover Inspection Status Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between font-mono text-xs">
          {hoveredCell ? (
            <div className="flex items-center gap-3 text-slate-700">
              <span className="text-emerald-800 font-bold uppercase text-[10px]">
                INSPECTED SUBPROBLEM:
              </span>
              <span>
                dp[{hoveredCell.item.id}][cap={hoveredCell.w}] ={' '}
                <strong className="text-slate-900">{hoveredCell.cellVal} pts</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span>
                Item Cost: <strong className="text-emerald-800">{hoveredCell.item.weight} {activeRes.unit}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span>
                Item Value: <strong className="text-emerald-700">+{hoveredCell.item.value} pts</strong>
              </span>
              {hoveredCell.isBacktrackCell && (
                <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-amber-900 text-[10px] font-bold">
                  ★ On Optimal Backtracking Path
                </span>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-[11px]">
              Hover any cell in the DP matrix to inspect subproblem state recurrence dp[i][w] = max(dp[i-1][w], dp[i-1][w - w_i] + v_i).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
