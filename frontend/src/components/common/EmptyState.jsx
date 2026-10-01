import React from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

export default function EmptyState({
  title = 'Module Uninitialized',
  description = 'No active telemetry or graph data loaded in this subsystem.',
  icon: Icon = Terminal,
  actionText,
  onAction,
  badge = 'STANDBY',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs overflow-hidden"
    >
      {/* Icon Shield */}
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xs">
        <Icon className="h-7 w-7 text-emerald-700" />
      </div>

      {/* Badge */}
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        {badge}
      </span>

      {/* Title & Description */}
      <h3 className="text-base font-bold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
        {description}
      </p>

      {/* Optional Action Button */}
      {actionText && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </motion.div>
  );
}
