import React, { useState } from 'react';
import {
  X,
  Edit2,
  Save,
  RotateCcw,
  Ban,
  CheckCircle2,
  Flame,
  Gauge,
  Timer,
  Navigation,
} from 'lucide-react';
import { calculateEffectiveEdgeCost } from '../../utils/graphUtils';

export default function EdgeInfoPanel({
  edge,
  onClose,
  onToggleBlock,
  onUpdateEdge,
  onSelectNode,
}) {
  const [isEditing, setIsEditing] = useState(false);
  
  const edgeData = edge?.data || edge || {};
  const [formData, setFormData] = useState({
    distance: edgeData.distance || 0,
    travelTime: edgeData.travelTime || 0,
    congestion: edgeData.congestion || 0,
    danger: edgeData.danger || 0,
    capacity: edgeData.capacity || 0,
    blocked: Boolean(edgeData.blocked),
  });

  if (!edge) return null;

  const costDetails = calculateEffectiveEdgeCost(edgeData, { detailed: true });

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateEdge(edge.id, {
      ...edgeData,
      distance: Number(formData.distance),
      travelTime: Number(formData.travelTime),
      congestion: Number(formData.congestion),
      danger: Number(formData.danger),
      capacity: Number(formData.capacity),
      blocked: Boolean(formData.blocked),
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    setFormData({
      distance: edgeData.distance || 0,
      travelTime: edgeData.travelTime || 0,
      congestion: edgeData.congestion || 0,
      danger: edgeData.danger || 0,
      capacity: edgeData.capacity || 0,
      blocked: Boolean(edgeData.blocked),
    });
    setIsEditing(false);
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-slate-800">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-950">
                {edgeData.name && edgeData.name !== 'Unnamed OSM road' ? edgeData.name : 'Unnamed road'}
              </span>
              {edgeData.blocked ? (
                <span className="rounded bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Ban className="h-2.5 w-2.5 text-red-600" /> BLOCKED
                </span>
              ) : (
                <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> OPEN
                </span>
              )}
            </div>
            <details className="mt-1 text-xs font-mono text-slate-500"><summary className="cursor-pointer">Technical Details</summary><div className="mt-1 flex items-center gap-1"><button onClick={() => onSelectNode(edge.source)} className="text-emerald-700 hover:underline cursor-pointer">{edge.source}</button><span className="text-slate-400">↔</span><button onClick={() => onSelectNode(edge.target)} className="text-emerald-700 hover:underline cursor-pointer">{edge.target}</button></div><div>Road ID: {edge.id}</div></details>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={isEditing ? 'Cancel Edit' : 'Edit Road Properties'}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Block / Unblock Action Button */}
        <div className="mt-4">
          <button
            onClick={() => onToggleBlock(edge.id)}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
              edgeData.blocked
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            {edgeData.blocked ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                UNBLOCK ROAD CORRIDOR
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 text-red-600" />
                BLOCK ROAD CORRIDOR
              </>
            )}
          </button>
        </div>

        {/* Content / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSave} className="mt-4 space-y-3 font-mono text-xs">
            <div className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider">
              Edit Road Properties
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">DISTANCE (M)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">BASE TIME (S)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.travelTime}
                  onChange={(e) => setFormData({ ...formData, travelTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">
                  CONGESTION ({(formData.congestion * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.congestion}
                  onChange={(e) => setFormData({ ...formData, congestion: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">
                  DANGER ({(formData.danger * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.danger}
                  onChange={(e) => setFormData({ ...formData, danger: parseFloat(e.target.value) })}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">CAPACITY (PER MIN)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">BLOCKED STATUS</label>
                <select
                  value={formData.blocked ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, blocked: e.target.value === 'true' })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="false">OPEN (Active)</option>
                  <option value="true">BLOCKED (Severed)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                SAVE CHANGES
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-200 cursor-pointer"
                title="Discard edits"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-4 font-mono text-xs">
            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">DISTANCE</span>
                <div className="mt-1 text-base font-extrabold text-slate-900 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-emerald-700" />
                  {edgeData.distance} m
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">BASE TRAVEL TIME</span>
                <div className="mt-1 text-base font-extrabold text-slate-900 flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-emerald-700" />
                  {edgeData.travelTime} s
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">ROAD CONGESTION</span>
                <div className="mt-1 text-base font-extrabold flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-amber-700" />
                  <span className={edgeData.congestion > 0.3 ? 'text-amber-700' : 'text-slate-800'}>
                    {(edgeData.congestion * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">HAZARD DANGER</span>
                <div className="mt-1 text-base font-extrabold flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-red-600" />
                  <span className={edgeData.danger > 0.4 ? 'text-red-700 font-bold' : 'text-slate-800'}>
                    {(edgeData.danger * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">FLOW CAPACITY</span>
                <div className="mt-1 text-base font-extrabold text-slate-900">
                  {edgeData.capacity} <span className="text-xs text-slate-500 font-normal">/ min</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">EFFECTIVE COST</span>
                <div className="mt-1 text-base font-extrabold text-emerald-800">
                  {costDetails.isBlocked ? '∞' : `${costDetails.effectiveCost} s`}
                </div>
              </div>
            </div>

            {/* Effective Cost Formula Breakdown */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] space-y-1">
              <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                Cost Metric Telemetry
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Congestion Factor:</span>
                <span className="font-bold text-slate-900">x{costDetails.congestionMultiplier}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Hazard Multiplier:</span>
                <span className="font-bold text-slate-900">x{costDetails.dangerMultiplier}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-1 border-t border-emerald-200">
                <span className="font-semibold text-emerald-950">Combined Impedance:</span>
                <span className="font-bold text-emerald-900">
                  {costDetails.isBlocked ? 'Blocked (Infinity)' : `${costDetails.effectiveCost} sec`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-400 text-center">
        DURGA Graph Explorer • Edge Subsystem
      </div>
    </div>
  );
}
