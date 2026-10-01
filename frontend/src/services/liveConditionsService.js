const DEFAULT_API_BASE = 'http://localhost:5000';
const DEFAULT_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Live conditions request failed (${response.status})`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchDirectWeather({ lat, lon }) {
  const url = new URL(import.meta.env.VITE_WEATHER_API_URL || DEFAULT_WEATHER_URL);
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m');
  url.searchParams.set('timezone', 'auto');

  const data = await fetchJson(url.toString(), { timeoutMs: 8000 });
  const weatherCode = data.current?.weather_code;
  const weatherHazards = {
    65: 'Heavy rain',
    67: 'Freezing rain',
    75: 'Heavy snow',
    82: 'Violent rain showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with hail',
  };

  return {
    temperatureC: data.current?.temperature_2m,
    humidityPercent: data.current?.relative_humidity_2m,
    precipitationMm: data.current?.precipitation,
    rainMm: data.current?.rain,
    weatherCode,
    hazard: weatherHazards[weatherCode] || null,
    windKmh: data.current?.wind_speed_10m,
    observedAt: data.current?.time,
    source: 'LIVE: Open-Meteo current conditions',
  };
}

export async function loadLiveConditions(location, graph = null) {
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) {
    throw new Error('Valid GPS latitude and longitude are required for live conditions.');
  }

  const roads = (graph?.edges || []).map((edge) => {
    const source = graph.nodes?.find((node) => node.id === edge.source);
    const target = graph.nodes?.find((node) => node.id === edge.target);
    return {
      id: edge.id,
      name: edge.name,
      source: source ? { lat: source.lat, lon: source.lon } : null,
      target: target ? { lat: target.lat, lon: target.lon } : null,
    };
  });

  // 1. Try Backend Live Conditions API first (proxies weather + configured incident/flood feeds)
  try {
    const result = await fetchJson(`${import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE}/api/live-conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...location, roads }),
      timeoutMs: 8000,
    });
    return {
      ...result,
      isDirectFallback: false,
    };
  } catch (backendError) {
    // 2. Direct fallback to Open-Meteo Weather API if backend is unreachable
    try {
      const weather = await fetchDirectWeather(location);
      return {
        fetchedAt: new Date().toISOString(),
        weather,
        hazards: [],
        availability: { weather: true, incidents: false, flooding: false },
        providerNotes: [
          `Backend live-conditions proxy offline (${backendError.message}); direct Open-Meteo weather active.`,
          'No verified hazard feed configured.',
        ],
        isDirectFallback: true,
      };
    } catch (weatherError) {
      return {
        fetchedAt: null,
        weather: null,
        hazards: [],
        availability: { weather: false, incidents: false, flooding: false },
        providerNotes: [
          `Live backend unavailable: ${backendError.message}`,
          `Live weather direct query failed: ${weatherError.message}`,
        ],
        weatherReason: `Weather provider unavailable (${weatherError.message})`,
      };
    }
  }
}

export function applyLiveHazardsToGraph(graph, hazards = []) {
  if (!graph) return graph;
  const hazardByRoadId = new Map();
  (hazards || []).forEach((hazard) => {
    if (hazard.roadId || hazard.edgeId) hazardByRoadId.set(hazard.roadId || hazard.edgeId, hazard);
  });

  return {
    ...graph,
    edges: (graph.edges || []).map((edge) => {
      const hazard = hazardByRoadId.get(edge.id);
      if (!hazard) return edge;
      const isBlocked = hazard.blocked === true || ['closed', 'critical'].includes(String(hazard.severity).toLowerCase());
      return {
        ...edge,
        blocked: isBlocked || edge.blocked,
        danger: Math.max(edge.danger || 0, isBlocked ? 1 : Number(hazard.danger ?? 0.7)),
        hazard: {
          type: hazard.type || 'road hazard',
          title: hazard.title || hazard.description || 'Reported road hazard',
          dataSource: hazard.dataSource || 'LIVE provider',
        },
      };
    }),
    dangerDataAvailable: hazards.length > 0,
  };
}

export function createUnavailableConditions(reason = 'Live provider unavailable.') {
  return {
    fetchedAt: null,
    weather: null,
    hazards: [],
    availability: { weather: false, incidents: false, flooding: false },
    providerNotes: [reason],
    weatherReason: reason,
  };
}