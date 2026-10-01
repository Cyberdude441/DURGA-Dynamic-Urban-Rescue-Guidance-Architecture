import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Clock,
  Wifi,
  MapPin,
} from 'lucide-react';
import DurgaLogo from '../common/DurgaLogo';
import { NAV_ITEMS, APP_CONFIG } from '../../utils/constants';
import { useLocationContext } from '../../context/LocationContext.jsx';

export default function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const { address, status, error, requestLocation } = useLocationContext();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentNav =
    NAV_ITEMS.find((item) => item.path === location.pathname) || {
      name: 'Command Center',
      description: 'Emergency Operations Subsystem',
    };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-8 shadow-xs">
      {/* Left side: Hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 shadow-2xs">
            <DurgaLogo size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-emerald-800 font-bold tracking-wider uppercase">
                {APP_CONFIG.name} //
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {currentNav.name}
              </h2>
            </div>
            <p className="hidden text-[11px] text-slate-500 sm:block">
              {currentNav.description}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Live System HUD */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => requestLocation().catch(() => {})}
          title={error || 'Refresh live location'}
          className={`hidden md:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
            status === 'active'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : status === 'requesting'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
          aria-label="Refresh live GPS location"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{status === 'active' ? 'LIVE LOCATION' : status === 'requesting' ? 'LOCATING...' : 'LOCATION OFF'}</span>
          {status === 'active' && <span className="hidden xl:inline max-w-[150px] truncate normal-case font-sans font-semibold">{address?.displayName || 'Current area'}</span>}
        </button>

        {/* Standby alert indicator & Telemetry normal badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-emerald-50/50 px-3 py-1.5 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="font-mono text-[10px] uppercase font-bold text-emerald-800">
              TELEMETRY: ACTIVE
            </span>
          </div>

          <div className="h-3 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="inline-flex rounded-full h-2 w-2 bg-slate-400" />
            </span>
            <span className="font-mono text-[10px] uppercase font-bold text-slate-600">
              MONITOR: NOMINAL
            </span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-700 shadow-xs">
          <Clock className="h-3.5 w-3.5 text-emerald-700" />
          <span className="font-semibold tracking-wider">
            {time.toLocaleTimeString([], { hour12: false })}
          </span>
          <span className="hidden text-[10px] text-slate-400 md:inline font-mono">
            UTC {time.getTimezoneOffset() <= 0 ? '+' : '-'}{Math.abs(Math.round(time.getTimezoneOffset() / 60))}
          </span>
        </div>

        {/* System Mode Pill */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px] text-emerald-900 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-semibold">
          <Wifi className="h-3.5 w-3.5 text-emerald-700" />
          <span>MESH CONNECTED</span>
        </div>
      </div>
    </header>
  );
}
