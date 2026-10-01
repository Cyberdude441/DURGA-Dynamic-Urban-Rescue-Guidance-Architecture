import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Building2,
  DoorOpen,
  HeartPulse,
  Radio,
  ShieldCheck,
  Waypoints,
  Users,
} from 'lucide-react';

const riskColorMap = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
  MODERATE: 'bg-amber-50 text-amber-800 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  NONE: 'bg-slate-100 text-slate-600 border-slate-200',
};

function UrbanNode({ data, selected }) {
  const {
    id,
    name,
    type,
    people = 0,
    capacity = 0,
    riskLevel = 'NONE',
    priority = 1,
  } = data;

  const riskClass = riskColorMap[riskLevel] || riskColorMap.NONE;

  // Render content based on node type
  const renderTypeContent = () => {
    switch (type) {
      case 'exit':
        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <DoorOpen className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="font-mono text-xs">{id}</span>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-mono font-bold text-emerald-900">
                SAFE EXIT
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-slate-900 truncate max-w-[170px]" title={name}>
              {name}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>Cap: {capacity}/min</span>
              <span>Pri: {priority}/5</span>
            </div>
          </div>
        );

      case 'hospital':
        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-red-200 pb-1.5">
              <div className="flex items-center gap-1.5 text-red-800 font-bold">
                <HeartPulse className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-mono text-xs">{id}</span>
              </div>
              <span className="rounded-full bg-red-100 border border-red-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-red-800">
                TRAUMA CTR
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-slate-900 truncate max-w-[170px]" title={name}>
              {name}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>Beds: {capacity}</span>
              <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${riskClass}`}>
                {riskLevel}
              </span>
            </div>
          </div>
        );

      case 'resource_center':
        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-blue-200 pb-1.5">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="font-mono text-xs">{id}</span>
              </div>
              <span className="rounded-full bg-blue-100 border border-blue-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-blue-800">
                DEPOT
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-slate-900 truncate max-w-[170px]" title={name}>
              {name}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>Fleets: {capacity}</span>
              <span className="text-emerald-700 font-bold">DISPATCH READY</span>
            </div>
          </div>
        );

      case 'evacuation_zone':
        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-amber-200 pb-1.5">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <Radio className="h-4 w-4 shrink-0 text-amber-700" />
                <span className="font-mono text-xs">{id}</span>
              </div>
              <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-900">
                EVAC ZONE
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-slate-900 truncate max-w-[170px]" title={name}>
              {name}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-slate-500" /> {people.toLocaleString()}
              </span>
              <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${riskClass}`}>
                {riskLevel}
              </span>
            </div>
          </div>
        );

      case 'junction':
        return (
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800">
              <Waypoints className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-emerald-950">{id}</span>
                <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{name}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-500">
                Cap: {capacity}/min • {people} in junction
              </div>
            </div>
          </div>
        );

      case 'building':
      default:
        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1">
              <div className="flex items-center gap-1 text-slate-800 font-bold">
                <Building2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span className="font-mono text-[11px]">{id}</span>
              </div>
              <span className={`rounded px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase border ${riskClass}`}>
                {riskLevel}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-900 truncate max-w-[160px]" title={name}>
              {name}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span className="flex items-center gap-1 text-slate-700">
                <Users className="h-3 w-3 text-emerald-700" /> {people.toLocaleString()}
              </span>
              <span>Cap: {capacity}</span>
            </div>
          </div>
        );
    }
  };

  const getContainerStyle = () => {
    const base = 'relative rounded-xl p-2.5 transition-all duration-200 shadow-xs border bg-white';
    const selectionRing = selected
      ? 'ring-2 ring-emerald-600 ring-offset-2 ring-offset-white shadow-md'
      : '';

    switch (type) {
      case 'exit':
        return `${base} min-w-[190px] bg-emerald-50/90 border-2 border-emerald-500 ${selectionRing}`;
      case 'hospital':
        return `${base} min-w-[190px] bg-red-50/90 border-2 border-red-300 ${selectionRing}`;
      case 'resource_center':
        return `${base} min-w-[190px] bg-blue-50/90 border-2 border-blue-300 ${selectionRing}`;
      case 'evacuation_zone':
        return `${base} min-w-[190px] bg-amber-50/90 border-2 border-amber-300 border-dashed ${selectionRing}`;
      case 'junction':
        return `${base} min-w-[160px] bg-white border border-emerald-300 ${selectionRing}`;
      case 'building':
      default:
        return `${base} min-w-[170px] bg-white border border-slate-200 hover:border-emerald-300 ${selectionRing}`;
    }
  };

  return (
    <div className={getContainerStyle()}>
      {/* 4 Handles for multi-directional connection routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!bg-emerald-600 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!bg-emerald-600 !border-white"
      />

      {renderTypeContent()}
    </div>
  );
}

export default memo(UrbanNode);
