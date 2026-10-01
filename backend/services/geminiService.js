import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 20000);
const MAX_CONTEXT_BYTES = 1_500_000;

export class GeminiServiceError extends Error {
  constructor(message, code = 'GEMINI_ERROR', status = 502, providerStatus = null) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.status = status;
    this.providerStatus = providerStatus;
  }
}

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new GeminiServiceError(
      'Gemini is not configured. Add GEMINI_API_KEY to backend/.env.',
      'GEMINI_API_KEY_MISSING',
      503
    );
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function serializeContext(payload) {
  let serialized;
  try {
    serialized = JSON.stringify(payload ?? {});
  } catch {
    throw new GeminiServiceError('The supplied DURGA context is not serializable.', 'INVALID_AI_CONTEXT', 400);
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTEXT_BYTES) {
    throw new GeminiServiceError('The supplied DURGA context is too large for AI analysis.', 'AI_CONTEXT_TOO_LARGE', 413);
  }
  return serialized;
}

function parseResponse(text) {
  if (!text) throw new GeminiServiceError('Gemini returned an empty response.', 'GEMINI_EMPTY_RESPONSE');
  try {
    return JSON.parse(text);
  } catch {
    return { summary: text };
  }
}

function buildPrompt(operation, payload, instruction = '') {
  const context = serializeContext(payload);
  return `You are the DURGA AI decision-support layer. DURGA's deterministic algorithms and simulation outputs are the source of truth. Never replace, rerun, override, or invent algorithm results. Do not claim live data that is absent from the supplied context. Clearly distinguish LIVE, STATIC, and SYNTHETIC data. Return concise, operationally useful JSON with these keys when applicable: summary, findings, bottlenecks, hazards, routeAlternatives, resourceAlternatives, confidence, dataLimitations.

Requested operation: ${operation}
Additional operator instruction: ${instruction || 'Analyze the supplied DURGA results.'}

Authoritative DURGA context:
${context}`;
}

export async function askGemini(operation, payload, instruction) {
  const client = getClient();
  let timeoutId;
  try {
    const request = client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: buildPrompt(operation, payload, instruction),
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });
    const timeoutResponse = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new GeminiServiceError('Gemini request timed out.', 'GEMINI_TIMEOUT', 504, '504 / Timeout')), REQUEST_TIMEOUT_MS);
    });
    const response = await Promise.race([request, timeoutResponse]);
    return {
      model: DEFAULT_MODEL,
      advisory: true,
      sourceOfTruth: 'DURGA deterministic algorithms and simulation data',
      result: parseResponse(response.text),
    };
  } catch (error) {
    if (error instanceof GeminiServiceError) throw error;
    if (error.name === 'AbortError') {
      throw new GeminiServiceError('Gemini request timed out.', 'GEMINI_TIMEOUT', 504);
    }
    console.error('[Gemini Error]:', error.message);
    const providerCode = Number(error?.error?.code || error?.status);
    const providerStatus = providerCode === 503
      ? '503 / High Demand'
      : providerCode === 429
      ? '429 / Rate Limited'
      : null;
    throw new GeminiServiceError('Gemini is temporarily unavailable.', 'GEMINI_UNAVAILABLE', 502, providerStatus);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getGeminiConfiguration() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: DEFAULT_MODEL,
    timeoutMs: REQUEST_TIMEOUT_MS,
    advisoryOnly: true,
  };
}