import { CallGraph } from '../types.js';

export interface SCC {
  nodes: string[];
  isCycle: boolean;
}

/**
 * Tarjan's algorithm for Strongly Connected Components.
 * Returns SCCs; those with >1 node (or self-loops) are circular dependencies.
 */
export function tarjanSCC(graph: CallGraph): SCC[] {
  const adj: Record<string, string[]> = {};
  for (const id of Object.keys(graph.nodes)) {
    adj[id] = [];
  }
  for (const edge of graph.edges) {
    if (adj[edge.caller]) {
      adj[edge.caller].push(edge.callee);
    }
  }

  const index: Record<string, number> = {};
  const lowlink: Record<string, number> = {};
  const onStack: Record<string, boolean> = {};
  const stack: string[] = [];
  const sccs: SCC[] = [];
  let counter = 0;

  function strongConnect(v: string): void {
    index[v] = counter;
    lowlink[v] = counter;
    counter++;
    stack.push(v);
    onStack[v] = true;

    for (const w of (adj[v] ?? [])) {
      if (!(w in index)) {
        strongConnect(w);
        lowlink[v] = Math.min(lowlink[v], lowlink[w]);
      } else if (onStack[w]) {
        lowlink[v] = Math.min(lowlink[v], index[w]);
      }
    }

    if (lowlink[v] === index[v]) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack[w] = false;
        scc.push(w);
      } while (w !== v);

      // Self-loop check
      const hasSelfLoop = graph.edges.some((e) => e.caller === v && e.callee === v);
      sccs.push({ nodes: scc, isCycle: scc.length > 1 || hasSelfLoop });
    }
  }

  for (const id of Object.keys(graph.nodes)) {
    if (!(id in index)) {
      strongConnect(id);
    }
  }

  return sccs;
}

export function getCircularDeps(graph: CallGraph): string[][] {
  const sccs = tarjanSCC(graph);
  return sccs.filter((s) => s.isCycle).map((s) => s.nodes);
}
