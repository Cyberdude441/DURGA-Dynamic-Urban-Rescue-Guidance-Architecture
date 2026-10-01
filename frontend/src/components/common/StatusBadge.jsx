import React from 'react';

/**
 * StatusBadge Component
 * Clean light green, amber, red, and neutral status indicators
 */
export default function StatusBadge({ status = 'neutral', text, pulse = false, size = 'sm' }) {
  const configs = {
    danger: {
      dot: 'bg-red-600',
      pill: 'bg-red-50 text-red-700 border-red-200',
      pulseDot: 'bg-red-400',
    },
    emergency: {
      dot: 'bg-red-600',
      pill: 'bg-red-50 text-red-700 border-red-200',
      pulseDot: 'bg-red-400',
    },
    safe: {
      dot: 'bg-emerald-600',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      pulseDot: 'bg-emerald-400',
    },
    warning: {
      dot: 'bg-amber-600',
      pill: 'bg-amber-50 text-amber-800 border-amber-200',
      pulseDot: 'bg-amber-400',
    },
    cyan: {
      dot: 'bg-emerald-600',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      pulseDot: 'bg-emerald-400',
    },
    neutral: {
      dot: 'bg-slate-500',
      pill: 'bg-slate-100 text-slate-700 border-slate-200',
      pulseDot: 'bg-slate-400',
    },
  };

  const current = configs[status] || configs.neutral;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider font-semibold border ${current.pill} ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.pulseDot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
      </span>
      <span>{text}</span>
    </span>
  );
}
