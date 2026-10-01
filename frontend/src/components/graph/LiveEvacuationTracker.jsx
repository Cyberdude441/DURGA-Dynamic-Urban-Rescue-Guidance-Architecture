import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  LocateFixed,
  MapPin,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
  Compass,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  DoorOpen,
  AlertTriangle,
  Navigation,
  Radio,
  Route,
  ShieldAlert,
} from 'lucide-react';
import GeographicLiveMap from './GeographicLiveMap.jsx';
import { getHumanRoute, getNavigationState } from '../../utils/navigationUtils.js';
import voiceNavigation from '../../services/voiceNavigationService.js';

export default function LiveEvacuationTracker({
  graph,
  routePath,
  location,
  locationStatus,
  locationError,
  requestLocation,
  onRouteDeviation,
  emergency,
  riskLevel,
  peopleAffected,
  nearestExit,
}) {
  // Navigation operational states: 'idle' | 'navigating' | 'paused'
  const [navStatus, setNavStatus] = useState('idle');
  const [followUser, setFollowUser] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [trackerError, setTrackerError] = useState('');
  const [lastAnnouncedInstruction, setLastAnnouncedInstruction] = useState('');
  const [locState, setLocState] = useState({ current: location, previous: null });
  if (location !== locState.current) {
    setLocState({ current: location, previous: locState.current });
  }

  const lastSpokenInstructionRef = useRef('');
  const recalculatedRouteRef = useRef('');
  const wasOffRouteRef = useRef(false);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    isNavigatingRef.current = navStatus === 'navigating';
  }, [navStatus]);

  // Compute live navigation metrics deterministically from DURGA geometry
  const navigation = useMemo(
    () => getNavigationState(location, graph, routePath, locState.previous),
    [location, graph, routePath, locState.previous]
  );
  const humanRoute = useMemo(() => getHumanRoute(graph, routePath), [graph, routePath]);

  // Sync voice service enabled state
  useEffect(() => {
    voiceNavigation.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Poll speech synthesis active status for the visual wave indicator
  useEffect(() => {
    const timer = setInterval(() => {
      const active = voiceNavigation.synth?.speaking || false;
      setIsSpeaking(active);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // Safe speak helper that updates UI state
  const announceVoice = useCallback(
    (text, { priority = false, force = false } = {}) => {
      if (!voiceEnabled || !text) return;
      setLastAnnouncedInstruction(text);
      voiceNavigation.speak(text, {
        priority,
        force,
        onError: (err) => {
          if (err?.error !== 'canceled') {
            setTrackerError('Voice guidance encountered a browser speech warning.');
          }
        },
      });
    },
    [voiceEnabled]
  );

  // ----------------------------------------------------
  // Dynamic GPS Progress & Turn-by-Turn Voice Trigger
  // ----------------------------------------------------
  useEffect(() => {
    if (navStatus !== 'navigating' || !navigation.available) return;

    // 1. Off-Route Detection & Announcement
    if (navigation.isOffRoute) {
      if (!wasOffRouteRef.current) {
        wasOffRouteRef.current = true;
        announceVoice('Off route. Recalculating route...', { priority: true, force: true });
        if (onRouteDeviation) {
          const routeKey = (routePath || []).join('|');
          if (recalculatedRouteRef.current !== routeKey) {
            recalculatedRouteRef.current = routeKey;
            onRouteDeviation(navigation.nearestWaypoint?.id);
          }
        }
      }
      return;
    }

    // 2. Route Recalculation Recovery Announcement
    if (wasOffRouteRef.current && !navigation.isOffRoute) {
      wasOffRouteRef.current = false;
      announceVoice(`Route recalculated. ${navigation.instruction}`, { priority: true, force: true });
      lastSpokenInstructionRef.current = navigation.instruction;
      return;
    }

    // 3. Normal Progressive Turn-by-Turn Guidance
    const currentInstruction = navigation.instruction;
    if (currentInstruction && currentInstruction !== lastSpokenInstructionRef.current) {
      lastSpokenInstructionRef.current = currentInstruction;
      announceVoice(currentInstruction, { priority: false });
    }
  }, [navStatus, navigation, announceVoice, onRouteDeviation, routePath]);

  // ----------------------------------------------------
  // Navigation Command Handlers
  // ----------------------------------------------------
  const handleStartNavigation = async () => {
    setTrackerError('');
    if (!location) {
      try {
        await requestLocation();
      } catch (error) {
        setTrackerError(error.message || 'GPS permission is required for live voice navigation.');
        return;
      }
    }

    if (navStatus === 'paused') {
      voiceNavigation.resume();
      setNavStatus('navigating');
      announceVoice('Navigation resumed.', { priority: true, force: true });
      if (navigation.available && navigation.instruction) {
        announceVoice(navigation.instruction, { priority: false, force: true });
      }
    } else {
      setNavStatus('navigating');
      announceVoice('Navigation started. Follow the evacuation route.', { priority: true, force: true });
      if (navigation.available && navigation.instruction) {
        setTimeout(() => {
          if (isNavigatingRef.current && navigation.available) {
            announceVoice(navigation.instruction, { priority: false, force: true });
          }
        }, 1200);
      }
    }
  };

  const handlePauseNavigation = () => {
    setNavStatus('paused');
    announceVoice('Navigation paused.', { priority: true, force: true });
    setTimeout(() => {
      voiceNavigation.pause();
    }, 400);
  };

  const handleStopNavigation = () => {
    setNavStatus('idle');
    wasOffRouteRef.current = false;
    lastSpokenInstructionRef.current = '';
    announceVoice('Navigation stopped.', { priority: true, force: true });
    setTimeout(() => {
      voiceNavigation.stop();
    }, 600);
  };

  const handleToggleVoice = () => {
    const nextState = !voiceEnabled;
    setVoiceEnabled(nextState);
    if (nextState) {
      voiceNavigation.setEnabled(true);
      announceVoice('Voice guidance enabled.', { priority: true, force: true });
    } else {
      voiceNavigation.stop();
      voiceNavigation.setEnabled(false);
    }
  };

  const handleReplayInstruction = () => {
    if (!navigation.available || !navigation.instruction) {
      announceVoice('Acquiring route and GPS telemetry.', { force: true });
      return;
    }
    announceVoice(navigation.instruction, { priority: true, force: true });
  };

  // Maneuver icon helper
  const renderManeuverIcon = () => {
    if (!navigation.available) return <Navigation className="h-6 w-6 text-slate-400" />;
    switch (navigation.maneuverType) {
      case 'turn-left':
        return <CornerUpLeft className="h-7 w-7 text-emerald-700" />;
      case 'turn-right':
        return <CornerUpRight className="h-7 w-7 text-emerald-700" />;
      case 'u-turn':
        return <RotateCcw className="h-7 w-7 text-amber-600" />;
      case 'arrive':
        return <DoorOpen className="h-7 w-7 text-emerald-800" />;
      case 'recalculate':
        return <AlertTriangle className="h-7 w-7 text-amber-600" />;
      case 'straight':
      default:
        return <ArrowUp className="h-7 w-7 text-emerald-700" />;
    }
  };

  const statusText = !location
    ? locationStatus === 'denied'
      ? 'Location permission denied in browser.'
      : 'Waiting for live GPS satellite lock...'
    : navigation.available
    ? navigation.movementDirection
    : 'Route needs a live mapped graph.';

  const isNavigating = navStatus === 'navigating';
  const isPaused = navStatus === 'paused';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Top Header & Main Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                Live Voice Evacuation Guidance
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1.5 border ${
                  isNavigating
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : isPaused
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isNavigating
                      ? 'bg-emerald-600 animate-pulse'
                      : isPaused
                      ? 'bg-amber-600'
                      : 'bg-slate-400'
                  }`}
                />
                {isNavigating ? 'NAVIGATING' : isPaused ? 'PAUSED' : 'STANDBY'}
              </span>

              {voiceEnabled ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800 flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  {isSpeaking ? (
                    <span className="flex items-center gap-0.5 text-emerald-700">
                      <span className="inline-block w-1 h-2 bg-emerald-600 animate-pulse" />
                      <span className="inline-block w-1 h-3 bg-emerald-600 animate-pulse delay-75" />
                      <span className="inline-block w-1 h-2 bg-emerald-600 animate-pulse delay-150" />
                      <span className="ml-1">SPEAKING</span>
                    </span>
                  ) : (
                    'VOICE ACTIVE'
                  )}
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <VolumeX className="h-3 w-3" />
                  MUTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Hands-free real-time evacuation wayfinding powered by DURGA's deterministic Dijkstra pipeline.
            </p>
          </div>
        </div>

        {/* Primary Command Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 🔊 Voice Guidance Toggle */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
              voiceEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 shadow-2xs'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle Voice Guidance"
          >
            {voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-700" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
            <span>Voice Guidance: {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* ▶ Start Navigation */}
          {!isNavigating && (
            <button
              type="button"
              onClick={handleStartNavigation}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{isPaused ? 'Resume' : 'Start Navigation'}</span>
            </button>
          )}

          {/* ⏸ Pause */}
          {isNavigating && (
            <button
              type="button"
              onClick={handlePauseNavigation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3.5 py-2 text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Pause className="h-3.5 w-3.5 text-amber-700" />
              <span>Pause</span>
            </button>
          )}

          {/* ■ Stop */}
          {(isNavigating || isPaused) && (
            <button
              type="button"
              onClick={handleStopNavigation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3.5 py-2 text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Square className="h-3.5 w-3.5 fill-rose-700 text-rose-700" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Voice Guidance HUD */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Geographic Spatial Map */}
        <div className="relative h-[480px] min-h-0 rounded-xl overflow-hidden border border-slate-200">
          <GeographicLiveMap
            graph={graph}
            routePath={routePath}
            location={location}
            followUser={followUser}
          />

          {/* Floating Map Overlay Control */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFollowUser((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-bold shadow-sm transition-all cursor-pointer ${
                followUser
                  ? 'border-emerald-400 bg-white text-emerald-800 ring-2 ring-emerald-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <LocateFixed className="h-3.5 w-3.5 text-emerald-700" />
              <span>Follow GPS: {followUser ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Voice Guidance HUD & Live Turn-by-Turn Telemetry */}
        <div className="space-y-3">
          {/* Prominent Maneuver & Spoken Instruction Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-emerald-300 shadow-2xs">
                  {renderManeuverIcon()}
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                    Next Maneuver
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {navigation.available
                      ? `${Math.max(1, Math.round(navigation.nextWaypointDistance))} m`
                      : '--'}
                  </div>
                </div>
              </div>

              {voiceEnabled && (
                <button
                  type="button"
                  onClick={handleReplayInstruction}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-800 hover:bg-emerald-50 shadow-2xs transition-colors cursor-pointer"
                  title="Replay Voice Instruction"
                >
                  <Volume2 className="h-3 w-3" />
                  <span>Replay</span>
                </button>
              )}
            </div>

            {/* Instruction Speech Text */}
            <div className="rounded-lg bg-white p-3 border border-emerald-200/80 shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-800 uppercase tracking-wider mb-1">
                <span>Spoken Voice Instruction</span>
                {isSpeaking && <span className="text-emerald-700 font-bold animate-pulse">● Announcing</span>}
              </div>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {navigation.available
                  ? navigation.instruction
                  : 'Start navigation to acquire GPS lock and receive turn-by-turn spoken guidance.'}
              </p>
              {navigation.available && navigation.nextRoadName && (
                <div className="mt-1.5 text-xs text-emerald-800 font-medium">
                  via <span className="font-bold">{navigation.nextRoadName}</span>
                </div>
              )}
            </div>

            {/* Off-Route Alert Banner */}
            {navigation.available && navigation.isOffRoute && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 font-medium animate-pulse">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Off route ({Math.round(navigation.offRouteDistance)}m divergence). Recalculating path to safe exit...</span>
              </div>
            )}
          </div>

          {/* Live Situation & GPS Diagnostics */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* GPS Position */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Live GPS</span>
                <MapPin className="h-3 w-3 text-emerald-700" />
              </div>
              <div className="mt-1 font-bold text-slate-900 truncate">
                {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Acquiring...'}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500 truncate">{statusText}</div>
            </div>

            {/* Heading & Speed */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Heading & Speed</span>
                <Compass className="h-3 w-3 text-emerald-700" />
              </div>
              <div className="mt-1 font-bold text-slate-900 flex items-center gap-1.5">
                <span>
                  {navigation.userHeading != null
                    ? `${Math.round(navigation.userHeading)}° ${navigation.headingCompass}`
                    : '--'}
                </span>
                <span className="text-slate-400">|</span>
                <span>
                  {location?.speed != null
                    ? `${(location.speed * 3.6).toFixed(1)} km/h`
                    : 'Stationary'}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {location?.accuracy ? `Accurate to ±${Math.round(location.accuracy)}m` : 'Synthetic / Live'}
              </div>
            </div>

            {/* Remaining Distance */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Distance Remaining</span>
              <div className="mt-1 text-base font-bold text-slate-900">
                {navigation.available ? `${Math.round(navigation.remainingDistance)} m` : '--'}
              </div>
            </div>

            {/* Estimated Evacuation Time */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Estimated Clearance</span>
              <div className="mt-1 text-base font-bold text-emerald-800">
                {navigation.available
                  ? `${Math.max(1, Math.ceil(navigation.remainingDistance / 1.3 / 60))} min`
                  : '--'}
              </div>
            </div>
          </div>

          {/* Evacuation Progress Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] font-bold uppercase text-slate-500">Evacuation Clearance</span>
              <span className="font-bold text-emerald-700">
                {navigation.available ? `${navigation.progress}%` : '0%'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${navigation.available ? navigation.progress : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate">Destination: <strong className="text-slate-800">{nearestExit || 'Safe Exit Gate'}</strong></span>
              <span className="font-mono text-emerald-800 font-bold">{humanRoute.steps.length} segments</span>
            </div>
          </div>

          {/* Crisis Context & Voice Cue Log */}
          {(emergency || riskLevel || peopleAffected != null || lastAnnouncedInstruction) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-emerald-700" />
                  Tactical Incident Context
                </span>
                {riskLevel && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                      riskLevel === 'CRITICAL' || riskLevel === 'EXTREME'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {riskLevel}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Emergency:</span>
                  <span className="font-semibold text-slate-800">{emergency || 'Dynamic Evacuation'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Civilians in Sector:</span>
                  <span className="font-semibold text-slate-800">
                    {Number(peopleAffected || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              {lastAnnouncedInstruction && (
                <div className="border-t border-slate-200 pt-1.5 text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-emerald-700 shrink-0" />
                  <span className="truncate">Last Voice Cue: "{lastAnnouncedInstruction}"</span>
                </div>
              )}
            </div>
          )}

          {/* Active Corridor Chain */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-500 pb-1.5 border-b border-slate-100">
              <span className="flex items-center gap-1">
                <Route className="h-3 w-3 text-emerald-700" />
                Designated Safe Corridors
              </span>
              <span className="text-emerald-800">Dijkstra Shortest Safe Path</span>
            </div>
            <div className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 break-words">
              {humanRoute.names.length ? humanRoute.names.join(' → ') : 'No path calculated.'}
            </div>
          </div>

          {/* Errors & Notices */}
          {(trackerError || locationError) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
              <span>{trackerError || locationError}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}