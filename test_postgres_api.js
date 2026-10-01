/**
 * DURGA - Test Suite for PostgreSQL Integration & REST API (Part 11)
 * Tests:
 *  - Database connection
 *  - List scenarios (GET /api/scenarios)
 *  - View scenario with relations (GET /api/scenarios/:id)
 *  - Create scenario with transaction & real simulation (POST /api/scenarios)
 *  - Update scenario (PUT /api/scenarios/:id)
 *  - Re-run scenario with fresh execution (POST /api/scenarios/:id/rerun)
 *  - Delete scenario with cascade (DELETE /api/scenarios/:id)
 *  - Error handling (invalid ID, not found, validation)
 */

import http from 'http';
import app from './backend/server.js';
import { PrismaClient } from './backend/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient();

console.log('====================================================');
console.log('  DURGA PART 11: POSTGRESQL + ARCHIVE API TESTS     ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       Details: ${details}`);
    process.exitCode = 1;
  }
}

async function runApiTests() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on ${baseUrl}\n`);

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check & Database Connection
    // ----------------------------------------------------
    console.log('--- TEST 1: Healthcheck & PostgreSQL Connectivity ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns 200 OK');
    assert(health.database === 'connected', 'PostgreSQL database connected');

    // ----------------------------------------------------
    // TEST 2: List Scenarios
    // ----------------------------------------------------
    console.log('\n--- TEST 2: List Scenarios (GET /api/scenarios) ---');
    const listRes = await fetch(`${baseUrl}/api/scenarios`);
    const scenarios = await listRes.json();
    assert(listRes.status === 200, 'List endpoint returns 200 OK');
    assert(Array.isArray(scenarios), 'Returned array of scenarios');
    assert(scenarios.length >= 4, `At least 4 seeded scenarios present (got ${scenarios.length})`);

    // Verify first scenario structure
    const first = scenarios[0];
    assert(typeof first.id === 'string', `Scenario has valid ID: ${first.id}`);
    assert(typeof first.name === 'string', `Scenario has name: ${first.name}`);
    assert(Array.isArray(first.algorithmResults), 'Scenario includes algorithm results summary');

    // ----------------------------------------------------
    // TEST 3: Get Scenario Details by ID
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Scenario Details (GET /api/scenarios/:id) ---');
    const detailRes = await fetch(`${baseUrl}/api/scenarios/${first.id}`);
    const detail = await detailRes.json();
    assert(detailRes.status === 200, 'Detail endpoint returns 200 OK');
    assert(detail.id === first.id, 'Returned requested scenario ID');
    assert(detail.emergencies.length >= 1, 'Includes Emergency relational entity');
    assert(detail.algorithmResults.length === 6, `Includes all 6 Algorithm Results (got ${detail.algorithmResults.length})`);
    assert(detail.evacuationPlans.length >= 1, 'Includes Evacuation Plan relational entity');
    assert(detail.resourceAllocations.length === 3, `Includes 3 Resource Allocations (got ${detail.resourceAllocations.length})`);

    // Verify Algorithm Names in storage
    const algoNames = detail.algorithmResults.map((a) => a.algorithmName);
    assert(algoNames.includes('Dijkstra'), 'Stored Dijkstra results');
    assert(algoNames.includes('Floyd-Warshall'), 'Stored Floyd-Warshall results');
    assert(algoNames.includes('Greedy'), 'Stored Greedy results');
    assert(algoNames.includes('Dynamic Programming'), 'Stored Dynamic Programming results');
    assert(algoNames.includes('Kruskal'), 'Stored Kruskal results');
    assert(algoNames.includes('Prim'), 'Stored Prim results');

    // Verify algorithm values are real non-fabricated numbers
    const dijResult = detail.algorithmResults.find((a) => a.algorithmName === 'Dijkstra');
    assert(dijResult.executionTime > 0, `Dijkstra execution time is positive: ${dijResult.executionTime} ms`);
    assert(dijResult.nodesVisited > 0, `Dijkstra nodes visited > 0 (${dijResult.nodesVisited})`);
    assert(dijResult.edgesProcessed > 0, `Dijkstra edges processed > 0 (${dijResult.edgesProcessed})`);
    assert(dijResult.timeComplexity === 'O((V + E) log V)', 'Dijkstra complexity preserved');

    // ----------------------------------------------------
    // TEST 4: Create Scenario with Transaction
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Create Scenario (POST /api/scenarios) ---');
    const newScenarioPayload = {
      name: 'Test Industrial Ammonia Leak',
      description: 'Synthetic test scenario for automated verification of database transaction.',
      emergencyType: 'Chemical Leak',
      emergencyLocation: 'B16',
      peopleAffected: 950,
      riskLevel: 'CRITICAL',
      blockedRoads: ['E57', 'E58'],
      blockedBuildings: ['B16'],
      exitAvailability: {
        EX01: { available: true, capacity: 5000 },
        EX02: { available: true, capacity: 5000 },
        EX03: { available: false, capacity: 0 },
        EX04: { available: true, capacity: 3000 },
      },
      fleetBudget: { ambulances: 15, rescueTeams: 10, emergencyVehicles: 8 },
    };

    const createRes = await fetch(`${baseUrl}/api/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newScenarioPayload),
    });
    const created = await createRes.json();
    assert(createRes.status === 201, 'Create endpoint returns 201 Created');
    assert(created.name === newScenarioPayload.name, 'Created scenario matches name');
    assert(created.algorithmResults.length === 6, 'Created all 6 algorithm results in transaction');
    assert(created.evacuationPlans.length === 1, 'Created evacuation plan in transaction');
    assert(created.resourceAllocations.length === 3, 'Created 3 resource allocations in transaction');

    const createdId = created.id;

    // ----------------------------------------------------
    // TEST 5: Update Scenario Metadata
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Update Scenario (PUT /api/scenarios/:id) ---');
    const updateRes = await fetch(`${baseUrl}/api/scenarios/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Industrial Ammonia Leak (Tier 2)',
        peopleAffected: 1100,
      }),
    });
    const updated = await updateRes.json();
    assert(updateRes.status === 200, 'Update returns 200 OK');
    assert(updated.name === 'Updated Industrial Ammonia Leak (Tier 2)', 'Updated name verified');
    assert(updated.peopleAffected === 1100, 'Updated affected people verified');

    // ----------------------------------------------------
    // TEST 6: Re-run Scenario with Live Algorithmic Execution
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Re-run Scenario (POST /api/scenarios/:id/rerun) ---');
    const rerunRes = await fetch(`${baseUrl}/api/scenarios/${createdId}/rerun`, {
      method: 'POST',
    });
    const rerunData = await rerunRes.json();
    assert(rerunRes.status === 200, 'Re-run returns 200 OK');
    assert(rerunData.success === true, 'Re-run marked success');
    assert(rerunData.scenario.algorithmResults.length === 6, 'Re-generated all 6 algorithm results');
    assert(rerunData.simulationMetrics.feasibilityScore > 0, `Feasibility score computed: ${rerunData.simulationMetrics.feasibilityScore}%`);

    // ----------------------------------------------------
    // TEST 7: Delete Scenario & Cascade Verification
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Delete Scenario & Cascade (DELETE /api/scenarios/:id) ---');
    const deleteRes = await fetch(`${baseUrl}/api/scenarios/${createdId}`, {
      method: 'DELETE',
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, 'Delete returns 200 OK');
    assert(deleteData.success === true, 'Delete marked success');

    // Verify records are gone from database
    const checkScenario = await prisma.scenario.findUnique({ where: { id: createdId } });
    assert(checkScenario === null, 'Scenario removed from database');

    const checkAlgos = await prisma.algorithmResult.findMany({ where: { scenarioId: createdId } });
    assert(checkAlgos.length === 0, 'Cascade deleted associated algorithm results');

    const checkPlans = await prisma.evacuationPlan.findMany({ where: { scenarioId: createdId } });
    assert(checkPlans.length === 0, 'Cascade deleted associated evacuation plans');

    // ----------------------------------------------------
    // TEST 8: Error Handling (404 and Validation)
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Error Handling & Status Codes ---');
    const notFoundRes = await fetch(`${baseUrl}/api/scenarios/non-existent-id-12345`);
    assert(notFoundRes.status === 404, 'Returns 404 for non-existent scenario ID');

    const invalidCreateRes = await fetch(`${baseUrl}/api/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(invalidCreateRes.status === 400, 'Returns 400 for missing scenario name');

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
    console.log('====================================================\n');

    if (passedTests === totalTests) {
      console.log('ALL POSTGRESQL & SCENARIO API TESTS PASSED WITH 100% SUCCESS!');
    } else {
      console.error(`FAILED: ${totalTests - passedTests} tests did not pass.`);
      process.exitCode = 1;
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runApiTests();
