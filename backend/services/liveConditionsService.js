const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

function providerHeaders(apiKey) {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function loadWeather({ lat, lon }) {
  const url = new URL(process.env.WEATHER_API_URL || WEATHER_URL);
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m');
  url.searchParams.set('timezone', 'auto');
  const data = await fetchJson(url.toString());
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

async function loadOptionalHazards(urlKey, apiKeyKey, body) {
  const url = process.env[urlKey];
  if (!url) return { available: false, hazards: [], reason: 'No provider configured in backend .env.' };
  try {
    const payload = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...providerHeaders(process.env[apiKeyKey]) },
      body: JSON.stringify(body),
    });
    const hazards = Array.isArray(payload.hazards) ? payload.hazards : [];
    return { available: true, hazards, source: payload.source || `LIVE: ${url}` };
  } catch (error) {
    return { available: false, hazards: [], reason: error.message };
  }
}

export async function getLiveConditions({ lat, lon, roads = [] }) {
  const [weatherResult, incidentResult, floodResult] = await Promise.allSettled([
    loadWeather({ lat, lon }),
    loadOptionalHazards('INCIDENTS_API_URL', 'INCIDENTS_API_KEY', { lat, lon, roads }),
    loadOptionalHazards('FLOOD_API_URL', 'FLOOD_API_KEY', { lat, lon, roads }),
  ]);

  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const incidents = incidentResult.status === 'fulfilled' ? incidentResult.value : { available: false, hazards: [], reason: 'Incident provider unavailable.' };
  const floods = floodResult.status === 'fulfilled' ? floodResult.value : { available: false, hazards: [], reason: 'Flood provider unavailable.' };

  return {
    fetchedAt: new Date().toISOString(),
    weather,
    hazards: [...incidents.hazards, ...floods.hazards].map((hazard) => ({
      ...hazard,
      severity: hazard.severity || 'moderate',
      dataSource: hazard.dataSource || (hazard.type === 'flood' ? floods.source : incidents.source),
    })),
    availability: {
      weather: Boolean(weather),
      incidents: incidents.available,
      flooding: floods.available,
    },
    providerNotes: [incidents.reason, floods.reason].filter(Boolean),
  };
}