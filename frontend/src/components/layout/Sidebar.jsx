import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Flame,
  Network,
  Cpu,
  Route,
  ShieldAlert,
  BarChart3,
  Archive,
  BookOpen,
  Activity,
  X,
} from 'lucide-react';
import DurgaLogo from '../common/DurgaLogo';
import { APP_CONFIG, NAV_ITEMS } from '../../utils/constants';

const iconMap = {
  LayoutDashboard,
  Flame,
  Network,
  Cpu,
  Route,
  ShieldAlert,
  BarChart3,
  Archive,
  BookOpen,
};

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white p-4 text-slate-700 shadow-xs">
      {/* Brand Header */}
      <div>
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 shadow-xs">
              <DurgaLogo size={28} />
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-xl font-black tracking-widest text-emerald-950">
                  {APP_CONFIG.name}
                </h1>
                <span className="rounded bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-mono text-emerald-800 font-bold">
                  OPS
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold leading-tight line-clamp-1">
                {APP_CONFIG.fullName}
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tagline Card */}
        <div className="my-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-900 font-semibold">
            <span>PIPELINE</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              READY
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold tracking-wide text-emerald-950">
            {APP_CONFIG.tagline}
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="mt-4 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
            Command Modules
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || Activity;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive: linkActive }) =>
                  `group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    linkActive
                      ? 'bg-emerald-100/80 text-emerald-950 border border-emerald-300 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-emerald-700'
                        : 'text-slate-400 group-hover:text-emerald-700'
                    }`}
                  />
                  <span className="truncate tracking-wide">{item.name}</span>
                </div>

                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="flex items-center"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
                  </motion.div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="mt-6 pt-3 border-t border-slate-100">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-slate-500 font-medium">SYSTEM HEALTH</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              ONLINE
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>BUILD {APP_CONFIG.version}</span>
            <span className="flex items-center gap-1 text-slate-600 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              EOC ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
