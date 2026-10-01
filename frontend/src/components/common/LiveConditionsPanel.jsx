import React from 'react';
import {
  CloudRain,
  Hospital,
  MapPin,
  ShieldAlert,
  Siren,
  Map as MapIcon,
  Navigation,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

function SourceTag({ tone = 'slate', children }) {
  const tones = {
    live: 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold',
    static: 'border-slate-300 bg-slate-100 text-slate-700 font-bold',
    synthetic: 'border-blue-200 bg-blue-50 text-blue-800 font-bold',
    unavailable: 'border-rose-300 bg-rose-50 text-rose-700 font-bold',
    noFeed: 'border-slate-200 bg-slate-100 text-slate-600 font-semibold',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
}

export default function LiveConditionsPanel({
  mode = 'live', // 'live' | 'synthetic'
  location,
  locationStatus, // 'prompt' | 'requesting' | 'active' | 'denied' | 'error' | 'unavailable'
  locationError,
  requestLocation,
  address,
  graph,
  isGraphLoading = false,
  graphError = '',
  conditions,
}) {
  const isLive = mode === 'live';
  const hasGps = Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lon));
  const facilities = (graph?.nodes || []).filter((node) =>
    ['hospital', 'resource_center', 'exit'].includes(node.type) &&
    (node.facilityKind || ['hospital', 'resource_center'].includes(node.type))
  );
  const hazards = conditions?.hazards || [];
  const weather = conditions?.weather;

  // Collect any provider failure reasons when in LIVE mode
  const liveFailures = [];
  if (isLive) {
    if (!hasGps) {
      liveFailures.push(locationError || 'Browser GPS not active or permission not yet granted.');
    }
    if (hasGps && !weather) {
      liveFailures.push(conditions?.weatherReason || 'Live weather provider unreachable.');
    }
    if (hasGps && graphError) {
      liveFailures.push(`OpenStreetMap: ${graphError}`);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
              Live Conditions
            </h2>
            <div className="text-[11px] text-slate-500 font-mono">
              {isLive
                ? 'Real-world GPS, Overpass OpenStreetMap network & Open-Meteo atmospheric feeds'
                : 'Synthetic 47-node disaster simulation sandbox'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            hasGps ? (
              <SourceTag tone="live">LIVE MODE: GPS ACTIVE</SourceTag>
            ) : (
              <SourceTag tone="unavailable">LIVE MODE: AWAITING GPS</SourceTag>
            )
          ) : (
            <SourceTag tone="synthetic">SYNTHETIC SIMULATION</SourceTag>
          )}
        </div>
      </div>

      {/* Explicit Provider Failure Warning Banner (never "SYNTHETIC FALLBACK") */}
      {isLive && liveFailures.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 font-mono space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Live Provider Status Notice</span>
          </div>
          <div className="text-[11px] text-amber-900 leading-relaxed">
            {liveFailures.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span>Live provider unavailable: {reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-Card Conditions Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* CARD 1: GPS */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                GPS
              </span>
              {isLive ? (
                hasGps ? (
                  <SourceTag tone="live">LIVE</SourceTag>
                ) : (
                  <SourceTag tone="unavailable">UNAVAILABLE</SourceTag>
                )
              ) : (
                <SourceTag tone="synthetic">SYNTHETIC</SourceTag>
              )}
            </div>

            <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
              {isLive ? (
                hasGps ? (
                  <span>
                    {location.lat.toFixed(5)}°, {location.lon.toFixed(5)}°
                  </span>
                ) : (
                  <span className="text-rose-700">LOCATION UNAVAILABLE</span>
                )
              ) : (
                <span>Synthetic Planar Grid</span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {isLive ? (
                hasGps ? (
                  address?.displayName || `Real browser GPS locked (±${Math.round(location.accuracy || 10)}m accuracy)`
                ) : (
                  locationError || 'Browser GPS permission not yet granted or denied.'
                )
              ) : (
                '47 synthetic node coordinates (x, y) · No live GPS used.'
              )}
            </p>
          </div>

          {isLive && !hasGps && requestLocation && (
            <div className="pt-2">
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === 'requesting'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-mono font-bold text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {locationStatus === 'requesting' ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Navigation className="h-3.5 w-3.5" />
                )}
                <span>{locationStatus === 'requesting' ? 'Requesting GPS...' : 'Enable Location'}</span>
              </button>
            </div>
          )}
        </div>

        {/* CARD 2: WEATHER */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600">
                <CloudRain className="h-3.5 w-3.5 text-emerald-700" />
                WEATHER
              </span>
              {isLive ? (
                weather ? (
                  <SourceTag tone="live">LIVE</SourceTag>
                ) : (
                  <SourceTag tone="unavailable">UNAVAILABLE</SourceTag>
                )
              ) : (
                <SourceTag tone="synthetic">SYNTHETIC</SourceTag>
              )}
            </div>

            <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
              {isLive ? (
                weather ? (
                  <span>
                    {weather.temperatureC}°C · Wind: {weather.windKmh} km/h · Humidity: {weather.humidityPercent}%
                  </span>
                ) : (
                  <span className="text-rose-700">Live provider unavailable</span>
                )
              ) : (
                <span>Simulated Weather Baseline</span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {isLive ? (
                weather ? (
                  weather.hazard ? (
                    <span className="text-rose-700 font-bold">Hazard: {weather.hazard}</span>
                  ) : (
                    weather.source || 'LIVE: Open-Meteo current atmospheric conditions'
                  )
                ) : (
                  conditions?.weatherReason || (hasGps ? 'Awaiting weather feed response' : 'Requires live GPS coordinates')
                )
              ) : (
                'Predefined disaster scenario atmospheric variables.'
              )}
            </p>
          </div>
        </div>

        {/* CARD 3: HAZARDS */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600">
                <ShieldAlert className="h-3.5 w-3.5 text-emerald-700" />
                HAZARDS
              </span>
              {isLive ? (
                hazards.length > 0 ? (
                  <SourceTag tone="live">LIVE</SourceTag>
                ) : (
                  <SourceTag tone="noFeed">NO VERIFIED FEED</SourceTag>
                )
              ) : (
                <SourceTag tone="synthetic">SYNTHETIC</SourceTag>
              )}
            </div>

            <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
              {isLive ? (
                hazards.length > 0 ? (
                  <span>{hazards.length} Verified Hazard{hazards.length > 1 ? 's' : ''} Reported</span>
                ) : (
                  <span className="text-slate-700">0 Confirmed Incidents</span>
                )
              ) : (
                <span>Simulated Hazard Perimeter</span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {isLive ? (
                hazards.length > 0 ? (
                  `Active feed: ${hazards[0].dataSource || 'Configured incident provider'}`
                ) : (
                  'No verified incident or flood feed configured in backend .env'
                )
              ) : (
                'Preset conflagration, flood surge, or seismic rupture perimeters.'
              )}
            </p>
          </div>
        </div>

        {/* CARD 4: ROADS */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600">
                <Siren className="h-3.5 w-3.5 text-emerald-700" />
                ROADS
              </span>
              {isLive ? (
                graph && graph.edges?.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <SourceTag tone="live">LIVE</SourceTag>
                    <SourceTag tone="static">STATIC</SourceTag>
                  </div>
                ) : (
                  <SourceTag tone="unavailable">UNAVAILABLE</SourceTag>
                )
              ) : (
                <SourceTag tone="synthetic">SYNTHETIC</SourceTag>
              )}
            </div>

            <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
              {isLive ? (
                graph && graph.edges?.length > 0 ? (
                  <span>{graph.edges.length} OpenStreetMap Segments</span>
                ) : (
                  <span className="text-rose-700">Live provider unavailable</span>
                )
              ) : (
                <span>58 Synthetic Road Corridors</span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {isLive ? (
                graph && graph.edges?.length > 0 ? (
                  'Geometry: LIVE (Overpass OSM) · Speeds: STATIC class baseline (no live traffic API)'
                ) : (
                  graphError || (isGraphLoading ? 'Querying Overpass API...' : 'Awaiting live GPS coordinates')
                )
              ) : (
                'Synthetic graph edges with predefined capacities and impedance.'
              )}
            </p>
          </div>
        </div>

        {/* CARD 5: FACILITIES */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600">
                <Hospital className="h-3.5 w-3.5 text-emerald-700" />
                FACILITIES
              </span>
              {isLive ? (
                facilities.length > 0 ? (
                  <SourceTag tone="live">LIVE</SourceTag>
                ) : graph ? (
                  <SourceTag tone="static">STATIC</SourceTag>
                ) : (
                  <SourceTag tone="unavailable">UNAVAILABLE</SourceTag>
                )
              ) : (
                <SourceTag tone="synthetic">SYNTHETIC</SourceTag>
              )}
            </div>

            <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
              {isLive ? (
                facilities.length > 0 ? (
                  <span>{facilities.length} Emergency Facilities Mapped</span>
                ) : graph ? (
                  <span>0 Facilities in Search Radius</span>
                ) : (
                  <span className="text-rose-700">Live provider unavailable</span>
                )
              ) : (
                <span>4 Synthetic Facilities</span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {isLive ? (
                facilities.length > 0 ? (
                  `OpenStreetMap verified: ${facilities.slice(0, 2).map((f) => f.name).join(', ')}`
                ) : graph ? (
                  'Network boundary exits assigned as egress gates.'
                ) : (
                  'Requires OpenStreetMap query'
                )
              ) : (
                '2 Trauma Hospitals (H01, H02) · 2 Responder Staging Areas (RC01, RC02)'
              )}
            </p>
          </div>
        </div>

        {/* CARD 6: MAP */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600">
                <MapIcon className="h-3.5 w-3.5 text-emerald-700" />
                MAP
              </span>
              {isLive ? (
                hasGps && graph ? (
                  <SourceTag tone="live">LIVE OSM</SourceTag>
                ) : (
                  <SourceTag tone="unavailable">UNAVAILABLE</SourceTag>
                )
              ) : (
                <SourceTag tone="synthetic">SYNTHETIC</SourceTag>
              )}
            </div>

            <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
              {isLive ? (
                hasGps && graph ? (
                  <span>OpenStreetMap Layer Active</span>
                ) : (
                  <span className="text-rose-700">Live map unavailable</span>
                )
              ) : (
                <span>Synthetic 47-Node Canvas</span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {isLive ? (
                hasGps && graph ? (
                  'Real-world vector corridors & Leaflet OpenStreetMap tiles centered on your GPS.'
                ) : (
                  'Awaiting GPS position and OSM road geometry.'
                )
              ) : (
                'Topological planar projection of synthetic disaster network.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Render Verified Hazards if any */}
      {isLive && hazards.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-200 pt-3 text-[11px] font-mono">
          <div className="font-bold text-slate-900 uppercase tracking-wider">
            Verified Incident Telemetry
          </div>
          {hazards.map((hazard, index) => (
            <div
              key={`${hazard.roadId || hazard.type}-${index}`}
              className="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-200 p-2 text-rose-900"
            >
              <span>
                <strong>{hazard.title || hazard.type || 'Incident'}:</strong>{' '}
                {hazard.description || 'Verified road hazard impacts corridor impedance.'}
              </span>
              <SourceTag tone="live">LIVE FEED</SourceTag>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}