/**
 * DURGA: Dynamic Urban Rescue & Guidance Architecture
 * Google Apps Script Web Application Entry Point
 * 
 * Analyze. Optimize. Guide. Rescue.
 */

/**
 * Main web application HTTP GET handler.
 * Serves the DURGA emergency command interface.
 * 
 * @param {Object} e HTTP request event object
 * @returns {HtmlOutput} Evaluated HTML Service output
 */
function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile('Index');
    
    // Pass query parameters to template if any
    template.query = e && e.parameter ? e.parameter : {};
    
    const output = template.evaluate();
    output.setTitle('DURGA: Dynamic Urban Rescue & Guidance Architecture');
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return output;
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:24px;color:#991b1b;background:#fef2f2;border-radius:8px;margin:20px;">' +
      '<h2>DURGA Application Error</h2>' +
      '<p>Failed to initialize HTML Service: ' + error.message + '</p>' +
      '</div>'
    ).setTitle('DURGA - Initialization Error');
  }
}

/**
 * Helper to include modular HTML files (CSS, JS, partials) into templates.
 * 
 * @param {string} filename Name of the HTML file without extension
 * @returns {string} Raw HTML content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Container-bound spreadsheet trigger: adds a custom menu on open.
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🛡️ DURGA Command')
      .addItem('🚀 Launch Web App URL', 'showWebAppUrl')
      .addItem('🗄️ Initialize Database Sheets', 'menuInitDatabase')
      .addItem('🌱 Seed Default Scenarios', 'menuSeedScenarios')
      .addSeparator()
      .addItem('📊 Run Diagnostic Health Check', 'menuRunDiagnostics')
      .addToUi();
  } catch (err) {
    // Silent fail if running as standalone script without bound spreadsheet UI
  }
}

/**
 * Shows the deployed Web App URL in a modal.
 */
function showWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  const ui = SpreadsheetApp.getUi();
  if (url) {
    ui.alert('DURGA Web Application URL', 'Open your web app at:\n' + url, ui.ButtonSet.OK);
  } else {
    ui.alert('Deployment Notice', 'The Web App is not deployed yet. Go to:\nDeploy -> New deployment -> Web app', ui.ButtonSet.OK);
  }
}

/**
 * Menu action to initialize database sheets.
 */
function menuInitDatabase() {
  const result = initDatabase();
  SpreadsheetApp.getUi().alert('Database Setup', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menu action to seed default scenarios.
 */
function menuSeedScenarios() {
  const count = seedDefaultScenarios();
  SpreadsheetApp.getUi().alert('Database Seed', 'Successfully seeded ' + count + ' default emergency scenarios.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menu action to run diagnostics.
 */
function menuRunDiagnostics() {
  const health = getHealth();
  SpreadsheetApp.getUi().alert(
    'DURGA System Health',
    'Status: ' + health.status + '\n' +
    'Database: ' + health.database + '\n' +
    'Engine: ' + health.engine + '\n' +
    'Scenarios Count: ' + health.scenarioCount + '\n' +
    'Timestamp: ' + health.timestamp,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
