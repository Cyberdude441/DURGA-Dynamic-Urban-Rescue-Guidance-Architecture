import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  Layers,
  Activity,
  Code2,
  CheckCircle2,
  Printer,
  BookOpen,
  HelpCircle,
  FileText,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  Ambulance,
  Truck,
  Copy,
  Check,
  Flame,
  Droplets,
  RotateCcw,
  Scale,
  Award,
  ExternalLink,
  BookmarkCheck,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import DurgaLogo from '../components/common/DurgaLogo';
import { APP_CONFIG } from '../utils/constants';
import { ALGORITHM_DOCS } from '../data/algorithmPseudocode.js';
import { VIVA_QUESTIONS } from '../data/vivaQuestions.js';
import { runEmergencySimulation } from '../simulation/emergencySimulator.js';
import { URBAN_GRAPH } from '../data/urbanGraph.js';
import { useLocationContext } from '../context/LocationContext.jsx';

// Predefined disaster templates for the Tactical Directive Generator
const REPORT_SCENARIOS = [
  {
    id: 'fire',
    type: 'Fire',
    name: 'Downtown Commercial Firestorm',
    icon: Flame,
    location: 'B01',
    people: 1200,
    risk: 'CRITICAL',
    blockedRoads: ['E10', 'E12', 'E14', 'E26'],
    blockedBuildings: ['B01'],
    ambulances: 14,
    rescueTeams: 8,
    emergencyVehicles: 6,
    code: 'DIR-2026-FIRE-0929',
  },
  {
    id: 'flood',
    type: 'Flood',
    name: 'Riverfront Basin Flash Inundation',
    icon: Droplets,
    location: 'EZ02',
    people: 1420,
    risk: 'HIGH',
    blockedRoads: ['E41', 'E43', 'E45'],
    blockedBuildings: ['EZ02'],
    ambulances: 12,
    rescueTeams: 10,
    emergencyVehicles: 8,
    code: 'DIR-2026-FLOD-0930',
  },
  {
    id: 'earthquake',
    type: 'Earthquake',
    name: 'Metro Seismic Structural Rupture',
    icon: Activity,
    location: 'J05',
    people: 2400,
    risk: 'CRITICAL',
    blockedRoads: ['E01', 'E03', 'E07', 'E15', 'E22', 'E31'],
    blockedBuildings: ['B03', 'B07'],
    ambulances: 20,
    rescueTeams: 14,
    emergencyVehicles: 12,
    code: 'DIR-2026-QUAK-1001',
  },
  {
    id: 'chemical',
    type: 'Chemical Leak',
    name: 'Industrial East Perimeter Toxic Plume',
    icon: AlertTriangle,
    location: 'B09',
    people: 850,
    risk: 'EXTREME',
    blockedRoads: ['E34', 'E36', 'E38'],
    blockedBuildings: ['B09'],
    ambulances: 16,
    rescueTeams: 12,
    emergencyVehicles: 10,
    code: 'DIR-2026-HAZM-1002',
  },
];

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('algorithms'); // 'algorithms' | 'complexity' | 'viva' | 'report' | 'architecture'
  const [selectedAlgoId, setSelectedAlgoId] = useState('dijkstra');
  const [copiedCode, setCopiedCode] = useState(false);
  const { nearbyGraph, address, status } = useLocationContext();

  // Viva Mode State
  const [vivaCategory, setVivaCategory] = useState('All');
  const [vivaDifficulty, setVivaDifficulty] = useState('All');
  const [vivaSearch, setVivaSearch] = useState('');
  const [revealedQuestions, setRevealedQuestions] = useState({});
  const [masteredQuestions, setMasteredQuestions] = useState({});
  const [examMode, setExamMode] = useState(false);

  // Report Generator State
  const [selectedReportScenario, setSelectedReportScenario] = useState(REPORT_SCENARIOS[0]);
  const [isCompilingReport, setIsCompilingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Copy code helper
  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Compile real live simulation for the report
  const handleGenerateReport = async (scenario = selectedReportScenario) => {
    setIsCompilingReport(true);
    try {
      const result = await runEmergencySimulation(URBAN_GRAPH, {
        disasterType: scenario.type,
        emergencyLocation: scenario.location,
        affectedPeople: scenario.people,
        riskLevel: scenario.risk,
        blockedRoads: scenario.blockedRoads,
        blockedBuildings: scenario.blockedBuildings,
        ambulances: scenario.ambulances,
        rescueTeams: scenario.rescueTeams,
        emergencyVehicles: scenario.emergencyVehicles,
      });
      setGeneratedReport({ scenario, result, generatedAt: new Date() });
    } catch (err) {
      console.error('Failed to compile simulation report:', err);
    } finally {
      setIsCompilingReport(false);
    }
  };

  // Auto-generate report on first open of report tab if null
  const handleSelectReportTab = () => {
    setActiveTab('report');
    if (!generatedReport) {
      handleGenerateReport(REPORT_SCENARIOS[0]);
    }
  };

  // Filtered Viva Questions
  const vivaCategories = ['All', 'Graph Search', 'Dynamic Programming', 'Greedy Strategy', 'Minimum Spanning Tree', 'Data Structures', 'System Modeling', 'Complexity Analysis'];
  const filteredViva = useMemo(() => {
    return VIVA_QUESTIONS.filter((q) => {
      const matchCat = vivaCategory === 'All' || q.category === vivaCategory;
      const matchDiff = vivaDifficulty === 'All' || q.difficulty === vivaDifficulty;
      const matchSearch =
        vivaSearch === '' ||
        q.question.toLowerCase().includes(vivaSearch.toLowerCase()) ||
        q.answer.toLowerCase().includes(vivaSearch.toLowerCase()) ||
        q.algorithm.toLowerCase().includes(vivaSearch.toLowerCase());
      return matchCat && matchDiff && matchSearch;
    });
  }, [vivaCategory, vivaDifficulty, vivaSearch]);

  const activeAlgo = ALGORITHM_DOCS.find((a) => a.id === selectedAlgoId) || ALGORITHM_DOCS[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950" role="status">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div>
          <div className="font-mono font-bold uppercase tracking-wider">Simulation provenance</div>
          <p className="mt-1 leading-relaxed">
            {nearbyGraph && status === 'active'
              ? `Live Location Data is available for ${address?.displayName || 'the current area'}. Road geometry comes from OpenStreetMap; traffic, danger, and population remain unavailable unless a verified provider is configured.`
              : 'Synthetic Data is active until browser location permission is granted and nearby OpenStreetMap data is loaded.'}
          </p>
        </div>
      </div>

      {/* Top Header - Screen Only */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-emerald-700" />
              Algorithmic Documentation & DAA Defense Hub
            </h1>
            <StatusBadge status="safe" text="CURRICULUM v1.2" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Formal pseudocode, mathematical invariants, theoretical complexity matrices, oral viva defense bank, and printable tactical directives.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => {
              if (activeTab !== 'report') handleSelectReportTab();
              setTimeout(() => window.print(), 300);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer font-semibold shadow-xs"
            title="Print or export as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar - Screen Only */}
      <div className="no-print flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {[
          { id: 'algorithms', label: 'Algorithms & Pseudocode', icon: Code2 },
          { id: 'complexity', label: 'Complexity Matrix', icon: Scale },
          { id: 'viva', label: 'Viva Mode (DAA Exam)', icon: HelpCircle, badge: `${VIVA_QUESTIONS.length} Qs` },
          { id: 'report', label: 'Final Simulation Report', icon: FileText, badge: 'Printable' },
          { id: 'architecture', label: 'System Architecture', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => (tab.id === 'report' ? handleSelectReportTab() : setActiveTab(tab.id))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALGORITHMS & FORMAL PSEUDOCODE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'algorithms' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Sub-selector for algorithms */}
          <div className="flex flex-wrap items-center gap-2">
            {ALGORITHM_DOCS.map((algo) => (
              <button
                key={algo.id}
                onClick={() => setSelectedAlgoId(algo.id)}
                className={`px-3.5 py-2 rounded-lg font-mono text-xs transition-all cursor-pointer border ${
                  selectedAlgoId === algo.id
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {algo.name.split(' ')[0]} {algo.name.includes('MST') ? 'MST' : ''}
              </button>
            ))}
          </div>

          {/* Algorithm Detail Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[11px] text-emerald-800 font-bold uppercase">
                    {activeAlgo.category}
                  </span>
                  <StatusBadge status="safe" text={activeAlgo.optimality} size="xs" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1.5">{activeAlgo.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{activeAlgo.role}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={
                    activeAlgo.id === 'knapsack-dp'
                      ? '/resource-optimizer'
                      : activeAlgo.id === 'greedy-evacuation'
                      ? '/evacuation-planner'
                      : '/algorithm-lab'
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 font-mono text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Launch in Lab</span>
                </Link>
              </div>
            </div>

            {/* Complexity Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Best Time</span>
                <span className="text-emerald-700 font-bold text-sm">{activeAlgo.timeComplexity.best}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Average Time</span>
                <span className="text-emerald-800 font-bold text-sm">{activeAlgo.timeComplexity.average}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Worst Time</span>
                <span className="text-amber-700 font-bold text-sm">{activeAlgo.timeComplexity.worst}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Space Complexity</span>
                <span className="text-emerald-700 font-bold text-sm">{activeAlgo.spaceComplexity}</span>
              </div>
            </div>

            {/* Invariant & Mathematical Proof Summary */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-mono text-xs font-bold">
                <Award className="h-4 w-4 text-emerald-700" />
                <span>MATHEMATICAL INVARIANT & PROOF SUMMARY</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {activeAlgo.proofSummary}
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-600 flex items-center gap-2">
                <span className="text-emerald-800 font-bold">Auxiliary Data Structures:</span>
                <span>{activeAlgo.auxiliaryStorage}</span>
              </div>
            </div>

            {/* Pseudocode Container */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-emerald-700" />
                  Formal Algorithmic Pseudocode
                </span>
                <button
                  onClick={() => handleCopyCode(activeAlgo.pseudocode)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Pseudocode'}</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 overflow-x-auto leading-relaxed shadow-inner">
                <pre>{activeAlgo.pseudocode}</pre>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPLEXITY MATRIX                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'complexity' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-700" />
                Comprehensive Big-O Algorithmic Comparison Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Comparative analysis of all core DAA curriculum algorithms implemented from scratch in DURGA.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs text-slate-700">
                <thead className="bg-slate-100 text-[11px] text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Algorithm</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-emerald-800">Best Time</th>
                    <th className="py-3 px-3 text-emerald-800">Average Time</th>
                    <th className="py-3 px-3 text-amber-800">Worst Time</th>
                    <th className="py-3 px-3 text-emerald-800">Space</th>
                    <th className="py-3 px-3">Auxiliary Structures</th>
                    <th className="py-3 px-3">Optimality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ALGORITHM_DOCS.map((algo) => (
                    <tr key={algo.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{algo.name}</td>
                      <td className="py-3 px-3 text-slate-600">{algo.category}</td>
                      <td className="py-3 px-3 text-emerald-700 font-bold">{algo.timeComplexity.best}</td>
                      <td className="py-3 px-3 text-emerald-800 font-bold">{algo.timeComplexity.average}</td>
                      <td className="py-3 px-3 text-amber-700 font-bold">{algo.timeComplexity.worst}</td>
                      <td className="py-3 px-3 text-emerald-700 font-bold">{algo.spaceComplexity}</td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">{algo.auxiliaryStorage}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800 font-bold">
                          {algo.optimality.split('(')[0]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Deep-Dive Theory Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block">1. Pseudo-Polynomial Time (0/1 Knapsack DP)</span>
                <p className="text-slate-700 leading-relaxed">
                  0/1 Knapsack runs in <code className="text-emerald-800 font-mono">O(N · W)</code> time. Because the budget <code className="text-emerald-800 font-mono">W</code> is encoded with <code className="text-emerald-800 font-mono">log₂(W)</code> bits, the running time is exponential with respect to input length. In urban municipal disaster dispatch, <code className="text-emerald-800 font-mono">W</code> represents physical fleet units (typically 10 to 50 vehicles), where pseudo-polynomial DP runs in sub-millisecond execution times.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block">2. Sparse vs. Dense Spanning Trees (Kruskal vs. Prim)</span>
                <p className="text-slate-700 leading-relaxed">
                  Planar urban road networks have small vertex degrees (average degree 3 to 4, so <code className="text-emerald-800 font-mono">E ≈ 1.5 · V</code>). Kruskal’s <code className="text-emerald-800 font-mono">O(E log E)</code> is nearly linear on sparse grids, outperforming Prim’s <code className="text-emerald-800 font-mono">O(V²)</code> matrix approach. Prim with a binary min-heap runs in <code className="text-emerald-800 font-mono">O((V + E) log V)</code>, matching Kruskal closely on urban topologies.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block">3. Single-Source vs All-Pairs Space Complexity</span>
                <p className="text-slate-700 leading-relaxed">
                  Dijkstra uses <code className="text-emerald-800 font-mono">O(V + E)</code> auxiliary space, keeping memory minuscule for point-to-point queries. In contrast, Floyd-Warshall maintains <code className="text-emerald-800 font-mono">O(V²)</code> memory cells. For 47 nodes in DURGA, the <code className="text-emerald-800 font-mono">47 × 47</code> matrix takes 2,209 elements (easily cached in L1 CPU cache), whereas for 100,000 vertices, all-pairs DP requires 10 billion cells (40 GB RAM).
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block">4. Near-Linear DSU with Inverse Ackermann Function</span>
                <p className="text-slate-700 leading-relaxed">
                  Kruskal’s algorithm achieves near-linear edge union operations via Disjoint Set Union with Path Compression and Union-by-Rank. Any sequence of <code className="text-emerald-800 font-mono">m</code> operations on <code className="text-emerald-800 font-mono">n</code> elements requires <code className="text-emerald-800 font-mono">O(m · α(n))</code>, where <code className="text-emerald-800 font-mono">α(n) &le; 4</code> for all conceivable input sizes.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VIVA MODE (ORAL EXAM PREPARATION)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'viva' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-emerald-700" />
                  Academic DAA Viva & Oral Defense Examination Prep
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Master the algorithmic invariants, edge-case behavior, and complexity proofs for academic review.
                </p>
              </div>

              {/* Mode Toggle & Mastered Counter */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
                  <BookmarkCheck className="h-4 w-4 text-emerald-600" />
                  <span>Mastered:</span>
                  <span className="text-emerald-800 font-bold">
                    {Object.values(masteredQuestions).filter(Boolean).length} / {VIVA_QUESTIONS.length}
                  </span>
                </div>

                <button
                  onClick={() => setExamMode(!examMode)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer border ${
                    examMode
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {examMode ? <EyeOff className="h-3.5 w-3.5 text-rose-600" /> : <Eye className="h-3.5 w-3.5 text-emerald-700" />}
                  <span>{examMode ? 'Exam Mode (Hidden)' : 'Study Mode (Visible)'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search concepts, algorithms, proofs..."
                  value={vivaSearch}
                  onChange={(e) => setVivaSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={vivaCategory}
                  onChange={(e) => setVivaCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  {vivaCategories.map((c) => (
                    <option key={c} value={c}>
                      Category: {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={vivaDifficulty}
                  onChange={(e) => setVivaDifficulty(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="All">Difficulty: All Levels</option>
                  <option value="Fundamental">Fundamental</option>
                  <option value="Core">Core</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Comparative">Comparative</option>
                  <option value="Applied">Applied</option>
                </select>
              </div>
            </div>

            {/* Questions Deck */}
            <div className="space-y-4">
              {filteredViva.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 font-mono text-xs">
                  No viva questions match your search or filter.
                </div>
              ) : (
                filteredViva.map((q, idx) => {
                  const isRevealed = !examMode || revealedQuestions[q.id];
                  const isMastered = !!masteredQuestions[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`rounded-lg border transition-all p-5 space-y-3 ${
                        isMastered
                          ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white shadow-xs'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-800">
                            Q{idx + 1}.
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700 font-semibold">
                            {q.category}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${
                              q.difficulty === 'Fundamental'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : q.difficulty === 'Advanced'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            [{q.algorithm}]
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setMasteredQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                            }
                            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
                              isMastered
                                ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                            title="Mark question as mastered"
                          >
                            <BookmarkCheck className="h-3.5 w-3.5 text-emerald-700" />
                            <span>{isMastered ? 'Mastered' : 'Mark Mastered'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {q.question}
                      </p>

                      {/* Answer Block */}
                      {isRevealed ? (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed font-sans space-y-2"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
                            <span className="text-emerald-800 font-bold">Model Academic Defense Answer:</span>
                            {examMode && (
                              <button
                                onClick={() =>
                                  setRevealedQuestions((prev) => ({ ...prev, [q.id]: false }))
                                }
                                className="text-slate-500 hover:text-slate-900 cursor-pointer"
                              >
                                Hide
                              </button>
                            )}
                          </div>
                          <p>{q.answer}</p>
                        </motion.div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                          <button
                            onClick={() =>
                              setRevealedQuestions((prev) => ({ ...prev, [q.id]: true }))
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-1.5 font-mono text-xs text-white transition-colors cursor-pointer shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Reveal Model Answer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FINAL SIMULATION & TACTICAL DIRECTIVE REPORT (PRINT/PDF READY)      */}
      {/* ========================================================================= */}
      {activeTab === 'report' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Controls Bar - Screen Only */}
          <div className="no-print rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-700" />
                <span className="font-mono text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Tactical Directive & Simulation Report Compiler
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 font-mono text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-500 mr-2 font-bold">Select Disaster Incident:</span>
              {REPORT_SCENARIOS.map((sc) => {
                const Icon = sc.icon;
                const isSel = selectedReportScenario.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setSelectedReportScenario(sc);
                      handleGenerateReport(sc);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer border ${
                      isSel
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{sc.name}</span>
                  </button>
                );
              })}

              <button
                onClick={() => handleGenerateReport(selectedReportScenario)}
                disabled={isCompilingReport}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isCompilingReport ? 'animate-spin text-emerald-700' : ''}`} />
                <span>{isCompilingReport ? 'Executing 12 Stages...' : 'Re-compile Live Results'}</span>
              </button>
            </div>
          </div>

          {/* Printable Tactical Directive Report */}
          {generatedReport && (
            <div className="print-page rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-8 text-slate-800">
              {/* Document Header */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <DurgaLogo size={24} />
                      <span className="font-mono text-xs uppercase tracking-widest font-bold text-emerald-800">
                        MUNICIPAL DISASTER RESPONSE COMMAND // DURGA ARCHITECTURE
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                      EXECUTIVE INCIDENT TACTICAL DIRECTIVE
                    </h1>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      CLASSIFICATION: <span className="text-rose-600 font-bold">TOP SECRET // EMERGENCY DISPATCH</span> • AUTH CODE: {generatedReport.scenario.code}
                    </p>
                  </div>

                  <div className="text-right font-mono text-xs space-y-1">
                    <div className="text-slate-600">
                      INCIDENT DATE: <span className="text-slate-900 font-bold">{new Date(generatedReport.generatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-slate-600">
                      SYSTEM TIME: <span className="text-emerald-800 font-bold">{new Date(generatedReport.generatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-600">
                      SIMULATION ID: <span className="text-slate-800 font-bold">{generatedReport.result.simulationId}</span>
                    </div>
                  </div>
                </div>

                {/* Directive Summary Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Hazard Type</span>
                    <span className="text-rose-700 font-bold text-sm">{(generatedReport.scenario?.type || 'UNKNOWN').toUpperCase()}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Epicenter Focus</span>
                    <span className="text-slate-900 font-bold text-sm">{generatedReport.scenario?.location || 'B01'}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Casualties At Risk</span>
                    <span className="text-amber-700 font-bold text-sm">{Number(generatedReport.scenario?.people || 0).toLocaleString()} civilians</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Compute Duration</span>
                    <span className="text-emerald-700 font-bold text-sm">{generatedReport.result?.totalExecutionTime ?? 0} ms</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Algorithmic Routing & Evacuation Corridors */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="font-mono text-emerald-800 font-bold text-sm">SECTION 1 //</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Optimal Egress Routing (Dijkstra's Single-Source Shortest Path)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                    <span className="font-bold text-emerald-900 block">Primary Epicenter-to-Exit Escape Route</span>
                    <div className="flex justify-between text-slate-600">
                      <span>Designated Gate:</span>
                      <span className="text-emerald-800 font-bold">
                        {generatedReport.result.dijkstraResults?.epicenterToExit?.targetExitId || 'EX01'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Effective Traversing Cost:</span>
                      <span className="text-slate-900 font-bold">
                        {Number.isFinite(generatedReport.result.dijkstraResults?.epicenterToExit?.totalCost)
                          ? `${generatedReport.result.dijkstraResults.epicenterToExit.totalCost.toFixed(1)} units`
                          : 'Unreachable'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Corridor Distance:</span>
                      <span className="text-slate-900 font-bold">
                        {generatedReport.result.dijkstraResults?.epicenterToExit?.distance != null
                          ? `${Number(generatedReport.result.dijkstraResults.epicenterToExit.distance).toFixed(0)} meters`
                          : (generatedReport.result.dijkstraResults?.epicenterToExit?.totalDistance != null
                              ? `${Number(generatedReport.result.dijkstraResults.epicenterToExit.totalDistance).toFixed(0)} meters`
                              : '0 meters')}
                      </span>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-700 border-t border-slate-100 break-words">
                      <span className="text-emerald-800 font-bold block mb-1">Wayfinding Path:</span>
                      {generatedReport.result.dijkstraResults?.epicenterToExit?.path?.length > 0
                        ? generatedReport.result.dijkstraResults.epicenterToExit.path.join(' → ')
                        : 'No path found'}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                    <span className="font-bold text-emerald-900 block">Emergency Medical Triage Route</span>
                    <div className="flex justify-between text-slate-600">
                      <span>Target Trauma Hospital:</span>
                      <span className="text-emerald-800 font-bold">
                        {generatedReport.result.dijkstraResults?.epicenterToMedical?.targetHospitalId || 'H01'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Triage Impedance Cost:</span>
                      <span className="text-slate-900 font-bold">
                        {Number.isFinite(generatedReport.result.dijkstraResults?.epicenterToMedical?.totalCost)
                          ? `${generatedReport.result.dijkstraResults.epicenterToMedical.totalCost.toFixed(1)} units`
                          : 'Unreachable'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Trauma Route Distance:</span>
                      <span className="text-slate-900 font-bold">
                        {generatedReport.result.dijkstraResults?.epicenterToMedical?.distance != null
                          ? `${Number(generatedReport.result.dijkstraResults.epicenterToMedical.distance).toFixed(0)} meters`
                          : (generatedReport.result.dijkstraResults?.epicenterToMedical?.totalDistance != null
                              ? `${Number(generatedReport.result.dijkstraResults.epicenterToMedical.totalDistance).toFixed(0)} meters`
                              : '0 meters')}
                      </span>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-700 border-t border-slate-100 break-words">
                      <span className="text-emerald-800 font-bold block mb-1">Trauma Dispatch Path:</span>
                      {generatedReport.result.dijkstraResults?.epicenterToMedical?.path?.length > 0
                        ? generatedReport.result.dijkstraResults.epicenterToMedical.path.join(' → ')
                        : 'No medical route found'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Safe Haven Capacity & Greedy Allocation */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="font-mono text-emerald-800 font-bold text-sm">SECTION 2 //</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Gate Saturation & Evacuation Dispatch (Greedy Triage Strategy)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs text-slate-700 bg-white rounded-lg border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Exit Gate</th>
                        <th className="py-2 px-3">Max Throughput</th>
                        <th className="py-2 px-3">Evacuees Assigned</th>
                        <th className="py-2 px-3">Remaining Cap</th>
                        <th className="py-2 px-3">Gate Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(Array.isArray(generatedReport.result?.greedyResult?.exitSummary)
                        ? generatedReport.result.greedyResult.exitSummary
                        : Object.entries(generatedReport.result?.greedyResult?.exitSummary || {}).map(([key, val]) => ({
                            id: val?.id || key,
                            initialCapacity: val?.initialCapacity ?? val?.totalCapacity ?? val?.capacity ?? 0,
                            usedCapacity: val?.usedCapacity ?? val?.assigned ?? val?.used ?? 0,
                            remainingCapacity: val?.remainingCapacity ?? val?.remaining ?? 0,
                            utilizationPercent: val?.utilizationPercent,
                          }))
                      ).map((info, idx) => {
                        const exitId = info?.id || info?.name || `EX0${idx + 1}`;
                        const initCap = Number(info?.initialCapacity ?? info?.totalCapacity ?? 0);
                        const usedCap = Number(info?.usedCapacity ?? info?.assigned ?? info?.assignedPeopleTotal ?? 0);
                        const remCap = Number(info?.remainingCapacity ?? Math.max(0, initCap - usedCap));
                        const sat = Number(info?.utilizationPercent ?? (initCap > 0 ? (usedCap / initCap) * 100 : 0));
                        return (
                          <tr key={exitId} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-emerald-800">{exitId}</td>
                            <td className="py-2 px-3">{initCap.toLocaleString()} / hr</td>
                            <td className="py-2 px-3 text-slate-900 font-bold">{usedCap.toLocaleString()}</td>
                            <td className="py-2 px-3 text-slate-600">{remCap.toLocaleString()}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                  sat > 80
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {sat > 80 ? 'HIGH SATURATION' : 'OPTIMAL FLOW'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Fleet Optimization (0/1 Knapsack DP) */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="font-mono text-emerald-800 font-bold text-sm">SECTION 3 //</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Emergency Fleet Dispatch & Life-Preservation Staging (0/1 Knapsack DP)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1 shadow-2xs">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Ambulance className="h-3.5 w-3.5 text-rose-500" />
                      Ambulances Deployed
                    </span>
                    <div className="text-slate-900 font-bold text-base">
                      {generatedReport.result.knapsackResults?.ambulances?.resourceUsed ?? 0} / {generatedReport.scenario?.ambulances ?? 0} units
                    </div>
                    <span className="text-emerald-700 text-[11px] block font-semibold">
                      Saved Lives Score: +{generatedReport.result.knapsackResults?.ambulances?.maxBenefit ?? 0}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1 shadow-2xs">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      Rescue Teams Staged
                    </span>
                    <div className="text-slate-900 font-bold text-base">
                      {generatedReport.result.knapsackResults?.rescueTeams?.resourceUsed ?? 0} / {generatedReport.scenario?.rescueTeams ?? 0} squads
                    </div>
                    <span className="text-emerald-700 text-[11px] block font-semibold">
                      Saved Lives Score: +{generatedReport.result.knapsackResults?.rescueTeams?.maxBenefit ?? 0}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1 shadow-2xs">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Truck className="h-3.5 w-3.5 text-blue-500" />
                      Emergency Utility Vehicles
                    </span>
                    <div className="text-slate-900 font-bold text-base">
                      {generatedReport.result.knapsackResults?.emergencyVehicles?.resourceUsed ?? 0} / {generatedReport.scenario?.emergencyVehicles ?? 0} vehicles
                    </div>
                    <span className="text-emerald-700 text-[11px] block font-semibold">
                      Saved Lives Score: +{generatedReport.result.knapsackResults?.emergencyVehicles?.maxBenefit ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Infrastructure Grid Resilience (Kruskal & Prim MST) */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="font-mono text-emerald-800 font-bold text-sm">SECTION 4 //</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Network Spine & Communication Grid Resilience (Kruskal & Prim MST)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                    <span className="text-emerald-900 font-bold block">Kruskal's MST (Sorting + Disjoint Set Union)</span>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Tree Cost:</span>
                      <span className="text-emerald-800 font-bold">{Number(generatedReport.result.kruskalResult?.totalCost ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Corridors Preserved:</span>
                      <span className="text-slate-900 font-bold">{generatedReport.result.kruskalResult?.selectedCount ?? 0} edges</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Severed Segments:</span>
                      <span className="text-rose-600 font-bold">{generatedReport.result.kruskalResult?.rejectedCount ?? 0} edges</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                    <span className="text-emerald-900 font-bold block">Prim's MST (Priority-Based Cut Expansion)</span>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Tree Cost:</span>
                      <span className="text-emerald-800 font-bold">{Number(generatedReport.result.primResult?.totalCost ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Corridors Preserved:</span>
                      <span className="text-slate-900 font-bold">{generatedReport.result.primResult?.selectedCount ?? 0} edges</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Cost Delta vs Kruskal:</span>
                      <span className="text-emerald-800 font-bold">
                        {(Number(generatedReport.result.primResult?.totalCost ?? 0) - Number(generatedReport.result.kruskalResult?.totalCost ?? 0)).toFixed(2)} (Equivalent)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: 12-Stage Execution Audit Benchmark */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="font-mono text-emerald-800 font-bold text-sm">SECTION 5 //</span>
                  <h3 className="text-base font-bold text-slate-900">
                    12-Stage Algorithmic Pipeline Execution Audit
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs text-slate-700 bg-white rounded-lg border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Stage</th>
                        <th className="py-2 px-3">Pipeline Stage Name</th>
                        <th className="py-2 px-3">Latency (ms)</th>
                        <th className="py-2 px-3">Algorithm Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(generatedReport.result?.stages || []).map((st) => (
                        <tr key={st.stage} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 text-emerald-800 font-bold">STAGE {st.stage}</td>
                          <td className="py-1.5 px-3 text-slate-900 font-semibold">{st.name}</td>
                          <td className="py-1.5 px-3 text-emerald-700 font-bold">{st.durationMs} ms</td>
                          <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                            {st.stage === 5
                              ? 'Dijkstra Single-Source O((V+E)logV)'
                              : st.stage === 6
                              ? 'Floyd-Warshall All-Pairs O(V³)'
                              : st.stage === 7
                              ? 'Greedy Bottleneck Egress'
                              : st.stage === 8
                              ? '0/1 Knapsack DP O(N·W)'
                              : st.stage === 9
                              ? 'Kruskal MST O(E log E)'
                              : st.stage === 10
                              ? 'Prim MST O((V+E)logV)'
                              : 'Real-time Graph & Topology Operations'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 6: Official Sign-Off Block */}
              <div className="print-card rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1 font-bold">COMMAND AUTHORIZATION:</span>
                    <div className="text-slate-900 font-bold text-sm">CHIEF DISASTER CONTROLLER</div>
                    <div className="text-slate-500 text-[11px]">Metropolitan Emergency Response Division</div>
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center sm:w-64 bg-white flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">OFFICIAL AUTHENTICATION SEAL</span>
                    <DurgaLogo size={24} className="my-1" />
                    <div className="font-bold text-emerald-800 tracking-wider">DURGA SECURE DIRECTIVE</div>
                    <div className="text-[9px] text-slate-500">DIGITALLY SIGNED & VERIFIED</div>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block mb-1 font-bold">EXECUTIVE STATUS:</span>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-emerald-800 font-bold border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ACTIVE DIRECTIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM ARCHITECTURE & 4 PILLARS                                    */}
      {/* ========================================================================= */}
      {activeTab === 'architecture' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <DurgaLogo size={24} />
              <h2 className="text-xl font-bold text-slate-900">
                {APP_CONFIG.name} — Dynamic Urban Rescue & Guidance Architecture
              </h2>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 font-mono text-xs">
              <span className="font-bold">TAGLINE:</span> {APP_CONFIG.tagline}
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              DURGA is designed as an end-to-end command-and-control platform for municipal emergency response teams, disaster relief coordinators, and urban transportation authorities. The system models complex metropolitan road networks as dynamic mathematical graphs, continuously assessing evolving hazards (thermal firestorms, structural collapses, flash flooding, or toxic plumes) to compute optimal civilian evacuation paths and dispatch first-responder squads with minimal latency.
            </p>

            {/* The Four Pillars */}
            <h3 className="text-base font-bold text-slate-900 pt-2">The Four Operational Pillars</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block text-sm">01. ANALYZE</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time urban road network topology ingestion (47 vertices, 58 edges, 4 perimeter exits, 2 hospitals). Continuous evaluation of dynamic hazard propagation, toxic plume perimeters, and severed corridors.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block text-sm">02. OPTIMIZE</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dual optimization engine: Capacity-constrained greedy evacuation assignment preventing exit gate crushes, paired with 0/1 Knapsack Dynamic Programming for life-preservation fleet staging.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block text-sm">03. GUIDE</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Point-to-point wayfinding via Dijkstra's algorithm with binary min-heap frontier relaxation, and global all-pairs emergency distance matrices via Floyd-Warshall dynamic programming.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <span className="font-mono text-emerald-800 font-bold block text-sm">04. RESCUE</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Spanning tree infrastructure preservation using Kruskal's (DSU) and Prim's (Priority Cut) algorithms to secure emergency communication lines and safe responder ingress arterials.
                </p>
              </div>
            </div>

            {/* Dynamic Edge Cost Formulation */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 space-y-3 font-mono text-xs">
              <span className="text-emerald-900 font-bold block text-sm">Mathematical Formulation: Dynamic Edge Impedance</span>
              <div className="rounded-lg bg-white p-3 text-slate-800 border border-slate-200 shadow-2xs">
                <code>Cost(e) = TravelTime(e) &times; [1 + 1.5 &times; Congestion(e)] &times; [1 + 2.5 &times; Danger(e)]</code>
              </div>
              <p className="text-slate-600 text-[11px] font-sans">
                If an edge is severed by physical collapse or toxic containment perimeters, <code className="font-mono text-rose-600 font-bold">Cost(e) = &infin;</code>, guaranteeing that routing algorithms strictly avoid impassable roads.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
