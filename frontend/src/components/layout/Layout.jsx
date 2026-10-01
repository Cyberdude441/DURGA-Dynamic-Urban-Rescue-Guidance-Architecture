import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import DurgaLogo from '../common/DurgaLogo';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* Responsive Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-72 relative z-10">
        <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <DurgaLogo size={18} />
              <span className="font-mono text-slate-600">
                DURGA // Dynamic Urban Rescue & Guidance Architecture
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-800 font-semibold">
              Analyze • Optimize • Guide • Rescue
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
