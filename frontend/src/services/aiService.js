const DEFAULT_API_BASE = 'http://localhost:5000';

async function requestAi(path, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE}/api/ai/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `AI request failed (${response.status})`);
      error.providerStatus = payload.providerStatus || null;
      throw error;
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function analyzeWithGemini(simulation) {
  return requestAi('analyze', { simulation });
}

export function explainWithGemini(results, question) {
  return requestAi('explain', { results, question });
}

export function optimizeWithGemini(results) {
  return requestAi('optimize', { results });
}