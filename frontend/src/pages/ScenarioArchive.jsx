import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Flame,
  Droplets,
  Activity,
  Biohazard,
  RefreshCw,
  Trash2,
  Eye,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  DoorOpen,
  Ambulance,
  Users,
  Truck,
  Cpu,
  ShieldAlert,
  ChevronRight,
  SlidersHorizontal,
  MapPin,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import {
  getScenarios,
  getScenarioById,
  rerunScenario,
  deleteScenario,
  checkDatabaseHealth,
} from '../services/scenarioService.js';
import { useLocationContext } from '../context/LocationContext.jsx';

export default function ScenarioArchive() {
  const { address, nearbyGraph } = useLocationContext();
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dbStatus, setDbStatus] = useState({ connected: false, checked: false });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Detailed Modal View
  const [viewScenario, setViewScenario] = useState(null);

  // Re-run state
  const [rerunningId, setRerunningId] = useState(null);

  // Delete Confirmation Modal
  const [deletingScenario, setDeletingScenario] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Scenarios from PostgreSQL API
  const fetchScenarios = useCallback(async () => {
    try {
      const health = await checkDatabaseHealth();
      const isConnected = health.database === 'connected';
      setDbStatus({ connected: isConnected, checked: true });

      if (!isConnected) {
        setErrorMessage('PostgreSQL server is not reachable at http://localhost:5000. Start backend server with: npm start');
        setIsLoading(false);
        return;
      }

      const data = await getScenarios({
        type: selectedType,
        search: searchTerm,
        sortBy: 'createdAt',
        order: sortOrder,
      });
      setScenarios(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load scenarios from database.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, searchTerm, sortOrder]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const health = await checkDatabaseHealth();
        const isConnected = health.database === 'connected';
        if (ignore) return;
        setDbStatus({ connected: isConnected, checked: true });

        if (!isConnected) {
          setErrorMessage('PostgreSQL server is not reachable at http://localhost:5000. Start backend server with: npm start');
          setIsLoading(false);
          return;
        }

        const data = await getScenarios({
          type: selectedType,
          search: searchTerm,
          sortBy: 'createdAt',
          order: sortOrder,
        });
        if (ignore) return;
        setScenarios(data);
        setErrorMessage(null);
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err.message || 'Failed to load scenarios from database.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [selectedType, searchTerm, sortOrder]);

  // View Scenario Details
  const handleOpenDetail = async (scenarioSummary) => {
    try {
      const fullDetail = await getScenarioById(scenarioSummary.id);
      setViewScenario(fullDetail);
    } catch (err) {
      setErrorMessage(`Failed to load details: ${err.message}`);
    }
  };

  // Re-run Scenario Pipeline
  const handleRerun = async (id, e) => {
    if (e) e.stopPropagation();
    setRerunningId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await rerunScenario(id);
      setSuccessMessage(result.message || 'Scenario re-simulated with fresh algorithmic outputs!');
      
      // Update local state and current detail if open
      if (viewScenario && viewScenario.id === id) {
        setViewScenario(result.scenario);
      }
      await fetchScenarios();
    } catch (err) {
      setErrorMessage(`Re-run failed: ${err.message}`);
    } finally {
      setRerunningId(null);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingScenario) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteScenario(deletingScenario.id);
      setSuccessMessage(`Scenario '${deletingScenario.name}' and all associated results deleted.`);
      setDeletingScenario(null);
      if (viewScenario && viewScenario.id === deletingScenario.id) {
        setViewScenario(null);
      }
      await fetchScenarios();
    } catch (err) {
      setErrorMessage(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Icon Helper
  const getHazardIcon = (type) => {
    switch (type) {
      case 'Fire':
        return <Flame className="h-4 w-4 text-rose-500" />;
      case 'Flood':
        return <Droplets className="h-4 w-4 text-blue-500" />;
      case 'Earthquake':
        return <Activity className="h-4 w-4 text-amber-500" />;
      case 'Chemical Leak':
        return <Biohazard className="h-4 w-4 text-emerald-600" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-emerald-700" />;
    }
  };

  // Risk Badge Helper (Light Theme)
  const getRiskBadgeClass = (risk) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950" role="status">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div>
          <div className="font-mono font-bold uppercase tracking-wider">Location context</div>
          <p className="mt-1 leading-relaxed">
            New simulations can be associated with {nearbyGraph ? address?.displayName || 'the current GPS area' : 'a manually selected or synthetic location'}.
            Precise coordinates are kept in memory and are not persisted by DURGA.
          </p>
        </div>
      </div>

      {/* Header & Global Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Database className="h-6 w-6 text-emerald-700" />
              Scenario Archive
            </h1>
            <StatusBadge
              status={dbStatus.connected ? 'safe' : 'danger'}
              text={dbStatus.connected ? 'POSTGRESQL CONNECTED' : 'DATABASE OFFLINE'}
              pulse={dbStatus.connected}
            />
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-800">
              PRISMA RELATIONAL STORAGE
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Persistent PostgreSQL simulation records, full relational algorithm telemetry, and autonomous replay executions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchScenarios}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-mono text-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss success message" className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-mono text-rose-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} aria-label="Dismiss error message" className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search, Filter by Type & Sort Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scenario catalog by title, location, or description..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-mono text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-500 text-[11px] font-bold">HAZARD:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 font-mono focus:border-emerald-500 focus:outline-none text-xs"
            >
              <option value="ALL">All Hazard Types</option>
              <option value="Fire">Fire</option>
              <option value="Flood">Flood</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Chemical Leak">Chemical Leak</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] font-bold">SORT:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 font-mono focus:border-emerald-500 focus:outline-none text-xs"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* SCENARIO ARCHIVE TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900">
              Archived Disaster Scenarios ({scenarios.length})
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-800 font-bold">
            POSTGRESQL TABLE: SCENARIOS
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-700" />
            <span>Querying PostgreSQL database...</span>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-2">
            <div className="text-slate-800 font-bold">No Scenarios Found</div>
            <p className="text-slate-500 max-w-sm mx-auto">
              No matching disaster simulations exist in the PostgreSQL archive. Adjust your search or run a simulation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-700">
              <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4">Emergency</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">People</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenarios.map((sc) => {
                  const isRerunning = rerunningId === sc.id;
                  const evacPlan = sc.evacuationPlans?.[0];
                  return (
                    <tr
                      key={sc.id}
                      onClick={() => handleOpenDetail(sc)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {/* Scenario Name & Description */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {sc.name}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500 line-clamp-1 mt-0.5">
                          {sc.description || 'No descriptive summary'}
                        </div>
                      </td>

                      {/* Emergency Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                          {getHazardIcon(sc.emergencyType)}
                          {sc.emergencyType}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 font-bold text-emerald-800 whitespace-nowrap">
                        {sc.emergencyLocation}
                      </td>

                      {/* People */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {sc.peopleAffected?.toLocaleString() || 0}
                      </td>

                      {/* Risk */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getRiskBadgeClass(
                            sc.riskLevel
                          )}`}
                        >
                          {sc.riskLevel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {evacPlan ? 'SIMULATED' : 'ARCHIVED'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(sc.createdAt).toLocaleDateString()}{' '}
                        <span className="text-[9px] text-slate-400">
                          {new Date(sc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Actions: VIEW, RE-RUN, DELETE */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(sc)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-mono font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-all cursor-pointer"
                            title="View complete scenario record and algorithmic results"
                          >
                            <Eye className="h-3 w-3" />
                            VIEW
                          </button>

                          <button
                            onClick={(e) => handleRerun(sc.id, e)}
                            disabled={isRerunning}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-800 hover:bg-amber-100 transition-all disabled:opacity-50 cursor-pointer"
                            title="Re-run simulation using existing DURGA algorithm engine"
                          >
                            <RefreshCw className={`h-3 w-3 ${isRerunning ? 'animate-spin' : ''}`} />
                            {isRerunning ? 'RUNNING' : 'RE-RUN'}
                          </button>

                          <button
                            onClick={() => setDeletingScenario(sc)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-mono font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                            title="Delete scenario and related database records"
                          >
                            <Trash2 className="h-3 w-3" />
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: DETAILED SCENARIO RECORD & ALGORITHM MANIFEST */}
      {/* ============================================================== */}
      {viewScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto" role="presentation">
          <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5" role="dialog" aria-modal="true" aria-labelledby="scenario-detail-title">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ID: {viewScenario.id}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold border ${getRiskBadgeClass(
                      viewScenario.riskLevel
                    )}`}
                  >
                    {viewScenario.riskLevel}
                  </span>
                </div>
                <h2 id="scenario-detail-title" className="text-xl font-bold font-mono text-slate-900 mt-1.5 flex items-center gap-2">
                  {getHazardIcon(viewScenario.emergencyType)}
                  {viewScenario.name}
                </h2>
                <p className="text-xs text-slate-600 mt-1">{viewScenario.description}</p>
              </div>

              <button
                onClick={() => setViewScenario(null)}
                aria-label="Close scenario details"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold">INCIDENT TYPE</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  {getHazardIcon(viewScenario.emergencyType)}
                  {viewScenario.emergencyType}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold">EPICENTER LOCATION</span>
                <span className="text-sm font-bold text-emerald-800 mt-0.5 block">{viewScenario.emergencyLocation}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold">AFFECTED PEOPLE</span>
                <span className="text-sm font-bold text-rose-600 mt-0.5 block">
                  {viewScenario.peopleAffected?.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold">RECORDED TIMESTAMP</span>
                <span className="text-[11px] font-bold text-slate-700 mt-0.5 block">
                  {new Date(viewScenario.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* ALGORITHM RESULTS SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-mono text-xs uppercase font-bold text-slate-900">
                    Algorithm Execution Telemetry (PostgreSQL Table: algorithm_results)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {viewScenario.algorithmResults?.length || 0} Algorithms Recorded
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {viewScenario.algorithmResults?.map((algo) => (
                  <div
                    key={algo.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 text-xs">{algo.algorithmName}</strong>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        {algo.timeComplexity}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span>Execution Time:</span>
                        <strong className="text-emerald-800 font-bold">{algo.executionTime} ms</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Nodes Visited:</span>
                        <strong className="text-slate-900">{algo.nodesVisited}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Edges Processed:</span>
                        <strong className="text-slate-900">{algo.edgesProcessed}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Result Cost:</span>
                        <strong className="text-emerald-700 font-bold">{algo.resultCost}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Space Complexity:</span>
                        <strong className="text-slate-500">{algo.spaceComplexity}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EVACUATION PLAN & RESOURCE ALLOCATION DUAL CARDS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Evacuation Plan */}
              {viewScenario.evacuationPlans?.[0] && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <DoorOpen className="h-4 w-4 text-emerald-700" />
                      Evacuation Plan (evacuation_plans)
                    </span>
                    <span className="text-emerald-800">
                      {viewScenario.evacuationPlans[0].primaryExit}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-700 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Exit:</span>
                      <strong className="text-slate-900">{viewScenario.evacuationPlans[0].primaryExit}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Secondary Exit:</span>
                      <strong className="text-slate-700">{viewScenario.evacuationPlans[0].secondaryExit || 'None'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Route Distance:</span>
                      <strong className="text-slate-900">{viewScenario.evacuationPlans[0].totalDistance} m</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated Clearance Time:</span>
                      <strong className="text-emerald-800 font-bold">{viewScenario.evacuationPlans[0].estimatedTime} s</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Civilians Evacuated:</span>
                      <strong className="text-emerald-800 font-bold">
                        {viewScenario.evacuationPlans[0].peopleEvacuated?.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Route Checkpoints */}
                  {Array.isArray(viewScenario.evacuationPlans[0].routeData) && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 font-bold">
                        Egress Path Checkpoints:
                      </span>
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        {viewScenario.evacuationPlans[0].routeData.map((node, i) => (
                          <React.Fragment key={node}>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-emerald-800 font-bold">
                              {node}
                            </span>
                            {i < viewScenario.evacuationPlans[0].routeData.length - 1 && (
                              <ChevronRight className="h-3 w-3 text-slate-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resource Allocation */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Ambulance className="h-4 w-4 text-emerald-700" />
                    Resource Allocations (resource_allocations)
                  </span>
                  <span className="text-emerald-800 font-semibold">0/1 KNAPSACK DP</span>
                </div>

                <div className="space-y-2.5">
                  {viewScenario.resourceAllocations?.map((res) => (
                    <div
                      key={res.id}
                      className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        {res.resourceType === 'Ambulances' ? (
                          <Ambulance className="h-3.5 w-3.5 text-rose-500" />
                        ) : res.resourceType === 'Rescue Teams' ? (
                          <Users className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Truck className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <strong className="text-slate-900">{res.resourceType}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-800 font-bold">
                          {res.totalUsed} / {res.totalAvailable} used
                        </span>
                        {res.benefitScore && (
                          <span className="block text-[10px] text-slate-500">
                            Benefit: {res.benefitScore} pts
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={(e) => handleRerun(viewScenario.id, e)}
                disabled={rerunningId === viewScenario.id}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-mono font-bold text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-4 w-4 ${rerunningId === viewScenario.id ? 'animate-spin' : ''}`} />
                {rerunningId === viewScenario.id ? 'RE-RUNNING ENGINE...' : 'RE-RUN SIMULATION'}
              </button>

              <button
                onClick={() => setViewScenario(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ============================================================== */}
      {deletingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Scenario?</h3>
                <span className="text-[10px] text-slate-500">PostgreSQL Relational Cascade</span>
              </div>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed font-sans">
              Delete this scenario and all associated simulation results?
            </p>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div>Target: <strong className="text-slate-900">{deletingScenario.name}</strong></div>
              <div>Cascade Deletes: <strong>Emergency, 6 AlgorithmResults, EvacuationPlan, ResourceAllocations</strong></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingScenario(null)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                CANCEL
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
