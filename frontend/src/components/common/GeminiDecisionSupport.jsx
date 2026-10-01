import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, ChevronDown, ClipboardList, LoaderCircle, MessageSquare, RefreshCw, Send, Sparkles } from 'lucide-react';
import { analyzeWithGemini, explainWithGemini, optimizeWithGemini } from '../../services/aiService.js';

function compactSimulationContext({ simulationResult, disasterType, location, people, risk, mode, blockedRoads }) {
  const graph = simulationResult.graph || {};
  return {
    dataSource: mode === 'live' ? 'LIVE LOCATION GRAPH + SYNTHETIC POPULATION CONFIG' : 'SYNTHETIC',
    incident: { type: disasterType, location, peopleAffected: people, riskLevel: risk, blockedRoads },
    graph: {
      nodeCount: graph.nodes?.length || 0,
      edgeCount: graph.edges?.length || 0,
      blockedEdges: (graph.edges || []).filter((edge) => edge.blocked).map((edge) => edge.id),
      dangerousEdges: (graph.edges || []).filter((edge) => edge.danger > 0.4).map((edge) => ({ id: edge.id, danger: edge.danger })),
    },
    pipeline: simulationResult.stages,
    algorithms: {
      dijkstra: simulationResult.dijkstraResults,
      floydWarshall: simulationResult.fwResult,
      greedy: simulationResult.greedyResult,
      dynamicProgramming: simulationResult.knapsackResults,
      kruskal: simulationResult.kruskalResult,
      prim: simulationResult.primResult,
    },
    evacuationPlan: simulationResult.evacuationPlan,
    resourceAllocation: simulationResult.knapsackResults,
    networkMetrics: simulationResult.networkMetrics,
  };
}

function deterministicFallback(context, question = '') {
  const route = context.algorithms.dijkstra?.epicenterToExit;
  const path = route?.path?.join(' -> ') || 'no reachable route';
  const cost = typeof route?.totalCost === 'number' ? `${route.totalCost.toFixed(1)} calculated cost units` : 'an unavailable calculated cost';
  const blockedCount = context.graph.blockedEdges.length;
  const dangerousCount = context.graph.dangerousEdges.length;
  const lowerQuestion = question.toLowerCase();
  let summary = `Gemini unavailable. Based on the computed Dijkstra result, ${path} is the selected route with ${cost}.`;
  const findings = [`${blockedCount} blocked and ${dangerousCount} dangerous roads are present in the supplied graph.`];

  if (lowerQuestion.includes('dp') || lowerQuestion.includes('resource')) {
    const resources = context.resourceAllocation || {};
    summary = `Gemini unavailable. The deterministic DP allocation used ${resources.ambulances?.resourceUsed ?? 0} ambulances, ${resources.rescueTeams?.resourceUsed ?? 0} rescue teams, and ${resources.emergencyVehicles?.resourceUsed ?? 0} emergency vehicles from the computed result.`;
  } else if (lowerQuestion.includes('compare') || lowerQuestion.includes('floyd')) {
    const timings = (context.pipeline || []).filter((stage) => /Dijkstra|Floyd-Warshall/.test(stage.name));
    summary = `Gemini unavailable. DURGA computed both Dijkstra and Floyd-Warshall; their recorded stage timings are ${timings.map((stage) => `${stage.name}: ${stage.durationMs}ms`).join(', ') || 'not available'}.`;
  } else if (lowerQuestion.includes('bottleneck') || lowerQuestion.includes('risk')) {
    summary = `Gemini unavailable. The supplied DURGA graph contains ${blockedCount} blocked and ${dangerousCount} dangerous roads; inspect those corridors as the primary network risks.`;
  }

  return { summary, findings, source: 'Dijkstra, graph state, and deterministic DURGA pipeline outputs only.' };
}

function renderValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return <span>{String(value)}</span>;
  if (Array.isArray(value)) return <ul className="list-disc space-y-1 pl-5">{value.slice(0, 8).map((item, index) => <li key={index}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>)}</ul>;
  if (value && typeof value === 'object') return <div className="space-y-2">{Object.entries(value).slice(0, 12).map(([key, nested]) => <div key={key}><strong className="text-slate-900">{key}: </strong>{renderValue(nested)}</div>)}</div>;
  return <span>{String(value)}</span>;
}

export default function GeminiDecisionSupport({ simulationResult, disasterType, location, people, risk, mode, blockedRoads, onViewAlgorithmResults }) {
  const [question, setQuestion] = useState('Why was this evacuation route selected?');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerStatus, setProviderStatus] = useState('NOT QUERIED');
  const [analysis, setAnalysis] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [lastError, setLastError] = useState(null);
  const lastRequestRef = useRef(null);
  const context = useMemo(() => compactSimulationContext({ simulationResult, disasterType, location, people, risk, mode, blockedRoads }), [simulationResult, disasterType, location, people, risk, mode, blockedRoads]);

  const runRequest = async (request, operation, instruction = '') => {
    lastRequestRef.current = { request, operation, instruction };
    const timestamp = new Date().toISOString();
    setIsLoading(true);
    setError('');
    try {
      const liveResponse = await request();
      setAnalysis({ kind: 'gemini', payload: liveResponse });
      setProviderStatus('LIVE AI RESPONSE');
      setLastError(null);
      setAuditTrail((previous) => [{ timestamp, scenario: disasterType, operation, algorithms: Object.keys(context.algorithms), dataSent: context, providerStatus: 'LIVE AI RESPONSE', response: liveResponse }, ...previous]);
    } catch (requestError) {
      const fallback = deterministicFallback(context, instruction);
      const fallbackResponse = { model: 'Deterministic DURGA Analysis', advisory: true, result: fallback };
      setAnalysis({ kind: 'fallback', payload: fallbackResponse });
      setProviderStatus('AI PROVIDER UNAVAILABLE');
      setLastError({ message: requestError.message || 'Gemini is unavailable.', providerStatus: requestError.providerStatus || 'Provider error' });
      setError(requestError.message || 'Gemini is unavailable.');
      setAuditTrail((previous) => [{ timestamp, scenario: disasterType, operation, algorithms: Object.keys(context.algorithms), dataSent: context, providerStatus: 'AI PROVIDER UNAVAILABLE', error: requestError.message || 'Gemini is unavailable.', providerError: requestError.providerStatus || null, response: fallbackResponse }, ...previous]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoute = context.algorithms.dijkstra?.epicenterToExit?.path || [];
  const calculatedCost = context.algorithms.dijkstra?.epicenterToExit?.totalCost;
  const blockedRoadCount = context.graph.blockedEdges.length;
  const dangerousRoadCount = context.graph.dangerousEdges.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-bold text-slate-900">DURGA AI Decision Support</h2><span className="rounded border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">ADVISORY ONLY</span></div>
            <p className="mt-1 text-xs text-slate-600">Gemini explains the completed deterministic pipeline. Dijkstra, Floyd-Warshall, Greedy, DP, Kruskal, and Prim remain the source of truth.</p>
          </div>
          <Sparkles className="hidden h-5 w-5 text-emerald-600 sm:block" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => runRequest(() => analyzeWithGemini(context), 'analyze', 'Analyze the complete emergency situation.')} disabled={isLoading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-mono font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />Analyze Situation</button>
          <button type="button" onClick={() => runRequest(() => optimizeWithGemini(context), 'optimize', 'Review route and resource alternatives.')} disabled={isLoading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-mono font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Review Alternatives</button>
        </div>

        <div className="mt-4 flex gap-2">
          <MessageSquare className="mt-2 h-4 w-4 shrink-0 text-emerald-700" />
          <input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && question.trim()) runRequest(() => explainWithGemini(context, question.trim()), 'explain', question.trim()); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none" aria-label="Ask DURGA AI" />
          <button type="button" onClick={() => runRequest(() => explainWithGemini(context, question.trim()), 'explain', question.trim())} disabled={isLoading || !question.trim()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />Ask</button>
        </div>
      </div>

      <div className={`flex items-center justify-between rounded-xl border p-3 text-xs font-mono font-bold ${providerStatus === 'LIVE AI RESPONSE' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : providerStatus === 'AI PROVIDER UNAVAILABLE' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><span>{providerStatus}</span><span className="text-[10px] font-normal">Algorithms remain authoritative</span></div>
      {isLoading && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs font-mono text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" /> Gemini is interpreting DURGA's actual results...</div>}
      {providerStatus === 'AI PROVIDER UNAVAILABLE' && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-xs">
        <div className="flex items-start justify-between gap-3 border-b border-amber-200 pb-3"><div><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /><h3 className="text-base font-bold">AI SERVICE STATUS</h3></div><div className="mt-2 space-y-1 text-xs font-mono"><div>● Gemini temporarily unavailable</div><div className="text-emerald-800">● DURGA algorithms operational</div></div></div><span className="rounded border border-amber-300 bg-white px-2 py-1 text-[10px] font-mono font-bold text-amber-800">PROVIDER UNAVAILABLE</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><span className="text-[10px] font-mono uppercase text-amber-700">Provider status</span><div className="text-sm font-bold">Unavailable</div></div><div><span className="text-[10px] font-mono uppercase text-amber-700">Algorithms</span><div className="text-sm font-bold text-emerald-800">Operational</div></div><div><span className="text-[10px] font-mono uppercase text-amber-700">Data source</span><div className="text-sm font-bold">DURGA simulation</div></div><div><span className="text-[10px] font-mono uppercase text-amber-700">Analysis mode</span><div className="text-sm font-bold">Deterministic</div></div></div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 p-3 text-xs"><strong>Last error:</strong> {lastError?.providerStatus || 'Provider unavailable'}{lastError?.providerStatus && <span className="ml-2 text-slate-600">({lastError.message})</span>}</div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4"><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800">Deterministic DURGA Analysis — Not Gemini</div><div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="sm:col-span-2"><div className="text-[10px] font-mono uppercase text-slate-500">Selected evacuation route</div><div className="mt-1 break-words text-sm font-bold text-slate-900">{selectedRoute.length ? selectedRoute.join(' → ') : 'No reachable route'}</div></div><div><div className="text-[10px] font-mono uppercase text-slate-500">Calculated cost</div><div className="mt-1 text-lg font-bold text-slate-900">{typeof calculatedCost === 'number' ? `${calculatedCost.toFixed(1)} units` : 'Unavailable'}</div></div></div><div className="mt-4 border-t border-slate-200 pt-3"><div className="text-[10px] font-mono uppercase text-slate-500">Network conditions</div><div className="mt-1 text-sm font-semibold text-slate-900">{blockedRoadCount} blocked roads · {dangerousRoadCount} dangerous roads</div></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => lastRequestRef.current && runRequest(lastRequestRef.current.request, lastRequestRef.current.operation, lastRequestRef.current.instruction)} disabled={isLoading || !lastRequestRef.current} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-white disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Retry Gemini</button><button type="button" onClick={onViewAlgorithmResults} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 hover:bg-slate-50">View Algorithm Results</button></div>
      </div>}
      {error && providerStatus !== 'AI PROVIDER UNAVAILABLE' && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>AI provider unavailable.</strong><div className="mt-1">{error}</div></div></div>}
      {analysis?.payload?.result && <div className={`rounded-xl border p-5 text-xs leading-relaxed shadow-xs ${analysis.kind === 'fallback' ? 'border-amber-200 bg-amber-50/50 text-amber-950' : 'border-slate-200 bg-white text-slate-700'}`}><div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3"><span className="font-mono font-bold uppercase tracking-wider text-slate-900">{analysis.kind === 'fallback' ? 'Deterministic DURGA Analysis — Not Gemini' : 'AI Interpretation'}</span><span className="text-[10px] font-mono text-emerald-700">{analysis.payload.model} · ADVISORY</span></div>{renderValue(analysis.payload.result)}</div>}

      <details open className="rounded-xl border border-slate-200 bg-white shadow-xs"><summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-900"><ChevronDown className="h-4 w-4 text-emerald-700" /><ClipboardList className="h-4 w-4 text-emerald-700" />AI Context Sent to Gemini</summary><div className="border-t border-slate-200 p-4"><pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-[10px] leading-relaxed text-emerald-100">{JSON.stringify(context, null, 2)}</pre></div></details>

      <details className="rounded-xl border border-slate-200 bg-white shadow-xs"><summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-900"><ChevronDown className="h-4 w-4 text-emerald-700" />AI Audit Trail ({auditTrail.length})</summary><div className="space-y-3 border-t border-slate-200 p-4">{auditTrail.length === 0 ? <p className="text-xs text-slate-500">No AI analysis has been requested for this simulation.</p> : auditTrail.map((entry, index) => <details key={`${entry.timestamp}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-[11px] font-mono font-bold text-slate-800">{entry.timestamp} · {entry.scenario} · {entry.operation} · {entry.providerStatus}</summary><div className="mt-3 space-y-2 text-[11px] text-slate-600"><div><strong>Algorithms:</strong> {entry.algorithms.join(', ')}</div>{entry.error && <div><strong>Error:</strong> {entry.error}</div>}<pre className="max-h-56 overflow-auto rounded bg-slate-950 p-3 text-[10px] text-emerald-100">{JSON.stringify(entry, null, 2)}</pre></div></details>)}</div></details>
    </div>
  );
}