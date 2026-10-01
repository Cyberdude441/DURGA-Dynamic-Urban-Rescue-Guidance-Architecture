/**
 * DURGA - Academic DAA Viva Examination Preparation Bank
 * Comprehensive Design and Analysis of Algorithms Questions & Model Answers
 */

export const VIVA_QUESTIONS = [
  {
    id: 'viva-1',
    category: 'Graph Search',
    difficulty: 'Fundamental',
    question: 'Why does Dijkstra’s algorithm fail or produce incorrect results on graphs with negative edge weights?',
    answer:
      'Dijkstra’s algorithm relies on the greedy choice property: once a vertex u is extracted from the priority queue (settled), its shortest path distance dist[u] is finalized and never relaxed again. If negative edges exist, reaching u via a longer path with subsequent negative edges could reduce its distance after it has already been settled, violating the greedy invariant. For graphs with negative edge weights, Bellman-Ford O(V · E) or SPFA must be used.',
    algorithm: 'Dijkstra',
  },
  {
    id: 'viva-2',
    category: 'Dynamic Programming',
    difficulty: 'Advanced',
    question: 'How does Floyd-Warshall’s recurrence relation formulate all-pairs shortest paths as Dynamic Programming?',
    answer:
      'Floyd-Warshall defines subproblems by restricting intermediate vertices. Let D[k][i][j] be the shortest path from vertex i to vertex j using only intermediate vertices from {1, 2, ..., k}. The recurrence is D[k][i][j] = min(D[k-1][i][j], D[k-1][i][k] + D[k-1][k][j]). The base case D[0] is the direct adjacency matrix. It computes all pairs in O(V³) time and O(V²) space by reusing the 2D matrix in-place.',
    algorithm: 'Floyd-Warshall',
  },
  {
    id: 'viva-3',
    category: 'Greedy Strategy',
    difficulty: 'Intermediate',
    question: 'What is the Greedy Choice Property, and how is it proven for evacuation triage?',
    answer:
      'The Greedy Choice Property states that a globally optimal solution can be arrived at by making locally optimal (greedy) choices at each step without backtracking. In DURGA’s Urgency-First evacuation, zones with highest casualty-to-lead-time ratios are prioritized. This can be proven by an exchange argument: swapping a high-urgency zone with a low-urgency zone cannot reduce overall expected loss of life under finite exit flow rate constraints.',
    algorithm: 'Greedy',
  },
  {
    id: 'viva-4',
    category: 'Dynamic Programming',
    difficulty: 'Core',
    question: 'Why is the 0/1 Knapsack dynamic programming algorithm called "pseudo-polynomial" rather than purely polynomial?',
    answer:
      'The time complexity of 0/1 Knapsack DP is O(N · W), where N is the number of items and W is the knapsack capacity. While N · W looks polynomial, the input size of W is represented in log₂(W) bits. Since the runtime is exponential with respect to the number of bits in W (2^b), the algorithm is pseudo-polynomial. If W is extremely large, the DP table becomes computationally intractable, whereas if W is small, it runs efficiently in practice.',
    algorithm: 'Dynamic Programming',
  },
  {
    id: 'viva-5',
    category: 'Minimum Spanning Tree',
    difficulty: 'Fundamental',
    question: 'Explain the Cut Property and Cycle Property that prove Kruskal’s and Prim’s algorithms correct.',
    answer:
      'The Cut Property states that for any cut (partition of vertices into two disjoint sets S and V\\S), the edge of minimum weight crossing the cut must belong to some Minimum Spanning Tree. Prim’s algorithm directly utilizes this by picking the minimum-weight crossing edge from the current tree. The Cycle Property states that for any cycle in the graph, the edge of maximum weight in that cycle cannot belong to any unique MST. Kruskal’s algorithm relies on avoiding cycles and repeatedly choosing the lightest available edge.',
    algorithm: 'Kruskal & Prim',
  },
  {
    id: 'viva-6',
    category: 'Data Structures',
    difficulty: 'Advanced',
    question: 'How does Disjoint Set Union (DSU) achieve near-linear time O(E · α(V)) in Kruskal’s algorithm?',
    answer:
      'DSU combines two key optimizations: (1) Union by Rank/Size, which always attaches the shallower tree under the root of the deeper tree, keeping tree height O(log V); and (2) Path Compression, which during Find(u) flattens the tree by pointing every traversed node directly to the representative root. Combined, any sequence of m operations on n elements runs in O(m · α(n)) time, where α is the inverse Ackermann function, which is effectively constant (α(n) ≤ 4) for all physical quantities in the universe.',
    algorithm: 'Kruskal',
  },
  {
    id: 'viva-7',
    category: 'Minimum Spanning Tree',
    difficulty: 'Comparative',
    question: 'When is Prim’s algorithm computationally preferred over Kruskal’s algorithm, and vice-versa?',
    answer:
      'Prim’s algorithm with an adjacency matrix runs in O(V²), or with a Fibonacci heap in O(E + V log V), making it superior for dense graphs where E ≈ V². Kruskal’s algorithm runs in O(E log E) due to edge sorting, making it significantly faster and simpler on sparse graphs where E << V² (such as urban road street networks where average degree is 3 to 4). Kruskal also naturally handles disconnected components by yielding a Minimum Spanning Forest.',
    algorithm: 'Prim vs Kruskal',
  },
  {
    id: 'viva-8',
    category: 'Graph Theory',
    difficulty: 'Core',
    question: 'What is the fundamental difference between a Shortest Path Tree (SPT) and a Minimum Spanning Tree (MST)?',
    answer:
      'An MST minimizes the total sum of weights of all edges required to connect all vertices in the graph without cycles. A Shortest Path Tree (SPT), produced by Dijkstra, minimizes the distance from a single source vertex to every other vertex individually. An MST may not provide the shortest path between any two vertices, and conversely, the sum of edge weights in an SPT is frequently greater than that of an MST.',
    algorithm: 'Dijkstra vs MST',
  },
  {
    id: 'viva-9',
    category: 'System Modeling',
    difficulty: 'Applied',
    question: 'How does DURGA compute dynamic effective edge costs during a multi-hazard crisis?',
    answer:
      'Rather than using static geographic distances, DURGA calculates dynamic traversal resistance using the formula: Cost(e) = TravelTime(e) · (1 + 1.5 · Congestion(e)) · (1 + 2.5 · Danger(e)). If an edge is physically severed or obstructed, Cost(e) = ∞. This ensures that algorithms like Dijkstra and Floyd-Warshall avoid congested choke points and toxic plume perimeters even if physical distance is shorter.',
    algorithm: 'System Modeling',
  },
  {
    id: 'viva-10',
    category: 'Algorithm Design',
    difficulty: 'Fundamental',
    question: 'Can Dijkstra’s algorithm produce different shortest paths for the same source and destination?',
    answer:
      'Yes. If multiple alternative paths have the exact same total minimum cost, the tie-breaking order in the priority queue determines which path is reconstructed. However, the total path cost returned is invariant and guaranteed to be the global minimum.',
    algorithm: 'Dijkstra',
  },
  {
    id: 'viva-11',
    category: 'Dynamic Programming',
    difficulty: 'Core',
    question: 'Why does Greedy allocation fail to guarantee global optimality in the 0/1 Knapsack problem?',
    answer:
      'Greedy strategies select items based on value-to-weight ratio (v_i / w_i). Because items cannot be fractionally divided (0/1 constraint), taking a high-ratio item might leave unused residual capacity that cannot accommodate other valuable items, leading to a sub-optimal total benefit. Dynamic Programming evaluates both choices (include vs exclude) exhaustively across all capacity increments, guaranteeing global optimality.',
    algorithm: 'Dynamic Programming',
  },
  {
    id: 'viva-12',
    category: 'Complexity Analysis',
    difficulty: 'Advanced',
    question: 'What is the space complexity difference between Dijkstra and Floyd-Warshall?',
    answer:
      'Dijkstra requires O(V + E) auxiliary space for the adjacency list, min-heap priority queue, distance array, and predecessor array. Floyd-Warshall requires O(V²) space for the distance matrix and the predecessor routing matrix. For a 1,000-node graph, Dijkstra requires only a few thousand words, whereas Floyd-Warshall requires 1,000,000 memory cells.',
    algorithm: 'Complexity Comparison',
  },
];
