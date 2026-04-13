import { CallGraph, AffectedNode } from '../types.js';
import { computePageRank, computeCallerCount } from './pagerank.js';

/**
 * BFS/DFS to find all nodes that call (directly or transitively) the given node.
 * Returns the set of affected node IDs with their depth.
 */
export function findAffected(
  graph: CallGraph,
  startId: string,
  maxDepth = 10
): Map<string, number> {
  // Build: callee -> callers (reverse of call direction)
  const callerMap: Record<string, string[]> = {};
  for (const edge of graph.edges) {
    if (!callerMap[edge.callee]) callerMap[edge.callee] = [];
    callerMap[edge.callee].push(edge.caller);
  }

  const visited = new Map<string, number>(); // id -> depth
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visited.has(item.id)) continue;
    visited.set(item.id, item.depth);

    if (item.depth >= maxDepth) continue;

    const callers = callerMap[item.id] ?? [];
    for (const caller of callers) {
      if (!visited.has(caller)) {
        queue.push({ id: caller, depth: item.depth + 1 });
      }
    }
  }

  return visited;
}

export function buildImpactResults(
  graph: CallGraph,
  startId: string,
  maxDepth = 10
): AffectedNode[] {
  const affected = findAffected(graph, startId, maxDepth);
  const pageRanks = computePageRank(graph);
  const callerCounts = computeCallerCount(graph);

  const results: AffectedNode[] = [];

  for (const [id, depth] of affected) {
    if (id === startId) continue; // exclude the source itself
    const node = graph.nodes[id];
    if (!node) continue;

    const pr = pageRanks[id] ?? 0;
    const callers = callerCounts[id] ?? 0;
    // Risk = pagerank * 100 + depth penalty (closer = higher risk)
    const depthFactor = maxDepth > 0 ? 1 - depth / (maxDepth + 1) : 1;
    const riskScore = Math.round((pr * 100 + depthFactor * 10) * 100) / 100;

    results.push({
      id,
      file: node.file,
      name: node.name,
      depth,
      riskScore,
      callerCount: callers,
    });
  }

  // Sort by riskScore desc
  results.sort((a, b) => b.riskScore - a.riskScore);
  return results;
}
