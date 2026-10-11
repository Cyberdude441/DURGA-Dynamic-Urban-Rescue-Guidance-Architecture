/**
 * DURGA: Dynamic Urban Rescue & Guidance Architecture
 * Public Server-Side API Endpoints (google.script.run callable)
 */

/**
 * Health check endpoint reporting engine status and Google Sheets database health.
 */
function getHealth() {
  const dbHealth = dbGetHealth();
  return {
    status: dbHealth.status,
    database: dbHealth.database,
    engine: 'DURGA V8 Algorithmic Engine',
    service: 'Google Apps Script Cloud Infrastructure',
    spreadsheetUrl: dbHealth.spreadsheetUrl || '',
    scenarioCount: dbHealth.scenarioCount || 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Returns list of crisis scenarios with relational summaries.
 * @param {Object} filter { type, search, sortBy, order }
 */
function getScenarios(filter = {}) {
  try {
    return dbGetScenarios(filter);
  } catch (error) {
    console.error('getScenarios error:', error.message);
    // Fallback to default local scenarios if spreadsheet temporarily unavailable
    return getDefaultScenarios().map((s, idx) => ({
      id: `default-${idx}`,
      ...s,
      createdAt: new Date().toISOString(),
      algorithmResults: [],
      evacuationPlans: [],
    }));
  }
}

/**
 * Returns full scenario details with all associated runs, plans, and allocations.
 * @param {string} id Scenario identifier
 */
function getScenarioById(id) {
  try {
    return dbGetScenarioById(id);
  } catch (error) {
    console.error('getScenarioById error:', error.message);
    throw error;
  }
}

/**
 * Creates and persists a scenario atomically across Google Sheets tables.
 * @param {Object} data Scenario input payload
 */
function createScenario(data) {
  try {
    return dbCreateScenario(data);
  } catch (error) {
    console.error('createScenario error:', error.message);
    throw error;
  }
}

/**
 * Deletes a scenario and cascades deletion across child tables.
 * @param {string} id Scenario identifier
 */
function deleteScenario(id) {
  try {
    return dbDeleteScenario(id);
  } catch (error) {
    console.error('deleteScenario error:', error.message);
    throw error;
  }
}

/**
 * Seeds default crisis scenarios with 100% real deterministic DAA computations.
 */
function seedDefaultScenarios() {
  try {
    return dbSeedDefaultScenarios();
  } catch (error) {
    console.error('seedDefaultScenarios error:', error.message);
    throw error;
  }
}

/**
 * Runs DAA algorithms on demand for a scenario or custom graph configuration.
 */
function runAlgorithms(scenarioId, params = {}) {
  const graph = getCanonicalUrbanGraph();
  let scenario = null;

  if (scenarioId) {
    try {
      scenario = dbGetScenarioById(scenarioId);
    } catch (e) {}
  }

  const config = {
    disasterType: scenario ? scenario.emergencyType : params.emergencyType || 'Fire',
    emergencyLocation: scenario ? scenario.emergencyLocation : params.emergencyLocation || 'B01',
    affectedPeople: scenario ? scenario.peopleAffected : params.peopleAffected || 1200,
    riskLevel: scenario ? scenario.riskLevel : params.riskLevel || 'CRITICAL',
    blockedRoads: params.blockedRoads || (scenario && scenario.blockedRoads) || [],
    fleetBudget: params.fleetBudget || { ambulances: 18, rescueTeams: 12, emergencyVehicles: 10 },
  };

  const simulation = runFullEmergencySimulation(graph, config);
  const fwResult = runFloydWarshall(graph, { blockedEdges: config.blockedRoads });

  return {
    scenarioId,
    config,
    dijkstra: simulation.dijkstraResults.epicenterToExit,
    floydWarshall: fwResult,
    greedy: simulation.greedyResult,
    knapsack: simulation.knapsackResults.ambulances,
    kruskal: simulation.kruskalResult,
    prim: simulation.primResult,
    evacuationPlan: simulation.evacuationPlan,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Queries OpenStreetMap Overpass API around real GPS coordinates.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {number} radiusMeters Radius
 */
function getLiveOsmGraph(lat, lon, radiusMeters) {
  try {
    return fetchOverpassLiveGraph(lat, lon, radiusMeters);
  } catch (error) {
    console.error('getLiveOsmGraph error:', error.message);
    throw error;
  }
}

/**
 * Queries real-time Open-Meteo weather and verified hazard conditions.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 */
function getLiveConditions(lat, lon) {
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    throw new Error('Valid GPS latitude and longitude are required.');
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m`;

  let weather = null;
  try {
    const res = UrlFetchApp.fetch(weatherUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (data && data.current) {
        weather = {
          temperatureC: data.current.temperature_2m,
          humidityPercent: data.current.relative_humidity_2m,
          precipitationMm: data.current.precipitation,
          windSpeedKmh: data.current.wind_speed_10m,
          pressureHpa: data.current.surface_pressure,
          condition: data.current.precipitation > 0 ? 'Rainy' : 'Clear',
          provider: 'Open-Meteo Atmospheric Telemetry',
          status: 'LIVE',
        };
      }
    }
  } catch (e) {
    console.warn('Weather fetch failed:', e.message);
  }

  return {
    gps: { lat: Number(lat), lon: Number(lon), status: 'LIVE' },
    weather: weather || { status: 'UNAVAILABLE', error: 'Weather provider unreachable' },
    hazards: { status: 'NO VERIFIED FEED', notice: 'No municipal hazard feed configured' },
    roads: { status: 'AWAITING QUERY' },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Invokes Gemini AI decision support copilot.
 * @param {string} taskType 'analyze' | 'explain'
 * @param {Object} payload Scenario or algorithm data
 * @param {string} prompt Custom inquiry
 */
function askGemini(taskType, payload, prompt) {
  if (taskType === 'explain') {
    return { text: geminiExplainAlgorithm(payload, prompt) };
  }
  return { text: geminiAnalyzeCrisis(payload, prompt) };
}
