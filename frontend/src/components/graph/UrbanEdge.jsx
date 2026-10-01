import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import { Ban } from 'lucide-react';

function UrbanEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data = {},
  selected,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const {
    distance = 0,
    travelTime = 0,
    congestion = 0,
    danger = 0,
    blocked = false,
  } = data;

  const isHazardous = danger > 0.4;
  const isCongested = congestion > 0.3;

  let strokeColor = '#94a3b8'; // default slate-400
  let strokeWidth = 2;

  if (blocked) {
    strokeColor = '#ef4444'; // red-500
    strokeWidth = 3;
  } else if (isHazardous) {
    strokeColor = '#f87171'; // red-400
    strokeWidth = 2.5;
  } else if (isCongested) {
    strokeColor = '#f59e0b'; // amber-500
    strokeWidth = 2.5;
  }

  if (selected) {
    strokeColor = '#059669'; // emerald-600
    strokeWidth = 3.5;
  }

  const customStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth,
    strokeDasharray: blocked ? '6, 5' : undefined,
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={customStyle} />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {blocked ? (
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold border transition-all cursor-pointer shadow-xs ${
                selected
                  ? 'bg-red-100 text-red-800 border-red-500 ring-2 ring-emerald-600'
                  : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              }`}
              title={`Road ${id} is BLOCKED`}
            >
              <Ban className="h-2.5 w-2.5 text-red-600" />
              <span>BLOCKED</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-mono text-[9px] border transition-all cursor-pointer shadow-xs ${
                selected
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-600 font-bold'
                  : isHazardous
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : isCongested
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
              }`}
              title={`Road ${id}: ${distance}m, ${travelTime}s, ${Math.round(congestion * 100)}% cong, ${Math.round(danger * 100)}% danger`}
            >
              <span className="font-bold text-slate-500">{id}</span>
              <span className="text-slate-900 font-medium">{distance}m</span>
              {congestion > 0 && (
                <span className={`text-[8px] font-semibold ${congestion > 0.3 ? 'text-amber-700' : 'text-slate-500'}`}>
                  {Math.round(congestion * 100)}%c
                </span>
              )}
              {danger > 0 && (
                <span className="text-[8px] text-red-600 font-bold">
                  {Math.round(danger * 100)}%d
                </span>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(UrbanEdge);
