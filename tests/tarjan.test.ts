import { describe, it, expect } from 'vitest';
import { tarjanSCC, getCircularDeps } from '../src/algorithms/tarjan';
import { CallGraph } from '../src/types';

function makeGraph(nodes: string[], edges: Array<[string, string]>): CallGraph {
  const g: CallGraph = {
    nodes: {},
    edges: [],
    imports: [],
    meta: { indexedAt: new Date().toISOString(), rootDir: '.', fileCount: 1, version: '0.1.0' },
  };
  for (const id of nodes) {
    g.nodes[id] = { id, name: id, file: 'test.ts', line: 1, type: 'function', isExported: false };
  }
  for (const [caller, callee] of edges) {
    g.edges.push({ caller, callee, line: 1, resolved: true });
  }
  return g;
}

describe('Tarjan SCC / Circular Dependency Detection', () => {
  it('detects a simple cycle', () => {
    const g = makeGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
    const cycles = getCircularDeps(g);
    expect(cycles.length).toBeGreaterThan(0);
    const allInCycle = cycles.flat();
    expect(allInCycle).toContain('a');
    expect(allInCycle).toContain('b');
    expect(allInCycle).toContain('c');
  });

  it('returns no cycles for a DAG', () => {
    const g = makeGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
    const cycles = getCircularDeps(g);
    expect(cycles).toHaveLength(0);
  });

  it('handles empty graph', () => {
    const g = makeGraph([], []);
    const cycles = getCircularDeps(g);
    expect(cycles).toHaveLength(0);
  });

  it('handles single node with self-loop', () => {
    const g = makeGraph(['a'], [['a', 'a']]);
    const cycles = getCircularDeps(g);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('detects multiple independent cycles', () => {
    const g = makeGraph(
      ['a', 'b', 'c', 'd', 'e'],
      [['a', 'b'], ['b', 'a'], ['c', 'd'], ['d', 'e'], ['e', 'c']]
    );
    const cycles = getCircularDeps(g);
    expect(cycles.length).toBeGreaterThanOrEqual(2);
  });
});
