import { describe, it, expect } from 'vitest';
import { computePageRank, computeCallerCount } from '../src/algorithms/pagerank';
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

describe('PageRank', () => {
  it('converges on a simple graph', () => {
    const g = makeGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['a', 'c']]);
    const ranks = computePageRank(g);
    expect(Object.keys(ranks)).toHaveLength(3);
    // c is called by both a and b, so should have higher rank
    expect(ranks['c']).toBeGreaterThan(ranks['a']);
  });

  it('handles empty graph', () => {
    const g = makeGraph([], []);
    const ranks = computePageRank(g);
    expect(Object.keys(ranks)).toHaveLength(0);
  });

  it('handles single node', () => {
    const g = makeGraph(['a'], []);
    const ranks = computePageRank(g);
    expect(ranks['a']).toBeGreaterThan(0);
  });

  it('scores sum to approximately 1', () => {
    const g = makeGraph(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']]);
    const ranks = computePageRank(g);
    const total = Object.values(ranks).reduce((sum, v) => sum + v, 0);
    expect(Math.abs(total - 1)).toBeLessThan(0.01);
  });
});

describe('CallerCount', () => {
  it('counts correctly', () => {
    const g = makeGraph(['a', 'b', 'c'], [['a', 'c'], ['b', 'c']]);
    const counts = computeCallerCount(g);
    expect(counts['c']).toBe(2);
    expect(counts['a']).toBe(0);
  });
});
