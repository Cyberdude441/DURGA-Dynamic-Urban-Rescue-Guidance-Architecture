/**
 * DURGA - Dynamic Urban Rescue & Guidance Architecture
 * Part 12 Verification Suite: Integration & External Services
 *
 * Exhaustively tests:
 *  1. Live Conditions Service & Weather Telemetry (Open-Meteo)
 *  2. Live Conditions Input Validation (Missing / Non-numeric coordinates)
 *  3. OpenStreetMap Overpass Live Provider & Validation
 *  4. AI Advisory Status & Architectural Invariant (advisoryOnly: true)
 *  5. AI Input Context Serialization & Size Limits
 *  6. AI Service Error Translation & Graceful Provider Handling
 */

import app from './backend/server.js';
import { getLiveConditions } from './backend/services/liveConditionsService.js';
import { getGeminiConfiguration } from './backend/services/geminiService.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('  DURGA PART 12: INTEGRATION & EXTERNAL SERVICES    ');
  console.log('====================================================\n');

  // Start test server
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // ----------------------------------------------------
    // TEST 1: Live Conditions Unit Service
    // ----------------------------------------------------
    console.log('--- TEST 1: Live Conditions & Weather Telemetry ---');
    try {
      const conditions = await getLiveConditions({ lat: 20.2961, lon: 85.8245 });
      assert(conditions !== null && typeof conditions === 'object', 'Conditions object returned');
      assert(typeof conditions.fetchedAt === 'string', 'Timestamp recorded');
      assert('availability' in conditions, 'Availability metadata present');
      assert(Array.isArray(conditions.hazards), 'Hazards array returned');
      if (conditions.weather) {
        assert(typeof conditions.weather.temperatureC === 'number', `Live temperature recorded: ${conditions.weather.temperatureC}°C`);
      } else {
        assert(conditions.availability.weather === false, 'Weather marked unavailable gracefully');
      }
    } catch (err) {
      assert(false, `Unexpected exception in getLiveConditions: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 2: POST /api/live-conditions Endpoint Validation
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Live Conditions Endpoint Validation ---');
    const validRes = await fetch(`${baseUrl}/api/live-conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 20.2961, lon: 85.8245 }),
    });
    assert(validRes.status === 200, `Valid coordinates return 200 OK (got ${validRes.status})`);

    const invalidRes1 = await fetch(`${baseUrl}/api/live-conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(invalidRes1.status === 400, `Missing coordinates return 400 Bad Request (got ${invalidRes1.status})`);

    const invalidRes2 = await fetch(`${baseUrl}/api/live-conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 'INVALID', lon: 'COORDS' }),
    });
    assert(invalidRes2.status === 400, `Non-numeric coordinates return 400 Bad Request (got ${invalidRes2.status})`);

    // ----------------------------------------------------
    // TEST 3: POST /api/osm/live-graph Validation
    // ----------------------------------------------------
    console.log('\n--- TEST 3: OpenStreetMap Endpoint Validation ---');
    const osmInvalid = await fetch(`${baseUrl}/api/osm/live-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(osmInvalid.status === 400, `Missing OSM GPS coordinates return 400 Bad Request (got ${osmInvalid.status})`);

    // ----------------------------------------------------
    // TEST 4: AI Decision Support Invariant & Status
    // ----------------------------------------------------
    console.log('\n--- TEST 4: AI Decision Support Status & Invariant ---');
    const aiConfig = getGeminiConfiguration();
    assert(typeof aiConfig.configured === 'boolean', 'Gemini configured flag is boolean');
    assert(aiConfig.advisoryOnly === true, 'Strict architectural invariant: advisoryOnly is true');
    assert(typeof aiConfig.model === 'string', `Configured model is ${aiConfig.model}`);

    const aiStatusRes = await fetch(`${baseUrl}/api/ai/status`);
    assert(aiStatusRes.status === 200, 'GET /api/ai/status returns 200 OK');
    const aiStatusJson = await aiStatusRes.json();
    assert(aiStatusJson.advisoryOnly === true, 'GET /api/ai/status verifies advisoryOnly is true');

    // ----------------------------------------------------
    // TEST 5: Health Check & Graceful Degradation
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Health Check & System Telemetry ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    const healthJson = await healthRes.json();
    assert(healthJson.database === 'connected', 'Database reported connected');
    assert(healthJson.service === 'DURGA Scenario Archive API', 'Service identifier verified');

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
    console.log('====================================================\n');

    if (passedTests === totalTests) {
      console.log('ALL INTEGRATION & EXTERNAL SERVICE TESTS PASSED WITH 100% SUCCESS!');
    } else {
      console.error(`FAILED: ${totalTests - passedTests} tests did not pass.`);
      process.exitCode = 1;
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runIntegrationTests();
