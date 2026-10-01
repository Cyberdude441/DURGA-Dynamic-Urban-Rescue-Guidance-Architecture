import React, { useState } from 'react';
import {
  ArrowRight,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  SkipBack,
  Play,
  Pause,
} from 'lucide-react';

export default function GreedyEvacuationView({
  assignments = [],
  exitSummary = [],
  decisionSequence = [],
  metrics = {},
  exitCapacities = {},
  onCapacityChange,
  onApplyCapacityPreset,
  strategy = 'urgency_first',
  onStrategyChange,
  zoneScope = 'zones_only',
  onZoneScopeChange,
  allowSplitting = false,
  onToggleSplitting,
  onSelectAssignment,
  selectedAssignment = null,
  activeDecisionStep = 0,
  onSelectDecisionStep,
}) {
  const [showSliders, setShowSliders] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = React.useRef(null);

  // Playback timer for decision sequence
  React.useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onSelectDecisionStep((prev) => {
          if (prev >= decisionSequence.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, decisionSequence.length, onSelectDecisionStep]);

  const currentDecision = decisionSequence[activeDecisionStep] || decisionSequence[0] || null;

  // Color helper for risk levels (light theme)
  const getRiskBadgeColor = (risk) => {
    const r = String(risk).toUpperCase();
    if (r === 'CRITICAL') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r === 'LOW') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Color helper for exit utilization
  const getUtilizationColor = (pct) => {
    if (pct >= 95) return 'text-rose-600';
    if (pct >= 75) return 'text-amber-600';
    return 'text-emerald-700';
  };

  const getProgressBarColor = (pct) => {
    if (pct >= 95) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-emerald-600';
  };

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. CONFIGURATION & STRATEGY CONTROL BAR             */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-700" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
                Greedy Evacuation Assignment Strategy
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select priority heuristic and configure exit throughput limits to test capacity constraints.
            </p>
          </div>

          {/* Strategy Presets & Controls */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Strategy Heuristic Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <span className="text-[10px] text-slate-500 px-2 uppercase font-bold">HEURISTIC:</span>
              <button
                onClick={() => onStrategyChange('urgency_first')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  strategy === 'urgency_first'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sort by (Priority * 12 + Risk * 18 + People / 150) descending"
              >
                Urgency-First
              </button>
              <button
                onClick={() => onStrategyChange('proximity_first')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  strategy === 'proximity_first'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sort by minimum travel distance ascending"
              >
                Proximity-First
              </button>
              <button
                onClick={() => onStrategyChange('population_first')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  strategy === 'population_first'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sort by largest crowd density first"
              >
                Population-First
              </button>
            </div>

            {/* Scope Toggle */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <span className="text-[10px] text-slate-500 px-2 uppercase font-bold">TARGETS:</span>
              <button
                onClick={() => onZoneScopeChange('zones_only')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  zoneScope === 'zones_only'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                5 Evac Zones (EZ01-05)
              </button>
              <button
                onClick={() => onZoneScopeChange('all_sectors')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  zoneScope === 'all_sectors'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All 27 Populated Sectors
              </button>
            </div>
          </div>
        </div>

        {/* Exit Capacity Presets & Custom Sliders Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase text-slate-500 font-bold">CAPACITY PRESETS:</span>
            <button
              onClick={() => onApplyCapacityPreset('abundant')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-emerald-800 font-medium hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer"
            >
              Abundant Throughput (5,000 / exit)
            </button>
            <button
              onClick={() => onApplyCapacityPreset('constrained')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-amber-800 font-medium hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer"
            >
              Constrained (2,500 / exit)
            </button>
            <button
              onClick={() => onApplyCapacityPreset('bottleneck')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-rose-800 font-medium hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer"
            >
              Severe Bottleneck (1,250 / exit)
            </button>
            <button
              onClick={() => setShowSliders(!showSliders)}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                showSliders
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sliders className="h-3 w-3" />
              {showSliders ? 'Hide Sliders' : 'Custom Exit Sliders'}
            </button>
          </div>

          {/* Splitting Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={allowSplitting}
              onChange={(e) => onToggleSplitting(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <span className="text-[11px]">Allow crowd partitioning across exits</span>
          </label>
        </div>

        {/* Custom Exit Capacity Sliders Deck (Expandable) */}
        {showSliders && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            {['EX01', 'EX02', 'EX03', 'EX04'].map((exitId) => {
              const cap = exitCapacities[exitId] !== undefined ? exitCapacities[exitId] : 5000;
              return (
                <div key={exitId} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-900 font-bold">{exitId} Capacity:</span>
                    <span className="text-emerald-700 font-bold">{cap.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="8000"
                    step="250"
                    value={cap}
                    onChange={(e) => onCapacityChange(exitId, parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>500</span>
                    <span>8,000</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. EXIT CAPACITY UTILIZATION METERS                 */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {exitSummary.map((exit) => {
          const utilPct = exit.utilizationPercent;
          return (
            <div
              key={exit.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-900 font-bold">{exit.id}</span>
                <span className={`font-bold ${getUtilizationColor(utilPct)}`}>
                  {utilPct.toFixed(1)}% USED
                </span>
              </div>
              <div className="text-[11px] text-slate-600 truncate" title={exit.name}>
                {exit.name}
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(utilPct)}`}
                  style={{ width: `${Math.min(100, utilPct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between font-mono text-[11px] pt-1">
                <span className="text-slate-600">
                  Used: <strong className="text-slate-900">{exit.usedCapacity.toLocaleString()}</strong>
                </span>
                <span className="text-slate-600">
                  Remaining:{' '}
                  <strong
                    className={
                      exit.remainingCapacity === 0
                        ? 'text-rose-600'
                        : exit.remainingCapacity < 500
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }
                  >
                    {exit.remainingCapacity.toLocaleString()}
                  </strong>
                </span>
              </div>

              {/* Assigned Zones tags */}
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100 font-mono text-[10px]">
                <span className="text-slate-500">Assigned ({exit.assignedZonesCount}):</span>
                {exit.assignedZones.slice(0, 5).map((zid) => (
                  <span
                    key={zid}
                    className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800 border border-emerald-200"
                  >
                    {zid}
                  </span>
                ))}
                {exit.assignedZones.length > 5 && (
                  <span className="text-slate-500">+{exit.assignedZones.length - 5}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. GREEDY DECISION SEQUENCE INSPECTOR               */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
                Greedy Decision Sequence Audit Trail
              </span>
              <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-800 font-bold">
                Step {activeDecisionStep + 1} of {decisionSequence.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Step-by-step chronology of greedy choices based on zone urgency and exit capacity.
            </p>
          </div>

          {/* VCR Playback Controls for Decision Sequence */}
          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => onSelectDecisionStep(0)}
              disabled={activeDecisionStep === 0}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Reset to step 1"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => onSelectDecisionStep((prev) => Math.max(0, prev - 1))}
              disabled={activeDecisionStep === 0}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Previous decision"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> PAUSE
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> PLAY SEQUENCE
                </>
              )}
            </button>

            <button
              onClick={() =>
                onSelectDecisionStep((prev) => Math.min(decisionSequence.length - 1, prev + 1))
              }
              disabled={activeDecisionStep >= decisionSequence.length - 1}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Next decision"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step Scrubber Slider */}
        <div>
          <input
            type="range"
            min="0"
            max={Math.max(0, decisionSequence.length - 1)}
            value={activeDecisionStep}
            onChange={(e) => {
              setIsPlaying(false);
              onSelectDecisionStep(parseInt(e.target.value, 10));
            }}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Active Decision Card */}
        {currentDecision && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 font-mono text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-700 px-2 py-0.5 font-bold text-white">
                  STEP #{currentDecision.step}
                </span>
                <span className="text-slate-900 font-bold">
                  {currentDecision.zoneId} ({currentDecision.zoneName})
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${getRiskBadgeColor(currentDecision.riskLevel)}`}>
                  {currentDecision.riskLevel}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 border border-slate-200 font-bold">
                  Priority {currentDecision.priority}
                </span>
              </div>
              <div className="text-slate-700">
                Civilians: <strong>{currentDecision.people.toLocaleString()}</strong> | Urgency Score:{' '}
                <strong className="text-emerald-800">{currentDecision.urgencyScore}</strong>
              </div>
            </div>

            {/* Decision Rationale */}
            <div className="text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <strong className="text-emerald-800 uppercase">Greedy Decision:</strong>{' '}
              {currentDecision.rationale}
            </div>

            {/* Candidate Exits Evaluated */}
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1.5">
                CANDIDATE EXITS EVALUATED AT THIS STEP:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {currentDecision.consideredExits.map((cand) => {
                  const isChosen = cand.exitId === currentDecision.chosenExitId;
                  return (
                    <div
                      key={cand.exitId}
                      className={`p-2 rounded-lg border text-[11px] transition-all ${
                        isChosen
                          ? 'border-emerald-500 bg-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className={isChosen ? 'text-emerald-800' : 'text-slate-700'}>
                          {cand.exitId}
                        </span>
                        {isChosen && (
                          <span className="text-[9px] bg-emerald-700 text-white px-1 rounded font-bold">
                            CHOSEN
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600 text-[10px] mt-0.5">
                        Cost: {isFinite(cand.cost) ? `${Math.round(cand.cost)}s` : '∞'}
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Available: {cand.remainingCapacity.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. ASSIGNMENT TABLE (REQUIRED DISPLAY FIELDS)        */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50">
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
              Zone-To-Exit Evacuation Allocation Manifest
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {assignments.length} allocations generated | {metrics.totalAssigned?.toLocaleString()} of{' '}
              {metrics.totalPeople?.toLocaleString()} civilians routed ({metrics.evacuationRate}%)
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 font-bold text-[10px]">
              AVG IMPEDANCE: {metrics.averageDistance}s
            </span>
          </div>
        </div>

        {/* Manifest Table */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full border-collapse font-mono text-xs text-left">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Zone</th>
                <th className="px-3 py-2.5">People</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Risk Level</th>
                <th className="px-3 py-2.5">Assigned Exit</th>
                <th className="px-3 py-2.5">Distance</th>
                <th className="px-3 py-2.5 text-right">Remaining Exit Cap</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((item, idx) => {
                const isSelected = selectedAssignment?.zoneId === item.zoneId;
                return (
                  <tr
                    key={`${item.zoneId}_${idx}`}
                    onClick={() => onSelectAssignment && onSelectAssignment(item)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    {/* Zone */}
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900">{item.zoneId}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {item.zoneName}
                      </div>
                    </td>

                    {/* People */}
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900">
                        {item.assignedPeople.toLocaleString()}
                      </div>
                      {item.unassignedPeople > 0 && (
                        <div className="text-[10px] text-rose-600 font-semibold">
                          +{item.unassignedPeople.toLocaleString()} overflow
                        </div>
                      )}
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
                        className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getRiskBadgeColor(
                          item.riskLevel
                        )}`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>

                    {/* Assigned Exit */}
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{item.assignedExitId}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {item.assignedExitName}
                      </div>
                    </td>

                    {/* Distance / Impedance */}
                    <td className="px-3 py-2.5">
                      <div className="text-slate-900 font-bold">
                        {isFinite(item.distance) ? `${item.distance}s` : '∞'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.physicalDistance?.toLocaleString()}m
                      </div>
                    </td>

                    {/* Remaining Exit Capacity After Assignment */}
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                      {item.exitRemainingCapacityAfter.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center">
                      {item.status === 'OPTIMAL' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ALLOCATED
                        </span>
                      ) : item.status === 'PARTITIONED' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          PARTITIONED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          <AlertTriangle className="h-3 w-3 text-rose-500" />
                          LIMITED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
