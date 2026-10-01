import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Radio,
  DoorOpen,
  Ban,
  Ambulance,
  ShieldCheck,
  Timer,
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

// Map icon strings to Lucide components
const iconMap = {
  Users,
  Radio,
  DoorOpen,
  Ban,
  Ambulance,
  ShieldCheck,
  Timer,
  Activity,
  AlertTriangle,
  CheckCircle2,
};

export default function MetricCard({
  label,
  value = '--',
  unit,
  status = 'neutral',
  statusText,
  icon,
  changeText,
  delay = 0,
}) {
  const IconComponent = iconMap[icon] || HelpCircle;

  const iconColorMap = {
    danger: 'text-red-700 bg-red-50 border-red-200',
    emergency: 'text-red-700 bg-red-50 border-red-200',
    safe: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-800 bg-amber-50 border-amber-200',
    neutral: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };

  const currentIconTheme = iconColorMap[status] || iconColorMap.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200"
    >
      {/* Top row: Icon and Status Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${currentIconTheme}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <StatusBadge
          status={status}
          text={status === 'neutral' ? 'Standby' : status === 'safe' ? 'Normal' : status}
          pulse={status === 'danger' || status === 'emergency' || status === 'warning'}
          size="xs"
        />
      </div>

      {/* Metric value and unit */}
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
            {value}
          </span>
          {unit && (
            <span className="font-mono text-xs text-slate-500 lowercase tracking-wider">
              {unit}
            </span>
          )}
        </div>
        <h3 className="mt-1 text-sm font-semibold text-slate-700">
          {label}
        </h3>
      </div>

      {/* Divider */}
      <div className="my-3 h-px w-full bg-slate-100" />

      {/* Footer status */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="truncate pr-2" title={statusText}>
          {statusText || 'Awaiting algorithm telemetry'}
        </span>
        {changeText && (
          <span className="shrink-0 font-mono text-[11px] text-slate-500 font-medium">
            {changeText}
          </span>
        )}
      </div>
    </motion.div>
  );
}
