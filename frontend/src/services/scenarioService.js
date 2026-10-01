/**
 * DURGA - Scenario Archive API Service
 * Connects frontend to the PostgreSQL Express backend via Prisma ORM.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Check backend and PostgreSQL database connectivity
 */
export async function checkDatabaseHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'disconnected',
      database: 'disconnected',
      error: err.message || 'Cannot reach DURGA PostgreSQL backend',
    };
  }
}

/**
 * Retrieve all archived scenarios with optional search, filter, and sorting
 *
 * @param {Object} [params] - { type, search, sortBy, order }
 * @returns {Promise<Array<Object>>}
 */
export async function getScenarios(params = {}) {
  const query = new URLSearchParams();
  if (params.type && params.type !== 'ALL') query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.order) query.set('order', params.order);

  const url = `${API_BASE_URL}/scenarios${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch scenarios (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Retrieve complete scenario details by ID including relations
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getScenarioById(id) {
  if (!id) throw new Error('Scenario ID is required.');
  const res = await fetch(`${API_BASE_URL}/scenarios/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch scenario ${id}`);
  }
  return await res.json();
}

/**
 * Create a new disaster scenario and execute real simulation in a PostgreSQL transaction
 *
 * @param {Object} scenarioData
 * @returns {Promise<Object>}
 */
export async function createScenario(scenarioData) {
  const res = await fetch(`${API_BASE_URL}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenarioData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create scenario (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Update scenario metadata
 *
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateScenario(id, data) {
  const res = await fetch(`${API_BASE_URL}/scenarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update scenario ${id}`);
  }
  return await res.json();
}

/**
 * Re-run a scenario through the DURGA multi-algorithm engine and atomically update results
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function rerunScenario(id) {
  const res = await fetch(`${API_BASE_URL}/scenarios/${id}/rerun`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to re-run scenario ${id}`);
  }
  return await res.json();
}

/**
 * Delete a scenario and all related records with cascade
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteScenario(id) {
  const res = await fetch(`${API_BASE_URL}/scenarios/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete scenario ${id}`);
  }
  return await res.json();
}

export default {
  checkDatabaseHealth,
  getScenarios,
  getScenarioById,
  createScenario,
  updateScenario,
  rerunScenario,
  deleteScenario,
};
