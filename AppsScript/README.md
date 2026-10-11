# DURGA: Google Apps Script Edition
> **Dynamic Urban Rescue & Guidance Architecture**  
> *Analyze. Optimize. Guide. Rescue.*

This directory contains the **fully converted, production-ready Google Apps Script edition** of the DURGA platform. It allows the complete emergency command-and-control platform, its 6 core DAA algorithms, interactive spatial visualizers, live voice guidance, and database archive to run directly as a **Google Apps Script Web Application** backed by **Google Sheets** and Google Cloud infrastructure with zero server hosting costs.

---

## 1. Project Structure

```text
AppsScript/
├── appsscript.json   # Apps Script manifest (V8 runtime, Web App deployment, OAuth scopes)
├── Code.gs           # Web App entry point (doGet, include helper, spreadsheet triggers)
├── Database.gs       # Google Sheets relational storage engine (PostgreSQL/Prisma replacement)
├── Algorithms.gs     # 100% custom DAA algorithmic suite (Dijkstra, FW, Greedy, Knapsack, MST)
├── OsmService.gs     # OpenStreetMap Overpass live provider with multi-mirror failover
├── GeminiService.gs  # Google Gemini AI tactical decision-support copilot via UrlFetchApp
├── Utils.gs          # Canonical 47-node/58-road graph topology, Haversine & cost formulas
├── API.gs            # Public RPC server bridge (google.script.run callable endpoints)
├── Index.html        # Main HTML layout & view container
├── CSS.html          # Light green + white enterprise tactical command styling
├── JS.html           # Reactive client controller, interactive SVG visualizer & Voice Guidance
└── README.md         # Deployment and configuration documentation
```

---

## 2. Architectural Conversions & Mappings

| Feature | Original Full-Stack Architecture | Converted Google Apps Script Edition |
| :--- | :--- | :--- |
| **Server Engine** | Node.js 22 + Express 4 (`backend/server.js`) | Google Apps Script V8 Runtime (`Code.gs` + `API.gs`) |
| **Web Entrypoint** | Vite Dev Server / Node Port 5000 | `doGet(e)` via `HtmlService.createTemplateFromFile('Index')` |
| **Client-Server Comm** | REST API (`fetch('/api/...')`) | Asynchronous RPC bridge via `google.script.run` |
| **Database Storage** | PostgreSQL 18 + Prisma ORM 6 | Google Sheets Storage Engine (`SpreadsheetApp` via `Database.gs`) |
| **DAA Algorithms** | ES Modules in `backend/algorithms/` | Native V8 JavaScript in `Algorithms.gs` + client-side execution |
| **OSM Live Provider** | Backend Node service with `fetch` | Server-side `UrlFetchApp` with multi-mirror retry (`OsmService.gs`) |
| **Weather Telemetry** | Open-Meteo HTTP API | `UrlFetchApp` server proxy + direct browser fetch (`API.gs`) |
| **AI Decision Support**| Google GenAI Node SDK (`geminiService.js`)| REST API via `UrlFetchApp` using `PropertiesService` |
| **Voice Navigation** | Browser Web Speech API | Browser Web Speech API (`SpeechSynthesisUtterance`) preserved |
| **Spatial Graph** | React Flow (`@xyflow/react`) | Native Pan/Zoom Interactive SVG Canvas (`JS.html`) |

---

## 3. Required Script Properties (API Keys & Config)

All credentials must be stored securely using `PropertiesService`. **Never hardcode secrets in source code.**

To add Script Properties:
1. Open the script in the **Google Apps Script Editor**.
2. Click **Project Settings** (⚙️ gear icon in the left sidebar).
3. Scroll down to **Script Properties** and click **Edit script properties**.
4. Add the following properties:

| Property Name | Required? | Default / Description |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | Optional | Your Google AI Studio API key for tactical crisis advisory text. (Algorithms run without this). |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-1.5-flash` if omitted. |
| `SPREADSHEET_ID` | Optional | ID of an existing Google Spreadsheet. If omitted, DURGA **automatically creates and initializes a dedicated spreadsheet** named `DURGA Emergency Architecture Database`. |
| `OVERPASS_API_URL` | Optional | Custom OpenStreetMap Overpass mirror URL. |

---

## 4. Deployment Methods

### Method 1: Google Apps Script Web Editor (Recommended & Quickest)

1. Open [script.google.com](https://script.google.com) and click **New project**.
2. Name the project `DURGA Urban Rescue Architecture`.
3. In the left panel, create the following script (`.gs`) and HTML (`.html`) files and copy the corresponding code from this `AppsScript/` folder:
   - `Code.gs`
   - `Database.gs`
   - `Algorithms.gs`
   - `OsmService.gs`
   - `GeminiService.gs`
   - `Utils.gs`
   - `API.gs`
   - `Index.html`
   - `CSS.html`
   - `JS.html`
4. Replace the contents of `appsscript.json` (Click **Project Settings** -> check *"Show 'appsscript.json' manifest file in editor"*, then paste `appsscript.json`).
5. Click **Deploy** -> **New deployment**.
6. Select type: **Web app** (⚙️ gear icon).
   - **Description**: `DURGA Production Release 2.0`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` (or `Anyone within your organization`)
7. Click **Deploy**.
8. Authorize permissions when prompted by Google (Access to Google Sheets & External Requests).
9. Copy the **Web App URL** (e.g., `https://script.google.com/macros/s/.../exec`) and open it in any browser!

---

### Method 2: Google Clasp Command Line Deployment

If you prefer using the command line:

1. Install Google Clasp globally:
   ```bash
   npm install -g @google/clasp
   ```
2. Login to your Google Account:
   ```bash
   clasp login
   ```
3. Navigate to the `AppsScript` directory:
   ```bash
   cd "C:\Users\KIIT\Desktop\DAA\DURGA Dynamic Urban Rescue & Guidance Architecture\AppsScript"
   ```
4. Create a new Apps Script Web App project:
   ```bash
   clasp create --title "DURGA Dynamic Urban Rescue" --type webapp
   ```
5. Push all code files to Google Apps Script:
   ```bash
   clasp push
   ```
6. Deploy the web application:
   ```bash
   clasp deploy --description "DURGA Web App Production 2.0"
   ```
7. Open the project in the editor or view deployment URLs:
   ```bash
   clasp open
   ```

---

## 5. Google Sheets Database Auto-Initialization

The database replaces PostgreSQL with a Google-native relational spreadsheet with 5 interconnected sheets:
1. `Scenarios`: Parent crisis scenarios (name, disaster type, location, people affected, risk level).
2. `Emergencies`: Crisis severity records, casualties, containment targets.
3. `AlgorithmResults`: Execution times, visited node counts, and costs for Dijkstra, Floyd-Warshall, Greedy, Knapsack, Kruskal, and Prim.
4. `EvacuationPlans`: Primary and secondary exit designations, transit times, and ordered waypoints.
5. `ResourceAllocations`: First-responder units deployed (ambulances, rescue teams, HAZMAT).

**Zero Manual Setup Required**:
- On initial launch, the system automatically checks if a database spreadsheet exists. If not, it creates `DURGA Emergency Architecture Database` on Google Drive, styles the header rows in dark green (`#166534`), and pre-seeds the 4 canonical emergency scenarios (Academic Block Fire, Southern Flood, Fault Rupture, Chemical Plume).

---

## 6. Migration Limitations & Trade-offs

1. **Execution Time Limit**:
   - Google Apps Script enforces a 6-minute maximum execution timeout per server call.
   - *Impact*: Negligible. All 6 DAA algorithms execute in under **10 milliseconds** on the urban graph.
2. **PostgreSQL vs Google Sheets**:
   - Replaces SQL queries with Google Sheets rows. Google Sheets supports millions of cells, which easily accommodates thousands of disaster scenario records.
3. **React / Vite vs HTML Service**:
   - The React 19/Vite build was converted into native, zero-dependency HTML/CSS/JavaScript with responsive SVG graphics, eliminating a 450 MB `node_modules` dependency while keeping 100% of the UI design, light green palette, animations, and voice navigation.
4. **Live Geolocation & Audio**:
   - Runs client-side in the browser via `navigator.geolocation` and `window.speechSynthesis` (Web Speech API). When hosted in an `iframe` by Google, Apps Script's `HtmlService.XFrameOptionsMode.ALLOWALL` ensures full sensor and audio access.
