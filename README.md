# DURGA: Dynamic Urban Rescue & Guidance Architecture
> *Analyze. Optimize. Guide. Rescue.*

An advanced, production-grade command-and-control platform for municipal emergency disaster management, developed as an academic capstone project in **Design and Analysis of Algorithms (DAA)**.

---

## 1. Problem Statement & Motivation

During catastrophic metropolitan crises—such as high-intensity commercial firestorms, structural seismic collapses, toxic chemical plume leaks, or flash inundation surges—traditional navigation software (e.g., standard GPS mapping) fails catastrophically:
1. **Static vs. Dynamic Impedance**: Physical distance does not reflect thermal hazard radiation, toxic gas concentrations, or collapsing debris.
2. **Bottleneck Stampedes**: Naively funneling all civilians to the geographically nearest exit induces deadly crush dynamics and arterial road blockages.
3. **Constrained Resource Dispatch**: First-responder assets (specialized trauma ambulances, heavy urban search-and-rescue squads, HAZMAT suppression engines) are strictly finite and must be allocated to maximize lives saved under multi-dimensional knapsack constraints.
4. **Severed Communication & Power Networks**: Vital telemetry corridors are disrupted, requiring the immediate computation of resilient minimum-cost spanning backbones to reconnect safe havens.

**DURGA** solves this complex urban challenge by modeling metropolitan transit networks as dynamic mathematical graphs and applying a unified, 12-stage algorithmic pipeline implemented entirely from scratch without external black-box algorithm libraries.

---

## 2. The Four Operational Pillars

```
+-----------------------------------------------------------------------------------+
|                                  D U R G A                                        |
|              Dynamic Urban Rescue & Guidance Architecture                         |
+-----------------------------------------------------------------------------------+
       |                          |                          |                      |
       v                          v                          v                      v
+--------------+          +--------------+          +--------------+          +--------------+
| 01. ANALYZE  |          | 02. OPTIMIZE |          |  03. GUIDE   |          |  04. RESCUE  |
| Hazard Feeds | -------> | Egress Gates | -------> | Shortest Safe| -------> | Spanning Grid|
| & Road Graph |          | & Fleet DP   |          | Waypoints    |          | Backbones    |
+--------------+          +--------------+          +--------------+          +--------------+
```

1. **ANALYZE (Threat Perception & Topology Ingestion)**:
   Continuously ingests urban spatial graph topology ($47$ vertices, $58$ bidirectional arterial corridors, $4$ perimeter exit portals, $2$ level-1 trauma centers, $5$ high-density evacuation zones, and $2$ first-responder staging depots).
2. **OPTIMIZE (Flow Network & Multi-Fleet Scheduling)**:
   Solves bottleneck egress assignment using capacity-constrained greedy heuristic triage, coupled with $0/1$ Knapsack Dynamic Programming for optimal life-preservation fleet staging.
3. **GUIDE (Civilian Evacuation Wayfinding)**:
   Computes lowest-impedance point-to-point evacuation corridors using Dijkstra's algorithm with binary min-heaps, and establishes global distance reachability using Floyd-Warshall Dynamic Programming.
4. **RESCUE (Emergency Dispatch & Network Resilience)**:
   Reconstructs the minimum-cost infrastructure communication and road backbone using Kruskal's Algorithm (with Disjoint Set Union) and Prim's Algorithm (with Priority Cut Expansion).

---

## 3. Dynamic Edge Impedance Formula

Corridor travel resistance is dynamically evaluated using non-linear penalty multipliers:

$$\text{Cost}(e) = \text{TravelTime}(e) \times \left(1 + 1.5 \times \text{Congestion}(e)\right) \times \left(1 + 2.5 \times \text{Danger}(e)\right)$$

Where:
- $\text{TravelTime}(e) = \frac{\text{Distance}(e)}{\text{BaseSpeed}(e)}$ in seconds.
- $\text{Congestion}(e) \in [0.0, 1.0]$ represents vehicular density.
- $\text{Danger}(e) \in [0.0, 1.0]$ represents proximity to the disaster perimeter.
- If an arterial corridor is physically blocked or compromised, $\text{Cost}(e) = \infty$, guaranteeing that shortest-path frontiers strictly bypass impassable corridors.

---

## 4. Algorithmic Foundation & Theoretical Complexity

All algorithms are implemented from scratch in pure ES6 JavaScript in both `backend/algorithms/` and `frontend/src/algorithms/`.

| Algorithm | Category | Best Time | Average Time | Worst Time | Space Complexity | Data Structures Used | Optimality Guarantee |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dijkstra** | Greedy Frontier Search | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V + E)$ | Binary Min-Heap, Distance Map, Predecessors | Strictly Optimal (Non-negative weights) |
| **Floyd-Warshall** | Dynamic Programming | $\mathcal{O}(V^3)$ | $\mathcal{O}(V^3)$ | $\mathcal{O}(V^3)$ | $\mathcal{O}(V^2)$ | $V \times V$ Distance Matrix, $V \times V$ Next Matrix | Globally Optimal All-Pairs |
| **Greedy Evacuation** | Greedy Egress Matching | $\mathcal{O}(Z \log Z + Z \cdot X)$ | $\mathcal{O}(Z \log Z + Z \cdot X)$ | $\mathcal{O}(Z \log Z + Z \cdot X)$ | $\mathcal{O}(Z + X)$ | Urgency Priority Queue, Exit Capacity Hash | Heuristic with Bounded Bottleneck Delay |
| **0/1 Knapsack DP** | Dynamic Programming (2D) | $\mathcal{O}(N \cdot W)$ | $\mathcal{O}(N \cdot W)$ | $\mathcal{O}(N \cdot W)$ | $\mathcal{O}(N \cdot W)$ | $(N+1) \times (W+1)$ Table, Backtracking Bitset | Strictly Globally Optimal |
| **Kruskal MST** | Greedy + Matroid Theory | $\mathcal{O}(E \log E)$ | $\mathcal{O}(E \log E)$ | $\mathcal{O}(E \log E)$ | $\mathcal{O}(V + E)$ | Disjoint Set Union (Path Compression + Rank) | Strictly Globally Minimal Tree |
| **Prim MST** | Greedy Cut Expansion | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V + E)$ | Binary Min-Heap, Visited Set, Parent Map | Strictly Globally Minimal Tree |

### Deep-Dive Invariant Highlights:
1. **Dijkstra's Invariant**: Upon extracting vertex $u$ from the min-heap, $\text{dist}[u] = \delta(s, u)$. Because edge weights are non-negative, any alternative path crossing from the settled set to the unsettled set has cost at least $\text{dist}[u]$.
2. **Floyd-Warshall DP Recurrence**:
   $$D^{(k)}[i, j] = \min\left(D^{(k-1)}[i, j], D^{(k-1)}[i, k] + D^{(k-1)}[k, j]\right)$$
   Where state $k$ restricts intermediate path vertices to $\{1, 2, \dots, k\}$.
3. **Greedy Evacuation Exchange Argument**: Zones are ordered by Urgency Ratio $\frac{\text{Risk} \times \text{People}}{\text{Distance}}$. Swapping a higher-urgency allocation with a lower-urgency allocation cannot decrease expected mortality under finite exit flow rate constraints.
4. **0/1 Knapsack Pseudo-Polynomial Nature**: The time complexity $\mathcal{O}(N \cdot W)$ depends on the numerical value of capacity $W$, not the number of input bits ($\log_2 W$). In disaster response, fleet sizes ($10 \le W \le 50$) execute in sub-millisecond real time.
5. **Kruskal's DSU Complexity**: With Path Compression and Union-by-Rank, the amortized cost per operation is $\mathcal{O}(\alpha(V))$, where $\alpha$ is the inverse Ackermann function ($\alpha(n) \le 4$ for all physical values).

---

## 5. Technology Stack

- **Frontend**:
  - **React 19** & **Vite 8** (high-performance client bundle)
  - **Tailwind CSS 4** (custom dark command-center theme + print layout)
  - **React Flow (`@xyflow/react 12`)** (interactive spatial graph inspector)
  - **Recharts 3** (interactive theoretical vs. empirical benchmark charts)
  - **Framer Motion 13** (smooth interface transitions)
  - **Lucide React** (high-contrast tactical icons)
  - **React Router 7** (client-side routing)
- **Backend**:
  - **Node.js 22** & **Express 4** (RESTful API architecture)
  - **JavaScript ES Modules** (`"type": "module"`)
- **Database & ORM**:
  - **PostgreSQL 18** (relational database engine)
  - **Prisma ORM 6** (type-safe database client, schema migrations, seeders)
- **Code Quality & Testing**:
  - **Oxlint** (blazing fast linter: 0 errors, 0 warnings across 43 frontend modules)
  - **Automated Verification Suites** (9 test suites, 316 / 316 tests passing, 100% success rate)

---

## 6. Project Architecture & Directory Layout

```
DURGA Dynamic Urban Rescue & Guidance Architecture/
├── backend/
│   ├── algorithms/               # Algorithmic engine from scratch
│   │   ├── dijkstra.js           # Binary Min-Heap Single-Source Shortest Path
│   │   ├── floydWarshall.js      # All-Pairs Shortest Path Dynamic Programming
│   │   ├── greedyEvacuation.js   # Urgency-First Greedy Egress Matcher
│   │   ├── resourceOptimizer.js  # 0/1 Knapsack DP Resource Allocation
│   │   ├── kruskal.js            # Kruskal's MST with Disjoint Set Union
│   │   └── prim.js               # Prim's MST with Priority Cut Expansion
│   ├── prisma/
│   │   ├── schema.prisma         # Relational data models with CASCADE rules
│   │   ├── migrations/           # Automated PostgreSQL migration history
│   │   └── seed.js               # Multi-scenario database seeder
│   ├── simulation/
│   │   └── emergencySimulator.js # 12-Stage synchronous simulation pipeline
│   ├── server.js                 # Express REST API & healthcheck server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── algorithms/           # Frontend algorithm bindings
│   │   ├── components/
│   │   │   ├── common/           # MetricCard, StatusBadge, EmptyState
│   │   │   ├── graph/            # React Flow custom nodes, canvases, matrix view
│   │   │   └── layout/           # Navbar, Sidebar, App Shell
│   │   ├── data/                 # Urban graph, scenarios, viva bank, pseudocode
│   │   │   ├── urbanGraph.js     # 47 nodes, 58 edges synthetic topology
│   │   │   ├── vivaQuestions.js  # 12 comprehensive DAA oral examination questions
│   │   │   └── algorithmPseudocode.js # Formal pseudocode & invariant proofs
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Command telemetry overview (8 KPI metrics)
│   │   │   ├── EmergencySimulator.jsx# 12-stage live propagation runner
│   │   │   ├── GraphExplorer.jsx     # Interactive React Flow spatial graph
│   │   │   ├── AlgorithmLab.jsx      # Step-by-step visualizer for all 6 algorithms
│   │   │   ├── EvacuationPlanner.jsx # Multi-exit pedestrian corridor guidance
│   │   │   ├── ResourceOptimizer.jsx # 0/1 Knapsack fleet dispatch workbench
│   │   │   ├── Analytics.jsx         # Empirical vs Theoretical Recharts
│   │   │   ├── ScenarioArchive.jsx   # PostgreSQL scenario manager & replay
│   │   │   └── Documentation.jsx     # 5-tab documentation, viva & print report
│   │   ├── routes/AppRoutes.jsx
│   │   ├── utils/                # Graph analytics, math formulas, constants
│   │   └── index.css             # Tailwind base + @media print layout
│   └── package.json
├── package.json                  # Root npm workspace & unified execution script
├── test_dijkstra.js              # Dijkstra Min-Heap Shortest Path suite (32/32)
├── test_floyd_warshall.js        # Floyd-Warshall All-Pairs DP suite (32/32)
├── test_greedy_evacuation.js     # Greedy Evacuation Capacity suite (56/56)
├── test_knapsack_optimizer.js    # 0/1 Knapsack DP Resource Allocation suite (23/23)
├── test_mst.js                   # Kruskal & Prim MST verification suite (47/47)
├── test_emergency_simulator.js   # 12-Stage Pipeline verification suite (40/40)
├── test_analytics_engine.js      # Benchmark & Empirical Scaling test suite (26/26)
├── test_postgres_api.js          # PostgreSQL CRUD & Transaction test suite (43/43)
├── test_integrations.js          # Integrations, Weather & AI Telemetry suite (17/17)
└── README.md
```

---

## 7. The 12-Stage Emergency Simulation Pipeline

Every simulation run executes 12 coordinated stages with live runtime measurement (no hardcoded mock values):

```
 [Stage 01: Apply Parameters]
             │
             ▼
 [Stage 02: Update Graph State & Epicenter Escalation]
             │
             ▼
 [Stage 03: Sever Blocked Corridors & Structural Collapses]
             │
             ▼
 [Stage 04: Compute Dynamic Impedance Edge Costs]
             │
             ▼
 [Stage 05: Run Dijkstra Single-Source Shortest Paths (Epicenter -> Exits/Hospitals)]
             │
             ▼
 [Stage 06: Run Floyd-Warshall All-Pairs Dynamic Programming Matrix (47x47)]
             │
             ▼
 [Stage 07: Run Greedy Evacuation Triage (Zone -> Gate Matching under Capacity Limits)]
             │
             ▼
 [Stage 08: Run 0/1 Knapsack DP (Ambulances, Rescue Squads, Emergency Vehicles)]
             │
             ▼
 [Stage 09: Run Kruskal's MST (Sorting + Disjoint Set Union Backbone)]
             │
             ▼
 [Stage 10: Run Prim's MST (Priority-Based Cut Expansion)]
             │
             ▼
 [Stage 11: Generate Executive Evacuation Directives & Feasibility Score]
             │
             ▼
 [Stage 12: Telemetry Audit Manifest & Timestamp Packaging]
```

---

## 8. Installation & Setup Guide

### Live Hazard Intelligence

DURGA requests current weather from Open-Meteo and sends the current GPS position plus mapped road IDs to the backend live-conditions endpoint. Road incidents and flood conditions are only displayed when configured providers return verified records; otherwise the UI says `NO VERIFIED FEED` and retains the existing static/synthetic simulation. Configure provider URLs and credentials only in `backend/.env` using `INCIDENTS_API_URL`, `INCIDENTS_API_KEY`, `FLOOD_API_URL`, and `FLOOD_API_KEY`. Providers must return a JSON object with a `hazards` array whose records identify a graph `roadId` (or `edgeId`), `severity`, `type`, and optional `blocked` flag.

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v15.0` or higher (running locally on port `5432`)

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/your-username/durga-rescue-architecture.git
cd "durga-rescue-architecture"

# Configure Backend Environment Variables
cp backend/.env.example backend/.env
```
Ensure your `backend/.env` file contains your local PostgreSQL credentials:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/durga?schema=public"
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Initialize Database Schema & Seed Data
```bash
cd ../backend

# Generate Prisma Client
npm run db:generate

# Execute Database Migration
npm run db:migrate

# Seed Synthetic Disaster Scenarios
npm run db:seed
```

### Step 4: Run Automated Test Verification
Run all 9 test suites covering all 316 unit, algorithm, and integration assertions:
```bash
# Unified command:
npm test

# Or individually:
node test_dijkstra.js
node test_floyd_warshall.js
node test_greedy_evacuation.js
node test_knapsack_optimizer.js
node test_mst.js
node test_emergency_simulator.js
node test_analytics_engine.js
node test_postgres_api.js
node test_integrations.js
```
*Expected Output: `316 / 316 PASSED (100% SUCCESS)`*

### Step 5: Start the Servers
In terminal 1 (Backend API):
```bash
cd backend
npm start
# Server listens at http://localhost:5000
```

In terminal 2 (Frontend Client):
```bash
cd frontend
npm run dev
# Vite dev server running at http://localhost:5173
```

Navigate to `http://localhost:5173` in any modern web browser.

---

## 9. Academic DAA Viva Defense Questions & Key Insights

DURGA includes an interactive **Viva Mode** (`/documentation -> Viva Mode`) with 12 comprehensive questions and answers designed for academic oral defenses:

1. **Why does Dijkstra fail on graphs with negative edge weights?**
   - *Answer*: Dijkstra relies on the greedy choice property. Once a vertex $u$ is extracted from the min-heap, its shortest path distance $\text{dist}[u]$ is finalized. A subsequent negative edge could reduce this distance, violating the invariant. Bellman-Ford $\mathcal{O}(V \cdot E)$ must be used if negative weights exist.
2. **Why is 0/1 Knapsack DP called pseudo-polynomial?**
   - *Answer*: Its runtime is $\mathcal{O}(N \cdot W)$. Input capacity $W$ is encoded in $\log_2 W$ bits. Since runtime is exponential with respect to the bit-length of $W$ ($2^b$), it is pseudo-polynomial.
3. **When is Prim computationally preferred over Kruskal?**
   - *Answer*: On dense graphs ($E \approx V^2$), Prim with an adjacency matrix $\mathcal{O}(V^2)$ or Fibonacci heap $\mathcal{O}(E + V \log V)$ outperforms Kruskal's $\mathcal{O}(E \log E)$ edge-sorting overhead. On sparse planar road graphs ($E \ll V^2$), Kruskal is practically faster.
4. **How does Disjoint Set Union (DSU) achieve near-linear time?**
   - *Answer*: By combining Union-by-Rank (attaching shallower trees to deeper roots) and Path Compression (pointing all traversed nodes directly to the root during `find`). Any $m$ operations on $n$ elements run in $\mathcal{O}(m \cdot \alpha(n))$, where $\alpha(n) \le 4$.

---

## 10. Printable Tactical Incident Directives

The **Final Simulation Report** tab (`/documentation`) allows Incident Commanders to select any scenario (Firestorm, Flash Flood, Earthquake, Chemical Plume) and run the live 12-stage pipeline. 
Clicking **"Print / Save as PDF"** activates the built-in `@media print` layout:
- Hides sidebars, navigation bars, and debug buttons.
- Inverts the dark command palette to a high-contrast white document with clean borders.
- Formats executive directive seals, casualty estimates, Dijkstra routes, gate saturation tables, fleet allocations, MST backbone costs, and the 12-stage execution audit benchmark into an official A4 document ready for field dispatch.

---

## 11. Future Scope & Extensions

1. **Real-Time IoT Sensor Ingestion**: Live MQTT/WebSocket telemetry streaming from urban seismic sensors and gas detectors.
2. **Min-Cost Maximum-Flow Egress**: Integration of Edmonds-Karp / Dinic residual network algorithms for multi-source, multi-sink continuous fluid crowd flow modeling.
3. **Autonomous Drone Swarm Relays**: Reinforcement-learning-driven mobile mesh nodes providing aerial guidance over compromised bridge spans.
4. **GIS Shapefile Export**: GeoJSON spatial translation for interoperability with ESRI ArcGIS and QGIS platforms.

---

## 12. License & Academic Attribution
Developed as part of the Design and Analysis of Algorithms (DAA) Laboratory Curriculum. Open for academic research, emergency response modeling, and disaster preparedness studies.
