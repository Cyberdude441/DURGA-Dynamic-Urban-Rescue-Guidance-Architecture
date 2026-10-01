import React, { useState } from 'react';
import {
  X,
  Edit2,
  Save,
  RotateCcw,
  Users,
  Building2,
  DoorOpen,
  HeartPulse,
  Radio,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { getReadableNodeName } from '../../utils/navigationUtils.js';

const typeIcons = {
  building: Building2,
  junction: Waypoints,
  exit: DoorOpen,
  hospital: HeartPulse,
  evacuation_zone: Radio,
  resource_center: ShieldCheck,
};

export default function NodeInfoPanel({
  node,
  connectedEdges = [],
  onClose,
  onUpdateNode,
  onSelectEdge,
}) {
  const [isEditing, setIsEditing] = useState(false);
  
  const nodeData = node?.data || node || {};
  const [formData, setFormData] = useState({
    name: nodeData.name || '',
    people: nodeData.people ?? 0,
    capacity: nodeData.capacity ?? 0,
    riskLevel: nodeData.riskLevel || 'NONE',
    priority: nodeData.priority ?? 1,
  });

  if (!node) return null;

  const IconComponent = typeIcons[nodeData.type] || Building2;

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateNode(node.id, {
      ...nodeData,
      name: formData.name,
      people: Number(formData.people),
      capacity: Number(formData.capacity),
      riskLevel: formData.riskLevel,
      priority: Number(formData.priority),
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    setFormData({
      name: nodeData.name || '',
      people: nodeData.people || 0,
      capacity: nodeData.capacity || 0,
      riskLevel: nodeData.riskLevel || 'NONE',
      priority: nodeData.priority || 1,
    });
    setIsEditing(false);
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-slate-800">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-emerald-950">
                  {getReadableNodeName(nodeData)}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono uppercase text-slate-600 font-semibold">
                  {nodeData.type}
                </span>
              </div>
              <details className="text-[11px] font-mono text-slate-500"><summary className="cursor-pointer">Technical Details</summary><div>ID: {node.id}</div><div>Coords: ({Math.round(node.position?.x || node.x || 0)}, {Math.round(node.position?.y || node.y || 0)})</div></details>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={isEditing ? 'Cancel Edit' : 'Edit Node Properties'}
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

        {/* Content / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSave} className="mt-4 space-y-3 font-mono text-xs">
            <div className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider">
              Edit Node Properties
            </div>

            <div>
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">NODE NAME</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">OCCUPANTS (PEOPLE)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.people}
                  onChange={(e) => setFormData({ ...formData, people: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">MAX CAPACITY</label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">HAZARD RISK</label>
                <select
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="NONE">NONE</option>
                  <option value="LOW">LOW</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-600 block mb-1 font-semibold">PRIORITY (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
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
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">OFFICIAL NAME</span>
              <h3 className="mt-0.5 text-sm font-bold text-slate-900">{nodeData.name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">PEOPLE / OCCUPANTS</span>
                <div className="mt-1 text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-700" />
                  {nodeData.people.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">STRUCTURAL CAPACITY</span>
                <div className="mt-1 text-base font-extrabold text-slate-900">
                  {nodeData.capacity.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">HAZARD RISK</span>
                <div className="mt-1">
                  <StatusBadge
                    status={
                      nodeData.riskLevel === 'CRITICAL'
                        ? 'danger'
                        : nodeData.riskLevel === 'HIGH'
                        ? 'warning'
                        : nodeData.riskLevel === 'MODERATE'
                        ? 'warning'
                        : 'safe'
                    }
                    text={nodeData.riskLevel}
                    size="xs"
                    pulse={nodeData.riskLevel === 'CRITICAL'}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">EVAC PRIORITY</span>
                <div className="mt-1 text-base font-extrabold text-emerald-800">
                  {nodeData.priority} <span className="text-xs text-slate-500 font-normal">/ 5</span>
                </div>
              </div>
            </div>

            {/* Connected Roads List */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 font-semibold mb-2">
                <span>CONNECTED CORRIDORS</span>
                <span className="font-bold text-emerald-800">{connectedEdges.length} ROADS</span>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {connectedEdges.map((e) => {
                  const edgeData = e.data || e;
                  const otherNodeId = e.source === node.id ? e.target : e.source;

                  return (
                    <div
                      key={e.id}
                      onClick={() => onSelectEdge(e)}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800 group-hover:text-emerald-950">
                          {e.id}
                        </span>
                        <span className="text-slate-600">↔ {otherNodeId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{edgeData.distance}m</span>
                        {edgeData.blocked ? (
                          <span className="rounded bg-red-50 border border-red-200 text-red-700 px-1 py-0.2 text-[8px] font-bold">
                            BLOCKED
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[10px]">OPEN</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-400 text-center">
        DURGA Graph Explorer • Node Subsystem
      </div>
    </div>
  );
}
