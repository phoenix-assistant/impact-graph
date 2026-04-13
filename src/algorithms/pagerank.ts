import { CallGraph } from '../types.js';

export function computePageRank(
  graph: CallGraph,
  dampingFactor = 0.85,
  iterations = 50,
  tolerance = 1e-6
): Record<string, number> {
  const nodeIds = Object.keys(graph.nodes);
  const N = nodeIds.length;
  if (N === 0) return {};

  // Build reverse adjacency: for each node, who calls it?
  const inLinks: Record<string, string[]> = {};
  const outDegree: Record<string, number> = {};

  for (const id of nodeIds) {
    inLinks[id] = [];
    outDegree[id] = 0;
  }

  for (const edge of graph.edges) {
    if (inLinks[edge.callee] !== undefined && outDegree[edge.caller] !== undefined) {
      inLinks[edge.callee].push(edge.caller);
      outDegree[edge.caller] = (outDegree[edge.caller] ?? 0) + 1;
    }
  }

  // Initialize ranks
  let ranks: Record<string, number> = {};
  for (const id of nodeIds) {
    ranks[id] = 1 / N;
  }

  // Iterative PageRank
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks: Record<string, number> = {};
    let diff = 0;

    for (const id of nodeIds) {
      let sum = 0;
      for (const caller of inLinks[id]) {
        const deg = outDegree[caller] || 1;
        sum += ranks[caller] / deg;
      }
      newRanks[id] = (1 - dampingFactor) / N + dampingFactor * sum;
      diff += Math.abs(newRanks[id] - ranks[id]);
    }

    ranks = newRanks;
    if (diff < tolerance) break;
  }

  return ranks;
}

export function computeCallerCount(graph: CallGraph): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of Object.keys(graph.nodes)) {
    counts[id] = 0;
  }
  for (const edge of graph.edges) {
    counts[edge.callee] = (counts[edge.callee] ?? 0) + 1;
  }
  return counts;
}
