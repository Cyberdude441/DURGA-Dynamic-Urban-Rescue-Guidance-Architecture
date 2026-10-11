/**
 * DURGA: Dynamic Urban Rescue & Guidance Architecture
 * Server-Side Gemini AI Decision Support Layer
 * 
 * Strict Invariant: Gemini acts purely as a tactical decision-support advisor.
 * It NEVER replaces or alters deterministic DAA algorithm results (Dijkstra, FW, Greedy, Knapsack, MST).
 * Deterministic DAA computations remain the authoritative source of truth.
 */

/**
 * Checks Gemini configuration status.
 */
function getGeminiStatus() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('GEMINI_API_KEY');
  return {
    configured: Boolean(key && key.trim().length > 10),
    model: props.getProperty('GEMINI_MODEL') || 'gemini-1.5-flash',
    role: 'Tactical Advisory & Operational Intelligence',
  };
}

/**
 * Executes a structured prompt against Google Gemini API using UrlFetchApp.
 * 
 * @param {string} prompt User prompt
 * @param {string} systemInstruction Grounding instructions
 * @returns {string} Model response text
 */
function queryGeminiApi(prompt, systemInstruction = '') {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');

  if (!apiKey || apiKey.trim().length < 10) {
    return (
      '⚠️ Gemini AI decision support is not yet configured with an API key.\n\n' +
      'To enable AI analysis:\n' +
      '1. Open this Google Apps Script project\n' +
      '2. Go to Project Settings (⚙️) -> Script Properties\n' +
      '3. Add Property: GEMINI_API_KEY with your Google AI Studio key.\n\n' +
      'All deterministic DAA algorithms continue to execute with 100% mathematical precision.'
    );
  }

  // Use supported GA model endpoint (gemini-1.5-flash)
  const model = props.getProperty('GEMINI_MODEL') || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    const text = response.getContentText();

    if (status !== 200) {
      console.warn('Gemini API returned HTTP status: ' + status);
      return '⚠️ Gemini API advisory unavailable (HTTP ' + status + '). Deterministic DAA operations continue normally.';
    }

    const data = JSON.parse(text);
    const candidate = data.candidates && data.candidates[0];
    const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];

    return part && part.text ? part.text.trim() : 'No response text returned by Gemini.';
  } catch (error) {
    console.warn('Gemini execution error:', error.message);
    return '⚠️ Gemini advisory service temporarily unavailable: ' + error.message;
  }
}

/**
 * Generates tactical crisis analysis from deterministic simulation output.
 */
function geminiAnalyzeCrisis(scenarioData, customInstruction = '') {
  const systemInstruction =
    'You are DURGA-AI, an enterprise disaster management tactical advisor. ' +
    'Synthesize the deterministic simulation results provided into clear, concise operational recommendations for incident commanders. ' +
    'Do not hallucinate paths or alternative graph topologies. Ground your advice strictly in the provided data.';

  const prompt =
    'Analyze the following urban crisis situation and deterministic algorithm outputs:\n\n' +
    JSON.stringify(scenarioData, null, 2) +
    '\n\nOperational Commander Request: ' +
    (customInstruction || 'Provide tactical risk hotspots, bottleneck exits, and high-priority action items.');

  return queryGeminiApi(prompt, systemInstruction);
}

/**
 * Explains algorithmic invariants and mathematical proof details.
 */
function geminiExplainAlgorithm(resultData, question = '') {
  const systemInstruction =
    'You are an expert algorithm professor explaining DAA algorithms (Dijkstra, Floyd-Warshall, Greedy, 0/1 Knapsack, Kruskal, Prim) ' +
    'implemented in the DURGA platform. Provide rigorous mathematical and operational explanations.';

  const prompt =
    'Algorithm execution data:\n\n' +
    JSON.stringify(resultData, null, 2) +
    '\n\nStudent/Examiner Question: ' +
    (question || 'Explain how the algorithm reached this result, its greedy choice or DP recurrence, and its theoretical complexity.');

  return queryGeminiApi(prompt, systemInstruction);
}
