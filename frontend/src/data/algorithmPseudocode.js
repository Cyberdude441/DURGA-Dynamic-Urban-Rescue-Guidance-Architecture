/**
 * DURGA - Algorithm Pseudocode & Mathematical Invariant Specifications
 * Formal documentation for all 6 core algorithms in the curriculum.
 */

export const ALGORITHM_DOCS = [
  {
    id: 'dijkstra',
    name: "Dijkstra's Single-Source Shortest Path",
    category: 'Greedy Frontier Search',
    role: 'Optimal Point-to-Point Emergency Evacuation & Hospital Triage Route',
    timeComplexity: {
      best: 'O((V + E) log V)',
      average: 'O((V + E) log V)',
      worst: 'O((V + E) log V)',
    },
    spaceComplexity: 'O(V + E)',
    auxiliaryStorage: 'Binary Min-Heap, Distance Map, Predecessor Map',
    optimality: 'Strictly Optimal for non-negative weights',
    proofSummary:
      'Induction on the number of settled vertices. At step k, the extracted vertex u has dist[u] = δ(s, u) because any alternative path must cross the cut from settled to unsettled vertices, and any such path has cost at least dist[u] due to non-negative edge weights.',
    pseudocode: `function Dijkstra(Graph G, Vertex source, Vertex target):
    // 1. Initialization
    for each vertex v in G.vertices:
        dist[v] ← ∞
        prev[v] ← undefined
    dist[source] ← 0

    MinHeap Q ← new MinHeap()
    Q.insert(source, priority = 0)

    // 2. Frontier Relaxation Loop
    while Q is not empty:
        u ← Q.extractMin()
        if u = target:
            break // Target reached with minimal cost

        for each neighbor (u, v) with edge e in G.edges:
            if e.isBlocked:
                continue // Impassable corridor

            altCost ← dist[u] + e.effectiveCost
            if altCost < dist[v]:
                dist[v] ← altCost
                prev[v] ← u
                Q.decreaseOrInsert(v, priority = altCost)

    // 3. Reconstruct Optimal Route
    path ← []
    curr ← target
    while curr is defined:
        path.prepend(curr)
        curr ← prev[curr]

    return { path, totalCost: dist[target] }`,
  },
  {
    id: 'floyd-warshall',
    name: 'Floyd-Warshall All-Pairs Shortest Path',
    category: 'Dynamic Programming',
    role: 'Global Disaster Routing Matrix & Network Egress Distance Table',
    timeComplexity: {
      best: 'O(V³)',
      average: 'O(V³)',
      worst: 'O(V³)',
    },
    spaceComplexity: 'O(V²)',
    auxiliaryStorage: 'V×V Distance Matrix, V×V Predecessor/Next Matrix',
    optimality: 'Globally Optimal (detects negative weight cycles)',
    proofSummary:
      'Optimal substructure of shortest paths: Any subpath of a shortest path is itself a shortest path. The dynamic programming state D[k][i][j] considers whether vertex k lies on the shortest path from i to j; if so, D[k][i][j] = D[k-1][i][k] + D[k-1][k][j], otherwise D[k-1][i][j].',
    pseudocode: `function FloydWarshall(Graph G):
    n ← G.vertices.length
    Matrix dist[n][n]
    Matrix next[n][n]

    // 1. Base Case Initialization (k = 0)
    for i from 0 to n-1:
        for j from 0 to n-1:
            if i = j:
                dist[i][j] ← 0
                next[i][j] ← j
            else if edge(i, j) exists and not blocked:
                dist[i][j] ← edge(i, j).effectiveCost
                next[i][j] ← j
            else:
                dist[i][j] ← ∞
                next[i][j] ← null

    // 2. Triply Nested DP State Relaxation
    for k from 0 to n-1:           // Intermediate pivot vertex
        for i from 0 to n-1:       // Source vertex
            for j from 0 to n-1:   // Destination vertex
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] ← dist[i][k] + dist[k][j]
                    next[i][j] ← next[i][k]

    return { distMatrix: dist, nextMatrix: next }`,
  },
  {
    id: 'greedy-evacuation',
    name: 'Greedy Evacuation Assignment',
    category: 'Greedy Allocation with Bottleneck Capacity',
    role: 'Disaster Zone Egress & Crowd Allocation across Safe Gates',
    timeComplexity: {
      best: 'O(Z log Z + Z · X)',
      average: 'O(Z log Z + Z · X)',
      worst: 'O(Z log Z + Z · X)',
    },
    spaceComplexity: 'O(Z + X)',
    auxiliaryStorage: 'Urgency Priority Queue, Exit Capacity Hash Map',
    optimality: 'Locally Optimal / Heuristic with Bounded Clearance Delay',
    proofSummary:
      'Greedy Exchange Argument: By ordering evacuation zones by urgency ratio (Risk · People / Distance), servicing the highest urgency demand first minimizes expected casualties across bounded time horizons under exit bottleneck saturation.',
    pseudocode: `function GreedyEvacuation(Zones Z, Exits X, Strategy S):
    // 1. Rank zones by triage urgency heuristic
    for each zone z in Z:
        z.urgencyScore ← ComputeUrgency(z.risk, z.people, z.distance, S)
    Sort Z in descending order of urgencyScore

    remainingCapacity ← Copy(X.capacities)
    assignments ← []

    // 2. Greedy Matching Loop
    for each zone z in Z:
        bestExit ← null
        minEgressTime ← ∞

        for each exit x in X:
            if remainingCapacity[x] > 0:
                egressTime ← dist(z, x) + (z.people / flowRate(x))
                if egressTime < minEgressTime:
                    minEgressTime ← egressTime
                    bestExit ← x

        if bestExit is defined:
            alloc ← min(z.people, remainingCapacity[bestExit])
            remainingCapacity[bestExit] ← remainingCapacity[bestExit] - alloc
            assignments.append({ zone: z.id, exit: bestExit.id, evacuees: alloc })

    return { assignments, remainingCapacity }`,
  },
  {
    id: 'knapsack-dp',
    name: '0/1 Knapsack Resource Optimizer',
    category: 'Dynamic Programming (2D Tabulation)',
    role: 'Optimal Life-Preservation Fleet Allocation (Ambulances, Rescue, Vehicles)',
    timeComplexity: {
      best: 'O(N · W)',
      average: 'O(N · W)',
      worst: 'O(N · W)',
    },
    spaceComplexity: 'O(N · W)',
    auxiliaryStorage: '(N+1) × (W+1) Integer DP Table, Backtracking Bitset',
    optimality: 'Globally Optimal (Exact Mathematical Optimization)',
    proofSummary:
      'Principle of Optimality: In an optimal selection of zones for budget W, the choice for zone i is either excluded (yielding V[i-1, W]) or included (yielding V[i-1, W - w_i] + v_i). Exhaustive tabulation ensures the global optimum is guaranteed.',
    pseudocode: `function KnapsackDP(Zones items, Capacity W):
    N ← items.length
    Table V[N+1][W+1] ← initialized to 0

    // 1. Dynamic Programming State Tabulation
    for i from 1 to N:
        wi ← items[i-1].requirement // Units needed
        vi ← items[i-1].benefitScore // Lives saved

        for w from 0 to W:
            if wi > w:
                V[i][w] ← V[i-1][w]
            else:
                V[i][w] ← max(V[i-1][w], V[i-1][w - wi] + vi)

    // 2. Backtracking for Optimal Zone Selection
    selectedItems ← []
    wCurr ← W
    for i from N down to 1:
        if V[i][wCurr] ≠ V[i-1][wCurr]:
            selectedItems.append(items[i-1])
            wCurr ← wCurr - items[i-1].requirement

    return { maxBenefit: V[N][W], selectedItems, resourceUsed: W - wCurr }`,
  },
  {
    id: 'kruskal-mst',
    name: "Kruskal's Minimum Spanning Tree",
    category: 'Greedy Edge Selection with DSU',
    role: 'Resilient City Road Backbone & Emergency Communication Grid',
    timeComplexity: {
      best: 'O(E log E)',
      average: 'O(E log E)',
      worst: 'O(E log E)',
    },
    spaceComplexity: 'O(V + E)',
    auxiliaryStorage: 'Disjoint Set Union (Parent Array, Rank Array)',
    optimality: 'Strictly Optimal (Global Minimum Cost Tree)',
    proofSummary:
      'Cycle Property & Matroid Theory: Edges sorted in non-decreasing order are accepted if and only if they do not introduce a cycle. The graphic matroid structure guarantees that the greedy forward selection yields a global minimum basis.',
    pseudocode: `function KruskalMST(Graph G):
    mstEdges ← []
    dsu ← new DisjointSetUnion(G.vertices)

    // 1. Sort all active corridors by effective cost
    sortedEdges ← Sort(G.edges.filter(not blocked) by cost ascending)

    // 2. Greedy Edge Inclusion Loop
    for each edge (u, v) with weight w in sortedEdges:
        rootU ← dsu.find(u)
        rootV ← dsu.find(v)

        if rootU ≠ rootV:
            dsu.union(rootU, rootV)
            mstEdges.append(edge)
            if mstEdges.length = G.vertices.length - 1:
                break // Full spanning tree achieved

    return { mstEdges, totalCost: Sum(mstEdges.weights) }`,
  },
  {
    id: 'prim-mst',
    name: "Prim's Minimum Spanning Tree",
    category: 'Greedy Cut Expansion with Priority Queue',
    role: 'Safe-Haven Outward Corridor Expansion & Rescue Perimeter',
    timeComplexity: {
      best: 'O((V + E) log V)',
      average: 'O((V + E) log V)',
      worst: 'O((V + E) log V)',
    },
    spaceComplexity: 'O(V + E)',
    auxiliaryStorage: 'Priority Queue (Keyed by min crossing edge weight), InTree Set',
    optimality: 'Strictly Optimal (Global Minimum Cost Tree)',
    proofSummary:
      'Cut Property: At any stage, the set of visited vertices S defines a cut (S, V\\S). The lightest edge crossing this cut must belong to the MST. Prim repeatedly picks this minimal crossing edge, preserving MST invariants.',
    pseudocode: `function PrimMST(Graph G, Vertex seed):
    inTree ← Set()
    MinHeap PQ ← new MinHeap()
    key[v] ← ∞ for all v; parent[v] ← null
    key[seed] ← 0
    PQ.insert(seed, 0)

    mstEdges ← []

    while PQ is not empty:
        u ← PQ.extractMin()
        inTree.add(u)

        if parent[u] is not null:
            mstEdges.append(edge(parent[u], u))

        for each neighbor (u, v) with edge e in G.edges:
            if v not in inTree and not e.isBlocked:
                if e.effectiveCost < key[v]:
                    key[v] ← e.effectiveCost
                    parent[v] ← u
                    PQ.decreaseOrInsert(v, key[v])

    return { mstEdges, totalCost: Sum(mstEdges.weights) }`,
  },
];
